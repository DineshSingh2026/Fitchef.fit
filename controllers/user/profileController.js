const User = require('../../models/User');

async function getProfile(req, res) {
  try {
    const profile = await User.getProfileById(req.user.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
}

async function updateProfile(req, res) {
  try {
    const body = req.body || {};
    const profile = await User.updateProfile(req.user.id, {
      full_name: body.full_name,
      phone: body.phone,
      city: body.city,
      gender: body.gender,
      date_of_birth: body.date_of_birth || null,
      address_line1: body.address_line1,
      address_line2: body.address_line2,
      state: body.state,
      pincode: body.pincode,
      delivery_instructions: body.delivery_instructions,
      height: body.height != null ? Number(body.height) : undefined,
      weight: body.weight != null ? Number(body.weight) : undefined,
      target_weight: body.target_weight != null ? Number(body.target_weight) : undefined,
      fitness_goal: body.fitness_goal,
      dietary_preference: body.dietary_preference,
      allergies: body.allergies,
      protein_target: body.protein_target != null ? Number(body.protein_target) : undefined,
    });
    res.json(profile);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

module.exports = { getProfile, updateProfile };
