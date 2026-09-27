const Parent = require('../models/Parent');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { findOrCreateConversation, postMessage } = require('./chatController');
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
    res.status(201).json({ sent: docs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin's chat inbox: every parent/teacher conversation for this school, newest
// first, with the participant's name/photo and how many admin hasn't read yet.
exports.listConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ schoolId: req.schoolId })
      .sort({ lastMessageAt: -1 })
      .populate('parentId', 'name phone photo')
      .populate('teacherId', 'name phone photo');
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Open one thread: messages in order, and mark it read by the admin.
exports.getConversationMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });

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

    const message = await postMessage(conversation, 'admin', req.body.text);
    res.status(201).json(message);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
