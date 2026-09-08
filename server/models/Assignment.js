const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  classSectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['Assigned', 'Closed'], default: 'Assigned' }
}, { timestamps: true });
module.exports = mongoose.model('Assignment', AssignmentSchema);
