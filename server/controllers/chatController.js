const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// One conversation per participant per school — created lazily on first use
// (whichever side sends or opens the thread first), same as WhatsApp doesn't
// make you "create a chat" separately from just sending the first message.
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

exports.postMessage = async (conversation, senderType, text) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) throw new Error('Message cannot be empty.');
  if (trimmed.length > 4000) throw new Error('Message is too long.');

  const message = await Message.create({
    schoolId: conversation.schoolId,
    conversationId: conversation._id,
    senderType,
    text: trimmed,
  });

  conversation.lastMessageAt = message.createdAt;
  conversation.lastMessagePreview = trimmed.slice(0, 120);
  if (senderType === 'admin') conversation.unreadByParticipant += 1;
  else conversation.unreadByAdmin += 1;
  await conversation.save();

  return message;
};
