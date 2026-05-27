const MembershipPlan = require('../models/MembershipPlan');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const ownerScope = (req) => ({ owner: req.user._id });

// Allowlist of writable fields.
const ALLOWED = ['name', 'duration', 'durationInDays', 'price', 'description', 'features', 'isActive'];
const pick = (body) =>
  Object.fromEntries(Object.entries(body || {}).filter(([k]) => ALLOWED.includes(k)));

const listPlans = asyncHandler(async (req, res) => {
  const items = await MembershipPlan.find(ownerScope(req)).sort({ price: 1 });
  return success(res, items, 'Plans fetched');
});

const getPlan = asyncHandler(async (req, res) => {
  const plan = await MembershipPlan.findOne({ _id: req.params.id, ...ownerScope(req) });
  if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
  return success(res, plan);
});

const createPlan = asyncHandler(async (req, res) => {
  const plan = await MembershipPlan.create({ ...pick(req.body), owner: req.user._id });
  return success(res, plan, 'Plan created', 201);
});

const updatePlan = asyncHandler(async (req, res) => {
  const plan = await MembershipPlan.findOneAndUpdate(
    { _id: req.params.id, ...ownerScope(req) },
    pick(req.body),
    { new: true, runValidators: true }
  );
  if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
  return success(res, plan, 'Plan updated');
});

const deletePlan = asyncHandler(async (req, res) => {
  const plan = await MembershipPlan.findOneAndDelete({ _id: req.params.id, ...ownerScope(req) });
  if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
  return success(res, null, 'Plan deleted');
});

module.exports = { listPlans, getPlan, createPlan, updatePlan, deletePlan };
