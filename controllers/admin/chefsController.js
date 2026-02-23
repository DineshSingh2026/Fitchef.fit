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
      where = ' WHERE status = $3';
      params.push(status);
    }
    const countResult = await pool.query(`SELECT COUNT(*) AS total FROM admin_chefs ${where}`, status ? [status] : []);
    const total = parseInt(countResult.rows[0].total, 10);
    const result = await pool.query(
      `SELECT * FROM admin_chefs ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      params
    );
    res.json({ data: result.rows, total, page, limit });
  } catch (err) {
    console.error('Chefs list error:', err);
    res.status(500).json({ error: 'Failed to load chefs' });
  }
}

async function getOne(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid chef id' });
    const result = await pool.query('SELECT * FROM admin_chefs WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Chef not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Chef get error:', err);
    res.status(500).json({ error: 'Failed to load chef' });
  }
}

async function create(req, res) {
  try {
    const { full_name, email, phone, speciality, status } = req.body;
    if (!full_name || !email) return res.status(400).json({ error: 'full_name and email required' });
    const result = await pool.query(
      `INSERT INTO admin_chefs (full_name, email, phone, speciality, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [full_name, email, phone || null, speciality || null, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Chef create error:', err);
    res.status(500).json({ error: 'Failed to create chef' });
  }
}

async function update(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid chef id' });
    const { full_name, email, phone, speciality, status } = req.body;
    const result = await pool.query(
      `UPDATE admin_chefs SET
        full_name = COALESCE($2, full_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        speciality = COALESCE($5, speciality),
        status = COALESCE($6, status)
       WHERE id = $1
       RETURNING *`,
      [id, full_name, email, phone, speciality, status]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Chef not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Chef update error:', err);
    res.status(500).json({ error: 'Failed to update chef' });
  }
}

module.exports = { list, getOne, create, update };
