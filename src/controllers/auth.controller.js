const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  gymName: user.gymName,
  avatar: user.avatar,
});

// POST /api/auth/signup
// Trainers are managed as resources by admins, not as login users — so signup always creates an admin.
const signup = asyncHandler(async (req, res) => {
  const { name, email, password, phone, gymName } = req.body;

  if (!name || !email || !password || !gymName) {
    return res
      .status(400)
      .json({ success: false, message: 'Name, email, password and gym name are required' });
  }

  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(400).json({ success: false, message: 'Email already in use' });
  }

  const user = await User.create({
    name,
    email,
    password,
    role: 'admin',
    phone,
    gymName: gymName.trim(),
  });

  const token = generateToken(user._id, user.role);
  return success(res, { token, user: publicUser(user) }, 'Account created', 201);
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const token = generateToken(user._id, user.role);
  return success(res, { token, user: publicUser(user) });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  return success(res, { user: publicUser(req.user) });
});

module.exports = { signup, login, me };
