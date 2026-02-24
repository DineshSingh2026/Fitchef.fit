/**
 * Create or reset the fixed FitChef logistics user in the DB.
 * Usage: node scripts/seed-logistics.js
 * Default credentials: logistics@fitchef.fit / Logistics@123
 * Override with INITIAL_LOGISTICS_EMAIL, INITIAL_LOGISTICS_PASSWORD, INITIAL_LOGISTICS_NAME
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const pool = require('../config/database');

const email = process.env.INITIAL_LOGISTICS_EMAIL || 'logistics@fitchef.fit';
const password = process.env.INITIAL_LOGISTICS_PASSWORD || 'Logistics@123';
const name = process.env.INITIAL_LOGISTICS_NAME || 'FitChef Logistics';

function loadSql(name) {
  const file = path.join(__dirname, name);
  return fs.readFileSync(file, 'utf8').replace(/--[^\n]*/g, '').replace(/\n\n+/g, '\n').trim();
}

async function ensureLogisticsTable() {
  try {
    await pool.query(loadSql('init-logistics-dashboard.sql'));
  } catch (e) {
    if (e.code !== '42P01') throw e;
  }
}

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }
  try {
    await ensureLogisticsTable();
    const hash = await bcrypt.hash(password, 10);
    const existing = await pool.query('SELECT id FROM logistics_users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE logistics_users SET password_hash = $1, name = $2 WHERE email = $3',
        [hash, name, email]
      );
      console.log('Fixed logistics user updated:', email);
    } else {
      await pool.query(
        'INSERT INTO logistics_users (name, email, password_hash) VALUES ($1, $2, $3)',
        [name, email, hash]
      );
      console.log('Fixed logistics user created:', email);
    }
    console.log('Logistics login: ' + email + ' / ' + password);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
