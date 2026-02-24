const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Chef = require('../../models/Chef');
const { JWT_SECRET } = require('../../middleware/auth');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const chef = await Chef.findByEmail(email.trim().toLowerCase());
    if (!chef) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const match = await bcrypt.compare(password, chef.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { id: chef.id, email: chef.email, role: 'chef' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      chef: { id: chef.id, email: chef.email, name: chef.name },
    });
  } catch (err) {
    console.error('Chef login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
}

module.exports = { login };
