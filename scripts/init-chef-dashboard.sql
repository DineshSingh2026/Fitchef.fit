-- FitChef Chef Dashboard: chefs table (login), user_orders extensions, order notifications
-- Chefs table (separate from admin_chefs for chef login)
CREATE TABLE IF NOT EXISTS chefs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  mobile VARCHAR(20),
  address TEXT,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chefs_email ON chefs(email);

-- user_orders: add chef assignment and delivery fields (safe for chef view)
ALTER TABLE user_orders ADD COLUMN IF NOT EXISTS chef_id INTEGER REFERENCES chefs(id) ON DELETE SET NULL;
ALTER TABLE user_orders ADD COLUMN IF NOT EXISTS admin_approved BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE user_orders ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;
ALTER TABLE user_orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_user_orders_chef ON user_orders(chef_id);
CREATE INDEX IF NOT EXISTS idx_user_orders_status_chef ON user_orders(chef_id, status);

-- Order notifications (chef marks ready -> notify user and admin; no sensitive data)
CREATE TABLE IF NOT EXISTS order_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES site_users(id) ON DELETE SET NULL,
  admin_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES user_orders(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  read_status BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_order_notifications_user ON order_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_order_notifications_admin ON order_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_order_notifications_order ON order_notifications(order_id);
