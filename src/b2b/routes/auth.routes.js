const router = require('express').Router();
const { signup, login, me } = require('../controllers/auth.controller');
const { protect } = require('../../middleware/auth.middleware');
const { requireProduct } = require('../middleware/productGuard.middleware');
const { loginLimiter, signupLimiter } = require('../../middleware/rateLimit.middleware');

router.post('/signup', signupLimiter, signup);
router.post('/login', loginLimiter, login);
router.get('/me', protect, requireProduct('b2b'), me);

module.exports = router;
