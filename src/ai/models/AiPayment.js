const mongoose = require('mongoose');

// A user-submitted UPI payment for an AI credit pack / plan. Owner verifies the UTR and approves,
// which grants the plan's credits. Mirrors the gym SubscriptionPayment flow (manual approval, no
// payment gateway) but is credit-based.
const aiPaymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Snapshot of plan details at payment time (in case pricing changes later).
    planKey: { type: String, enum: ['starter', 'pro', 'ultra'], required: true },
    credits: { type: Number, required: true },
    durationDays: { type: Number, default: 30 },
    amount: { type: Number, required: true },
    // The UPI transaction reference the user enters after paying. Globally unique so the same UTR
    // can never be submitted twice.
    utr: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      match: [/^[A-Za-z0-9]{6,30}$/, 'UTR must be 6-30 alphanumeric characters'],
    },
    paidAt: { type: Date, required: true },
    notes: { type: String, trim: true },

    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AiPayment', aiPaymentSchema);
