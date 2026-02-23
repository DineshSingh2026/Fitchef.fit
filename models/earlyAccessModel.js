const pool = require('../config/database');

/**
 * Insert email into early_access table
 * @param {string} email
 * @returns {Promise<{ id: number, email: string, created_at: Date }>}
 */
async function createEarlyAccess(email) {
  const result = await pool.query(
    'INSERT INTO early_access (email) VALUES ($1) RETURNING id, email, created_at',
    [email.toLowerCase().trim()]
  );
  return result.rows[0];
}

/**
 * Check if email already exists (optional, for custom duplicate message)
 */
async function findByEmail(email) {
  const result = await pool.query(
    'SELECT id FROM early_access WHERE email = $1',
    [email.toLowerCase().trim()]
  );
  return result.rows[0];
}

module.exports = {
  createEarlyAccess,
  findByEmail,
};
