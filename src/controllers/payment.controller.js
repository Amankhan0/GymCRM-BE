const Payment = require('../models/Payment');
const Member = require('../models/Member');
const MembershipPlan = require('../models/MembershipPlan');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const ownerScope = (req) => ({ owner: req.user._id });

const listPayments = asyncHandler(async (req, res) => {
  const { status, memberId, page = 1, limit = 10 } = req.query;
  const filter = { ...ownerScope(req) };
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

  // Confirm the member and plan both belong to this gym — defence against cross-tenant tampering.
  const member = await Member.findOne({ _id: memberId, ...ownerScope(req) });
  if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

  const plan = await MembershipPlan.findOne({ _id: planId, ...ownerScope(req) });
  if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

  const payment = await Payment.create({
    owner: req.user._id,
    member: memberId,
    plan: planId,
    amount: amount ?? plan.price,
    paymentMethod,
    transactionId,
    notes,
    status: 'paid',
  });

  const baseline = !member.expiryDate || member.expiryDate < new Date() ? new Date() : member.expiryDate;
  const newExpiry = new Date(baseline);
  newExpiry.setDate(newExpiry.getDate() + plan.durationInDays);

  member.membershipPlan = plan._id;
  member.expiryDate = newExpiry;
  member.status = 'active';
  await member.save();

  return success(res, payment, 'Payment recorded', 201);
});

const updatePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOneAndUpdate(
    { _id: req.params.id, ...ownerScope(req) },
    req.body,
    { new: true, runValidators: true }
  );
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
  return success(res, payment, 'Payment updated');
});

const deletePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOneAndDelete({ _id: req.params.id, ...ownerScope(req) });
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
  return success(res, null, 'Payment deleted');
});

module.exports = { listPayments, createPayment, updatePayment, deletePayment };
