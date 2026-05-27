const Product = require('../models/Product');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');

const companyScope = (req) => ({ company: req.user.company });

const ALLOWED = [
  'name', 'description', 'sku', 'hsnCode', 'gstPercent',
  'price', 'unit', 'stockQuantity', 'isActive',
];
const pick = (body) =>
  Object.fromEntries(Object.entries(body || {}).filter(([k]) => ALLOWED.includes(k)));

// GET /api/b2b/products?search=&isActive=&page=&limit=
const listProducts = asyncHandler(async (req, res) => {
  const { search = '', isActive, page = 1, limit = 20 } = req.query;
  const filter = { ...companyScope(req) };
  if (search) {
    const rx = { $regex: search, $options: 'i' };
    filter.$or = [{ name: rx }, { description: rx }, { sku: rx }, { hsnCode: rx }];
  }
  if (isActive === 'true') filter.isActive = true;
  if (isActive === 'false') filter.isActive = false;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Product.countDocuments(filter),
  ]);
  return success(res, items, 'Products fetched', 200, {
    total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)),
  });
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, ...companyScope(req) });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  return success(res, product);
});

const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create({ ...pick(req.body), company: req.user.company });
  return success(res, product, 'Product created', 201);
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, ...companyScope(req) },
    pick(req.body),
    { new: true, runValidators: true }
  );
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  return success(res, product, 'Product updated');
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOneAndDelete({ _id: req.params.id, ...companyScope(req) });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  return success(res, null, 'Product deleted');
});

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
