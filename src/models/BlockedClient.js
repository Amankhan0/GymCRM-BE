const mongoose = require('mongoose');

// Persistent record of IPs / users that have tripped a rate limit.
// Each `key` is prefixed with its source ("ip:1.2.3.4" or "user:<id>") so the same actor
// is tracked the same way across request types.
const blockedClientSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    violations: { type: Number, default: 0 },
    // null when the block is permanent (admin must clear it from the DB).
    bannedUntil: { type: Date, default: null },
    permanent: { type: Boolean, default: false },
    firstViolationAt: { type: Date, default: Date.now },
    lastViolationAt: { type: Date, default: Date.now },
    // Useful for debugging — which endpoint(s) tripped this client.
    reason: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BlockedClient', blockedClientSchema);
