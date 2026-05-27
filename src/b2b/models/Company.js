const mongoose = require('mongoose');

// One Company per b2b signup. All b2b data (leads, customers, products, etc.) is scoped to
// `company` for multi-tenancy. The signup user becomes the company's superadmin.
const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // Indian GST format: 2-digit state + 10-char PAN + 1 entity + 1 'Z' + 1 checksum.
    // Optional at signup so freshly-registered businesses can onboard before GST is issued.
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      match: [
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        'Invalid GSTIN format',
      ],
    },

    // Used in PDFs (Quotation/Invoice headers). Kept as a single multi-line field for simplicity;
    // we can split into structured fields later if reports need state-wise filtering.
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true, match: [/^[1-9][0-9]{5}$/, 'Invalid pincode'] },

    phone: { type: String, trim: true, match: [/^[6-9]\d{9}$/, 'Invalid phone'] },
    email: { type: String, lowercase: true, trim: true },
    website: { type: String, trim: true },

    // Cloudinary URLs — uploaded via /api/b2b/upload routes. PDFs embed these directly.
    logoUrl: { type: String, trim: true },
    signatureUrl: { type: String, trim: true },

    // Bank details for invoice footer (optional).
    bankDetails: {
      accountName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      ifsc: { type: String, trim: true, uppercase: true },
      bankName: { type: String, trim: true },
      branch: { type: String, trim: true },
    },

    // Per-doc-type running counters so the next quotation/invoice/order/PO/PI auto-numbers.
    // E.g. QTN-000123, INV-000045 — much friendlier than ObjectIds in customer-facing docs.
    counters: {
      quotation: { type: Number, default: 0 },
      order: { type: Number, default: 0 },
      invoice: { type: Number, default: 0 },
      purchaseOrder: { type: Number, default: 0 },
      proformaInvoice: { type: Number, default: 0 },
    },

    // The user who signed up. Convenience pointer so we can identify the company owner cheaply.
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);
