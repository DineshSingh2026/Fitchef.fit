-- User profile columns (site_users)
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(200);
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(200);
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS height INTEGER;
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS weight DECIMAL(6, 2);
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS target_weight DECIMAL(6, 2);
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS fitness_goal VARCHAR(50);
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS dietary_preference VARCHAR(50);
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS protein_target INTEGER;
ALTER TABLE site_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- User orders (customer orders from user dashboard)
CREATE TABLE IF NOT EXISTS user_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES site_users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'Preparing',
  payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_orders_user ON user_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_orders_created ON user_orders(created_at DESC);

CREATE TABLE IF NOT EXISTS user_order_items (
  id SERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES user_orders(id) ON DELETE CASCADE,
  dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10, 2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_order_items_order ON user_order_items(order_id);

-- User feedback
CREATE TABLE IF NOT EXISTS user_feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES site_users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES user_orders(id) ON DELETE CASCADE,
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  food_rating INTEGER NOT NULL CHECK (food_rating >= 1 AND food_rating <= 5),
  delivery_rating INTEGER NOT NULL CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  recommend BOOLEAN NOT NULL DEFAULT true,
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user ON user_feedback(user_id);

-- Support tickets
CREATE TABLE IF NOT EXISTS user_support_tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES site_users(id) ON DELETE CASCADE,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
  status VARCHAR(30) NOT NULL DEFAULT 'Open',
  attachment_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_support_user ON user_support_tickets(user_id);

-- User notifications (e.g. order confirmed by admin)
CREATE TABLE IF NOT EXISTS user_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES site_users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES user_orders(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(read_at);
