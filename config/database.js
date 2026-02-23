const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const isLocalhost =
  !connectionString ||
  /@localhost(\d*):|@127\.0\.0\.1(\d*):/.test(connectionString);
const useSsl = !isLocalhost;

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
