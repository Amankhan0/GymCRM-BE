// Enforces that the authenticated user belongs to the expected product. Prevents a gym user's
// JWT from hitting a b2b endpoint (and vice versa) — defence-in-depth on top of route mounting.
const requireProduct = (product) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  if (req.user.product !== product) {
    return res.status(403).json({
      success: false,
      message: `Forbidden — this endpoint is for ${product} users only.`,
    });
  }
  next();
};

module.exports = { requireProduct };
