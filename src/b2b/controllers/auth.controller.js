const mongoose = require('mongoose');
const User = require('../../models/User');
const Company = require('../models/Company');
const generateToken = require('../../utils/generateToken');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');

const TRIAL_DAYS = 7;

// Shape returned to the client on auth-related responses. Strips password and surfaces
// the subscription state so the frontend can render the trial banner.
const publicUser = (user, company) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  avatar: user.avatar,
  product: user.product,
  permissions: user.permissions || {},
  company: company
    ? {
        id: company._id,
        name: company.name,
        gstNumber: company.gstNumber,
        logoUrl: company.logoUrl,
        signatureUrl: company.signatureUrl,
      }
    : null,
  trialEndsAt: user.trialEndsAt,
  subscriptionEndsAt: user.subscriptionEndsAt,
  subscriptionState: user.subscriptionState ? user.subscriptionState() : 'expired',
});

// POST /api/b2b/auth/signup — creates Company + superadmin user in a transaction so a partial
// failure doesn't leave an orphan record. Gives the user a 7-day trial.
const signup = asyncHandler(async (req, res) => {
  const {
    companyName, ownerName, email, password, phone,
    gstNumber, address, city, state, pincode,
  } = req.body;

  if (!companyName || !ownerName || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Company name, owner name, email and password are required.',
    });
  }

  // Per-product uniqueness — same email may already exist as a gym user; that's allowed.
  const exists = await User.findOne({ email, product: 'b2b' });
  if (exists) {
    return res.status(409).json({ success: false, message: 'This email is already registered.' });
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  // Mongoose transactions need a replica set — Atlas free tier supports them. We use a session
  // so company+user are both created or neither is.
  const session = await mongoose.startSession();
  let user; let company;
  try {
    await session.withTransaction(async () => {
      const [createdCompany] = await Company.create(
        [{ name: companyName, gstNumber, address, city, state, pincode, phone }],
        { session }
      );
      company = createdCompany;

      const [createdUser] = await User.create(
        [{
          name: ownerName,
          email,
          password,
          phone,
          product: 'b2b',
          role: 'superadmin',
          company: company._id,
          trialEndsAt,
        }],
        { session }
      );
      user = createdUser;

      company.owner = user._id;
      await company.save({ session });
    });
  } finally {
    session.endSession();
  }

  const token = generateToken(user._id, user.role);
  return success(res, { token, user: publicUser(user, company) }, 'Account created', 201);
});

// POST /api/b2b/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const user = await User.findOne({ email, product: 'b2b' }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const company = user.company ? await Company.findById(user.company) : null;
  const token = generateToken(user._id, user.role);
  return success(res, { token, user: publicUser(user, company) });
});

// GET /api/b2b/auth/me — used by the frontend after refresh to re-hydrate auth state.
const me = asyncHandler(async (req, res) => {
  const company = req.user.company ? await Company.findById(req.user.company) : null;
  return success(res, { user: publicUser(req.user, company) });
});

module.exports = { signup, login, me };
