const earlyAccessModel = require('../models/earlyAccessModel');
const pool = require('../config/database');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  return trimmed.length > 0 && EMAIL_REGEX.test(trimmed);
}

async function postEarlyAccess(req, res) {
  try {
    const { email } = req.body;

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const row = await earlyAccessModel.createEarlyAccess(normalizedEmail);

      // Sync to admin_leads so the form appears in the admin dashboard
      try {
        await pool.query(
          `INSERT INTO admin_leads (email, source, status) VALUES ($1, 'early_access', 'new')`,
          [normalizedEmail]
        );
      } catch (leadErr) {
        if (leadErr.code !== '42P01') console.error('Admin leads sync:', leadErr.message);
      }
      // Sync to admin_customers so they appear in Customers list
      try {
        await pool.query(
          `INSERT INTO admin_customers (email, full_name, phone, city, source)
           VALUES ($1, NULL, NULL, NULL, 'early_access')`,
          [normalizedEmail]
        );
      } catch (custErr) {
        if (custErr.code !== '42P01') console.error('Admin customers sync:', custErr.message);
      }

      return res.status(201).json({
        success: true,
        message: "You're on the list. Welcome to refined wellness.",
        data: { id: row.id, email: row.email, created_at: row.created_at },
      });
    } catch (dbError) {
      if (dbError.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'This email is already on the list. Welcome back!',
        });
      }
      throw dbError;
    }
  } catch (err) {
    console.error('Early access error:', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
    });
  }
}

module.exports = {
  postEarlyAccess,
};
