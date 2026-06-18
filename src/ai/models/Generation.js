const mongoose = require('mongoose');

// One row per image/video the user generates — powers the History page.
const generationSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['image', 'video'], required: true },
    prompt: { type: String, required: true, trim: true },
    // Free-form options the user picked (aspectRatio/style/quality OR duration/format/resolution).
    options: { type: Object, default: {} },
    url: { type: String },
    status: { type: String, enum: ['done', 'pending', 'failed'], default: 'done' },
    creditsUsed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

generationSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model('Generation', generationSchema);
