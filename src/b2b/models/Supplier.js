const mongoose = require('mongoose');

// Same shape as Customer but a distinct collection — keeps reports / queries clean and lets
// each grow independent fields later (e.g. supplier-only: leadTimeDays, paymentTermsDays).
const supplierSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },

    companyName: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true, match: [/^[6-9]\d{9}$/, 'Invalid phone'] },

    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      match: [
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        'Invalid GSTIN',
      ],
    },

    billingAddress: { type: String, trim: true },
    shippingAddress: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true, match: [/^[1-9][0-9]{5}$/, 'Invalid pincode'] },

    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

supplierSchema.index({ companyName: 'text', contactPerson: 'text', email: 'text', phone: 'text' });

module.exports = mongoose.model('Supplier', supplierSchema);
