const mongoose = require('mongoose');

// A notification always targets exactly one Student or one Teacher, never a
// Parent account directly. This means it shows up for a parent as soon as they
// link to that student — even if they register on V Community after the
// notification was already sent — instead of being lost if no Parent account
// existed yet at broadcast time.
const NotificationSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  audience: { type: String, enum: ['student', 'teacher'], required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
  category: { type: String, enum: ['Announcement', 'Fee Reminder', 'Attendance', 'Result', 'Exam', 'Event', 'Admission'], default: 'Announcement' },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  read: { type: Boolean, default: false },
}, { timestamps: true });

NotificationSchema.index({ schoolId: 1, audience: 1, studentId: 1, createdAt: -1 });
NotificationSchema.index({ schoolId: 1, audience: 1, teacherId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
