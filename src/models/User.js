const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ['admin', 'trainer'], default: 'admin' },
    phone: { type: String, trim: true },
    avatar: { type: String },
    // Each admin signup represents one gym — gymName drives branding throughout the panel.
    gymName: { type: String, required: true, trim: true, default: 'My Gym' },

    // Subscription gating. trialEndsAt is set on signup (+7 days). subscriptionEndsAt is
    // bumped each time a SubscriptionPayment is approved by the platform super-admin.
    trialEndsAt: { type: Date },
    subscriptionEndsAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Treat the user as having access if either the trial or a paid subscription is still in the future.
userSchema.methods.hasAccess = function () {
  const now = new Date();
  if (this.subscriptionEndsAt && this.subscriptionEndsAt > now) return true;
  if (this.trialEndsAt && this.trialEndsAt > now) return true;
  return false;
};

// Returns 'trial' | 'active' | 'expired' for the client to render the right state.
userSchema.methods.subscriptionState = function () {
  const now = new Date();
  if (this.subscriptionEndsAt && this.subscriptionEndsAt > now) return 'active';
  if (this.trialEndsAt && this.trialEndsAt > now) return 'trial';
  return 'expired';
};

module.exports = mongoose.model('User', userSchema);
