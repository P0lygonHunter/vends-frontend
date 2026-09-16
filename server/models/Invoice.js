const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true, index: true },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  schoolName: { type: String, required: true },
  schoolEmail: { type: String, required: true },
  plan: { type: String, required: true },
  planLabel: { type: String, required: true },
  amount: { type: Number, required: true },
  methodLabel: { type: String, required: true },
  transactionId: { type: String, required: true },
  status: { type: String, default: 'PAID' },
  paidAt: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
