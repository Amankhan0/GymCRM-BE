// Single-secret auth for the platform owner. The client sends the password as
// X-Superadmin-Password on every request. Login endpoint is intentionally exempt.
const superadminAuth = (req, res, next) => {
  if (!process.env.SUPERADMIN_PASSWORD) {
    return res
      .status(500)
      .json({ success: false, message: 'SUPERADMIN_PASSWORD env var is not configured' });
  }
  const provided = req.headers['x-superadmin-password'];
  if (provided !== process.env.SUPERADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

module.exports = { superadminAuth };
