// Restrict a route to certain roles. Usage: router.get('/x', protect, allowRoles('admin'), handler)
const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: `Role '${req.user.role}' is not allowed` });
    }
    next();
  };
};

module.exports = { allowRoles };
