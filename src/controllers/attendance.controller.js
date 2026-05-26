const Attendance = require('../models/Attendance');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

// Use UTC so the server's local timezone doesn't disagree with what the client thinks "today" is —
// the client computes today() via toISOString() which is UTC-based.
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

// POST /api/attendance  { memberId, status }
// Idempotent per day: if a record exists for this member today, it's returned instead of duplicated.
const markAttendance = asyncHandler(async (req, res) => {
  const { memberId, status = 'present', notes } = req.body;
  if (!memberId) {
    return res.status(400).json({ success: false, message: 'memberId is required' });
  }

  const today = new Date();
  const existing = await Attendance.findOne({
    member: memberId,
    date: { $gte: startOfDay(today), $lte: endOfDay(today) },
  });

  if (existing) {
    existing.status = status;
    if (notes) existing.notes = notes;
    await existing.save();
    return success(res, existing, 'Attendance updated');
  }

  const record = await Attendance.create({ member: memberId, status, notes, date: today });
  return success(res, record, 'Attendance marked', 201);
});

// GET /api/attendance?date=YYYY-MM-DD&memberId=
const listAttendance = asyncHandler(async (req, res) => {
  const { date, memberId, page = 1, limit = 50 } = req.query;
  const filter = {};

  if (date) {
    filter.date = { $gte: startOfDay(date), $lte: endOfDay(date) };
  }
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

// DELETE /api/attendance/:id
const deleteAttendance = asyncHandler(async (req, res) => {
  const record = await Attendance.findByIdAndDelete(req.params.id);
  if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
  return success(res, null, 'Attendance removed');
});

module.exports = { markAttendance, listAttendance, deleteAttendance };
