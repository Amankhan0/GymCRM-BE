const Member = require('../models/Member');
const Trainer = require('../models/Trainer');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');

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

// GET /api/dashboard/stats
const getStats = asyncHandler(async (req, res) => {
  const scope = ownerScope(req);
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [
    totalMembers,
    activeMembers,
    pendingFees,
    newMembersThisMonth,
    totalTrainers,
    todaysAttendance,
    revenueAggregate,
  ] = await Promise.all([
    Member.countDocuments(scope),
    Member.countDocuments({ ...scope, status: 'active' }),
    Member.countDocuments({ ...scope, expiryDate: { $lte: sevenDaysFromNow } }),
    Member.countDocuments({ ...scope, joinDate: { $gte: startOfMonth } }),
    Trainer.countDocuments({ ...scope, status: 'active' }),
    Attendance.countDocuments({
      ...scope,
      date: { $gte: startOfDay(now), $lte: endOfDay(now) },
      status: 'present',
    }),
    Payment.aggregate([
      {
        $match: {
          ...scope,
          status: 'paid',
          paymentDate: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const monthlyRevenue = revenueAggregate[0]?.total || 0;

  return success(res, {
    totalMembers,
    activeMembers,
    pendingFees,
    newMembersThisMonth,
    totalTrainers,
    todaysAttendance,
    monthlyRevenue,
  });
});

// GET /api/dashboard/revenue-chart  — last 6 months for this gym
const getRevenueChart = asyncHandler(async (req, res) => {
  const months = [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59);
    const agg = await Payment.aggregate([
      { $match: { ...ownerScope(req), status: 'paid', paymentDate: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    months.push({
      month: start.toLocaleString('default', { month: 'short' }),
      revenue: agg[0]?.total || 0,
    });
  }
  return success(res, months);
});

// GET /api/dashboard/attendance-chart  — last 7 days for this gym
const getAttendanceChart = asyncHandler(async (req, res) => {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const count = await Attendance.countDocuments({
      ...ownerScope(req),
      date: { $gte: startOfDay(day), $lte: endOfDay(day) },
      status: 'present',
    });
    days.push({
      day: day.toLocaleDateString('default', { weekday: 'short' }),
      count,
    });
  }
  return success(res, days);
});

module.exports = { getStats, getRevenueChart, getAttendanceChart };
