const mongoose = require('mongoose');

const membershipPlanSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    duration: { type: String, enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'], required: true },
    durationInDays: { type: Number, required: true },
    price: { type: Number, required: true, min: 0 },
    features: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MembershipPlan', membershipPlanSchema);
