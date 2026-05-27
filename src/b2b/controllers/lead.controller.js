const Lead = require('../models/Lead');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');

const companyScope = (req) => ({ company: req.user.company });

const ALLOWED = [
  'name', 'contactCompany', 'email', 'phone',
  'source', 'status', 'estimatedValue',
  'description', 'notes', 'followUpDate',
  'assignedTo', 'lostReason',
];
const pick = (body) =>
  Object.fromEntries(Object.entries(body || {}).filter(([k]) => ALLOWED.includes(k)));

// GET /api/b2b/leads?search=&status=&source=&page=&limit=
const listLeads = asyncHandler(async (req, res) => {
  const { search = '', status, source, page = 1, limit = 20 } = req.query;
  const filter = { ...companyScope(req) };
  if (search) {
    const rx = { $regex: search, $options: 'i' };
    filter.$or = [{ name: rx }, { contactCompany: rx }, { email: rx }, { phone: rx }];
  }
  if (status) filter.status = status;
  if (source) filter.source = source;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total, counts] = await Promise.all([
    Lead.find(filter)
      .populate('assignedTo', 'name email')
      .sort({ followUpDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Lead.countDocuments(filter),
    // Per-status counts power the tab badges. Always scoped to the calling company.
    Lead.aggregate([
      { $match: companyScope(req) },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const statusCounts = counts.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {});

  return success(res, items, 'Leads fetched', 200, {
    total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)),
    statusCounts,
  });
});

const getLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, ...companyScope(req) })
    .populate('assignedTo', 'name email');
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
  return success(res, lead);
});

const createLead = asyncHandler(async (req, res) => {
  const lead = await Lead.create({ ...pick(req.body), company: req.user.company });
  return success(res, lead, 'Lead created', 201);
});

const updateLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, ...companyScope(req) },
    pick(req.body),
    { new: true, runValidators: true }
  );
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
  return success(res, lead, 'Lead updated');
});

const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findOneAndDelete({ _id: req.params.id, ...companyScope(req) });
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
  return success(res, null, 'Lead deleted');
});

// POST /api/b2b/leads/:id/convert
// Phase 3: just mark the lead as converted. Phase 4 will additionally create a Quotation
// pre-filled from the lead's contact/value/notes and store its id on convertedToQuotation.
const convertLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, ...companyScope(req) });
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
  if (lead.status === 'converted') {
    return res.status(400).json({ success: false, message: 'Lead is already converted' });
  }
  lead.status = 'converted';
  lead.convertedAt = new Date();
  await lead.save();
  return success(res, lead, 'Marked as converted. Quotation creation coming in Phase 4.');
});

module.exports = { listLeads, getLead, createLead, updateLead, deleteLead, convertLead };
