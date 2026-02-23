-- Run this in your PostgreSQL database (local or Render) to create the early_access table.
-- Example: psql $DATABASE_URL -f scripts/init-db.sql

CREATE TABLE IF NOT EXISTS early_access (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_early_access_email ON early_access(email);
