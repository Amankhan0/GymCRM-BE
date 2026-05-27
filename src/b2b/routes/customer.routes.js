const router = require('express').Router();
const {
  listCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
} = require('../controllers/customer.controller');

router.get('/', listCustomers);
router.post('/', createCustomer);
router.get('/:id', getCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

module.exports = router;
