const router = require('express').Router();
const {
  markAttendance,
  listAttendance,
  deleteAttendance,
} = require('../controllers/attendance.controller');
const { protect } = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');

router.use(protect);

router.get('/', listAttendance);
router.post('/', markAttendance);
router.delete('/:id', allowRoles('admin'), deleteAttendance);

module.exports = router;
