const router = require('express').Router();
const {
  listProducts, getProduct, createProduct, updateProduct, deleteProduct,
} = require('../controllers/product.controller');

router.get('/', listProducts);
router.post('/', createProduct);
router.get('/:id', getProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
