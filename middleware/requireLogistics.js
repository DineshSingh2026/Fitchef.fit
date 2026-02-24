/**
 * Require logistics role (role === 'logistics'). Use after authenticate middleware.
 */
function requireLogistics(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'logistics') {
    return res.status(403).json({ error: 'Logistics access required' });
  }
  next();
}

module.exports = { requireLogistics };
