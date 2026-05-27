const router = require('express').Router();
const {
  login,
  getStats,
  listUsers,
  listRequests,
  approveRequest,
  rejectRequest,
} = require('../controllers/superadmin.controller');
const { superadminAuth } = require('../middleware/superadmin.middleware');
const { superLoginLimiter } = require('../middleware/rateLimit.middleware');

// Login is rate-limited (5 / 15 min / IP) since the password is the only auth factor.
router.post('/login', superLoginLimiter, login);

router.use(superadminAuth);

router.get('/stats', getStats);
router.get('/users', listUsers);
router.get('/payment-requests', listRequests);
router.post('/payment-requests/:id/approve', approveRequest);
router.post('/payment-requests/:id/reject', rejectRequest);

module.exports = router;
