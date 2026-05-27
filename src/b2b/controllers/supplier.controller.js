const Supplier = require('../models/Supplier');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');

const companyScope = (req) => ({ company: req.user.company });

const ALLOWED = [
  'companyName', 'contactPerson', 'email', 'phone', 'gstNumber',
  'billingAddress', 'shippingAddress', 'city', 'state', 'pincode', 'notes',
];
const pick = (body) =>
  Object.fromEntries(Object.entries(body || {}).filter(([k]) => ALLOWED.includes(k)));

const listSuppliers = asyncHandler(async (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;
  const filter = { ...companyScope(req) };
  if (search) {
    const rx = { $regex: search, $options: 'i' };
    filter.$or = [
      { companyName: rx }, { contactPerson: rx }, { email: rx }, { phone: rx }, { gstNumber: rx },
    ];
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Supplier.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Supplier.countDocuments(filter),
  ]);
  return success(res, items, 'Suppliers fetched', 200, {
    total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)),
  });
});

const getSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOne({ _id: req.params.id, ...companyScope(req) });
  if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
  return success(res, supplier);
});

const createSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.create({ ...pick(req.body), company: req.user.company });
  return success(res, supplier, 'Supplier created', 201);
});

const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOneAndUpdate(
    { _id: req.params.id, ...companyScope(req) },
    pick(req.body),
    { new: true, runValidators: true }
  );
  if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
  return success(res, supplier, 'Supplier updated');
});

const deleteSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOneAndDelete({ _id: req.params.id, ...companyScope(req) });
  if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
  return success(res, null, 'Supplier deleted');
});

module.exports = { listSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier };
