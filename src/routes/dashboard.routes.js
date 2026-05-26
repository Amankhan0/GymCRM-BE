const router = require('express').Router();
const {
  getStats,
  getRevenueChart,
  getAttendanceChart,
} = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/stats', getStats);
router.get('/revenue-chart', getRevenueChart);
router.get('/attendance-chart', getAttendanceChart);

module.exports = router;
