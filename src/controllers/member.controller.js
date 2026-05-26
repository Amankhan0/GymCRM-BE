const Member = require('../models/Member');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

// GET /api/members?search=&status=&pendingFees=&page=&limit=
const listMembers = asyncHandler(async (req, res) => {
  const { search = '', status, pendingFees, page = 1, limit = 10 } = req.query;
  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }
  if (status) filter.status = status;
  if (pendingFees === 'true') {
    // Same definition the dashboard uses: expiry already passed OR within next 7 days.
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

// GET /api/members/:id
const getMember = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id)
    .populate('membershipPlan')
    .populate('trainer');
  if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
  return success(res, member);
});

// POST /api/members
const createMember = asyncHandler(async (req, res) => {
  const member = await Member.create(req.body);
  return success(res, member, 'Member created', 201);
});

// PUT /api/members/:id
const updateMember = asyncHandler(async (req, res) => {
  const member = await Member.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
  return success(res, member, 'Member updated');
});

// DELETE /api/members/:id
const deleteMember = asyncHandler(async (req, res) => {
  const member = await Member.findByIdAndDelete(req.params.id);
  if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
  return success(res, null, 'Member deleted');
});

module.exports = { listMembers, getMember, createMember, updateMember, deleteMember };
