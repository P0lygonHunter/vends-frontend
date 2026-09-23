const mongoose = require('mongoose');

// A Parent account belongs to exactly one school (tenant) and can be linked to
// more than one Student within that school — e.g. two siblings at the same school
// share one parent login. Registration verifies the parent already knows the
// student's roll number AND the phone number on file for that student, so a
// stranger cannot self-register against a roll number they merely guessed.
const ParentSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true }],
}, { timestamps: true });

// One parent account per phone number per school.
ParentSchema.index({ schoolId: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('Parent', ParentSchema);
