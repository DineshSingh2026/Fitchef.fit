const pool = require('../config/database');

async function findByEmail(email) {
  const result = await pool.query(
    'SELECT id, email, password_hash, full_name, role FROM admin_users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await pool.query(
    'SELECT id, email, full_name, role, created_at FROM admin_users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function create({ email, passwordHash, fullName, role = 'admin' }) {
  const result = await pool.query(
    `INSERT INTO admin_users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, role, created_at`,
    [email, passwordHash, fullName, role]
  );
  return result.rows[0];
}

module.exports = { findByEmail, findById, create };
