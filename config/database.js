const { Pool } = require('pg');

let poolConfig;
const connectionString = process.env.DATABASE_URL;
const explicitPassword = process.env.DATABASE_PASSWORD;

// Use explicit password when set (avoids URL encoding issues with @, etc.)
if (connectionString && explicitPassword) {
  try {
    const url = new URL(connectionString.replace('postgresql://', 'https://'));
    poolConfig = {
      user: url.username || 'postgres',
      password: explicitPassword,
      host: url.hostname || '127.0.0.1',
      port: parseInt(url.port || '5432', 10),
      database: (url.pathname || '/postgres').replace(/^\//, '') || 'postgres',
      ssl: /@localhost|@127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false },
    };
  } catch (e) {
    poolConfig = { connectionString, ssl: false };
  }
} else {
  const isLocalhost =
    !connectionString ||
    /@localhost(\d*):|@127\.0\.0\.1(\d*):/.test(connectionString);
  poolConfig = {
    connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Database pool error:', err.message);
});

module.exports = pool;
