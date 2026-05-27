const mongoose = require('mongoose');

const trainerSchema = new mongoose.Schema(
  {
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
    specialization: { type: String, trim: true },
    experience: { type: Number, default: 0 },
    salary: { type: Number, default: 0 },
    joinDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    avatar: { type: String },
    bio: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

trainerSchema.virtual('assignedMembers', {
  ref: 'Member',
  localField: '_id',
  foreignField: 'trainer',
});

trainerSchema.set('toJSON', { virtuals: true });
trainerSchema.set('toObject', { virtuals: true });

// Per-gym unique email. Partial index so trainers without an email don't collide.
trainerSchema.index(
  { owner: 1, email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);

module.exports = mongoose.model('Trainer', trainerSchema);
