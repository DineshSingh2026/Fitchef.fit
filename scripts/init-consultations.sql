-- Consultations table for Personalized Nutrition Concierge
-- Run: psql $DATABASE_URL -f scripts/init-consultations.sql

CREATE TABLE IF NOT EXISTS consultations (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  city VARCHAR(100) NOT NULL,
  delivery_frequency VARCHAR(50),
  goals TEXT[],
  age INTEGER,
  gender VARCHAR(20),
  height INTEGER,
  weight INTEGER,
  activity_level VARCHAR(50),
  diet_type VARCHAR(50),
  allergies TEXT,
  spice_preference VARCHAR(20),
  start_timeline VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consultations_email ON consultations(email);
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON consultations(created_at);
