const mongoose = require('mongoose');

const PaymentMethodSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['jazzcash', 'easypaisa', 'bank', 'other'],
    required: true,
  },
  label: { type: String, required: true, trim: true },
  accountDetail: { type: String, required: true, trim: true },
  accountTitle: { type: String, default: '', trim: true },
  instructions: { type: String, default: '', trim: true },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.models.PaymentMethod || mongoose.model('PaymentMethod', PaymentMethodSchema);
