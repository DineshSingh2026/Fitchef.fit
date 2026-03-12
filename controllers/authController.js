const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AdminUser = require('../models/AdminUser');
const Chef = require('../models/Chef');
const LogisticsUser = require('../models/LogisticsUser');
const { JWT_SECRET } = require('../middleware/auth');

function sanitizeString(val, maxLen) {
  if (val == null) return null;
  const s = String(val).trim();
  return s === '' ? null : s.slice(0, maxLen);
}

async function signup(req, res) {
  try {
    const { email, password, confirm_password, full_name, phone, city } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'Email, password and full name are required.' });
    }
    if (password !== confirm_password) {
      return res.status(400).json({ success: false, message: 'Password and confirm password do not match.' });
    }
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = full_name.trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({ success: false, message: 'Please enter your full name.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    const phoneDigits = (phone != null ? String(phone).replace(/\D/g, '') : '');
    if (!phoneDigits || phoneDigits.length < 10) {
      return res.status(400).json({ success: false, message: 'A valid mobile number (10–15 digits) is required.' });
    }
    if (phoneDigits.length > 15) {
      return res.status(400).json({ success: false, message: 'Please provide a valid mobile number (10–15 digits).' });
    }
    const existing = await User.findByEmail(trimmedEmail);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({
      email: trimmedEmail,
      passwordHash,
      fullName: trimmedName,
      phone: phoneDigits.slice(0, 20),
      city: sanitizeString(city, 100),
      status: 'pending',
    });
    res.status(201).json({
      success: true,
      message: 'Signup successful. Your account is waiting for admin approval.',
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Sign up failed. Please try again.' });
  }
}

async function signin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    const trimmedEmail = email.trim().toLowerCase();

    // 1) Admin login (role from record, e.g. admin / superadmin)
    const admin = await AdminUser.findByEmail(trimmedEmail);
    if (admin) {
      const matchAdmin = await bcrypt.compare(password, admin.password_hash);
      if (!matchAdmin) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }
      const adminRole = admin.role || 'admin';
      const adminToken = jwt.sign(
        { id: admin.id, email: admin.email, role: adminRole },
        JWT_SECRET,
        { expiresIn: '90d' }
      );
      return res.json({
        success: true,
        message: 'Signed in successfully.',
        role: adminRole,
        token: adminToken,
        user: { id: admin.id, email: admin.email, full_name: admin.full_name, role: adminRole },
      });
    }

    // 2) Chef login
    const chef = await Chef.findByEmail(trimmedEmail);
    if (chef) {
      const matchChef = await bcrypt.compare(password, chef.password_hash);
      if (!matchChef) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }
      const chefToken = jwt.sign(
        { id: chef.id, email: chef.email, role: 'chef' },
        JWT_SECRET,
        { expiresIn: '90d' }
      );
      return res.json({
        success: true,
        message: 'Signed in successfully.',
        role: 'chef',
        token: chefToken,
        user: { id: chef.id, email: chef.email, name: chef.name, role: 'chef' },
      });
    }

    // 3) Logistics login
    const logisticsUser = await LogisticsUser.findByEmail(trimmedEmail);
    if (logisticsUser) {
      const matchLogistics = await bcrypt.compare(password, logisticsUser.password_hash);
      if (!matchLogistics) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }
      const logisticsToken = jwt.sign(
        { id: logisticsUser.id, email: logisticsUser.email, role: 'logistics' },
        JWT_SECRET,
        { expiresIn: '90d' }
      );
      return res.json({
        success: true,
        message: 'Signed in successfully.',
        role: 'logistics',
        token: logisticsToken,
        user: { id: logisticsUser.id, email: logisticsUser.email, name: logisticsUser.name, role: 'logistics' },
      });
    }

    // 4) Regular user login (existing behavior)
    const user = await User.findByEmail(trimmedEmail);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    if (user.status !== 'approved') {
      if (user.status === 'rejected') {
        return res.status(403).json({ success: false, message: 'Your account has been rejected. Please contact support.' });
      }
      return res.status(403).json({ success: false, message: 'Your account is pending admin approval. You will be able to sign in once approved.' });
    }
    const matchUser = await bcrypt.compare(password, user.password_hash);
    if (!matchUser) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    const userToken = jwt.sign(
      { id: user.id, email: user.email, role: 'user' },
      JWT_SECRET,
      { expiresIn: '90d' }
    );
    return res.json({
      success: true,
      message: 'Signed in successfully.',
      role: 'user',
      token: userToken,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: 'user' },
    });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ success: false, message: 'Sign in failed. Please try again.' });
  }
}

module.exports = { signup, signin };
