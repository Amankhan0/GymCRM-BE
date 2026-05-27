// Permission gate for b2b 'admin' role. 'superadmin' bypasses all checks (full access).
// 'admin' must have an entry in user.permissions[section][action] set to true.
//
// Usage in routes:
//   router.get('/', can('leads', 'view'), listLeads);
//   router.delete('/:id', can('leads', 'delete'), deleteLead);
const can = (section, action) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  if (req.user.role === 'superadmin') return next();

  const perms = req.user.permissions || {};
  if (perms[section]?.[action]) return next();

  return res.status(403).json({
    success: false,
    message: `You don't have permission to ${action} ${section}.`,
  });
};

module.exports = { can };
