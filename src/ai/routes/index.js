// Single mount point for all AI-product routes (mounted at /api/ai in app.js).
const router = require('express').Router();
const { protect } = require('../../middleware/auth.middleware');
const { requireProduct } = require('../middleware/productGuard.middleware');
const { requireAiAdmin } = require('../middleware/adminGuard.middleware');
const { paymentSubmitLimiter } = require('../../middleware/rateLimit.middleware');

const {
  generateImage,
  generateVideo,
  listGenerations,
  deleteGeneration,
} = require('../controllers/generate.controller');
const { listPlans, mySubscription, submitRequest } = require('../controllers/account.controller');
const {
  getStats,
  listRequests,
  approveRequest,
  rejectRequest,
} = require('../controllers/admin.controller');

// Auth (signup, login, google, me) — manages its own guarding so unauth signup/login works.
router.use('/auth', require('./auth.routes'));

// Public pricing + UPI info.
router.get('/plans', listPlans);

// Logged-in AI user. Credit/plan gating happens inside controllers (credit-based, not trial-based).
const gate = [protect, requireProduct('ai')];
router.post('/generate/image', gate, generateImage);
router.post('/generate/video', gate, generateVideo);
router.get('/generations', gate, listGenerations);
router.delete('/generations/:id', gate, deleteGeneration);

// Subscription = manual UPI + owner approval (NO instant access). Credits granted on approval.
router.get('/subscription/me', gate, mySubscription);
router.post('/subscription/request', gate, paymentSubmitLimiter, submitRequest);

// Owner-only admin: review & approve/reject payment requests.
const adminGate = [protect, requireProduct('ai'), requireAiAdmin];
router.get('/admin/stats', adminGate, getStats);
router.get('/admin/payment-requests', adminGate, listRequests);
router.post('/admin/payment-requests/:id/approve', adminGate, approveRequest);
router.post('/admin/payment-requests/:id/reject', adminGate, rejectRequest);

module.exports = router;
