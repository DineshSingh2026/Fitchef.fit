/**
 * Run on server startup: create tables (early_access, consultations, admin_*)
 * and seed first admin user if none exists. Makes consultation form work on
 * Render without running Shell commands.
 */
const fs = require('fs');
const path = require('path');
const pool = require('./database');

function loadSql(name) {
  const file = path.join(__dirname, '..', 'scripts', name);
  return fs
    .readFileSync(file, 'utf8')
    .replace(/--[^\n]*/g, '')
    .replace(/\n\n+/g, '\n')
    .trim();
}

async function ensureTables() {
  if (!process.env.DATABASE_URL) {
    console.warn('ensureDb: DATABASE_URL not set, skipping.');
    return;
  }
  try {
    await pool.query(loadSql('init-db.sql'));
    console.log('ensureDb: early_access OK');
  } catch (e) {
    if (e.code !== '42P01') console.warn('ensureDb: early_access', e.message);
  }
  try {
    await pool.query(loadSql('init-consultations.sql'));
    console.log('ensureDb: consultations OK');
  } catch (e) {
    if (e.code !== '42P01') console.warn('ensureDb: consultations', e.message);
  }
  try {
    await pool.query(loadSql('init-admin.sql'));
    console.log('ensureDb: admin tables OK');
  } catch (e) {
    if (e.code !== '42P01') console.warn('ensureDb: admin tables', e.message);
  }
}

async function seedAdminIfNeeded() {
  try {
    const r = await pool.query('SELECT id FROM admin_users LIMIT 1');
    if (r.rows.length > 0) return;
    const bcrypt = require('bcrypt');
    const email = process.env.INITIAL_ADMIN_EMAIL || 'admin@fitchef.fit';
    const password = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123';
    const fullName = process.env.INITIAL_ADMIN_NAME || 'FitChef Admin';
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO admin_users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4)',
      [email, hash, fullName, 'admin']
    );
    console.log('ensureDb: admin user created', email);
  } catch (e) {
    if (e.code !== '42P01') console.warn('ensureDb: seed admin', e.message);
  }
}

async function ensureDb() {
  await ensureTables();
  await seedAdminIfNeeded();
}

module.exports = { ensureDb };
