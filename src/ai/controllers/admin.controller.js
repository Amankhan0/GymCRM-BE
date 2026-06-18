const AiPayment = require('../models/AiPayment');
const User = require('../../models/User');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');

// GET /api/ai/admin/stats
const getStats = asyncHandler(async (req, res) => {
  const [totalUsers, pending, revenueAgg] = await Promise.all([
    User.countDocuments({ product: 'ai' }),
    AiPayment.countDocuments({ status: 'pending' }),
    AiPayment.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);
  return success(res, { totalUsers, pending, revenue: revenueAgg[0]?.total || 0 });
});

// GET /api/ai/admin/payment-requests?status=pending|approved|rejected|all
const listRequests = asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;
  const filter = status === 'all' ? {} : { status };
  const items = await AiPayment.find(filter)
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(500);
  return success(res, items);
});

// POST /api/ai/admin/payment-requests/:id/approve — grants the plan's credits to the user.
const approveRequest = asyncHandler(async (req, res) => {
  const request = await AiPayment.findById(req.params.id);
  if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
  if (request.status !== 'pending') {
    return res.status(400).json({ success: false, message: `Already ${request.status}` });
  }

  const user = await User.findById(request.user);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  // Grant credits + set plan + extend the 30-day validity window from max(now, current expiry).
  const now = new Date();
  user.credits = (user.credits || 0) + request.credits;
  user.aiPlan = request.planKey;
  const baseline = user.subscriptionEndsAt && user.subscriptionEndsAt > now ? user.subscriptionEndsAt : now;
  const newExpiry = new Date(baseline);
  newExpiry.setDate(newExpiry.getDate() + request.durationDays);
  user.subscriptionEndsAt = newExpiry;
  await user.save();

  request.status = 'approved';
  request.reviewedAt = now;
  await request.save();

  return success(res, { request, credits: user.credits, subscriptionEndsAt: user.subscriptionEndsAt }, 'Approved');
});

// POST /api/ai/admin/payment-requests/:id/reject  { reason }
const rejectRequest = asyncHandler(async (req, res) => {
  const request = await AiPayment.findById(req.params.id);
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

module.exports = { getStats, listRequests, approveRequest, rejectRequest };
