const router = require('express').Router();
const {
  listSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier,
} = require('../controllers/supplier.controller');

router.get('/', listSuppliers);
router.post('/', createSupplier);
router.get('/:id', getSupplier);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);

module.exports = router;
