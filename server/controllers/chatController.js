const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const School = require('../models/School');
const { isValidChatImage, isValidChatAudio } = require('../utils/mediaValidation');
const { chatCapsForPlan, effectivePlanKey } = require('../config/moduleAccess');

function currentMonthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function assertAndBumpMediaUsage(schoolId, mediaType) {
  if (mediaType !== 'image' && mediaType !== 'audio') return;

  const school = await School.findById(schoolId).select('plan chatUsageMonth chatImageCount chatAudioCount');
  if (!school) throw new Error('School not found.');

  const caps = chatCapsForPlan(school.plan);
  if (mediaType === 'image' && !caps.image) {
    throw new Error('Photo attachments require Standard plan or higher. Upgrade from Subscription.');
  }
  if (mediaType === 'audio' && !caps.audio) {
    throw new Error('Voice notes require Standard plan or higher. Upgrade from Subscription.');
  }

  const month = currentMonthKey();
  if (school.chatUsageMonth !== month) {
    school.chatUsageMonth = month;
    school.chatImageCount = 0;
    school.chatAudioCount = 0;
  }

  if (mediaType === 'image' && caps.imageMonthly != null) {
    if (school.chatImageCount >= caps.imageMonthly) {
      throw new Error(`Monthly photo limit reached (${caps.imageMonthly}/month on your plan).`);
    }
    school.chatImageCount += 1;
  }
  if (mediaType === 'audio' && caps.audioMonthly != null) {
    if (school.chatAudioCount >= caps.audioMonthly) {
      throw new Error(`Monthly voice-note limit reached (${caps.audioMonthly}/month on your plan).`);
    }
    school.chatAudioCount += 1;
  }

  await school.save();
  return caps;
}

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

  let caps = chatCapsForPlan('starter');
  if (mediaType === 'image' || mediaType === 'audio') {
    caps = (await assertAndBumpMediaUsage(conversation.schoolId, mediaType)) || caps;
  } else {
    const school = await School.findById(conversation.schoolId).select('plan');
    if (school) caps = chatCapsForPlan(school.plan);
  }

  if (mediaType === 'image') {
    if (!isValidChatImage(mediaData, caps.maxImageChars || 700000)) {
      throw new Error('Image must be JPEG/PNG/WebP within your plan size limit.');
    }
    if (!text) text = '📷 Photo';
  } else if (mediaType === 'audio') {
    if (!isValidChatAudio(mediaData, caps.maxAudioChars || 1500000)) {
      throw new Error('Voice note must be a short audio clip within your plan limit.');
    }
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

exports.getChatCapabilitiesForSchool = async (schoolId) => {
  const school = await School.findById(schoolId).select('plan chatUsageMonth chatImageCount chatAudioCount');
  if (!school) return null;
  const caps = chatCapsForPlan(school.plan);
  const month = currentMonthKey();
  const imageUsed = school.chatUsageMonth === month ? school.chatImageCount : 0;
  const audioUsed = school.chatUsageMonth === month ? school.chatAudioCount : 0;
  return {
    plan: school.plan,
    effectivePlan: effectivePlanKey(school.plan),
    ...caps,
    imageUsed,
    audioUsed,
  };
};
