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
      `SELECT o.id, o.user_id, o.total_amount, o.status, o.payment_status, o.created_at,
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
      `SELECT o.id, o.user_id, o.total_amount, o.status, o.payment_status, o.created_at,
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

/** PATCH /api/admin/open-orders/:id/confirm - set status Confirmed and notify user */
async function confirm(req, res) {
  try {
    const id = req.params.id;
    const orderResult = await pool.query(
      'SELECT id, user_id, status FROM user_orders WHERE id = $1',
      [id]
    );
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orderResult.rows[0];
    if (order.status !== 'Open') {
      return res.status(400).json({ error: 'Order is not in Open status' });
    }

    await pool.query(
      "UPDATE user_orders SET status = 'Confirmed' WHERE id = $1",
      [id]
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

module.exports = { list, getOne, confirm };
