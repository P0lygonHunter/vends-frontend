const mongoose = require('mongoose');

const FeePaymentSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  feeRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeRecord', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  amount: { type: Number, min: 0.01, required: true },
  method: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa', 'Other'],
    required: true
  },
  reference: { type: String, trim: true, default: '' },
  // Base64 data URL – size & mime validated in controller. Prefer cloud storage later.
  screenshot: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Completed', 'Pending Verification', 'Rejected'],
    default: 'Completed',
    index: true
  },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  verifiedAt: { type: Date, default: null },
  rejectionReason: { type: String, trim: true, default: '' },
  paidAt: { type: Date, default: Date.now },
  receiptNumber: { type: String, required: true, unique: true }
}, { timestamps: true });

FeePaymentSchema.index({ schoolId: 1, status: 1 });
FeePaymentSchema.index({ schoolId: 1, method: 1, paidAt: -1 });

module.exports = mongoose.model('FeePayment', FeePaymentSchema);

