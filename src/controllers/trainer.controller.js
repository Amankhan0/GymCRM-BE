const Trainer = require('../models/Trainer');
const Member = require('../models/Member');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const ownerScope = (req) => ({ owner: req.user._id });

// Allowlist of writable fields — protects against mass assignment of `owner`, `_id`, `user`, etc.
const ALLOWED = [
  'name', 'email', 'phone', 'gender', 'specialization',
  'experience', 'salary', 'joinDate', 'status', 'avatar', 'bio',
];
const pick = (body) =>
  Object.fromEntries(Object.entries(body || {}).filter(([k]) => ALLOWED.includes(k)));

const listTrainers = asyncHandler(async (req, res) => {
  const { search = '', page = 1, limit = 10 } = req.query;
  const filter = { ...ownerScope(req) };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { specialization: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Trainer.find(filter)
      .populate({ path: 'assignedMembers', select: '_id' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Trainer.countDocuments(filter),
  ]);

  return success(res, items, 'Trainers fetched', 200, {
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Number(limit)),
  });
});

const getTrainer = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findOne({ _id: req.params.id, ...ownerScope(req) }).populate(
    'assignedMembers'
  );
  if (!trainer) return res.status(404).json({ success: false, message: 'Trainer not found' });
  return success(res, trainer);
});

const createTrainer = asyncHandler(async (req, res) => {
  const trainer = await Trainer.create({ ...pick(req.body), owner: req.user._id });
  return success(res, trainer, 'Trainer created', 201);
});

const updateTrainer = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findOneAndUpdate(
    { _id: req.params.id, ...ownerScope(req) },
    pick(req.body),
    { new: true, runValidators: true }
  );
  if (!trainer) return res.status(404).json({ success: false, message: 'Trainer not found' });
  return success(res, trainer, 'Trainer updated');
});

const deleteTrainer = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findOneAndDelete({ _id: req.params.id, ...ownerScope(req) });
  if (!trainer) return res.status(404).json({ success: false, message: 'Trainer not found' });
  await Member.updateMany(
    { trainer: req.params.id, ...ownerScope(req) },
    { $unset: { trainer: 1 } }
  );
  return success(res, null, 'Trainer deleted');
});

module.exports = { listTrainers, getTrainer, createTrainer, updateTrainer, deleteTrainer };
