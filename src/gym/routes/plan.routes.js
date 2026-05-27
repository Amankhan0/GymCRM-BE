const router = require('express').Router();
const {
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
} = require('../controllers/plan.controller');
const { protect } = require('../../middleware/auth.middleware');
const { allowRoles } = require('../../middleware/role.middleware');

router.use(protect);

router.get('/', listPlans);
router.get('/:id', getPlan);
router.post('/', allowRoles('admin'), createPlan);
router.put('/:id', allowRoles('admin'), updatePlan);
router.delete('/:id', allowRoles('admin'), deletePlan);

module.exports = router;
