const User = require('../../models/User');
const generateToken = require('../../utils/generateToken');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const { WELCOME_CREDITS } = require('../config/plans');

// The special lifetime/unlimited account. Whoever registers (or logs in with) this email is
// auto-elevated to unlimited access. Override via env in production.
const ADMIN_EMAIL = (process.env.AI_ADMIN_EMAIL || 'admin@nyra.ai').toLowerCase();

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  role: user.role,
  credits: user.credits,
  aiPlan: user.aiPlan,
  unlimited: user.unlimited,
  isAdmin: user.email === ADMIN_EMAIL,
  subscriptionEndsAt: user.subscriptionEndsAt,
});

// Give the admin account lifetime + unlimited perks. Idempotent — safe to call on every login.
const applyAdminPerks = (user) => {
  if (user.email !== ADMIN_EMAIL) return false;
  let changed = false;
  if (!user.unlimited) { user.unlimited = true; changed = true; }
  if (user.aiPlan !== 'ultra') { user.aiPlan = 'ultra'; changed = true; }
  const lifetime = new Date('2099-12-31');
  if (!user.subscriptionEndsAt || user.subscriptionEndsAt < lifetime) {
    user.subscriptionEndsAt = lifetime;
    changed = true;
  }
  return changed;
};

// POST /api/ai/auth/signup
const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }

  const exists = await User.findOne({ email: email.toLowerCase(), product: 'ai' });
  if (exists) {
    return res.status(409).json({ success: false, message: 'This email is already registered.' });
  }

  const user = new User({
    name,
    email,
    password,
    role: 'admin',
    product: 'ai',
    credits: WELCOME_CREDITS,
  });
  applyAdminPerks(user);
  await user.save();

  const token = generateToken(user._id, user.role);
  return success(res, { token, user: publicUser(user) }, 'Welcome to Nyra', 201);
});

// POST /api/ai/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase(), product: 'ai' }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  if (applyAdminPerks(user)) await user.save();

  const token = generateToken(user._id, user.role);
  return success(res, { token, user: publicUser(user) });
});

// POST /api/ai/auth/google — body: { credential } (Google ID token from the client).
// Verifies the token with Google's tokeninfo endpoint, then finds-or-creates the AI user.
const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ success: false, message: 'Missing Google credential' });
  }

  let payload;
  try {
    const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!resp.ok) throw new Error('bad token');
    payload = await resp.json();
  } catch {
    return res.status(401).json({ success: false, message: 'Google verification failed' });
  }

  // If a client ID is configured, ensure the token was minted for our app.
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (clientId && payload.aud !== clientId) {
    return res.status(401).json({ success: false, message: 'Google token audience mismatch' });
  }
  if (!payload.email) {
    return res.status(401).json({ success: false, message: 'Google token has no email' });
  }

  const email = payload.email.toLowerCase();
  let user = await User.findOne({ email, product: 'ai' }).select('+password');
  if (!user) {
    user = new User({
      name: payload.name || email.split('@')[0],
      email,
      // Random password — Google users never use it, but the schema requires one.
      password: `g_${Math.random().toString(36).slice(2)}${Date.now()}`,
      avatar: payload.picture,
      role: 'admin',
      product: 'ai',
      credits: WELCOME_CREDITS,
    });
  }
  applyAdminPerks(user);
  await user.save();

  const token = generateToken(user._id, user.role);
  return success(res, { token, user: publicUser(user) });
});

// GET /api/ai/auth/me
const me = asyncHandler(async (req, res) => {
  return success(res, { user: publicUser(req.user) });
});

module.exports = { signup, login, googleLogin, me, publicUser, applyAdminPerks, ADMIN_EMAIL };
