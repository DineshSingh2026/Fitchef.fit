const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const LogisticsUser = require('../../models/LogisticsUser');
const { JWT_SECRET } = require('../../middleware/auth');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const user = await LogisticsUser.findByEmail(email.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: 'logistics' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error('Logistics login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
}

module.exports = { login };
