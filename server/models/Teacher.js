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
  /** FCM device tokens for web push */
  fcmTokens: [{ type: String }],
}, { timestamps: true });

TeacherSchema.index({ schoolId: 1 });
TeacherSchema.index({ schoolId: 1, phone: 1 });
TeacherSchema.index({ schoolId: 1, status: 1 });

module.exports = mongoose.model('Teacher', TeacherSchema);

