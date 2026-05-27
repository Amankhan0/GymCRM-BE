const Member = require('../models/Member');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

// All queries are scoped to the logged-in owner so each gym only ever sees its own data.
const ownerScope = (req) => ({ owner: req.user._id });

// GET /api/members?search=&status=&pendingFees=&page=&limit=
const listMembers = asyncHandler(async (req, res) => {
  const { search = '', status, pendingFees, page = 1, limit = 10 } = req.query;
  const filter = { ...ownerScope(req) };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }
  if (status) filter.status = status;
  if (pendingFees === 'true') {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    filter.expiryDate = { $lte: sevenDaysFromNow };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Member.find(filter)
      .populate('membershipPlan', 'name price duration')
      .populate('trainer', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Member.countDocuments(filter),
  ]);

  return success(res, items, 'Members fetched', 200, {
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Number(limit)),
  });
});

const getMember = asyncHandler(async (req, res) => {
  const member = await Member.findOne({ _id: req.params.id, ...ownerScope(req) })
    .populate('membershipPlan')
    .populate('trainer');
  if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
  return success(res, member);
});

const createMember = asyncHandler(async (req, res) => {
  const member = await Member.create({ ...req.body, owner: req.user._id });
  return success(res, member, 'Member created', 201);
});

const updateMember = asyncHandler(async (req, res) => {
  const member = await Member.findOneAndUpdate(
    { _id: req.params.id, ...ownerScope(req) },
    req.body,
    { new: true, runValidators: true }
  );
  if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
  return success(res, member, 'Member updated');
});

const deleteMember = asyncHandler(async (req, res) => {
  const member = await Member.findOneAndDelete({ _id: req.params.id, ...ownerScope(req) });
  if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
  return success(res, null, 'Member deleted');
});

module.exports = { listMembers, getMember, createMember, updateMember, deleteMember };
