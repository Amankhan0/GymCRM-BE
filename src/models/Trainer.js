const mongoose = require('mongoose');

const trainerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
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

module.exports = mongoose.model('Trainer', trainerSchema);
