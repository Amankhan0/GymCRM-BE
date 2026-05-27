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

// Login is the only unauthenticated route — it's what gives the caller the password to use.
router.post('/login', login);

router.use(superadminAuth);

router.get('/stats', getStats);
router.get('/users', listUsers);
router.get('/payment-requests', listRequests);
router.post('/payment-requests/:id/approve', approveRequest);
router.post('/payment-requests/:id/reject', rejectRequest);

module.exports = router;
