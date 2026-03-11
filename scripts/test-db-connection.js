/**
 * Test database connection - run: node scripts/test-db-connection.js
 * Use this to verify DATABASE_URL before starting the server.
 */
require('dotenv').config();
const { Pool } = require('pg');

const url = process.env.DATABASE_URL;
const explicitPassword = process.env.DATABASE_PASSWORD;
if (!url) {
  console.error('ERROR: DATABASE_URL is not set in .env');
  process.exit(1);
}

// Check for placeholder values
if (url.includes('@host:') || url.includes('@host/')) {
  console.error('ERROR: DATABASE_URL contains placeholder "host". Use 127.0.0.1 or localhost for local PostgreSQL.');
  process.exit(1);
}

let poolConfig;
if (explicitPassword) {
  try {
    const u = new URL(url.replace('postgresql://', 'https://'));
    poolConfig = {
      user: u.username || 'postgres',
      password: explicitPassword,
      host: u.hostname || '127.0.0.1',
      port: parseInt(u.port || '5432', 10),
      database: (u.pathname || '/postgres').replace(/^\//, '') || 'postgres',
      ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    };
  } catch (e) {
    poolConfig = { connectionString: url, ssl: false, connectionTimeoutMillis: 5000 };
  }
} else {
  poolConfig = {
    connectionString: url,
    ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  };
}

const pool = new Pool(poolConfig);

async function test() {
  try {
    const res = await pool.query('SELECT 1 as ok, current_database() as db');
    console.log('✓ Database connected successfully');
    console.log('  Database:', res.rows[0].db);
    const adminCheck = await pool.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users') as exists");
    if (adminCheck.rows[0].exists) {
      const count = await pool.query('SELECT COUNT(*) as c FROM admin_users');
      console.log('  admin_users table: exists,', count.rows[0].c, 'admin(s)');
    } else {
      console.log('  admin_users table: not found (run server once to auto-create)');
    }
    await pool.end();
  } catch (err) {
    console.error('✗ Connection failed:', err.message);
    if (err.message.includes('password authentication failed')) {
      console.error('\n  → Check your PostgreSQL password in .env (DATABASE_URL)');
    } else if (err.message.includes('ECONNREFUSED') || err.message.includes('connect')) {
      console.error('\n  → Is PostgreSQL running? Start the postgresql service.');
    }
    process.exit(1);
  }
}

test();
