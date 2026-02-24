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

/** Full profile for dashboard (excludes password_hash) */
async function getProfileById(id) {
  const result = await pool.query(
    `SELECT id, email, full_name, phone, city, gender, date_of_birth,
            address_line1, address_line2, state, pincode, delivery_instructions,
            height, weight, target_weight, fitness_goal, dietary_preference, allergies, protein_target,
            created_at, updated_at
     FROM site_users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function updateProfile(id, data) {
  const fields = [];
  const values = [];
  let i = 1;
  const map = {
    full_name: data.full_name,
    phone: data.phone,
    city: data.city,
    gender: data.gender,
    date_of_birth: data.date_of_birth,
    address_line1: data.address_line1,
    address_line2: data.address_line2,
    state: data.state,
    pincode: data.pincode,
    delivery_instructions: data.delivery_instructions,
    height: data.height,
    weight: data.weight,
    target_weight: data.target_weight,
    fitness_goal: data.fitness_goal,
    dietary_preference: data.dietary_preference,
    allergies: data.allergies,
    protein_target: data.protein_target,
  };
  for (const [key, v] of Object.entries(map)) {
    if (v !== undefined) {
      fields.push(`${key} = $${i}`);
      values.push(v === '' ? null : v);
      i++;
    }
  }
  if (fields.length === 0) return getProfileById(id);
  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);
  await pool.query(
    `UPDATE site_users SET ${fields.join(', ')} WHERE id = $${i}`,
    values
  );
  return getProfileById(id);
}

async function updateStatus(id, status) {
  const result = await pool.query(
    "UPDATE site_users SET status = $1 WHERE id = $2 AND LOWER(TRIM(site_users.status)) = 'pending' RETURNING id, email, full_name, status",
    [status, id]
  );
  return result.rows[0] || null;
}

module.exports = { findByEmail, create, findPending, findById, updateStatus, getProfileById, updateProfile };
