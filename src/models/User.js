const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Phone must be a 10-digit number starting with 6-9'],
    },
    avatar: { type: String },

    // Which product this user belongs to. Defaults to 'gym' so existing rows are treated as gym.
    product: { type: String, enum: ['gym', 'b2b'], default: 'gym', required: true, index: true },

    // Role meaning depends on product:
    //  - gym:  'admin'      (only role; gym owner)
    //  - b2b:  'superadmin' (company owner / signup user)  OR  'admin' (invited team member)
    //  - 'trainer' is reserved for future gym multi-user (not currently used at signup).
    role: { type: String, enum: ['admin', 'trainer', 'superadmin'], default: 'admin' },

    // gym-only — name of the gym (drives branding).
    gymName: { type: String, trim: true },

    // b2b-only — the company this user belongs to. Multi-tenant data is scoped by this.
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },

    // b2b 'admin' role only — per-section / per-action permissions configured by the
    // company superadmin. Shape: { leads: { view, create, edit, delete }, customers: {...}, ... }
    // For 'superadmin' this is ignored (full access).
    permissions: { type: Object, default: {} },

    // Subscription gating (shared across products). trialEndsAt is set on signup (+7 days).
    // subscriptionEndsAt is bumped each time a SubscriptionPayment is approved.
    trialEndsAt: { type: Date },
    subscriptionEndsAt: { type: Date },
  },
  { timestamps: true }
);

// Per-product unique email: same email may register in gym AND b2b as separate accounts.
userSchema.index({ email: 1, product: 1 }, { unique: true });

// Custom validation: gymName required for product=gym, company required for product=b2b.
userSchema.pre('validate', function (next) {
  if (this.product === 'gym' && !this.gymName) {
    this.invalidate('gymName', 'gymName is required for gym users');
  }
  if (this.product === 'b2b' && !this.company) {
    this.invalidate('company', 'company is required for b2b users');
  }
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.hasAccess = function () {
  const now = new Date();
  if (this.subscriptionEndsAt && this.subscriptionEndsAt > now) return true;
  if (this.trialEndsAt && this.trialEndsAt > now) return true;
  return false;
};

userSchema.methods.subscriptionState = function () {
  const now = new Date();
  if (this.subscriptionEndsAt && this.subscriptionEndsAt > now) return 'active';
  if (this.trialEndsAt && this.trialEndsAt > now) return 'trial';
  return 'expired';
};

module.exports = mongoose.model('User', userSchema);
