const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const SubscriptionPayment = require('../models/SubscriptionPayment');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

// Constant-time string compare. Pads to equal length first to avoid leaking length via timing.
const safeEqual = (a, b) => {
  const max = Math.max(Buffer.byteLength(a), Buffer.byteLength(b));
  const ab = Buffer.alloc(max);
  const bb = Buffer.alloc(max);
  ab.write(a);
  bb.write(b);
  return crypto.timingSafeEqual(ab, bb) && a.length === b.length;
};

// POST /api/superadmin/login  — password-only login (the only super-admin is the platform owner).
// On success we issue a short-lived JWT so subsequent calls don't have to ship the password.
const login = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!process.env.SUPERADMIN_PASSWORD) {
    return res
      .status(500)
      .json({ success: false, message: 'SUPERADMIN_PASSWORD env var is not configured' });
  }
  if (typeof password !== 'string' || !safeEqual(password, process.env.SUPERADMIN_PASSWORD)) {
    return res.status(401).json({ success: false, message: 'Invalid password' });
  }
  const token = jwt.sign(
    { role: 'superadmin' },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '2h' }
  );
  return success(res, { token }, 'Authenticated');
});

// GET /api/superadmin/stats
const getStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const [totalUsers, activeSubscriptions, trialUsers, pendingRequests, totalRevenueAgg] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ subscriptionEndsAt: { $gt: now } }),
    User.countDocuments({
      $and: [
        { trialEndsAt: { $gt: now } },
        { $or: [{ subscriptionEndsAt: { $exists: false } }, { subscriptionEndsAt: { $lte: now } }] },
      ],
    }),
    SubscriptionPayment.countDocuments({ status: 'pending' }),
    SubscriptionPayment.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  return success(res, {
    totalUsers,
    activeSubscriptions,
    trialUsers,
    pendingRequests,
    totalRevenue: totalRevenueAgg[0]?.total || 0,
  });
});

// GET /api/superadmin/users
const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).limit(500);
  const enriched = users.map((u) => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    gymName: u.gymName,
    phone: u.phone,
    trialEndsAt: u.trialEndsAt,
    subscriptionEndsAt: u.subscriptionEndsAt,
    state: u.subscriptionState(),
    createdAt: u.createdAt,
  }));
  return success(res, enriched);
});

// GET /api/superadmin/payment-requests?status=pending|approved|rejected|all
const listRequests = asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;
  const filter = status === 'all' ? {} : { status };
  const items = await SubscriptionPayment.find(filter)
    .populate('user', 'name email gymName phone')
    .sort({ createdAt: -1 })
    .limit(500);
  return success(res, items);
});

// POST /api/superadmin/payment-requests/:id/approve
const approveRequest = asyncHandler(async (req, res) => {
  const request = await SubscriptionPayment.findById(req.params.id);
  if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
  if (request.status !== 'pending') {
    return res.status(400).json({ success: false, message: `Already ${request.status}` });
  }

  const user = await User.findById(request.user);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  // Extend subscription from max(now, currentExpiry) by the plan's duration.
  const now = new Date();
  const baseline = user.subscriptionEndsAt && user.subscriptionEndsAt > now ? user.subscriptionEndsAt : now;
  const newExpiry = new Date(baseline);
  newExpiry.setDate(newExpiry.getDate() + request.durationDays);

  user.subscriptionEndsAt = newExpiry;
  await user.save();

  request.status = 'approved';
  request.reviewedAt = now;
  await request.save();

  return success(res, { request, subscriptionEndsAt: user.subscriptionEndsAt }, 'Approved');
});

// POST /api/superadmin/payment-requests/:id/reject  { reason }
const rejectRequest = asyncHandler(async (req, res) => {
  const request = await SubscriptionPayment.findById(req.params.id);
  if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
  if (request.status !== 'pending') {
    return res.status(400).json({ success: false, message: `Already ${request.status}` });
  }

  request.status = 'rejected';
  request.rejectionReason = req.body.reason || 'No reason provided';
  request.reviewedAt = new Date();
  await request.save();

  return success(res, request, 'Rejected');
});

module.exports = { login, getStats, listUsers, listRequests, approveRequest, rejectRequest };
