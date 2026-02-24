/**
 * Require site user role (role === 'user'). Use after authenticate middleware.
 */
function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'user') {
    return res.status(403).json({ error: 'User access required' });
  }
  next();
}

module.exports = { requireUser };
