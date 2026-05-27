const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Common 429 response shape so the client error toast picks it up consistently.
const tooMany = (windowDesc) => ({
  success: false,
  message: `Too many requests — please try again in ${windowDesc}.`,
});

// Catches credential stuffing. 10 attempts / 15 minutes / IP. Successful logins are not counted
// so an honest user who logs in/out quickly isn't punished.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany('15 minutes'),
});

// Slows mass account creation. 5 / hour / IP.
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany('an hour'),
});

// Super-admin login is the highest-value target — password is the only auth.
// Strict 5 / 15 min / IP; failed attempts count, so brute force is effectively blocked.
const superLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany('15 minutes'),
});

// Keyed by user id (set by `protect`), not IP — prevents a single user from spamming UTRs.
const paymentSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user?._id ? String(req.user._id) : ipKeyGenerator(req.ip)),
  message: tooMany('an hour'),
});

// Last line of defence — caps any individual IP at 200 req / 15 min for the whole API.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany('15 minutes'),
});

module.exports = {
  loginLimiter,
  signupLimiter,
  superLoginLimiter,
  paymentSubmitLimiter,
  globalLimiter,
};
