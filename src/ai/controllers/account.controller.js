const AiPayment = require('../models/AiPayment');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const { PLANS } = require('../config/plans');

// Owner's UPI details for receiving payments — override in production via env.
const UPI_ID = process.env.AI_UPI_ID || 'yourname@upi';
const PAYEE_NAME = process.env.AI_PAYEE_NAME || 'Aether AI';

// GET /api/ai/plans — public pricing + payment (UPI) info for landing + subscription pages.
const listPlans = asyncHandler(async (req, res) => {
  return success(res, { plans: Object.values(PLANS), upiId: UPI_ID, payeeName: PAYEE_NAME });
});

// GET /api/ai/subscription/me — current plan/credits + recent payment requests.
const mySubscription = asyncHandler(async (req, res) => {
  const requests = await AiPayment.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(10);
  return success(res, {
    plan: req.user.aiPlan,
    credits: req.user.credits,
    unlimited: req.user.unlimited,
    subscriptionEndsAt: req.user.subscriptionEndsAt,
    requests,
  });
});

// POST /api/ai/subscription/request — user submits a UPI payment they've made. Creates a PENDING
// request; the owner approves it (which grants credits). No instant access.
const submitRequest = asyncHandler(async (req, res) => {
  const { planKey, utr, paidAt, notes } = req.body;
  const plan = PLANS[planKey];
  if (!plan) {
    return res.status(400).json({ success: false, message: 'Invalid plan' });
  }
  if (!utr || !utr.trim()) {
    return res.status(400).json({ success: false, message: 'UTR / transaction reference is required' });
  }
  if (!paidAt) {
    return res.status(400).json({ success: false, message: 'Payment date/time is required' });
  }

  // UTR uniqueness + format enforced at the schema level; error middleware translates E11000.
  const request = await AiPayment.create({
    user: req.user._id,
    planKey: plan.key,
    credits: plan.credits,
    durationDays: 30,
    amount: plan.price,
    utr: utr.trim(),
    paidAt: new Date(paidAt),
    notes,
    status: 'pending',
  });

  return success(res, request, 'Payment submitted — we will verify & activate it shortly.', 201);
});

module.exports = { listPlans, mySubscription, submitRequest };
