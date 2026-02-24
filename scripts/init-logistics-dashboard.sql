-- FitChef Logistics: delivery_agents, logistics_users (login), user_orders extensions
-- Delivery agents (for assignment to orders)
CREATE TABLE IF NOT EXISTS delivery_agents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  vehicle_number VARCHAR(50),
  availability_status VARCHAR(30) NOT NULL DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_delivery_agents_availability ON delivery_agents(availability_status);

-- Logistics team login (separate from admin/chef)
CREATE TABLE IF NOT EXISTS logistics_users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE logistics_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_logistics_users_email ON logistics_users(email);

-- user_orders: logistics and delivery fields
ALTER TABLE user_orders ADD COLUMN IF NOT EXISTS assigned_agent_id INTEGER REFERENCES delivery_agents(id) ON DELETE SET NULL;
ALTER TABLE user_orders ADD COLUMN IF NOT EXISTS delivery_time_slot VARCHAR(100);
ALTER TABLE user_orders ADD COLUMN IF NOT EXISTS kitchen_location VARCHAR(200);
ALTER TABLE user_orders ADD COLUMN IF NOT EXISTS dispatch_time TIMESTAMP;
ALTER TABLE user_orders ADD COLUMN IF NOT EXISTS delivered_time TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_user_orders_assigned_agent ON user_orders(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_user_orders_status_logistics ON user_orders(status);
