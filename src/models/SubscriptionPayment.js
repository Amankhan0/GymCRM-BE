const mongoose = require('mongoose');

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Snapshot of plan details at the time of payment (in case pricing changes later).
    planKey: { type: String, enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'], required: true },
    durationDays: { type: Number, required: true },
    amount: { type: Number, required: true },
    // What the user fills in after paying via UPI/QR.
    // Globally unique — same UTR can never be re-submitted across any user.
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

module.exports = mongoose.model('SubscriptionPayment', subscriptionPaymentSchema);
