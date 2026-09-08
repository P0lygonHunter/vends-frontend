const mongoose = require('mongoose');

const TimetableEntrySchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  classSectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
  day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  room: { type: String, default: '' }
}, { timestamps: true });

TimetableEntrySchema.index({ schoolId: 1, classSectionId: 1, day: 1, startTime: 1 }, { unique: true });
module.exports = mongoose.model('TimetableEntry', TimetableEntrySchema);
