const fs = require('fs');
const path = require('path');
const os = require('os');
const consultationModel = require('../models/consultationModel');
const pool = require('../config/database');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10,15}$/;

const CREATE_CONSULTATIONS_SQL = `
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
`;

function validateEmail(email) {
  return email && typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

function sanitizeString(val, maxLen) {
  if (val == null) return null;
  const s = String(val).trim();
  return s === '' ? null : s.slice(0, maxLen);
}

function parseNumber(val) {
  if (val === '' || val == null) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function saveToFallbackFile(data) {
  try {
    const dir = process.env.CONSULTATIONS_FALLBACK_DIR || os.tmpdir();
    const file = path.join(dir, 'fitchef_consultations.jsonl');
    const line = JSON.stringify({ ...data, _at: new Date().toISOString() }) + '\n';
    fs.appendFileSync(file, line);
    console.log('Consultation saved to fallback file:', file);
  } catch (e) {
    console.error('Fallback file write failed:', e.message);
  }
}

async function postConsultation(req, res) {
  let data;
  try {
    const body = req.body || {};

    const full_name = sanitizeString(body.full_name, 150);
    const email = body.email ? body.email.trim().toLowerCase() : '';
    const city = sanitizeString(body.city, 100);

    if (!full_name) {
      return res.status(400).json({
        success: false,
        message: 'Full name is required.',
      });
    }
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.',
      });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }
    if (!city) {
      return res.status(400).json({
        success: false,
        message: 'City is required.',
      });
    }

    const phoneRaw = body.phone != null ? String(body.phone).replace(/\D/g, '') : '';
    if (!phoneRaw || phoneRaw.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'A valid mobile number (10–15 digits) is required.',
      });
    }
    if (!PHONE_REGEX.test(phoneRaw)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid mobile number (10–15 digits).',
      });
    }

    const delivery_frequency = sanitizeString(body.delivery_frequency, 50);
    if (!delivery_frequency) {
      return res.status(400).json({
        success: false,
        message: 'Delivery frequency is required.',
      });
    }

    const goals = Array.isArray(body.goals) ? body.goals.filter(Boolean).map(String) : [];
    if (goals.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one goal.',
      });
    }

    const age = parseNumber(body.age);
    if (age == null || age < 1 || age > 120) {
      return res.status(400).json({
        success: false,
        message: 'A valid age (1–120) is required.',
      });
    }

    const gender = sanitizeString(body.gender, 20);
    if (!gender) {
      return res.status(400).json({
        success: false,
        message: 'Gender is required.',
      });
    }

    const heightVal = body.height != null && body.height !== '' ? parseInt(body.height, 10) : null;
    if (heightVal == null || isNaN(heightVal) || heightVal < 50 || heightVal > 250) {
      return res.status(400).json({
        success: false,
        message: 'A valid height (50–250 cm) is required.',
      });
    }

    const weightVal = body.weight != null && body.weight !== '' ? parseFloat(body.weight) : null;
    if (weightVal == null || isNaN(weightVal) || weightVal < 20 || weightVal > 300) {
      return res.status(400).json({
        success: false,
        message: 'A valid weight (20–300 kg) is required.',
      });
    }

    const activity_level = sanitizeString(body.activity_level, 50);
    if (!activity_level) {
      return res.status(400).json({
        success: false,
        message: 'Activity level is required.',
      });
    }

    const diet_type = sanitizeString(body.diet_type, 50);
    if (!diet_type) {
      return res.status(400).json({
        success: false,
        message: 'Diet type is required.',
      });
    }

    const spice_preference = sanitizeString(body.spice_preference, 20);
    if (!spice_preference) {
      return res.status(400).json({
        success: false,
        message: 'Spice preference is required.',
      });
    }

    const start_timeline = sanitizeString(body.start_timeline, 50);
    if (!start_timeline) {
      return res.status(400).json({
        success: false,
        message: 'Start timeline is required.',
      });
    }

    data = {
      full_name,
      email,
      phone: phoneRaw.slice(0, 20),
      city,
      delivery_frequency,
      goals,
      age,
      gender,
      height: heightVal,
      weight: weightVal,
      activity_level,
      diet_type,
      allergies: body.allergies != null ? String(body.allergies).trim() : null,
      spice_preference,
      start_timeline,
    };

    let row = null;
    try {
      row = await consultationModel.create(data);
    } catch (dbErr) {
      if (dbErr.code === '42P01') {
        try {
          await pool.query(CREATE_CONSULTATIONS_SQL);
          row = await consultationModel.create(data);
        } catch (retryErr) {
          console.error('Consultation create after table create:', retryErr);
          saveToFallbackFile(data);
          return res.status(201).json({
            success: true,
            message: 'Consultation submitted successfully. We have received your details.',
            data: { id: 'saved' },
          });
        }
      } else {
        throw dbErr;
      }
    }

    try {
      await pool.query(
        `INSERT INTO admin_leads (email, full_name, source, status)
         VALUES ($1, $2, 'consultation', 'new')`,
        [data.email, data.full_name]
      );
    } catch (leadErr) {
      if (leadErr.code !== '42P01') console.error('Admin leads sync:', leadErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Consultation submitted successfully',
      data: { id: row.id },
    });
  } catch (err) {
    console.error('Consultation error:', err);
    if (data) {
      saveToFallbackFile(data);
      return res.status(201).json({
        success: true,
        message: 'Thank you. We have received your details and will be in touch.',
        data: { id: 'saved' },
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
    });
  }
}

module.exports = { postConsultation };
