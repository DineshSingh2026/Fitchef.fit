const pool = require('../../config/database');

async function list(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const status = req.query.status ? String(req.query.status).trim() : null;
    const source = req.query.source ? String(req.query.source).trim() : null;
    const params = [limit, offset];
    const conditions = [];
    if (status) {
      conditions.push('status = $' + (params.length + 1));
      params.push(status);
    }
    if (source) {
      conditions.push('source = $' + (params.length + 1));
      params.push(source);
    }
    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    const countParams = params.slice(2);
    const countWhere = conditions.length
      ? ' WHERE ' + conditions.map(function (_, i) { return conditions[i].replace(/\$\d+/, '$' + (i + 1)); }).join(' AND ')
      : '';
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM admin_leads ${countWhere}`,
      countParams
    );
    const total = parseInt(countResult.rows[0].total, 10);
    const result = await pool.query(
      `SELECT * FROM admin_leads ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      params
    );
    res.json({ data: result.rows, total, page, limit });
  } catch (err) {
    console.error('Leads list error:', err);
    res.status(500).json({ error: 'Failed to load leads' });
  }
}

async function getOne(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid lead id' });
    const result = await pool.query('SELECT * FROM admin_leads WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Lead get error:', err);
    res.status(500).json({ error: 'Failed to load lead' });
  }
}

async function create(req, res) {
  try {
    const { email, full_name, source, status, notes } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    const result = await pool.query(
      `INSERT INTO admin_leads (email, full_name, source, status, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [email, full_name || null, source || 'consultation', status || 'new', notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Lead create error:', err);
    res.status(500).json({ error: 'Failed to create lead' });
  }
}

async function update(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid lead id' });
    const { email, full_name, source, status, notes } = req.body;
    const result = await pool.query(
      `UPDATE admin_leads SET
        email = COALESCE($2, email),
        full_name = COALESCE($3, full_name),
        source = COALESCE($4, source),
        status = COALESCE($5, status),
        notes = COALESCE($6, notes)
       WHERE id = $1
       RETURNING *`,
      [id, email, full_name, source, status, notes]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Lead update error:', err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
}

module.exports = { list, getOne, create, update };
