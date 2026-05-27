const router = require('express').Router();
const { signup, login, me } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { loginLimiter, signupLimiter } = require('../middleware/rateLimit.middleware');

router.post('/signup', signupLimiter, signup);
router.post('/login', loginLimiter, login);
router.get('/me', protect, me);

module.exports = router;
