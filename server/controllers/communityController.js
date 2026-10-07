const fcmService = require('../services/fcmService');
const ParentModel = require('../models/Parent');
const TeacherModel = require('../models/Teacher');
const Parent = require('../models/Parent');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { findOrCreateConversation, postMessage, markMessagesRead } = require('./chatController');
const { verifyPassword } = require('../middleware/passwords');
const { signToken } = require('../middleware/auth');

// One phone number could theoretically exist in both the Parent and Teacher
// collections for the same school (e.g. a teacher whose own child studies there).
// We check Parent first, then Teacher — whichever one the submitted password
// actually matches wins. If neither matches, we don't reveal which collection
// the phone was (or wasn't) found in — just a generic invalid-credentials error.
exports.communityLogin = async (req, res) => {
  try {
    const { schoolId, phone, password } = req.body;
    const normalizedPhone = String(phone || '').trim();
    if (!schoolId) return res.status(400).json({ error: 'Missing school reference in link.' });

    const parent = await Parent.findOne({ schoolId, phone: normalizedPhone });
    if (parent && (await verifyPassword(password || '', parent.password))) {
      const token = signToken({ role: 'parent', schoolId: String(schoolId), parentId: String(parent._id) });
      const safe = parent.toObject();
      delete safe.password;
      return res.json({ role: 'parent', token, account: safe });
    }

    const teacher = await Teacher.findOne({ schoolId, phone: normalizedPhone });
    if (teacher && teacher.password && (await verifyPassword(password || '', teacher.password))) {
      const token = signToken({ role: 'teacher', schoolId: String(schoolId), teacherId: String(teacher._id) });
      const safe = teacher.toObject();
      delete safe.password;
      return res.json({ role: 'teacher', token, account: safe });
    }

    return res.status(401).json({ error: 'Invalid phone number or password.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin's Communication Center: pick an audience (all/class/selected students, or
// all/selected teachers), write a message, and it fans out into one Notification
// document per targeted student or teacher.
exports.sendBroadcast = async (req, res) => {
  try {
    const { audience, mode = 'all', classSectionId, ids = [], category = 'Announcement', title, message } = req.body;
    const schoolId = req.schoolId;

    if (!['student', 'teacher'].includes(audience)) {
      return res.status(400).json({ error: 'Audience must be "student" or "teacher".' });
    }
    if (!String(title || '').trim() || !String(message || '').trim()) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }

    let targetIds = [];

    if (audience === 'student') {
      let query = { schoolId };
      if (mode === 'class') {
        if (!classSectionId) return res.status(400).json({ error: 'classSectionId is required for class-wise broadcast.' });
        query.classSectionId = classSectionId;
      } else if (mode === 'selected') {
        if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Select at least one student.' });
        query._id = { $in: ids };
      }
      const students = await Student.find(query).select('_id');
      targetIds = students.map(s => s._id);
    } else {
      let query = { schoolId };
      if (mode === 'selected') {
        if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Select at least one teacher.' });
        query._id = { $in: ids };
      }
      const teachers = await Teacher.find(query).select('_id');
      targetIds = teachers.map(t => t._id);
    }

    if (targetIds.length === 0) {
      return res.status(400).json({ error: 'No matching recipients found for that selection.' });
    }

    const docs = targetIds.map(id => ({
      schoolId,
      audience,
      studentId: audience === 'student' ? id : null,
      teacherId: audience === 'teacher' ? id : null,
      category,
      title: String(title).trim(),
      message: String(message).trim(),
    }));

    await Notification.insertMany(docs);
    setImmediate(() => {
      pushBroadcastFcm(req.schoolId, audience, docs, title, message).catch(() => {});
    });
    res.status(201).json({ sent: docs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Bulk 1:1 chat: same text into each selected parent/teacher conversation (ticks apply when read).
// Optional alsoNotify creates Notification rows for linked students / teachers (legacy feed).
exports.sendBulkChat = async (req, res) => {
  try {
    const schoolId = req.schoolId;
    const {
      participantType = 'parent',
      mode = 'selected',
      ids = [],
      classSectionId,
      text,
      alsoNotify = false,
      category = 'Announcement',
      title = '',
    } = req.body;

    if (!['parent', 'teacher'].includes(participantType)) {
      return res.status(400).json({ error: 'participantType must be parent or teacher.' });
    }
    const bodyText = String(text || '').trim();
    if (!bodyText) return res.status(400).json({ error: 'Message text is required.' });
    if (bodyText.length > 4000) return res.status(400).json({ error: 'Message is too long.' });

    let participantIds = [];

    if (participantType === 'parent') {
      if (mode === 'all') {
        const parents = await Parent.find({ schoolId }).select('_id');
        participantIds = parents.map((p) => p._id);
      } else if (mode === 'class') {
        if (!classSectionId) return res.status(400).json({ error: 'classSectionId required for class mode.' });
        const students = await Student.find({ schoolId, classSectionId }).select('_id');
        const sids = students.map((s) => s._id);
        if (sids.length === 0) return res.status(400).json({ error: 'No students in that class.' });
        const parents = await Parent.find({ schoolId, studentIds: { $in: sids } }).select('_id');
        participantIds = parents.map((p) => p._id);
      } else {
        if (!Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({ error: 'Select at least one parent.' });
        }
        const parents = await Parent.find({ schoolId, _id: { $in: ids } }).select('_id');
        participantIds = parents.map((p) => p._id);
      }
    } else {
      if (mode === 'all') {
        const teachers = await Teacher.find({ schoolId, password: { $ne: '' } }).select('_id');
        participantIds = teachers.map((t) => t._id);
      } else {
        if (!Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({ error: 'Select at least one teacher.' });
        }
        const teachers = await Teacher.find({ schoolId, _id: { $in: ids } }).select('_id');
        participantIds = teachers.map((t) => t._id);
      }
    }

    // unique
    participantIds = [...new Map(participantIds.map((id) => [String(id), id])).values()];
    if (participantIds.length === 0) {
      return res.status(400).json({ error: 'No matching registered contacts found.' });
    }

    let sent = 0;
    for (const pid of participantIds) {
      const conversation = await findOrCreateConversation(schoolId, participantType, pid);
      await postMessage(conversation, 'admin', { text: bodyText });
      sent += 1;
    }

    let notified = 0;
    if (alsoNotify) {
      const notifyTitle = String(title || bodyText).trim().slice(0, 120) || 'School message';
      if (participantType === 'parent') {
        const parents = await Parent.find({ schoolId, _id: { $in: participantIds } }).select('studentIds');
        const studentIds = [...new Set(parents.flatMap((p) => (p.studentIds || []).map(String)))];
        if (studentIds.length) {
          const docs = studentIds.map((sid) => ({
            schoolId,
            audience: 'student',
            studentId: sid,
            teacherId: null,
            category,
            title: notifyTitle,
            message: bodyText,
          }));
          await Notification.insertMany(docs);
          setImmediate(() => {
            pushBroadcastFcm(schoolId, 'student', docs, notifyTitle, bodyText).catch(() => {});
          });
          notified = docs.length;
        }
      } else {
        const docs = participantIds.map((tid) => ({
          schoolId,
          audience: 'teacher',
          studentId: null,
          teacherId: tid,
          category,
          title: notifyTitle,
          message: bodyText,
        }));
        await Notification.insertMany(docs);
        setImmediate(() => {
          pushBroadcastFcm(schoolId, 'teacher', docs, notifyTitle, bodyText).catch(() => {});
        });
        notified = docs.length;
      }
    }

    res.status(201).json({ sent, notified, participantType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin's chat inbox: every parent/teacher conversation for this school, newest
// first, with the participant's name/photo and how many admin hasn't read yet.


exports.listContacts = async (req, res) => {
  try {
    const type = req.query.type === 'teacher' ? 'teacher' : 'parent';
    const schoolId = req.schoolId;
    if (type === 'parent') {
      const parents = await Parent.find({ schoolId }).select('name phone photo lastSeenAt studentIds').sort({ name: 1 });
      const convs = await Conversation.find({ schoolId, participantType: 'parent' }).select('parentId lastMessageAt lastMessagePreview unreadByAdmin');
      const byParent = Object.fromEntries(convs.map((c) => [String(c.parentId), c]));
      return res.json(parents.map((p) => {
        const c = byParent[String(p._id)];
        return {
          participantType: 'parent', participantId: p._id, name: p.name, phone: p.phone, photo: p.photo || '',
          lastSeenAt: p.lastSeenAt, conversationId: c?._id || null, lastMessageAt: c?.lastMessageAt || null,
          lastMessagePreview: c?.lastMessagePreview || '', unreadByAdmin: c?.unreadByAdmin || 0,
        };
      }));
    }
    const teachers = await Teacher.find({ schoolId, password: { $ne: '' } }).select('name phone photo lastSeenAt subject status').sort({ name: 1 });
    const convs = await Conversation.find({ schoolId, participantType: 'teacher' }).select('teacherId lastMessageAt lastMessagePreview unreadByAdmin');
    const byTeacher = Object.fromEntries(convs.map((c) => [String(c.teacherId), c]));
    res.json(teachers.map((t) => {
      const c = byTeacher[String(t._id)];
      return {
        participantType: 'teacher', participantId: t._id, name: t.name, phone: t.phone, photo: t.photo || '',
        lastSeenAt: t.lastSeenAt, subject: t.subject || '', conversationId: c?._id || null,
        lastMessageAt: c?.lastMessageAt || null, lastMessagePreview: c?.lastMessagePreview || '', unreadByAdmin: c?.unreadByAdmin || 0,
      };
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ schoolId: req.schoolId })
      .sort({ lastMessageAt: -1 })
      .populate('parentId', 'name phone photo lastSeenAt')
      .populate('teacherId', 'name phone photo lastSeenAt');
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.openConversation = async (req, res) => {
  try {
    const { participantType, participantId } = req.body;
    if (!['parent', 'teacher'].includes(participantType) || !participantId) {
      return res.status(400).json({ error: 'participantType and participantId are required.' });
    }
    const conversation = await findOrCreateConversation(req.schoolId, participantType, participantId);
    await markMessagesRead(conversation._id, 'admin');
    if (conversation.unreadByAdmin > 0) {
      conversation.unreadByAdmin = 0;
      await conversation.save();
    }
    const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
    const populated = await Conversation.findById(conversation._id)
      .populate('parentId', 'name phone photo lastSeenAt')
      .populate('teacherId', 'name phone photo lastSeenAt');
    res.json({ conversation: populated, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getConversationMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });
    await markMessagesRead(conversation._id, 'admin');
    const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
    if (conversation.unreadByAdmin > 0) {
      conversation.unreadByAdmin = 0;
      await conversation.save();
    }
    res.json({ conversation, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sendAdminMessage = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });
    const message = await postMessage(conversation, 'admin', {
      text: req.body.text,
      mediaType: req.body.mediaType,
      mediaData: req.body.mediaData,
      replyTo: req.body.replyTo,
    });
    res.status(201).json(message);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

async function pushBroadcastFcm(schoolId, audience, docs, title, message) {
  try {
    const body = String(message || title || 'New announcement').slice(0, 200);
    const data = { type: 'broadcast', link: '/open' };
    if (audience === 'teacher' || (docs[0] && docs[0].audience === 'teacher')) {
      const ids = docs.map((d) => d.teacherId).filter(Boolean);
      const teachers = await TeacherModel.find({ _id: { $in: ids } }).select('fcmTokens');
      const tokens = teachers.flatMap((x) => x.fcmTokens || []);
      await fcmService.sendToTokens(tokens, { title: title || 'School notice', body, data: { ...data, link: '/teacher/dashboard' } });
    } else {
      const ids = docs.map((d) => d.studentId).filter(Boolean);
      // parents linked to these students
      const parents = await ParentModel.find({ schoolId, studentIds: { $in: ids } }).select('fcmTokens');
      const tokens = parents.flatMap((x) => x.fcmTokens || []);
      await fcmService.sendToTokens(tokens, { title: title || 'School notice', body, data: { ...data, link: '/parent/dashboard' } });
    }
  } catch (err) {
    console.error('[FCM] broadcast push error:', err.message);
  }
}
