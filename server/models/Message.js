const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  senderType: { type: String, enum: ['admin', 'parent', 'teacher'], required: true },
  text: { type: String, default: '', trim: true, maxlength: 4000 },
  mediaType: { type: String, enum: ['none', 'image', 'audio'], default: 'none' },
  mediaData: { type: String, default: '' },
  readAt: { type: Date, default: null },
  /** WhatsApp-style reply quote */
  replyTo: {
    messageId: { type: mongoose.Schema.Types.ObjectId, default: null },
    text: { type: String, default: '' },
    mediaType: { type: String, default: 'none' },
    senderType: { type: String, default: '' },
  },
}, { timestamps: true });

MessageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', MessageSchema);
