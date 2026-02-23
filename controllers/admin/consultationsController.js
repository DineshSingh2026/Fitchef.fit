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
      `SELECT COUNT(*) AS total FROM consultations ${where}`,
      search ? [search] : []
    );
    const total = parseInt(countResult.rows[0].total, 10);
    const result = await pool.query(
      `SELECT id, full_name, email, city, created_at FROM consultations ${where}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );
    res.json({ data: result.rows, total, page, limit });
  } catch (err) {
    console.error('Consultations list error:', err);
    res.status(500).json({ error: 'Failed to load consultations' });
  }
}

async function getOne(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const result = await pool.query(
      'SELECT * FROM consultations WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Consultation not found' });
    const row = result.rows[0];
    if (row.goals && !Array.isArray(row.goals)) row.goals = row.goals ? [row.goals] : [];
    res.json(row);
  } catch (err) {
    console.error('Consultation get error:', err);
    res.status(500).json({ error: 'Failed to load consultation' });
  }
}

module.exports = { list, getOne };
