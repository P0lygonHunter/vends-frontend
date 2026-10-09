const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const School = require('../models/School');
const { isValidChatImage, isValidChatAudio } = require('../utils/mediaValidation');
const { chatCapsForPlan, effectivePlanKey, planAllows } = require('../config/moduleAccess');
const fcmService = require('../services/fcmService');
const Parent = require('../models/Parent');
const Teacher = require('../models/Teacher');

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

  let replyTo = undefined;
  if (body.replyTo && (body.replyTo.messageId || body.replyTo.text)) {
    replyTo = {
      messageId: body.replyTo.messageId || null,
      text: String(body.replyTo.text || '').slice(0, 200),
      mediaType: body.replyTo.mediaType || 'none',
      senderType: body.replyTo.senderType || '',
    };
  }

  const message = await Message.create({
    schoolId: conversation.schoolId,
    conversationId: conversation._id,
    senderType,
    text,
    mediaType,
    mediaData: mediaType === 'none' ? '' : mediaData,
    readAt: null,
    replyTo: replyTo || undefined,
  });

  conversation.lastMessageAt = message.createdAt;
  conversation.lastMessagePreview = text.slice(0, 120);
  if (senderType === 'admin') conversation.unreadByParticipant += 1;
  else conversation.unreadByAdmin += 1;
  await conversation.save();

  // Phase 5B — push to the other side (best-effort, never block send)
  setImmediate(() => {
    notifyChatPush(conversation, senderType, text, message).catch(() => {});
  });

  return message;
};

async function notifyChatPush(conversation, senderType, text, message) {
  try {
    const preview = (text || (message.mediaType === 'image' ? '📷 Photo' : message.mediaType === 'audio' ? '🎤 Voice note' : 'New message')).slice(0, 120);
    const title = 'V-Community';
    const data = {
      type: 'chat',
      conversationId: String(conversation._id),
      link: senderType === 'admin' ? '/open' : '/communication-center',
    };
    if (senderType === 'admin') {
      if (conversation.participantType === 'parent') {
        const parent = await Parent.findById(conversation.parentId).select('fcmTokens');
        const pTokens = parent?.fcmTokens || [];
        console.log('[FCM] chat→parent tokens', pTokens.length, 'parentId', String(conversation.parentId));
        if (pTokens.length) {
          const r = await fcmService.sendToTokens(pTokens, { title, body: preview, data: { ...data, link: '/parent/dashboard' } });
          console.log('[FCM] chat→parent result', r);
          if (r.invalid?.length) await fcmService.pruneTokens(parent, r.invalid);
        } else {
          console.warn('[FCM] chat→parent SKIPPED — no fcmTokens on parent. Parent must open app and Allow notifications.');
        }
      } else if (conversation.participantType === 'teacher') {
        const teacher = await Teacher.findById(conversation.teacherId).select('fcmTokens');
        const tTokens = teacher?.fcmTokens || [];
        console.log('[FCM] chat→teacher tokens', tTokens.length);
        if (tTokens.length) {
          const r = await fcmService.sendToTokens(tTokens, { title, body: preview, data: { ...data, link: '/teacher/dashboard' } });
          console.log('[FCM] chat→teacher result', r);
          if (r.invalid?.length) await fcmService.pruneTokens(teacher, r.invalid);
        }
      }
    } else {
      const school = await School.findById(conversation.schoolId).select('fcmTokens');
      const sTokens = school?.fcmTokens || [];
      console.log('[FCM] chat→school tokens', sTokens.length);
      if (sTokens.length) {
        const who = senderType === 'teacher' ? 'Teacher' : 'Parent';
        const r = await fcmService.sendToTokens(sTokens, {
          title,
          body: `${who}: ${preview}`,
          data: { ...data, link: '/communication-center' },
        });
        console.log('[FCM] chat→school result', r);
        if (r.invalid?.length) await fcmService.pruneTokens(school, r.invalid);
      } else {
        console.warn('[FCM] chat→school SKIPPED — no fcmTokens on school admin device');
      }
    }
  } catch (err) {
    console.error('[FCM] chat push error:', err.message);
  }
}

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
    chatEnabled: planAllows(school.plan, 'chat'),
    ...caps,
    imageUsed,
    audioUsed,
  };
};
