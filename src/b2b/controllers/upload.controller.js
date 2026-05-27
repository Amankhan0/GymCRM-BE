const Company = require('../models/Company');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const { cloudinary } = require('../config/cloudinary');

// Extract the Cloudinary public_id from a secure_url so we can delete the old asset before
// replacing it. e.g. https://res.cloudinary.com/dhupcdxgz/image/upload/v123/b2b/logos/abc.jpg
// -> b2b/logos/abc
const publicIdFromUrl = (url) => {
  if (!url) return null;
  const m = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z]+)?$/);
  return m ? m[1] : null;
};

// POST /api/b2b/upload/logo  — multer + cloudinary-storage put the file on Cloudinary;
// here we just persist the secure URL on the user's company and delete the old logo if any.
const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const company = await Company.findById(req.user.company);
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

  const old = publicIdFromUrl(company.logoUrl);
  company.logoUrl = req.file.path; // Cloudinary returns secure_url in .path
  await company.save();

  // Old asset cleanup is best-effort — we don't fail the request if Cloudinary delete errors.
  if (old) cloudinary.uploader.destroy(old).catch(() => {});

  return success(res, { logoUrl: company.logoUrl }, 'Logo updated');
});

// POST /api/b2b/upload/signature
const uploadSignature = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const company = await Company.findById(req.user.company);
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

  const old = publicIdFromUrl(company.signatureUrl);
  company.signatureUrl = req.file.path;
  await company.save();

  if (old) cloudinary.uploader.destroy(old).catch(() => {});

  return success(res, { signatureUrl: company.signatureUrl }, 'Signature updated');
});

module.exports = { uploadLogo, uploadSignature };
