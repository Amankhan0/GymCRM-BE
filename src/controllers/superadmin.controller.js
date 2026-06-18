const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const SubscriptionPayment = require('../models/SubscriptionPayment');
const AiPayment = require('../ai/models/AiPayment');
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

// GET /api/superadmin/stats — counts span ALL products (gym, b2b, ai). Pending + revenue include
// both the gym/b2b SubscriptionPayment flow and the AI AiPayment flow.
const getStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const [
    totalUsers, activeSubscriptions, trialUsers,
    pendingSub, pendingAi, revSubAgg, revAiAgg,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ subscriptionEndsAt: { $gt: now } }),
    User.countDocuments({
      $and: [
        { trialEndsAt: { $gt: now } },
        { $or: [{ subscriptionEndsAt: { $exists: false } }, { subscriptionEndsAt: { $lte: now } }] },
      ],
    }),
    SubscriptionPayment.countDocuments({ status: 'pending' }),
    AiPayment.countDocuments({ status: 'pending' }),
    SubscriptionPayment.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    AiPayment.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);

  return success(res, {
    totalUsers,
    activeSubscriptions,
    trialUsers,
    pendingRequests: pendingSub + pendingAi,
    totalRevenue: (revSubAgg[0]?.total || 0) + (revAiAgg[0]?.total || 0),
  });
});

// GET /api/superadmin/users — every user across all products, tagged with `product`.
const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).limit(1000);
  const enriched = users.map((u) => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    product: u.product,           // gym | b2b | ai  — which website they came from
    gymName: u.gymName,
    phone: u.phone,
    credits: u.credits,           // ai-only
    aiPlan: u.aiPlan,             // ai-only
    trialEndsAt: u.trialEndsAt,
    subscriptionEndsAt: u.subscriptionEndsAt,
    state: u.subscriptionState(),
    createdAt: u.createdAt,
  }));
  return success(res, enriched);
});

// GET /api/superadmin/payment-requests?status=pending|approved|rejected|all
// Merges gym/b2b SubscriptionPayments AND ai AiPayments into ONE list, each tagged with `product`.
const listRequests = asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;
  const filter = status === 'all' ? {} : { status };

  const [subPayments, aiPayments] = await Promise.all([
    SubscriptionPayment.find(filter).populate('user', 'name email gymName phone product').sort({ createdAt: -1 }).limit(500).lean(),
    AiPayment.find(filter).populate('user', 'name email product').sort({ createdAt: -1 }).limit(500).lean(),
  ]);

  const merged = [
    ...subPayments.map((p) => ({ ...p, product: p.user?.product || 'gym' })),
    ...aiPayments.map((p) => ({ ...p, product: 'ai' })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return success(res, merged);
});

// Find a payment request in EITHER collection. Returns { request, kind }.
const findRequest = async (id) => {
  const sub = await SubscriptionPayment.findById(id);
  if (sub) return { request: sub, kind: 'subscription' };
  const ai = await AiPayment.findById(id);
  if (ai) return { request: ai, kind: 'ai' };
  return { request: null };
};

// POST /api/superadmin/payment-requests/:id/approve — works for gym/b2b AND ai payments.
const approveRequest = asyncHandler(async (req, res) => {
  const { request, kind } = await findRequest(req.params.id);
  if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
  if (request.status !== 'pending') {
    return res.status(400).json({ success: false, message: `Already ${request.status}` });
  }

  const user = await User.findById(request.user);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const now = new Date();
  const baseline = user.subscriptionEndsAt && user.subscriptionEndsAt > now ? user.subscriptionEndsAt : now;
  const newExpiry = new Date(baseline);
  newExpiry.setDate(newExpiry.getDate() + request.durationDays);
  user.subscriptionEndsAt = newExpiry;

  // AI payments additionally grant credits + set the plan tier.
  if (kind === 'ai') {
    user.credits = (user.credits || 0) + request.credits;
    user.aiPlan = request.planKey;
  }
  await user.save();

  request.status = 'approved';
  request.reviewedAt = now;
  await request.save();

  return success(res, { request, subscriptionEndsAt: user.subscriptionEndsAt }, 'Approved');
});

// POST /api/superadmin/payment-requests/:id/reject  { reason }
const rejectRequest = asyncHandler(async (req, res) => {
  const { request } = await findRequest(req.params.id);
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
