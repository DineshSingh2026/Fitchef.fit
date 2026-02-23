require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'init-admin.sql'), 'utf8');
  await pool.query(sql);
  console.log('Admin schema initialized.');
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
