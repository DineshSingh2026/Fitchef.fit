/**
 * Create or reset the fixed FitChef chef account in the DB.
 * Usage: node scripts/seed-chef.js
 * Default credentials: chef@fitchef.fit / Chef@123
 * Override with INITIAL_CHEF_EMAIL, INITIAL_CHEF_PASSWORD, INITIAL_CHEF_NAME
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const pool = require('../config/database');

const email = process.env.INITIAL_CHEF_EMAIL || 'chef@fitchef.fit';
const password = process.env.INITIAL_CHEF_PASSWORD || 'Chef@123';
const name = process.env.INITIAL_CHEF_NAME || 'FitChef Chef';

function loadSql(name) {
  const file = path.join(__dirname, name);
  return fs.readFileSync(file, 'utf8').replace(/--[^\n]*/g, '').replace(/\n\n+/g, '\n').trim();
}

async function ensureChefTable() {
  try {
    await pool.query(loadSql('init-chef-dashboard.sql'));
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
    await ensureChefTable();
    const hash = await bcrypt.hash(password, 10);
    const existing = await pool.query('SELECT id FROM chefs WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE chefs SET password_hash = $1, name = $2, updated_at = CURRENT_TIMESTAMP WHERE email = $3',
        [hash, name, email]
      );
      console.log('Fixed chef updated:', email);
    } else {
      await pool.query(
        'INSERT INTO chefs (name, email, password_hash, mobile, address) VALUES ($1, $2, $3, $4, $5)',
        [name, email, hash, '', '']
      );
      console.log('Fixed chef created:', email);
    }
    console.log('Chef login: ' + email + ' / ' + password);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
