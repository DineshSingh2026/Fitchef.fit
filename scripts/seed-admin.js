require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../config/database');

const email = process.env.INITIAL_ADMIN_EMAIL || 'admin@fitchef.fit';
const password = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123';
const fullName = process.env.INITIAL_ADMIN_NAME || 'FitChef Admin';

async function seed() {
  try {
    const existing = await pool.query('SELECT id FROM admin_users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log('Admin user already exists:', email);
      process.exit(0);
      return;
    }
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO admin_users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4)',
      [email, hash, fullName, 'admin']
    );
    console.log('Admin user created:', email);
    console.log('Login with:', email, '/', password);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
