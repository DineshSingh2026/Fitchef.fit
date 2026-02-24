const pool = require('../../config/database');

// Logistics-safe fields only: no payment, email, nutrition, admin notes
const ORDER_SELECT = `
  o.id, o.created_at, o.status, o.requested_delivery_date, o.delivery_address, o.delivery_time_slot, o.kitchen_location,
  o.dispatch_time, o.delivered_time, o.assigned_agent_id,
  COALESCE(u.full_name, 'Customer') AS user_name,
  COALESCE(u.phone, '') AS user_mobile
`;

const AGENT_JOIN = `LEFT JOIN delivery_agents a ON a.id = o.assigned_agent_id`;

/**
 * GET /api/logistics/orders/open
 * Orders: status = 'Confirmed', admin_approved = true. Read-only.
 */
async function openOrders(req, res) {
  try {
    const result = await pool.query(
      `SELECT ${ORDER_SELECT}
       FROM user_orders o
       INNER JOIN site_users u ON u.id = o.user_id
       ${AGENT_JOIN}
       WHERE o.status = 'Confirmed' AND o.admin_approved = true
       ORDER BY o.created_at ASC`,
      []
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('Logistics open orders error:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
}

/**
 * GET /api/logistics/orders/ready
 * Orders: status = 'Ready for Dispatch'
 */
async function readyOrders(req, res) {
  try {
    const result = await pool.query(
      `SELECT ${ORDER_SELECT}, a.name AS agent_name
       FROM user_orders o
       INNER JOIN site_users u ON u.id = o.user_id
       ${AGENT_JOIN}
       WHERE o.status = 'Ready for Dispatch'
       ORDER BY o.completed_at ASC NULLS LAST, o.created_at ASC`,
      []
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('Logistics ready orders error:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
}

/**
 * GET /api/logistics/orders/out
 * Orders: status = 'Out for Delivery'
 */
async function outOrders(req, res) {
  try {
    const result = await pool.query(
      `SELECT ${ORDER_SELECT}, a.name AS agent_name
       FROM user_orders o
       INNER JOIN site_users u ON u.id = o.user_id
       ${AGENT_JOIN}
       WHERE o.status = 'Out for Delivery'
       ORDER BY o.dispatch_time ASC`,
      []
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('Logistics out orders error:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
}

/**
 * GET /api/logistics/orders/delivered
 * Orders: status = 'Delivered'. Query: filter = today | week | month
 */
async function deliveredOrders(req, res) {
  try {
    const filter = (req.query.filter || '').toLowerCase();
    let dateCondition = '';
    if (filter === 'today') {
      dateCondition = " AND DATE(o.delivered_time) = CURRENT_DATE";
    } else if (filter === 'week') {
      dateCondition = " AND o.delivered_time >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (filter === 'month') {
      dateCondition = " AND o.delivered_time >= CURRENT_DATE - INTERVAL '30 days'";
    }
    const result = await pool.query(
      `SELECT ${ORDER_SELECT}, a.name AS agent_name
       FROM user_orders o
       INNER JOIN site_users u ON u.id = o.user_id
       ${AGENT_JOIN}
       WHERE o.status = 'Delivered' ${dateCondition}
       ORDER BY o.delivered_time DESC`,
      []
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('Logistics delivered orders error:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
}

/**
 * PUT /api/logistics/orders/:id/assign-agent
 * Body: { agent_id }. Order must be 'Ready for Dispatch'. Validate agent exists.
 */
async function assignAgent(req, res) {
  try {
    const orderId = req.params.id;
    const agentId = req.body.agent_id;
    if (!agentId) return res.status(400).json({ error: 'agent_id is required' });

    const orderRow = await pool.query(
      'SELECT id, status FROM user_orders WHERE id = $1',
      [orderId]
    );
    if (orderRow.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    if (orderRow.rows[0].status !== 'Ready for Dispatch') {
      return res.status(400).json({ error: 'Order must be Ready for Dispatch to assign agent' });
    }

    const agentRow = await pool.query(
      'SELECT id FROM delivery_agents WHERE id = $1',
      [agentId]
    );
    if (agentRow.rows.length === 0) return res.status(400).json({ error: 'Agent not found' });

    await pool.query(
      'UPDATE user_orders SET assigned_agent_id = $1 WHERE id = $2',
      [agentId, orderId]
    );
    res.json({ success: true, message: 'Agent assigned' });
  } catch (err) {
    console.error('Logistics assign agent error:', err);
    res.status(500).json({ error: 'Failed to assign agent' });
  }
}

/**
 * PUT /api/logistics/orders/:id/out-for-delivery
 * Set status = 'Out for Delivery', dispatch_time = now. Notify user and admin.
 * Order must be 'Ready for Dispatch' and have assigned_agent_id.
 */
async function outForDelivery(req, res) {
  try {
    const orderId = req.params.id;
    const orderRow = await pool.query(
      'SELECT id, user_id, status, assigned_agent_id FROM user_orders WHERE id = $1',
      [orderId]
    );
    if (orderRow.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orderRow.rows[0];
    if (order.status !== 'Ready for Dispatch') {
      return res.status(400).json({ error: 'Order must be Ready for Dispatch' });
    }
    if (!order.assigned_agent_id) {
      return res.status(400).json({ error: 'Assign a delivery agent first' });
    }

    const agentRow = await pool.query('SELECT name FROM delivery_agents WHERE id = $1', [order.assigned_agent_id]);
    const agentName = agentRow.rows[0]?.name || 'Delivery agent';

    await pool.query(
      `UPDATE user_orders SET status = 'Out for Delivery', dispatch_time = CURRENT_TIMESTAMP WHERE id = $1`,
      [orderId]
    );

    const shortId = orderId.slice(0, 8);
    const message = `Your FitChef order #${shortId} is out for delivery and will arrive soon.`;
    await pool.query(
      'INSERT INTO order_notifications (user_id, order_id, message) VALUES ($1, $2, $3)',
      [order.user_id, orderId, message]
    );
    await pool.query(
      'INSERT INTO user_notifications (user_id, order_id, message) VALUES ($1, $2, $3)',
      [order.user_id, orderId, message]
    );
    const adminRow = await pool.query('SELECT id FROM admin_users LIMIT 1');
    if (adminRow.rows.length > 0) {
      await pool.query(
        'INSERT INTO order_notifications (admin_id, order_id, message) VALUES ($1, $2, $3)',
        [adminRow.rows[0].id, orderId, `Order #${shortId} is out for delivery. Agent: ${agentName}.`]
      );
    }

    res.json({ success: true, message: 'Order marked out for delivery. User and admin notified.' });
  } catch (err) {
    console.error('Logistics out-for-delivery error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
}

/**
 * PUT /api/logistics/orders/:id/delivered
 * Set status = 'Delivered', delivered_time = now. Order must be 'Out for Delivery'.
 */
async function markDelivered(req, res) {
  try {
    const orderId = req.params.id;
    const orderRow = await pool.query(
      'SELECT id, status FROM user_orders WHERE id = $1',
      [orderId]
    );
    if (orderRow.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    if (orderRow.rows[0].status !== 'Out for Delivery') {
      return res.status(400).json({ error: 'Order must be Out for Delivery to mark delivered' });
    }

    await pool.query(
      `UPDATE user_orders SET status = 'Delivered', delivered_time = CURRENT_TIMESTAMP WHERE id = $1`,
      [orderId]
    );
    res.json({ success: true, message: 'Order marked as delivered' });
  } catch (err) {
    console.error('Logistics mark delivered error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
}

/**
 * GET /api/logistics/overview
 * Counts: open, ready, out, delivered today; average delivery time.
 */
async function overview(req, res) {
  try {
    const [open, ready, out, deliveredToday, avgTime] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS c FROM user_orders WHERE status = 'Confirmed' AND admin_approved = true`
      ),
      pool.query(
        `SELECT COUNT(*) AS c FROM user_orders WHERE status = 'Ready for Dispatch'`
      ),
      pool.query(
        `SELECT COUNT(*) AS c FROM user_orders WHERE status = 'Out for Delivery'`
      ),
      pool.query(
        `SELECT COUNT(*) AS c FROM user_orders WHERE status = 'Delivered' AND DATE(delivered_time) = CURRENT_DATE`
      ),
      pool.query(
        `SELECT AVG(EXTRACT(EPOCH FROM (delivered_time - dispatch_time)) / 60) AS avg_mins
         FROM user_orders WHERE status = 'Delivered' AND dispatch_time IS NOT NULL AND delivered_time IS NOT NULL`
      ),
    ]);
    res.json({
      data: {
        open_count: parseInt(open.rows[0]?.c || 0, 10),
        ready_count: parseInt(ready.rows[0]?.c || 0, 10),
        out_count: parseInt(out.rows[0]?.c || 0, 10),
        delivered_today: parseInt(deliveredToday.rows[0]?.c || 0, 10),
        avg_delivery_minutes: avgTime.rows[0]?.avg_mins != null
          ? Math.round(parseFloat(avgTime.rows[0].avg_mins))
          : null,
      },
    });
  } catch (err) {
    console.error('Logistics overview error:', err);
    res.status(500).json({ error: 'Failed to load overview' });
  }
}

module.exports = {
  openOrders,
  readyOrders,
  outOrders,
  deliveredOrders,
  assignAgent,
  outForDelivery,
  markDelivered,
  overview,
};
