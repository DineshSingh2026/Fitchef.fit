const pool = require('../../config/database');

/** List user_orders with status 'Out for Delivery' or 'Delivered' for admin logistics view. */
async function list(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const status = req.query.status ? String(req.query.status).trim() : null;
    const statusFilter = status && ['Out for Delivery', 'Delivered'].includes(status) ? status : null;
    const params = [limit, offset];
    let where = " WHERE o.status IN ('Out for Delivery', 'Delivered')";
    if (statusFilter) {
      where += ' AND o.status = $3';
      params.push(statusFilter);
    }
    const countResult = await pool.query(
      statusFilter
        ? `SELECT COUNT(*) AS total FROM user_orders o WHERE o.status = $1`
        : `SELECT COUNT(*) AS total FROM user_orders o WHERE o.status IN ('Out for Delivery', 'Delivered')`,
      statusFilter ? [statusFilter] : []
    );
    const total = parseInt(countResult.rows[0].total, 10);
    const result = await pool.query(
      `SELECT o.id AS order_id, o.status, o.total_amount, o.created_at, o.dispatch_time, o.delivered_time,
              COALESCE(u.full_name, 'Customer') AS customer_name, u.email AS customer_email,
              a.name AS driver_name
       FROM user_orders o
       INNER JOIN site_users u ON u.id = o.user_id
       LEFT JOIN delivery_agents a ON a.id = o.assigned_agent_id
       ${where}
       ORDER BY o.delivered_time DESC NULLS LAST, o.dispatch_time DESC NULLS LAST, o.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );
    res.json({ data: result.rows, total, page, limit });
  } catch (err) {
    console.error('Logistics list error:', err);
    res.status(500).json({ error: 'Failed to load deliveries' });
  }
}

/** Get one user_order (by order id) for logistics detail. */
async function getOne(req, res) {
  try {
    const id = req.params.id;
    const result = await pool.query(
      `SELECT o.id AS order_id, o.status, o.total_amount, o.created_at, o.dispatch_time, o.delivered_time,
              o.delivery_address, o.delivery_instructions,
              COALESCE(u.full_name, 'Customer') AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
              a.name AS driver_name, a.mobile AS driver_phone
       FROM user_orders o
       INNER JOIN site_users u ON u.id = o.user_id
       LEFT JOIN delivery_agents a ON a.id = o.assigned_agent_id
       WHERE o.id = $1 AND o.status IN ('Out for Delivery', 'Delivered')`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
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
