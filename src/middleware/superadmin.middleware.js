const jwt = require('jsonwebtoken');

// Super-admin requests must carry a short-lived JWT issued by POST /api/superadmin/login.
// The token's `role` claim must be `superadmin`.
const superadminAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (payload.role !== 'superadmin') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

module.exports = { superadminAuth };
