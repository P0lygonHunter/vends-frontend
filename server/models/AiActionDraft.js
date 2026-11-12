const mongoose = require('mongoose');
const AiActionDraftSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  type: { type: String, enum: ['fee_reminder', 'absence_today', 'weekly_summary', 'monthly_attendance', 'teacher_message', 'event_notice'], required: true, index: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'sent', 'failed'], default: 'pending', index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  studentName: { type: String, default: '' },
  grade: { type: String, default: '' },
  classSectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection', default: null },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', default: null },
  parentName: { type: String, default: '' },
  parentPhone: { type: String, default: '' },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
  teacherName: { type: String, default: '' },
  targetAudience: { type: String, enum: ['parent', 'teacher', 'event'], default: 'parent' },
  body: { type: String, required: true, trim: true, maxlength: 2000 },
  groupKey: { type: String, default: '', index: true },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  source: { type: String, enum: ['rules', 'ai'], default: 'rules' },
  tokensEstimate: { type: Number, default: 0 },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', default: null },
  sentMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  error: { type: String, default: '' },
  approvedAt: { type: Date, default: null },
  rejectedAt: { type: Date, default: null },
  sentAt: { type: Date, default: null },
}, { timestamps: true });
AiActionDraftSchema.index({ schoolId: 1, status: 1, createdAt: -1 });
module.exports = mongoose.models.AiActionDraft || mongoose.model('AiActionDraft', AiActionDraftSchema);
