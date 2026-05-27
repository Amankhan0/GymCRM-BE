const mongoose = require('mongoose');

// Pipeline stages. Order matters — UI tabs render in this sequence.
const LEAD_STATUS = ['new', 'contacted', 'interested', 'converted', 'lost'];
const LEAD_SOURCE = ['website', 'referral', 'cold-call', 'social-media', 'trade-show', 'advertisement', 'other'];

const leadSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },

    // Who — at least name; everything else is best-effort.
    name: { type: String, required: true, trim: true },
    contactCompany: { type: String, trim: true }, // their company name
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true, match: [/^[6-9]\d{9}$/, 'Invalid phone'] },

    source: { type: String, enum: LEAD_SOURCE, default: 'other' },
    status: { type: String, enum: LEAD_STATUS, default: 'new', index: true },

    estimatedValue: { type: Number, min: 0 },
    description: { type: String, trim: true }, // requirements / what they want
    notes: { type: String, trim: true },
    followUpDate: { type: Date },

    // Who in the company owns the follow-up. Optional — useful once employee invites land in Phase 6.
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Convert tracking. In Phase 3 we just mark conversion; in Phase 4 we'll also auto-create a
    // Quotation and link its id here so the lead's full lifecycle is visible.
    convertedAt: { type: Date },
    convertedToQuotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },

    lostReason: { type: String, trim: true },
  },
  { timestamps: true }
);

leadSchema.index({ name: 'text', contactCompany: 'text', email: 'text', phone: 'text' });
// Compound index speeds up the status-filtered list views (the default sort is createdAt desc).
leadSchema.index({ company: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);
module.exports.LEAD_STATUS = LEAD_STATUS;
module.exports.LEAD_SOURCE = LEAD_SOURCE;
