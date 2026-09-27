const mongoose = require('mongoose');

// One conversation per parent (or per teacher) per school — exactly like a single
// WhatsApp chat thread with "the school." Not per-student: a parent with three
// children still has ONE conversation, same as one WhatsApp chat covers everything
// you discuss with that contact.
const ConversationSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  participantType: { type: String, enum: ['parent', 'teacher'], required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', default: null },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
  lastMessageAt: { type: Date, default: Date.now },
  lastMessagePreview: { type: String, default: '' },
  unreadByAdmin: { type: Number, default: 0 },
  unreadByParticipant: { type: Number, default: 0 },
}, { timestamps: true });

ConversationSchema.index({ schoolId: 1, participantType: 1, parentId: 1 }, { unique: true, partialFilterExpression: { parentId: { $type: 'objectId' } } });
ConversationSchema.index({ schoolId: 1, participantType: 1, teacherId: 1 }, { unique: true, partialFilterExpression: { teacherId: { $type: 'objectId' } } });
ConversationSchema.index({ schoolId: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
