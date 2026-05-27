const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },

    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    // SKU is the user's own product code. We don't enforce a format — every business has its own.
    // (company, sku) is a partial unique compound index below: enforced only when sku is present.
    sku: { type: String, trim: true, uppercase: true },

    // HSN/SAC code drives GST classification on invoices.
    hsnCode: { type: String, trim: true, uppercase: true },

    // We store gstPercent only (e.g. 0, 5, 12, 18, 28). CGST/SGST are derived as half each at
    // PDF generation time for intra-state, or used as IGST for inter-state — no point keeping
    // three values in sync in the DB.
    gstPercent: { type: Number, default: 18, min: 0, max: 50 },

    // Pre-GST unit price. Tax is added on top at invoice/quotation time.
    price: { type: Number, required: true, min: 0 },

    unit: { type: String, trim: true, default: 'pcs' }, // pcs, kg, m, ltr, hr, etc.
    stockQuantity: { type: Number, default: 0, min: 0 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Search across name, description, SKU, HSN — power search across the visible columns.
productSchema.index({ name: 'text', description: 'text', sku: 'text', hsnCode: 'text' });

// Partial unique: same SKU can't be used twice within a company. Empty/missing SKU is allowed.
productSchema.index(
  { company: 1, sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $type: 'string' } } }
);

module.exports = mongoose.model('Product', productSchema);
