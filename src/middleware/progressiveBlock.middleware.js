const BlockedClient = require('../models/BlockedClient');

// Escalation ladder. Each row says: at N violations, apply this ban.
// `durationMs: null` means permanent (no auto-expiry — admin clears via DB).
const POLICY = [
  { atViolations: 1, durationMs: 15 * 60 * 1000 },       // 15 minutes
  { atViolations: 2, durationMs: 60 * 60 * 1000 },       // 1 hour
  { atViolations: 3, durationMs: null, permanent: true }, // permanent
];

// Sliding window — if no violations for this long, the counter resets on next strike.
const RESET_AFTER_MS = 24 * 60 * 60 * 1000; // 24 hours

// Identify the caller. Authenticated calls use the user id (survives IP changes);
// otherwise fall back to the IP.
const getKey = (req) => (req.user?._id ? `user:${req.user._id}` : `ip:${req.ip || 'unknown'}`);

const formatRemaining = (ms) => {
  if (ms <= 0) return 'a moment';
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `${sec} seconds`;
  const min = Math.ceil(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'}`;
  const hr = Math.ceil(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'}`;
  const day = Math.ceil(hr / 24);
  return `${day} day${day === 1 ? '' : 's'}`;
};

// Gate every request — if the caller is currently banned, reject before any other middleware runs.
const checkBlock = async (req, res, next) => {
  // Dev escape hatch — same flag as the rate limiter. Skip block checks entirely in local dev.
  if (process.env.DISABLE_RATE_LIMIT === 'true') return next();
  try {
    const key = getKey(req);
    const entry = await BlockedClient.findOne({ key });
    if (!entry) return next();

    if (entry.permanent) {
      return res.status(429).json({
        success: false,
        code: 'BLOCKED_PERMANENT',
        message: 'Your access has been permanently blocked due to repeated abuse. Contact support if you believe this is a mistake.',
        permanent: true,
      });
    }

    if (entry.bannedUntil && entry.bannedUntil > new Date()) {
      const remaining = entry.bannedUntil - new Date();
      return res.status(429).json({
        success: false,
        code: 'BLOCKED',
        message: `You are blocked. Try again in ${formatRemaining(remaining)}.`,
        bannedUntil: entry.bannedUntil,
      });
    }

    // Ban has expired but the entry persists so the next strike escalates instead of restarting.
    return next();
  } catch (err) {
    // DB outage shouldn't take the whole API down — fail open so honest users still get through.
    console.error('progressiveBlock.checkBlock error:', err.message);
    return next();
  }
};

// Called by the rate limiter when a client exceeds its window. Increments violations, applies
// the next rung of the escalation ladder, and persists.
const recordViolation = async (key, reason) => {
  try {
    const now = new Date();
    const existing = await BlockedClient.findOne({ key });

    // Sliding window: if it's been quiet for 24h+, treat this as a fresh first offence.
    const shouldReset = existing && existing.lastViolationAt &&
      (now - existing.lastViolationAt) > RESET_AFTER_MS;

    const nextCount = shouldReset ? 1 : (existing?.violations || 0) + 1;
    const policy = POLICY[Math.min(nextCount, POLICY.length) - 1];
    const bannedUntil = policy.durationMs ? new Date(now.getTime() + policy.durationMs) : null;
    const permanent = !!policy.permanent;

    await BlockedClient.findOneAndUpdate(
      { key },
      {
        $set: {
          violations: nextCount,
          bannedUntil,
          permanent,
          lastViolationAt: now,
          reason,
          ...(shouldReset || !existing ? { firstViolationAt: now } : {}),
        },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('progressiveBlock.recordViolation error:', err.message);
  }
};

// Helper for the rate-limit middleware so it doesn't need to know how keys are built.
const violationKeyFor = (req) => getKey(req);

module.exports = { checkBlock, recordViolation, violationKeyFor };
