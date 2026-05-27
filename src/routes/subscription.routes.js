const router = require('express').Router();
const { listPlans, myStatus, submitRequest } = require('../controllers/subscription.controller');
const { protect } = require('../middleware/auth.middleware');
const { paymentSubmitLimiter } = require('../middleware/rateLimit.middleware');

// All subscription routes require a logged-in user but do NOT require an active subscription —
// otherwise a user with expired access couldn't pay to renew.
router.use(protect);

router.get('/plans', listPlans);
router.get('/me', myStatus);
router.post('/request', paymentSubmitLimiter, submitRequest);

module.exports = router;
