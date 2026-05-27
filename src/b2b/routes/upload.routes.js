const router = require('express').Router();
const { uploadLogo, uploadSignature } = require('../controllers/upload.controller');
const { buildUploader } = require('../config/cloudinary');

const logoUploader = buildUploader('b2b/logos');
const signatureUploader = buildUploader('b2b/signatures');

// Auth + product + subscription guards applied by parent (b2b/routes/index.js dataGate).
router.post('/logo', logoUploader.single('file'), uploadLogo);
router.post('/signature', signatureUploader.single('file'), uploadSignature);

module.exports = router;
