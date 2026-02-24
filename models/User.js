const pool = require('../config/database');

async function findByEmail(email) {
  const result = await pool.query(
    'SELECT id, email, password_hash, full_name, phone, city, status, created_at FROM site_users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

async function create({ email, passwordHash, fullName, phone, city, status = 'pending' }) {
  const statusVal = (status && String(status).trim()) || 'pending';
  const result = await pool.query(
    `INSERT INTO site_users (email, password_hash, full_name, phone, city, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, full_name, phone, city, status, created_at`,
    [email, passwordHash, fullName, phone || null, city || null, statusVal]
  );
  return result.rows[0];
}

async function findPending(limit = 100) {
  const result = await pool.query(
    'SELECT id, email, full_name, phone, city, status, created_at FROM site_users WHERE LOWER(TRIM(status)) = $1 ORDER BY created_at DESC LIMIT $2',
    ['pending', limit]
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(
    'SELECT id, email, full_name, phone, city, status, created_at FROM site_users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function updateStatus(id, status) {
  const result = await pool.query(
    "UPDATE site_users SET status = $1 WHERE id = $2 AND LOWER(TRIM(site_users.status)) = 'pending' RETURNING id, email, full_name, status",
    [status, id]
  );
  return result.rows[0] || null;
}

module.exports = { findByEmail, create, findPending, findById, updateStatus };
