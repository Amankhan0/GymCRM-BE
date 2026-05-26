const router = require('express').Router();
const { updateProfile, changePassword } = require('../controllers/profile.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.put('/', updateProfile);
router.put('/password', changePassword);

module.exports = router;
