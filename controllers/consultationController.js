const consultationModel = require('../models/consultationModel');
const pool = require('../config/database');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUIRED = ['full_name', 'email', 'city'];

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

async function postConsultation(req, res) {
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

    const data = {
      full_name,
      email,
      phone: sanitizeString(body.phone, 20),
      city,
      delivery_frequency: sanitizeString(body.delivery_frequency, 50),
      goals: Array.isArray(body.goals) ? body.goals.filter(Boolean).map(String) : [],
      age: parseNumber(body.age),
      gender: sanitizeString(body.gender, 20),
      height: body.height != null && body.height !== '' ? parseInt(body.height, 10) : null,
      weight: body.weight != null && body.weight !== '' ? parseInt(body.weight, 10) : null,
      activity_level: sanitizeString(body.activity_level, 50),
      diet_type: sanitizeString(body.diet_type, 50),
      allergies: body.allergies != null ? String(body.allergies).trim() : null,
      spice_preference: sanitizeString(body.spice_preference, 20),
      start_timeline: sanitizeString(body.start_timeline, 50),
    };

    if (data.height != null && (isNaN(data.height) || data.height < 0)) data.height = null;
    if (data.weight != null && (isNaN(data.weight) || data.weight < 0)) data.weight = null;
    if (data.age != null && (isNaN(data.age) || data.age < 0 || data.age > 150)) data.age = null;

    const row = await consultationModel.create(data);

    // Sync to admin_leads so the form appears in the admin dashboard
    try {
      await pool.query(
        `INSERT INTO admin_leads (email, full_name, source, status)
         VALUES ($1, $2, 'consultation', 'new')`,
        [data.email, data.full_name]
      );
    } catch (leadErr) {
      // admin_leads may not exist yet; don't fail the form submission
      if (leadErr.code !== '42P01') console.error('Admin leads sync:', leadErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Consultation submitted successfully',
      data: { id: row.id },
    });
  } catch (err) {
    console.error('Consultation error:', err);
    let message = 'Something went wrong. Please try again later.';
    if (err.code === '42P01') {
      message = 'Service is being set up. Please try again in a moment or contact support.';
    } else if (process.env.NODE_ENV !== 'production' && err.message) {
      message = err.message;
    }
    return res.status(500).json({
      success: false,
      message,
    });
  }
}

module.exports = { postConsultation };
