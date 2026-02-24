const User = require('../../models/User');

async function list(req, res) {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const rows = await User.findPending(limit);
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    console.error('Pending signups list error:', err);
    res.status(500).json({ error: 'Failed to load pending signups' });
  }
}

async function getOne(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'Signup not found' });
    if (!user.status || user.status.toLowerCase().trim() !== 'pending') return res.status(400).json({ error: 'Signup is no longer pending' });
    res.json(user);
  } catch (err) {
    console.error('Pending signup get error:', err);
    res.status(500).json({ error: 'Failed to load signup' });
  }
}

async function approve(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const updated = await User.updateStatus(id, 'approved');
    if (!updated) return res.status(404).json({ error: 'Pending signup not found or already processed' });
    res.json({ success: true, message: 'Signup approved.', user: updated });
  } catch (err) {
    console.error('Approve signup error:', err);
    res.status(500).json({ error: 'Failed to approve' });
  }
}

async function reject(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const updated = await User.updateStatus(id, 'rejected');
    if (!updated) return res.status(404).json({ error: 'Pending signup not found or already processed' });
    res.json({ success: true, message: 'Signup rejected.', user: updated });
  } catch (err) {
    console.error('Reject signup error:', err);
    res.status(500).json({ error: 'Failed to reject' });
  }
}

module.exports = { list, getOne, approve, reject };
