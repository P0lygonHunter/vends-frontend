const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  schoolName: { type: String, required: true },
  schoolEmail: { type: String, required: true },
  plan: { type: String, enum: ['lite', 'zk'], required: true },
  amount: { type: Number, required: true, min: 0 },
  methodType: { type: String, required: true },
  methodLabel: { type: String, required: true },
  accountDetail: { type: String, default: '' },
  transactionId: { type: String, required: true, trim: true },
  notes: { type: String, default: '', trim: true },
  status: {
    type: String,
    enum: ['pending', 'paid', 'rejected', 'failed'],
    default: 'pending',
    index: true,
  },
  invoiceNumber: { type: String, default: null },
  approvedAt: { type: Date, default: null },
  rejectedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: '' },
}, { timestamps: true });

PaymentSchema.index({ schoolId: 1, status: 1 });
PaymentSchema.index({ transactionId: 1, schoolId: 1 });

module.exports = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
