-- FitChef site users (sign up / sign in); status: pending | approved | rejected
CREATE TABLE IF NOT EXISTS site_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  city VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_site_users_email ON site_users(email);
CREATE INDEX IF NOT EXISTS idx_site_users_status ON site_users(status);
