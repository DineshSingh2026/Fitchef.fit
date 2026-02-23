const pool = require('../config/database');

const INSERT_FIELDS = `
  full_name, email, phone, city, delivery_frequency, goals,
  age, gender, height, weight, activity_level,
  diet_type, allergies, spice_preference, start_timeline
`;

const INSERT_PLACEHOLDERS = `
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
`;

function toInt(val) {
  if (val == null || val === '') return null;
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : null;
}

function toGoals(val) {
  if (!Array.isArray(val) || val.length === 0) return null;
  const arr = val.filter(Boolean).map(String);
  return arr.length > 0 ? arr : null;
}

async function create(data) {
  const result = await pool.query(
    `INSERT INTO consultations (${INSERT_FIELDS})
     VALUES (${INSERT_PLACEHOLDERS})
     RETURNING id, full_name, email, city, created_at`,
    [
      data.full_name,
      data.email,
      data.phone || null,
      data.city,
      data.delivery_frequency || null,
      toGoals(data.goals),
      toInt(data.age),
      data.gender || null,
      toInt(data.height),
      toInt(data.weight),
      data.activity_level || null,
      data.diet_type || null,
      data.allergies || null,
      data.spice_preference || null,
      data.start_timeline || null,
    ]
  );
  return result.rows[0];
}

module.exports = { create };
