const pool = require('../../config/database');

async function list(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const status = req.query.status ? String(req.query.status).trim() : null;

    let where = '';
    const params = [limit, offset];
    if (status) {
      where = ' WHERE o.status = $3';
      params.push(status);
    }
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM admin_orders o ${where}`,
      status ? [status] : []
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const result = await pool.query(
      `SELECT o.id, o.order_number, o.customer_id, o.chef_id, o.status, o.total_amount,
              o.order_date, o.delivery_date, o.notes, o.created_at,
              c.full_name AS customer_name, c.email AS customer_email,
              ch.full_name AS chef_name
       FROM admin_orders o
       LEFT JOIN admin_customers c ON c.id = o.customer_id
       LEFT JOIN admin_chefs ch ON ch.id = o.chef_id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );
    res.json({ data: result.rows, total, page, limit });
  } catch (err) {
    console.error('Orders list error:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
}

async function getOne(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid order id' });
    const result = await pool.query(
      `SELECT o.*, c.full_name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
              ch.full_name AS chef_name, ch.email AS chef_email
       FROM admin_orders o
       LEFT JOIN admin_customers c ON c.id = o.customer_id
       LEFT JOIN admin_chefs ch ON ch.id = o.chef_id
       WHERE o.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Order get error:', err);
    res.status(500).json({ error: 'Failed to load order' });
  }
}

async function create(req, res) {
  try {
    const { customer_id, chef_id, order_number, status, total_amount, order_date, delivery_date, notes } = req.body;
    if (!order_number) return res.status(400).json({ error: 'order_number required' });
    const result = await pool.query(
      `INSERT INTO admin_orders (customer_id, chef_id, order_number, status, total_amount, order_date, delivery_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        customer_id || null,
        chef_id || null,
        order_number,
        status || 'pending',
        total_amount != null ? Number(total_amount) : 0,
        order_date || new Date().toISOString().slice(0, 10),
        delivery_date || null,
        notes || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Order number already exists' });
    console.error('Order create error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
}

async function update(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid order id' });
    const { customer_id, chef_id, status, total_amount, order_date, delivery_date, notes } = req.body;
    const result = await pool.query(
      `UPDATE admin_orders SET
        customer_id = COALESCE($2, customer_id),
        chef_id = COALESCE($3, chef_id),
        status = COALESCE($4, status),
        total_amount = COALESCE($5, total_amount),
        order_date = COALESCE($6, order_date),
        delivery_date = COALESCE($7, delivery_date),
        notes = COALESCE($8, notes)
       WHERE id = $1
       RETURNING *`,
      [id, customer_id, chef_id, status, total_amount, order_date, delivery_date, notes]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Order update error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
}

module.exports = { list, getOne, create, update };
