const Trainer = require('../models/Trainer');
const Member = require('../models/Member');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

// GET /api/trainers?search=&page=&limit=
const listTrainers = asyncHandler(async (req, res) => {
  const { search = '', page = 1, limit = 10 } = req.query;
  const filter = {};
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
    // Populate just the _id of assigned members so the client can show a count without bloating the payload.
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

// GET /api/trainers/:id
const getTrainer = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findById(req.params.id).populate('assignedMembers');
  if (!trainer) return res.status(404).json({ success: false, message: 'Trainer not found' });
  return success(res, trainer);
});

// POST /api/trainers
const createTrainer = asyncHandler(async (req, res) => {
  const trainer = await Trainer.create(req.body);
  return success(res, trainer, 'Trainer created', 201);
});

// PUT /api/trainers/:id
const updateTrainer = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!trainer) return res.status(404).json({ success: false, message: 'Trainer not found' });
  return success(res, trainer, 'Trainer updated');
});

// DELETE /api/trainers/:id
const deleteTrainer = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findByIdAndDelete(req.params.id);
  if (!trainer) return res.status(404).json({ success: false, message: 'Trainer not found' });
  // unassign trainer from members
  await Member.updateMany({ trainer: req.params.id }, { $unset: { trainer: 1 } });
  return success(res, null, 'Trainer deleted');
});

module.exports = { listTrainers, getTrainer, createTrainer, updateTrainer, deleteTrainer };
