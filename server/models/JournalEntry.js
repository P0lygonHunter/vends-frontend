const mongoose = require('mongoose');

const JournalEntrySchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  sourceType: { type: String, enum: ['FeePayment', 'Expense', 'Payroll'], required: true },
  sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  date: { type: Date, default: Date.now },
  description: { type: String, required: true },
  lines: [{ account: { type: String, required: true }, debit: { type: Number, min: 0, default: 0 }, credit: { type: Number, min: 0, default: 0 } }]
}, { timestamps: true });
JournalEntrySchema.index({ schoolId: 1, sourceType: 1, sourceId: 1 }, { unique: true });
module.exports = mongoose.model('JournalEntry', JournalEntrySchema);
