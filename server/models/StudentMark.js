const mongoose = require('mongoose');

const StudentMarkSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  examinationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Examination', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  obtainedMarks: { type: Number, min: 0, required: true },
  percentage: { type: Number, min: 0, max: 100, required: true },
  grade: { type: String, default: '' }
}, { timestamps: true });

StudentMarkSchema.index({ examinationId: 1, studentId: 1, subjectId: 1 }, { unique: true });

module.exports = mongoose.model('StudentMark', StudentMarkSchema);
