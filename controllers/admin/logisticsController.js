const pool = require('../../config/database');

async function list(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const status = req.query.status ? String(req.query.status).trim() : null;
    const params = [limit, offset];
    let where = '';
    if (status) {
      where = ' WHERE d.status = $3';
      params.push(status);
    }
    const countWhere = status ? ' WHERE d.status = $1' : '';
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM admin_deliveries d ${countWhere}`,
      status ? [status] : []
    );
    const total = parseInt(countResult.rows[0].total, 10);
    const result = await pool.query(
      `SELECT d.*, o.order_number, o.order_date, o.total_amount, o.status AS order_status,
              c.full_name AS customer_name, c.email AS customer_email
       FROM admin_deliveries d
       JOIN admin_orders o ON o.id = d.order_id
       LEFT JOIN admin_customers c ON c.id = o.customer_id
       ${where}
       ORDER BY d.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );
    res.json({ data: result.rows, total, page, limit });
  } catch (err) {
    console.error('Logistics list error:', err);
    res.status(500).json({ error: 'Failed to load deliveries' });
  }
}

async function getOne(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid delivery id' });
    const result = await pool.query(
      `SELECT d.*, o.order_number, o.order_date, o.total_amount, o.status AS order_status,
              c.full_name AS customer_name, c.email AS customer_email, c.phone AS customer_phone
       FROM admin_deliveries d
       JOIN admin_orders o ON o.id = d.order_id
       LEFT JOIN admin_customers c ON c.id = o.customer_id
       WHERE d.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Delivery not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Delivery get error:', err);
    res.status(500).json({ error: 'Failed to load delivery' });
  }
}

async function create(req, res) {
  try {
    const { order_id, status, driver_name, driver_phone, estimated_at, tracking_notes } = req.body;
    if (!order_id) return res.status(400).json({ error: 'order_id required' });
    const result = await pool.query(
      `INSERT INTO admin_deliveries (order_id, status, driver_name, driver_phone, estimated_at, tracking_notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        order_id,
        status || 'scheduled',
        driver_name || null,
        driver_phone || null,
        estimated_at || null,
        tracking_notes || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'Order not found' });
    console.error('Delivery create error:', err);
    res.status(500).json({ error: 'Failed to create delivery' });
  }
}

async function update(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid delivery id' });
    const { status, driver_name, driver_phone, estimated_at, delivered_at, tracking_notes } = req.body;
    const result = await pool.query(
      `UPDATE admin_deliveries SET
        status = COALESCE($2, status),
        driver_name = COALESCE($3, driver_name),
        driver_phone = COALESCE($4, driver_phone),
        estimated_at = COALESCE($5, estimated_at),
        delivered_at = COALESCE($6, delivered_at),
        tracking_notes = COALESCE($7, tracking_notes)
       WHERE id = $1
       RETURNING *`,
      [id, status, driver_name, driver_phone, estimated_at, delivered_at, tracking_notes]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Delivery not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Delivery update error:', err);
    res.status(500).json({ error: 'Failed to update delivery' });
  }
}

module.exports = { list, getOne, create, update };
