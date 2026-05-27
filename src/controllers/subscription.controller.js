const SubscriptionPayment = require('../models/SubscriptionPayment');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const { SUBSCRIPTION_PLANS, PLAN_LIST } = require('../config/subscriptionPlans');

// GET /api/subscription/plans  — public list of tiers so the client can render the picker.
const listPlans = asyncHandler(async (req, res) => {
  return success(res, PLAN_LIST);
});

// GET /api/subscription/me  — current user's subscription status + recent requests
const myStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const recent = await SubscriptionPayment.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(10);

  return success(res, {
    state: user.subscriptionState(),
    trialEndsAt: user.trialEndsAt,
    subscriptionEndsAt: user.subscriptionEndsAt,
    requests: recent,
  });
});

// POST /api/subscription/request  — user submits a payment they've made on UPI
const submitRequest = asyncHandler(async (req, res) => {
  const { planKey, utr, paidAt, notes } = req.body;
  const plan = SUBSCRIPTION_PLANS[planKey];
  if (!plan) {
    return res.status(400).json({ success: false, message: 'Invalid plan' });
  }
  if (!utr || !utr.trim()) {
    return res.status(400).json({ success: false, message: 'UTR / transaction reference is required' });
  }
  if (!paidAt) {
    return res.status(400).json({ success: false, message: 'Payment date/time is required' });
  }

  // Reject duplicate UTRs from the same user — prevents accidental double submissions.
  const dup = await SubscriptionPayment.findOne({ user: req.user._id, utr: utr.trim() });
  if (dup) {
    return res
      .status(400)
      .json({ success: false, message: 'This UTR is already submitted — wait for the previous request to be reviewed.' });
  }

  const request = await SubscriptionPayment.create({
    user: req.user._id,
    planKey: plan.key,
    durationDays: plan.durationDays,
    amount: plan.amount,
    utr: utr.trim(),
    paidAt: new Date(paidAt),
    notes,
    status: 'pending',
  });

  return success(res, request, 'Payment request submitted — admin will verify and approve.', 201);
});

module.exports = { listPlans, myStatus, submitRequest };
