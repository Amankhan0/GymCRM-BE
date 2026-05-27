const router = require('express').Router();
const {
  listMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
} = require('../controllers/member.controller');
const { protect } = require('../../middleware/auth.middleware');
const { allowRoles } = require('../../middleware/role.middleware');

router.use(protect);

router.get('/', listMembers);
router.get('/:id', getMember);
router.post('/', allowRoles('admin'), createMember);
router.put('/:id', allowRoles('admin'), updateMember);
router.delete('/:id', allowRoles('admin'), deleteMember);

module.exports = router;
