const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', default: null },
  classSectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection', default: null },
  studentName: { type: String, required: true },
  grade: { type: String, default: '' },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  status: { type: String, default: 'P' }, // P = Present, A = Absent
}, { timestamps: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);