const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { isValidChatImage, isValidChatAudio } = require('../utils/mediaValidation');

exports.findOrCreateConversation = async (schoolId, participantType, participantId) => {
  const filter = { schoolId, participantType };
  if (participantType === 'parent') filter.parentId = participantId;
  else filter.teacherId = participantId;

  let conversation = await Conversation.findOne(filter);
  if (!conversation) {
    conversation = await Conversation.create({
      schoolId,
      participantType,
      parentId: participantType === 'parent' ? participantId : null,
      teacherId: participantType === 'teacher' ? participantId : null,
    });
  }
  return conversation;
};

exports.postMessage = async (conversation, senderType, payload) => {
  const body = typeof payload === 'string' ? { text: payload } : (payload || {});
  let text = String(body.text || '').trim();
  let mediaType = body.mediaType || 'none';
  let mediaData = body.mediaData || '';

  if (!['none', 'image', 'audio'].includes(mediaType)) throw new Error('Invalid media type.');

  if (mediaType === 'image') {
    if (!isValidChatImage(mediaData)) throw new Error('Image must be JPEG/PNG/WebP under ~500KB.');
    if (!text) text = '📷 Photo';
  } else if (mediaType === 'audio') {
    if (!isValidChatAudio(mediaData)) throw new Error('Voice note must be a short audio clip under ~1MB.');
    if (!text) text = '🎤 Voice note';
  } else {
    mediaData = '';
    if (!text) throw new Error('Message cannot be empty.');
  }

  if (text.length > 4000) throw new Error('Message is too long.');

  const message = await Message.create({
    schoolId: conversation.schoolId,
    conversationId: conversation._id,
    senderType,
    text,
    mediaType,
    mediaData: mediaType === 'none' ? '' : mediaData,
    readAt: null,
  });

  conversation.lastMessageAt = message.createdAt;
  conversation.lastMessagePreview = text.slice(0, 120);
  if (senderType === 'admin') conversation.unreadByParticipant += 1;
  else conversation.unreadByAdmin += 1;
  await conversation.save();

  return message;
};

exports.markMessagesRead = async (conversationId, readerSide) => {
  const filter =
    readerSide === 'admin'
      ? { conversationId, senderType: { $in: ['parent', 'teacher'] }, readAt: null }
      : { conversationId, senderType: 'admin', readAt: null };
  const result = await Message.updateMany(filter, { $set: { readAt: new Date() } });
  return result.modifiedCount;
};
