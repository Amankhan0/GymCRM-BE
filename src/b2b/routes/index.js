// Single mount point for all b2b sub-routes. As we add modules (leads, customers, products,
// quotations, orders, dispatch, invoices, etc.) they get plugged in here so app.js stays clean.
const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/upload', require('./upload.routes'));

// Future:
// router.use('/leads', require('./leads.routes'));
// router.use('/customers', require('./customers.routes'));
// router.use('/products', require('./products.routes'));
// router.use('/quotations', require('./quotations.routes'));
// router.use('/orders', require('./orders.routes'));
// router.use('/dispatch', require('./dispatch.routes'));
// router.use('/invoices', require('./invoices.routes'));

module.exports = router;
