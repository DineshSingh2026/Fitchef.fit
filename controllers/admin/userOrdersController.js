const pool = require('../../config/database');

/** GET /api/admin/open-orders - list user_orders (default: status Open) */
async function list(req, res) {
  try {
    const status = req.query.status ? String(req.query.status).trim() : 'Open';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM user_orders o WHERE o.status = $1`,
      [status]
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const result = await pool.query(
      `SELECT o.id, o.user_id, o.total_amount, o.status, o.payment_status, o.created_at, o.requested_delivery_date,
              u.full_name AS user_name, u.email AS user_email, u.phone AS user_phone
       FROM user_orders o
       LEFT JOIN site_users u ON u.id = o.user_id
       WHERE o.status = $1
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    const orders = result.rows;
    for (const order of orders) {
      const items = await pool.query(
        `SELECT oi.quantity, oi.price, d.name AS dish_name, d.image_url
         FROM user_order_items oi
         LEFT JOIN dishes d ON d.id = oi.dish_id
         WHERE oi.order_id = $1`,
        [order.id]
      );
      order.items = items.rows;
    }

    res.json({ data: orders, total, page, limit });
  } catch (err) {
    console.error('Open orders list error:', err);
    res.status(500).json({ error: 'Failed to load open orders' });
  }
}

/** GET /api/admin/open-orders/:id - single user order with items and user */
async function getOne(req, res) {
  try {
    const id = req.params.id;
    const orderResult = await pool.query(
      `SELECT o.id, o.user_id, o.total_amount, o.status, o.payment_status, o.created_at, o.requested_delivery_date,
              u.full_name AS user_name, u.email AS user_email, u.phone AS user_phone,
              u.address_line1, u.address_line2, u.city, u.state, u.pincode, u.delivery_instructions
       FROM user_orders o
       LEFT JOIN site_users u ON u.id = o.user_id
       WHERE o.id = $1`,
      [id]
    );
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orderResult.rows[0];

    const items = await pool.query(
      `SELECT oi.quantity, oi.price, d.name AS dish_name, d.image_url, d.id AS dish_id
       FROM user_order_items oi
       LEFT JOIN dishes d ON d.id = oi.dish_id
       WHERE oi.order_id = $1`,
      [id]
    );
    order.items = items.rows;

    res.json(order);
  } catch (err) {
    console.error('Open order get error:', err);
    res.status(500).json({ error: 'Failed to load order' });
  }
}

/** PATCH /api/admin/open-orders/:id/confirm - set status Confirmed, admin_approved, delivery from user profile, notify user */
async function confirm(req, res) {
  try {
    const id = req.params.id;
    const orderResult = await pool.query(
      'SELECT o.id, o.user_id, o.status, u.address_line1, u.address_line2, u.city, u.state, u.pincode, u.delivery_instructions AS user_instructions FROM user_orders o LEFT JOIN site_users u ON u.id = o.user_id WHERE o.id = $1',
      [id]
    );
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orderResult.rows[0];
    if (order.status !== 'Open') {
      return res.status(400).json({ error: 'Order is not in Open status' });
    }
    const parts = [order.address_line1, order.address_line2, order.city, order.state, order.pincode].filter(Boolean);
    const deliveryAddress = parts.join(', ') || null;
    const deliveryInstructions = order.user_instructions || null;

    const defaultChef = await pool.query('SELECT id FROM chefs ORDER BY id LIMIT 1');
    const chefId = defaultChef.rows[0] ? defaultChef.rows[0].id : null;
    await pool.query(
      `UPDATE user_orders SET status = 'Confirmed', admin_approved = true, delivery_address = $2, delivery_instructions = $3, chef_id = $4 WHERE id = $1`,
      [id, deliveryAddress, deliveryInstructions, chefId]
    );
    await pool.query(
      `INSERT INTO user_notifications (user_id, order_id, message) VALUES ($1, $2, $3)`,
      [order.user_id, id, 'Your order has been confirmed. Thank you for choosing FitChef!']
    );

    res.json({ success: true, message: 'Order confirmed. User has been notified.' });
  } catch (err) {
    console.error('Confirm order error:', err);
    res.status(500).json({ error: 'Failed to confirm order' });
  }
}

/** PATCH /api/admin/open-orders/:id/assign - assign chef to a confirmed order (chef sees it in open orders) */
async function assignChef(req, res) {
  try {
    const id = req.params.id;
    const chefId = req.body.chef_id != null ? parseInt(req.body.chef_id, 10) : null;
    if (!chefId) return res.status(400).json({ error: 'chef_id is required' });
    const orderResult = await pool.query(
      'SELECT id, status FROM user_orders WHERE id = $1',
      [id]
    );
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    if (orderResult.rows[0].status !== 'Confirmed') {
      return res.status(400).json({ error: 'Order must be Confirmed to assign chef' });
    }
    const chefCheck = await pool.query('SELECT id FROM chefs WHERE id = $1', [chefId]);
    if (chefCheck.rows.length === 0) return res.status(400).json({ error: 'Chef not found' });
    await pool.query('UPDATE user_orders SET chef_id = $1 WHERE id = $2', [chefId, id]);
    res.json({ success: true, message: 'Chef assigned.' });
  } catch (err) {
    console.error('Assign chef error:', err);
    res.status(500).json({ error: 'Failed to assign chef' });
  }
}

/** GET /api/admin/chefs-for-assign - list chefs (id, name, email) for assigning to orders */
async function listChefsForAssign(req, res) {
  try {
    const result = await pool.query('SELECT id, name, email FROM chefs ORDER BY name');
    res.json({ data: result.rows });
  } catch (err) {
    console.error('List chefs for assign error:', err);
    res.status(500).json({ error: 'Failed to load chefs' });
  }
}

module.exports = { list, getOne, confirm, assignChef, listChefsForAssign };
