const Payment = require('../models/Payment');
const Member = require('../models/Member');
const MembershipPlan = require('../models/MembershipPlan');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

// GET /api/payments
const listPayments = asyncHandler(async (req, res) => {
  const { status, memberId, page = 1, limit = 10 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (memberId) filter.member = memberId;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Payment.find(filter)
      .populate('member', 'name phone email')
      .populate('plan', 'name price duration')
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Payment.countDocuments(filter),
  ]);

  return success(res, items, 'Payments fetched', 200, {
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Number(limit)),
  });
});

// POST /api/payments  — records a payment AND extends member expiry by the plan's duration.
const createPayment = asyncHandler(async (req, res) => {
  const { memberId, planId, amount, paymentMethod, transactionId, notes } = req.body;
  if (!memberId || !planId) {
    return res.status(400).json({ success: false, message: 'memberId and planId are required' });
  }

  const member = await Member.findById(memberId);
  if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

  const plan = await MembershipPlan.findById(planId);
  if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

  const payment = await Payment.create({
    member: memberId,
    plan: planId,
    amount: amount ?? plan.price,
    paymentMethod,
    transactionId,
    notes,
    status: 'paid',
  });

  // Extend expiry from max(today, currentExpiry) by plan duration
  const baseline = !member.expiryDate || member.expiryDate < new Date() ? new Date() : member.expiryDate;
  const newExpiry = new Date(baseline);
  newExpiry.setDate(newExpiry.getDate() + plan.durationInDays);

  member.membershipPlan = plan._id;
  member.expiryDate = newExpiry;
  member.status = 'active';
  await member.save();

  return success(res, payment, 'Payment recorded', 201);
});

// PUT /api/payments/:id
const updatePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
  return success(res, payment, 'Payment updated');
});

// DELETE /api/payments/:id
const deletePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findByIdAndDelete(req.params.id);
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
  return success(res, null, 'Payment deleted');
});

module.exports = { listPayments, createPayment, updatePayment, deletePayment };
