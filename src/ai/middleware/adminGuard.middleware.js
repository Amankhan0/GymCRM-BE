const { ADMIN_EMAIL } = require('../controllers/auth.controller');

// Only the platform owner (the admin account) may review/approve AI payments. Apply AFTER
// `protect` + `requireProduct('ai')` so req.user is a logged-in AI user.
const requireAiAdmin = (req, res, next) => {
  if (!req.user || req.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ success: false, message: 'Admin access only' });
  }
  next();
};

module.exports = { requireAiAdmin };
