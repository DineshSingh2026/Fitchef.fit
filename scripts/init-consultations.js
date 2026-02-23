/**
 * Create consultations table. Run: node scripts/init-consultations.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../config/database');
const fs = require('fs');

const sql = fs
  .readFileSync(require('path').join(__dirname, 'init-consultations.sql'), 'utf8')
  .replace(/--.*/g, '')
  .replace(/\n\n+/g, '\n')
  .trim();

pool
  .query(sql)
  .then(() => {
    console.log('Consultations table ready.');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
