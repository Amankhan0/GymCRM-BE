// Single mount point for all b2b sub-routes. Guards applied centrally so individual route
// files can stay simple (just GET/POST/etc, no middleware boilerplate per file).
const router = require('express').Router();
const { protect } = require('../../middleware/auth.middleware');
const { requireActiveSubscription } = require('../../middleware/subscription.middleware');
const { requireProduct } = require('../middleware/productGuard.middleware');

// Auth routes (signup, login, me) — manage their own guarding internally so unauth signup works.
router.use('/auth', require('./auth.routes'));

// Data routes — every endpoint requires a logged-in b2b user with an active trial / subscription.
const dataGate = [protect, requireProduct('b2b'), requireActiveSubscription];
router.use('/upload',    dataGate, require('./upload.routes'));
router.use('/customers', dataGate, require('./customer.routes'));
router.use('/suppliers', dataGate, require('./supplier.routes'));
router.use('/products',  dataGate, require('./product.routes'));

// Future Phase 3+:
// router.use('/leads',            dataGate, require('./lead.routes'));
// router.use('/quotations',       dataGate, require('./quotation.routes'));
// router.use('/orders',           dataGate, require('./order.routes'));
// router.use('/proforma-invoices',dataGate, require('./proformaInvoice.routes'));
// router.use('/purchase-orders',  dataGate, require('./purchaseOrder.routes'));
// router.use('/dispatch',         dataGate, require('./dispatch.routes'));
// router.use('/invoices',         dataGate, require('./invoice.routes'));

module.exports = router;
