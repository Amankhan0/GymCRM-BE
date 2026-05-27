const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    // Owner = the gym admin who created this record. Used to scope every query so gyms can't see each other's data.
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Phone must be a 10-digit number starting with 6-9'],
    },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'male' },
    dob: { type: Date },
    address: { type: String, trim: true },

    membershipPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipPlan' },
    trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer' },

    joinDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'expired', 'inactive'], default: 'active' },

    avatar: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

memberSchema.index({ name: 'text', email: 'text', phone: 'text' });

// Per-gym unique email. Partial index so members without an email don't collide on null.
memberSchema.index(
  { owner: 1, email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);

memberSchema.pre('save', function (next) {
  if (this.expiryDate && this.expiryDate < new Date()) {
    this.status = 'expired';
  }
  next();
});

module.exports = mongoose.model('Member', memberSchema);
