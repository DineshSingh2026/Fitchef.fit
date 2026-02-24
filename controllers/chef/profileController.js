const Chef = require('../../models/Chef');

async function getProfile(req, res) {
  try {
    const chef = await Chef.findById(req.user.id);
    if (!chef) return res.status(404).json({ error: 'Profile not found' });
    res.json(chef);
  } catch (err) {
    console.error('Chef get profile error:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
}

async function updateProfile(req, res) {
  try {
    const { name, mobile, address } = req.body || {};
    const updated = await Chef.updateProfile(req.user.id, { name, mobile, address });
    if (!updated) return res.status(404).json({ error: 'Profile not found' });
    res.json(updated);
  } catch (err) {
    console.error('Chef update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

module.exports = { getProfile, updateProfile };
