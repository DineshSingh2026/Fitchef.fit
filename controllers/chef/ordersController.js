const pool = require('../../config/database');

/**
 * GET /api/chef/orders/open
 * Only orders: status = 'Confirmed', chef_id = logged chef, admin_approved = true.
 * Return NO user phone/email. Only: order id, date, delivery_address, delivery_instructions, customer first name, items (dish details + allergies).
 */
async function openOrders(req, res) {
  try {
    const chefId = req.user.id;
    const result = await pool.query(
      `SELECT o.id, o.created_at, o.requested_delivery_date, o.delivery_address, o.delivery_instructions,
              TRIM(SPLIT_PART(COALESCE(u.full_name, 'Customer'), ' ', 1)) AS customer_first_name
       FROM user_orders o
       INNER JOIN site_users u ON u.id = o.user_id
       WHERE o.chef_id = $1 AND o.status = $2 AND o.admin_approved = true
       ORDER BY o.created_at ASC`,
      [chefId, 'Confirmed']
    );
    const orders = result.rows;
    for (const order of orders) {
      const items = await pool.query(
        `SELECT oi.quantity, d.name AS dish_name, d.ingredients, d.allergens, d.portion_size,
                d.calories, d.protein, d.carbs, d.fats
         FROM user_order_items oi
         INNER JOIN dishes d ON d.id = oi.dish_id
         WHERE oi.order_id = $1`,
        [order.id]
      );
      order.items = items.rows;
      order.allergy_notes = collectAllergies(order.items);
    }
    res.json({ data: orders });
  } catch (err) {
    console.error('Chef open orders error:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
}

function collectAllergies(items) {
  const set = new Set();
  (items || []).forEach((it) => {
    const a = (it.allergens || '').split(/[,;|\n]/).map((s) => s.trim()).filter(Boolean);
    a.forEach((x) => set.add(x));
  });
  return Array.from(set);
}

/**
 * GET /api/chef/orders/completed
 * chef_id = logged chef, status IN ('Ready for Dispatch', 'Delivered')
 * Query: filter = today | week | month
 */
async function completedOrders(req, res) {
  try {
    const chefId = req.user.id;
    const filter = (req.query.filter || '').toLowerCase();
    let dateCondition = '';
    const params = [chefId];
    if (filter === 'today') {
      dateCondition = " AND DATE(o.completed_at) = CURRENT_DATE";
    } else if (filter === 'week') {
      dateCondition = " AND o.completed_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (filter === 'month') {
      dateCondition = " AND o.completed_at >= CURRENT_DATE - INTERVAL '30 days'";
    }
    const result = await pool.query(
      `SELECT o.id, o.status, o.created_at, o.completed_at, o.requested_delivery_date, o.delivery_address, o.delivery_instructions,
              TRIM(SPLIT_PART(COALESCE(u.full_name, 'Customer'), ' ', 1)) AS customer_first_name
       FROM user_orders o
       INNER JOIN site_users u ON u.id = o.user_id
       WHERE o.chef_id = $1 AND o.status IN ('Ready for Dispatch', 'Delivered') ${dateCondition}
       ORDER BY o.completed_at DESC NULLS LAST`,
      params
    );
    const orders = result.rows;
    for (const order of orders) {
      const items = await pool.query(
        `SELECT oi.quantity, d.name AS dish_name
         FROM user_order_items oi
         INNER JOIN dishes d ON d.id = oi.dish_id
         WHERE oi.order_id = $1`,
        [order.id]
      );
      order.items = items.rows;
    }
    res.json({ data: orders });
  } catch (err) {
    console.error('Chef completed orders error:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
}

/**
 * PATCH /api/chef/orders/:id/ready
 * Set status = 'Ready for Dispatch', completed_at = now(), then notify user and admin.
 */
async function markReady(req, res) {
  try {
    const chefId = req.user.id;
    const orderId = req.params.id;
    const orderRow = await pool.query(
      'SELECT id, user_id, status FROM user_orders WHERE id = $1 AND chef_id = $2',
      [orderId, chefId]
    );
    if (orderRow.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orderRow.rows[0];
    if (order.status !== 'Confirmed') {
      return res.status(400).json({ error: 'Order is not in Confirmed status' });
    }
    await pool.query(
      "UPDATE user_orders SET status = 'Ready for Dispatch', completed_at = CURRENT_TIMESTAMP WHERE id = $1",
      [orderId]
    );
    const dishNames = await pool.query(
      `SELECT d.name FROM user_order_items oi INNER JOIN dishes d ON d.id = oi.dish_id WHERE oi.order_id = $1`,
      [orderId]
    );
    const names = dishNames.rows.map((r) => r.name).join(', ');
    const message = `Order ${orderId.slice(0, 8)}... is ready for dispatch. Dishes: ${names || 'N/A'}.`;
    await pool.query(
      'INSERT INTO order_notifications (user_id, order_id, message) VALUES ($1, $2, $3)',
      [order.user_id, orderId, message]
    );
    await pool.query(
      'INSERT INTO user_notifications (user_id, order_id, message) VALUES ($1, $2, $3)',
      [order.user_id, orderId, 'Your order is ready for dispatch. Dishes: ' + (names || 'N/A') + '.']
    );
    const adminRow = await pool.query('SELECT id FROM admin_users LIMIT 1');
    if (adminRow.rows.length > 0) {
      await pool.query(
        'INSERT INTO order_notifications (admin_id, order_id, message) VALUES ($1, $2, $3)',
        [adminRow.rows[0].id, orderId, message]
      );
    }
    res.json({ success: true, message: 'Order marked ready for dispatch. Admin and customer notified.' });
  } catch (err) {
    console.error('Chef mark ready error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
}

module.exports = { openOrders, completedOrders, markReady };
