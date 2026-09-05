const mongoose = require('mongoose');

const ClassSectionSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  name: { type: String, required: true, trim: true },
  room: { type: String, default: '', trim: true },
  capacity: { type: Number, min: 1, default: 40 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

ClassSectionSchema.index({ schoolId: 1, academicYearId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('ClassSection', ClassSectionSchema);
