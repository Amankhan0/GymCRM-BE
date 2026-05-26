const router = require('express').Router();
const {
  listPayments,
  createPayment,
  updatePayment,
  deletePayment,
} = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');

router.use(protect);

router.get('/', listPayments);
router.post('/', allowRoles('admin'), createPayment);
router.put('/:id', allowRoles('admin'), updatePayment);
router.delete('/:id', allowRoles('admin'), deletePayment);

module.exports = router;
