const Customer = require('../models/Customer');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');

// Every query scoped to the caller's company — defence-in-depth on top of route-level middleware.
const companyScope = (req) => ({ company: req.user.company });

// Allowlist of writable fields — protects against mass assignment of `company`, `_id`, etc.
const ALLOWED = [
  'companyName', 'contactPerson', 'email', 'phone', 'gstNumber',
  'billingAddress', 'shippingAddress', 'city', 'state', 'pincode', 'notes',
];
const pick = (body) =>
  Object.fromEntries(Object.entries(body || {}).filter(([k]) => ALLOWED.includes(k)));

// GET /api/b2b/customers?search=&page=&limit=
const listCustomers = asyncHandler(async (req, res) => {
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
    Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Customer.countDocuments(filter),
  ]);
  return success(res, items, 'Customers fetched', 200, {
    total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)),
  });
});

const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, ...companyScope(req) });
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
  return success(res, customer);
});

const createCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.create({ ...pick(req.body), company: req.user.company });
  return success(res, customer, 'Customer created', 201);
});

const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, ...companyScope(req) },
    pick(req.body),
    { new: true, runValidators: true }
  );
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
  return success(res, customer, 'Customer updated');
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOneAndDelete({ _id: req.params.id, ...companyScope(req) });
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
  return success(res, null, 'Customer deleted');
});

module.exports = { listCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer };
