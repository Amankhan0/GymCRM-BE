const router = require('express').Router();
const {
  listTrainers,
  getTrainer,
  createTrainer,
  updateTrainer,
  deleteTrainer,
} = require('../controllers/trainer.controller');
const { protect } = require('../../middleware/auth.middleware');
const { allowRoles } = require('../../middleware/role.middleware');

router.use(protect);

router.get('/', listTrainers);
router.get('/:id', getTrainer);
router.post('/', allowRoles('admin'), createTrainer);
router.put('/:id', allowRoles('admin'), updateTrainer);
router.delete('/:id', allowRoles('admin'), deleteTrainer);

module.exports = router;
