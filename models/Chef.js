const pool = require('../config/database');

async function findByEmail(email) {
  const result = await pool.query(
    'SELECT id, email, password_hash, name, mobile, address FROM chefs WHERE email = $1',
    [email.trim().toLowerCase()]
  );
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await pool.query(
    'SELECT id, email, name, mobile, address, created_at, updated_at FROM chefs WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function updateProfile(id, data) {
  const fields = [];
  const values = [];
  let idx = 1;
  if (data.name !== undefined) { fields.push(`name = $${idx}`); values.push(data.name); idx++; }
  if (data.mobile !== undefined) { fields.push(`mobile = $${idx}`); values.push(data.mobile); idx++; }
  if (data.address !== undefined) { fields.push(`address = $${idx}`); values.push(data.address); idx++; }
  if (fields.length === 0) return findById(id);
  values.push(id);
  const result = await pool.query(
    `UPDATE chefs SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id, email, name, mobile, address, created_at, updated_at`,
    values
  );
  return result.rows[0] || null;
}

module.exports = { findByEmail, findById, updateProfile };
