const router = require('express').Router();
const { signup, login, me } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, me);

module.exports = router;
