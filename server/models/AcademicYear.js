const mongoose = require('mongoose');

const AcademicYearSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  name: { type: String, required: true, trim: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  isCurrent: { type: Boolean, default: false }
}, { timestamps: true });

AcademicYearSchema.index({ schoolId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('AcademicYear', AcademicYearSchema);
