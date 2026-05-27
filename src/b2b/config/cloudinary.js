const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// One factory so each upload route can pick its own folder (e.g. 'b2b/logos', 'b2b/signatures').
// transformations keep files small so PDFs that embed them stay snappy.
const buildStorage = (folder) =>
  new CloudinaryStorage({
    cloudinary,
    params: {
      folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 800, height: 800, crop: 'limit' }, { quality: 'auto:good' }],
    },
  });

// 2 MB cap — logos and signatures should never need more than this; rejects accidental large uploads.
const buildUploader = (folder) =>
  multer({
    storage: buildStorage(folder),
    limits: { fileSize: 2 * 1024 * 1024 },
  });

module.exports = { cloudinary, buildUploader };
