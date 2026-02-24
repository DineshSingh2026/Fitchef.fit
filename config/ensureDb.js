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
    await pool.query(loadSql('init-users.sql'));
    console.log('ensureDb: site_users OK');
  } catch (e) {
    if (e.code !== '42P01') console.warn('ensureDb: site_users', e.message);
  }
  try {
    await pool.query('ALTER TABLE site_users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)');
    await pool.query('ALTER TABLE site_users ADD COLUMN IF NOT EXISTS city VARCHAR(100)');
    await pool.query('ALTER TABLE site_users ADD COLUMN IF NOT EXISTS status VARCHAR(20)');
    await pool.query("ALTER TABLE site_users ALTER COLUMN status SET DEFAULT 'pending'");
    await pool.query('UPDATE site_users SET status = \'approved\' WHERE status IS NULL');
  } catch (e) {
    if (e.code !== '42P01') console.warn('ensureDb: site_users columns', e.message);
  }
  try {
    await pool.query(loadSql('init-admin.sql'));
    console.log('ensureDb: admin tables OK');
  } catch (e) {
    if (e.code !== '42P01') console.warn('ensureDb: admin tables', e.message);
  }
  try {
    await pool.query(loadSql('init-dishes.sql'));
    console.log('ensureDb: dishes OK');
  } catch (e) {
    if (e.code !== '42P01') console.warn('ensureDb: dishes', e.message);
  }
  try {
    await pool.query(loadSql('init-user-dashboard.sql'));
    console.log('ensureDb: user dashboard OK');
  } catch (e) {
    if (e.code !== '42P01') console.warn('ensureDb: user dashboard', e.message);
  }
  try {
    await pool.query('ALTER TABLE user_orders ADD COLUMN IF NOT EXISTS requested_delivery_date DATE');
  } catch (e) {
    if (e.code !== '42P01') console.warn('ensureDb: user_orders requested_delivery_date', e.message);
  }
  try {
    await pool.query(loadSql('init-chef-dashboard.sql'));
    console.log('ensureDb: chef dashboard OK');
  } catch (e) {
    if (e.code !== '42P01') console.warn('ensureDb: chef dashboard', e.message);
  }
  try {
    await pool.query(loadSql('init-logistics-dashboard.sql'));
    console.log('ensureDb: logistics dashboard OK');
  } catch (e) {
    if (e.code !== '42P01') console.warn('ensureDb: logistics dashboard', e.message);
  }
}

// Fixed FitChef chef: default chef@fitchef.fit / Chef@123 (saved in DB on first run)
async function seedChefIfNeeded() {
  try {
    const r = await pool.query('SELECT id FROM chefs LIMIT 1');
    if (r.rows.length > 0) return;
    const bcrypt = require('bcrypt');
    const email = process.env.INITIAL_CHEF_EMAIL || 'chef@fitchef.fit';
    const password = process.env.INITIAL_CHEF_PASSWORD || 'Chef@123';
    const name = process.env.INITIAL_CHEF_NAME || 'FitChef Chef';
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO chefs (name, email, password_hash, mobile, address) VALUES ($1, $2, $3, $4, $5)',
      [name, email, hash, '', '']
    );
    console.log('ensureDb: chef user created', email);
  } catch (e) {
    if (e.code !== '42P01') console.warn('ensureDb: seed chef', e.message);
  }
}

// Fixed FitChef logistics: default logistics@fitchef.fit / Logistics@123 (saved in DB on first run)
async function seedLogisticsIfNeeded() {
  try {
    const r = await pool.query('SELECT id FROM logistics_users LIMIT 1');
    if (r.rows.length > 0) return;
    const bcrypt = require('bcrypt');
    const email = process.env.INITIAL_LOGISTICS_EMAIL || 'logistics@fitchef.fit';
    const password = process.env.INITIAL_LOGISTICS_PASSWORD || 'Logistics@123';
    const name = process.env.INITIAL_LOGISTICS_NAME || 'FitChef Logistics';
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO logistics_users (name, email, password_hash) VALUES ($1, $2, $3)',
      [name, email, hash]
    );
    console.log('ensureDb: logistics user created', email);
  } catch (e) {
    if (e.code !== '42P01') console.warn('ensureDb: seed logistics', e.message);
  }
}

async function seedDeliveryAgentIfNeeded() {
  try {
    const r = await pool.query('SELECT id FROM delivery_agents LIMIT 1');
    if (r.rows.length > 0) return;
    await pool.query(
      `INSERT INTO delivery_agents (name, mobile, vehicle_number, availability_status) VALUES ('FitChef Delivery', '9999999999', 'DL01AB1234', 'available')`
    );
    console.log('ensureDb: default delivery agent created');
  } catch (e) {
    if (e.code !== '42P01') console.warn('ensureDb: seed delivery agent', e.message);
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
  if (process.env.DATABASE_URL) {
    await seedAdminIfNeeded();
    await seedChefIfNeeded();
    await seedLogisticsIfNeeded();
    await seedDeliveryAgentIfNeeded();
  }
}

module.exports = { ensureDb };
