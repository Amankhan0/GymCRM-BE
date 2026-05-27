const router = require('express').Router();
const { uploadLogo, uploadSignature } = require('../controllers/upload.controller');
const { protect } = require('../../middleware/auth.middleware');
const { requireProduct } = require('../middleware/productGuard.middleware');
const { buildUploader } = require('../config/cloudinary');

const logoUploader = buildUploader('b2b/logos');
const signatureUploader = buildUploader('b2b/signatures');

// Auth + product check enforced; only the company owner / authorized admin reaches here.
router.use(protect, requireProduct('b2b'));

router.post('/logo', logoUploader.single('file'), uploadLogo);
router.post('/signature', signatureUploader.single('file'), uploadSignature);

module.exports = router;
