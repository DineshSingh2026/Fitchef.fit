-- FitChef Dishes (chef-designed meals)
-- Run via ensureDb or: psql $DATABASE_URL -f scripts/init-dishes.sql

CREATE TABLE IF NOT EXISTS dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  tags TEXT,
  image_url VARCHAR(500),
  calories INTEGER,
  protein DECIMAL(8, 2),
  carbs DECIMAL(8, 2),
  fats DECIMAL(8, 2),
  fiber DECIMAL(8, 2),
  sugar DECIMAL(8, 2),
  sodium DECIMAL(10, 2),
  ingredients TEXT,
  allergens TEXT,
  benefits TEXT,
  base_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount_price DECIMAL(10, 2),
  portion_size INTEGER,
  subscription_eligible BOOLEAN DEFAULT false,
  available BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  chef_id INTEGER REFERENCES admin_chefs(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dishes_category ON dishes(category);
CREATE INDEX IF NOT EXISTS idx_dishes_available ON dishes(available);
CREATE INDEX IF NOT EXISTS idx_dishes_featured ON dishes(featured);
CREATE INDEX IF NOT EXISTS idx_dishes_chef ON dishes(chef_id);
CREATE INDEX IF NOT EXISTS idx_dishes_created_at ON dishes(created_at);
