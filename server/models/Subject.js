const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  description: { type: String, default: '', trim: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

SubjectSchema.index({ schoolId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Subject', SubjectSchema);
