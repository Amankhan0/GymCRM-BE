const Attendance = require('../models/Attendance');
const Member = require('../models/Member');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

// UTC-based so the server's local timezone doesn't disagree with what the client thinks "today" is.
const startOfDay = (d) => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d) => {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
};

const ownerScope = (req) => ({ owner: req.user._id });

// POST /api/attendance  { memberId, status }
const markAttendance = asyncHandler(async (req, res) => {
  const { memberId, status = 'present', notes } = req.body;
  if (!memberId) {
    return res.status(400).json({ success: false, message: 'memberId is required' });
  }

  // Guard: the member must belong to this gym.
  const member = await Member.findOne({ _id: memberId, ...ownerScope(req) });
  if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

  const today = new Date();
  const existing = await Attendance.findOne({
    member: memberId,
    ...ownerScope(req),
    date: { $gte: startOfDay(today), $lte: endOfDay(today) },
  });

  if (existing) {
    existing.status = status;
    if (notes) existing.notes = notes;
    await existing.save();
    return success(res, existing, 'Attendance updated');
  }

  const record = await Attendance.create({
    owner: req.user._id,
    member: memberId,
    status,
    notes,
    date: today,
  });
  return success(res, record, 'Attendance marked', 201);
});

const listAttendance = asyncHandler(async (req, res) => {
  const { date, memberId, page = 1, limit = 50 } = req.query;
  const filter = { ...ownerScope(req) };

  if (date) filter.date = { $gte: startOfDay(date), $lte: endOfDay(date) };
  if (memberId) filter.member = memberId;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Attendance.find(filter)
      .populate('member', 'name phone email')
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Attendance.countDocuments(filter),
  ]);

  return success(res, items, 'Attendance fetched', 200, {
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Number(limit)),
  });
});

const deleteAttendance = asyncHandler(async (req, res) => {
  const record = await Attendance.findOneAndDelete({ _id: req.params.id, ...ownerScope(req) });
  if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
  return success(res, null, 'Attendance removed');
});

module.exports = { markAttendance, listAttendance, deleteAttendance };
