const mongoose = require('mongoose');

const FeePaymentSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  feeRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeRecord', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  amount: { type: Number, min: 0.01, required: true },
  method: { type: String, enum: ['Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa', 'Other'], required: true },
  reference: { type: String, trim: true, default: '' },
  paidAt: { type: Date, default: Date.now },
  receiptNumber: { type: String, required: true, unique: true }
}, { timestamps: true });
module.exports = mongoose.model('FeePayment', FeePaymentSchema);
