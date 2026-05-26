const MembershipPlan = require('../models/MembershipPlan');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const listPlans = asyncHandler(async (req, res) => {
  const items = await MembershipPlan.find().sort({ price: 1 });
  return success(res, items, 'Plans fetched');
});

const getPlan = asyncHandler(async (req, res) => {
  const plan = await MembershipPlan.findById(req.params.id);
  if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
  return success(res, plan);
});

const createPlan = asyncHandler(async (req, res) => {
  const plan = await MembershipPlan.create(req.body);
  return success(res, plan, 'Plan created', 201);
});

const updatePlan = asyncHandler(async (req, res) => {
  const plan = await MembershipPlan.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
  return success(res, plan, 'Plan updated');
});

const deletePlan = asyncHandler(async (req, res) => {
  const plan = await MembershipPlan.findByIdAndDelete(req.params.id);
  if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
  return success(res, null, 'Plan deleted');
});

module.exports = { listPlans, getPlan, createPlan, updatePlan, deletePlan };
