-- FitChef Admin Dashboard - Database Schema
-- Run: psql $DATABASE_URL -f scripts/init-admin.sql

-- Admin users (login)
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- Customers (from early_access / consultations or manual)
CREATE TABLE IF NOT EXISTS admin_customers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(150) NOT NULL,
  full_name VARCHAR(150),
  phone VARCHAR(20),
  city VARCHAR(100),
  source VARCHAR(50) DEFAULT 'website',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_customers_email ON admin_customers(email);
CREATE INDEX IF NOT EXISTS idx_admin_customers_created_at ON admin_customers(created_at);

-- Chefs
CREATE TABLE IF NOT EXISTS admin_chefs (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  speciality VARCHAR(100),
  status VARCHAR(30) DEFAULT 'active',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_chefs_status ON admin_chefs(status);
CREATE INDEX IF NOT EXISTS idx_admin_chefs_email ON admin_chefs(email);

-- Orders
CREATE TABLE IF NOT EXISTS admin_orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES admin_customers(id) ON DELETE SET NULL,
  chef_id INTEGER REFERENCES admin_chefs(id) ON DELETE SET NULL,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(30) DEFAULT 'pending',
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_orders_customer ON admin_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_admin_orders_chef ON admin_orders(chef_id);
CREATE INDEX IF NOT EXISTS idx_admin_orders_status ON admin_orders(status);
CREATE INDEX IF NOT EXISTS idx_admin_orders_order_date ON admin_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_admin_orders_created_at ON admin_orders(created_at);

-- Deliveries (logistics)
CREATE TABLE IF NOT EXISTS admin_deliveries (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES admin_orders(id) ON DELETE CASCADE,
  status VARCHAR(30) DEFAULT 'scheduled',
  driver_name VARCHAR(100),
  driver_phone VARCHAR(20),
  estimated_at TIMESTAMP,
  delivered_at TIMESTAMP,
  tracking_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_deliveries_order ON admin_deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_admin_deliveries_status ON admin_deliveries(status);

-- Payments (finance)
CREATE TABLE IF NOT EXISTS admin_payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES admin_orders(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  method VARCHAR(50),
  status VARCHAR(30) DEFAULT 'completed',
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_payments_order ON admin_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_admin_payments_paid_at ON admin_payments(paid_at);

-- Leads (from consultations / early access - synced or manual)
CREATE TABLE IF NOT EXISTS admin_leads (
  id SERIAL PRIMARY KEY,
  email VARCHAR(150) NOT NULL,
  full_name VARCHAR(150),
  source VARCHAR(50) DEFAULT 'consultation',
  status VARCHAR(30) DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_leads_email ON admin_leads(email);
CREATE INDEX IF NOT EXISTS idx_admin_leads_status ON admin_leads(status);
CREATE INDEX IF NOT EXISTS idx_admin_leads_created_at ON admin_leads(created_at);
