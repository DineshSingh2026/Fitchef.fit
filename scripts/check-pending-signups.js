/**
 * Check recent site_users and pending count (for debugging).
 * Run: node scripts/check-pending-signups.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../config/database');

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set.');
    process.exit(1);
  }
  try {
    const recent = await pool.query(
      `SELECT id, email, full_name, status, created_at FROM site_users ORDER BY created_at DESC LIMIT 20`
    );
    const pending = await pool.query(
      `SELECT COUNT(*) AS c FROM site_users WHERE LOWER(TRIM(status)) = 'pending'`
    );
    console.log('Pending signups count:', pending.rows[0].c);
    console.log('Recent site_users (last 20):');
    console.table(recent.rows.map((r) => ({ id: r.id, email: r.email, full_name: r.full_name, status: r.status, created_at: r.created_at })));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
