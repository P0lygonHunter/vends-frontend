const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  rollNumber: { type: String, required: true, trim: true },
  name: { type: String, required: true },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  grade: { type: String, default: '' },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', default: null },
  classSectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection', default: null },
  age: { type: Number, default: 0 },
  status: { type: String, default: 'Active' },
}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);