/**
 * Initialize the database: create fitchef_db if needed, then early_access table.
 * Run from project root: node scripts/init-db.js
 * Requires .env with DATABASE_URL set.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const fs = require('fs');

const sql = fs.readFileSync(require('path').join(__dirname, 'init-db.sql'), 'utf8')
  .replace(/--.*/g, '')
  .replace(/\n\n+/g, '\n')
  .trim();

function getPostgresUrl(url) {
  return url.replace(/\/[^/?]+(\?.*)?$/, '/postgres$1');
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Missing DATABASE_URL in .env');
    process.exit(1);
  }

  const dbName = (url.match(/\/([^/?]+)(?:\?|$)/) || [])[1] || 'fitchef_db';
  if (dbName === 'postgres') {
    console.error('Use a dedicated database name in DATABASE_URL, e.g. .../fitchef_db');
    process.exit(1);
  }
  const postgresUrl = getPostgresUrl(url);

  const poolDefault = new Pool({
    connectionString: postgresUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    const res = await poolDefault.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    if (res.rows.length === 0) {
      await poolDefault.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database "${dbName}" created.`);
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error('Cannot connect to PostgreSQL. Is it running? Check host/port in DATABASE_URL.');
    } else {
      console.error('Error:', err.message);
    }
    await poolDefault.end();
    process.exit(1);
  }
  await poolDefault.end();

  const pool = new Pool({
    connectionString: url,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await pool.query(sql);
    console.log('Database initialized: early_access table ready.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
