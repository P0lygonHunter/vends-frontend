const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  name: { type: String, required: true },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  subject: { type: String, default: '' },
  grades: { type: String, default: '' },
  status: { type: String, default: 'Active' },
  password: { type: String, default: '' },
  photo: { type: String, default: '' },
  lastSeenAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Teacher', TeacherSchema);
