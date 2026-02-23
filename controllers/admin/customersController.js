const pool = require('../../config/database');

async function list(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const search = req.query.search ? String(req.query.search).trim() : null;
    const params = [limit, offset];
    let where = '';
    if (search) {
      where = " WHERE (email ILIKE $3 OR full_name ILIKE $3 OR city ILIKE $3)";
      params.push(`%${search}%`);
    }
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM admin_customers ${where}`,
      search ? [search] : []
    );
    const total = parseInt(countResult.rows[0].total, 10);
    const result = await pool.query(
      `SELECT * FROM admin_customers ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      params
    );
    res.json({ data: result.rows, total, page, limit });
  } catch (err) {
    console.error('Customers list error:', err);
    res.status(500).json({ error: 'Failed to load customers' });
  }
}

async function getOne(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid customer id' });
    const result = await pool.query('SELECT * FROM admin_customers WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Customer get error:', err);
    res.status(500).json({ error: 'Failed to load customer' });
  }
}

async function create(req, res) {
  try {
    const { email, full_name, phone, city, source } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    const result = await pool.query(
      `INSERT INTO admin_customers (email, full_name, phone, city, source)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [email, full_name || null, phone || null, city || null, source || 'website']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Customer create error:', err);
    res.status(500).json({ error: 'Failed to create customer' });
  }
}

async function update(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid customer id' });
    const { email, full_name, phone, city, source } = req.body;
    const result = await pool.query(
      `UPDATE admin_customers SET
        email = COALESCE($2, email),
        full_name = COALESCE($3, full_name),
        phone = COALESCE($4, phone),
        city = COALESCE($5, city),
        source = COALESCE($6, source)
       WHERE id = $1
       RETURNING *`,
      [id, email, full_name, phone, city, source]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Customer update error:', err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
}

module.exports = { list, getOne, create, update };
