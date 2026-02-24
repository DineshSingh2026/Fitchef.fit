/**
 * Require chef role (role === 'chef'). Use after authenticate middleware.
 */
function requireChef(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'chef') {
    return res.status(403).json({ error: 'Chef access required' });
  }
  next();
}

module.exports = { requireChef };
