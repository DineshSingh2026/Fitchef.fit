const pool = require('../../config/database');

async function list(req, res) {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const status = req.query.status ? String(req.query.status).trim() : null;

    let where = 'WHERE o.user_id = $1';
    const params = [userId];
    if (status) {
      where += ' AND o.status = $2';
      params.push(status);
    }
    const countParams = status ? [userId, status] : [userId];
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    params.push(limit, offset);

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM user_orders o ${where}`,
      countParams
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const ordersResult = await pool.query(
      `SELECT o.id, o.total_amount, o.status, o.payment_status, o.created_at, o.requested_delivery_date
       FROM user_orders o ${where}
       ORDER BY o.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );
    const orders = ordersResult.rows;

    for (const order of orders) {
      const items = await pool.query(
        `SELECT oi.quantity, oi.price, d.name AS dish_name, d.image_url, d.protein
         FROM user_order_items oi
         LEFT JOIN dishes d ON d.id = oi.dish_id
         WHERE oi.order_id = $1`,
        [order.id]
      );
      order.items = items.rows;
    }

    res.json({ data: orders, total, page, limit });
  } catch (err) {
    console.error('User orders list error:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
}

async function create(req, res) {
  try {
    const userId = req.user.id;
    const { items, requested_delivery_date } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const requestedDate = requested_delivery_date ? new Date(String(requested_delivery_date).trim()) : null;
    if (!requestedDate || isNaN(requestedDate.getTime())) {
      return res.status(400).json({ error: 'Please select a delivery date (at least 24 hours from now).' });
    }
    requestedDate.setHours(0, 0, 0, 0);
    if (requestedDate.getTime() < tomorrow.getTime()) {
      return res.status(400).json({ error: 'Delivery date must be tomorrow or later. Orders cannot be delivered on the same day.' });
    }
    const deliveryDateStr = requestedDate.toISOString().slice(0, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const orderResult = await client.query(
        `INSERT INTO user_orders (user_id, total_amount, status, payment_status, requested_delivery_date)
         VALUES ($1, 0, 'Open', 'pending', $2)
         RETURNING id, total_amount, status, payment_status, created_at, requested_delivery_date`,
        [userId, deliveryDateStr]
      );
      const order = orderResult.rows[0];
      let total = 0;
      for (const it of items) {
        const dishId = it.dish_id;
        const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
        const dishRow = await client.query(
          'SELECT base_price, discount_price FROM dishes WHERE id = $1 AND available = true',
          [dishId]
        );
        if (dishRow.rows.length === 0) throw new Error('Invalid or unavailable dish: ' + dishId);
        const price = Number(dishRow.rows[0].discount_price ?? dishRow.rows[0].base_price);
        const lineTotal = price * qty;
        total += lineTotal;
        await client.query(
          'INSERT INTO user_order_items (order_id, dish_id, quantity, price) VALUES ($1, $2, $3, $4)',
          [order.id, dishId, qty, price]
        );
      }
      await client.query('UPDATE user_orders SET total_amount = $1 WHERE id = $2', [total, order.id]);
      await client.query('COMMIT');
      order.total_amount = total;
      order.items = items.map((it, i) => ({ dish_id: it.dish_id, quantity: it.quantity }));
      res.status(201).json(order);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: err.message || 'Failed to create order' });
  }
}

/** Delivered orders only (for feedback dropdown) */
async function listDelivered(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, total_amount, created_at FROM user_orders
       WHERE user_id = $1 AND status = 'Delivered'
       ORDER BY created_at DESC LIMIT 100`,
      [req.user.id]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('Delivered orders error:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
}

module.exports = { list, create, listDelivered };
