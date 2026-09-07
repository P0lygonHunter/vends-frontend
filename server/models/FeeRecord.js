const mongoose = require('mongoose');

const FeeRecordSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  classSectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection', default: null },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', default: null },
  feeType: { type: String, required: true, trim: true },
  month: { type: String, required: true, trim: true },
  amount: { type: Number, min: 0, required: true },
  paid: { type: Number, min: 0, default: 0 },
  balance: { type: Number, min: 0, default: 0 },
  dueDate: { type: Date, default: null },
  status: { type: String, enum: ['Paid', 'Pending', 'Overdue'], default: 'Pending' }
}, { timestamps: true });

FeeRecordSchema.index({ schoolId: 1, studentId: 1, month: 1, feeType: 1 }, { unique: true });

module.exports = mongoose.model('FeeRecord', FeeRecordSchema);
