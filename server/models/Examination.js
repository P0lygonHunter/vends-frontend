const mongoose = require('mongoose');

const ExaminationSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  classSectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection', required: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  maximumMarks: { type: Number, min: 1, required: true },
  passMarks: { type: Number, min: 0, required: true },
  status: { type: String, enum: ['Draft', 'Marks Pending', 'Published'], default: 'Draft' }
}, { timestamps: true });

ExaminationSchema.index({ schoolId: 1, academicYearId: 1, classSectionId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Examination', ExaminationSchema);
