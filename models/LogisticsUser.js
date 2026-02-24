const pool = require('../config/database');

async function findByEmail(email) {
  const result = await pool.query(
    'SELECT id, email, password_hash, name FROM logistics_users WHERE email = $1',
    [email.trim().toLowerCase()]
  );
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await pool.query(
    'SELECT id, email, name, created_at FROM logistics_users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

module.exports = { findByEmail, findById };
