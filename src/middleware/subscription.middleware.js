// Apply AFTER `protect` so req.user is available. Returns 402 when the user has no access —
// the client sees 402 and routes them to the "subscription required" page.
const requireActiveSubscription = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  if (!req.user.hasAccess || !req.user.hasAccess()) {
    return res.status(402).json({
      success: false,
      message: 'Trial expired — please subscribe to continue using the panel.',
      code: 'SUBSCRIPTION_REQUIRED',
    });
  }
  next();
};

module.exports = { requireActiveSubscription };
