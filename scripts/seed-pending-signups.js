/**
 * Seed sample pending signups in site_users (status = 'pending') for admin testing.
 * Run: node scripts/seed-pending-signups.js
 * Requires DATABASE_URL. Skips if emails already exist.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../config/database');
const bcrypt = require('bcrypt');

const SAMPLE_PENDING = [
  { email: 'pending1@example.com', full_name: 'Demo User One', phone: '9876543210', city: 'Mumbai' },
  { email: 'pending2@example.com', full_name: 'Demo User Two', phone: '9876543211', city: 'Delhi' },
];

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set.');
    process.exit(1);
  }
  try {
    const { ensureDb } = require('../config/ensureDb');
    await ensureDb();
    const hash = await bcrypt.hash('SamplePass123', 10);
    for (const u of SAMPLE_PENDING) {
      const exists = await pool.query('SELECT id FROM site_users WHERE email = $1', [u.email]);
      if (exists.rows.length > 0) {
        await pool.query("UPDATE site_users SET status = 'pending' WHERE email = $1", [u.email]);
        console.log('Reset to pending:', u.email);
      } else {
        await pool.query(
          `INSERT INTO site_users (email, password_hash, full_name, phone, city, status)
           VALUES ($1, $2, $3, $4, $5, 'pending')`,
          [u.email, hash, u.full_name, u.phone || null, u.city || null]
        );
        console.log('Inserted pending:', u.email);
      }
    }
    console.log('Done. Pending signups are in the DB.');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
