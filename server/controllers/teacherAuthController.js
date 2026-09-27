const Teacher = require('../models/Teacher');
const Notification = require('../models/Notification');
const { findOrCreateConversation, postMessage } = require('./chatController');
const { isValidImage } = require('../utils/imageValidation');
const { hashPassword, verifyPassword } = require('../middleware/passwords');
const { signToken } = require('../middleware/auth');

const toSafeTeacher = (teacher) => {
  const safe = teacher.toObject ? teacher.toObject() : { ...teacher };
  delete safe.password;
  return safe;
};

// A teacher proves who they are with the phone number AND name the school already
// has on file for them (set when the admin added them as a Teacher). This is the
// same "two facts only the real person and the school already know" pattern used
// for parent registration. Re-registering an account that already has a password
// is rejected outright — there is no sibling-style merge case for a single teacher.
exports.registerTeacher = async (req, res) => {
  try {
    const { schoolId, phone, name, password } = req.body;
    const normalizedPhone = String(phone || '').trim();
    const normalizedName = String(name || '').trim();

    if (!schoolId) return res.status(400).json({ error: 'Missing school reference in link.' });
    if (!normalizedPhone || !normalizedName || !password || password.length < 6) {
      return res.status(400).json({ error: 'Phone, name, and a password of at least 6 characters are required.' });
    }

    const teacher = await Teacher.findOne({
      schoolId,
      phone: normalizedPhone,
      name: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    });
    if (!teacher) {
      return res.status(400).json({ error: 'No teacher record found matching that name and phone number. Check the details with the school office.' });
    }
    if (teacher.password) {
      return res.status(409).json({ error: 'An account already exists for this teacher. Please log in instead.' });
    }

    teacher.password = await hashPassword(password);
    await teacher.save();

    const token = signToken({ role: 'teacher', schoolId: String(schoolId), teacherId: String(teacher._id) });
    res.status(201).json({ message: 'Account created.', token, teacher: toSafeTeacher(teacher) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.teacherLogin = async (req, res) => {
  try {
    const { schoolId, phone, password } = req.body;
    const normalizedPhone = String(phone || '').trim();
    if (!schoolId) return res.status(400).json({ error: 'Missing school reference in link.' });

    const teacher = await Teacher.findOne({ schoolId, phone: normalizedPhone });
    if (!teacher || !teacher.password || !(await verifyPassword(password || '', teacher.password))) {
      return res.status(401).json({ error: 'Invalid phone number or password.' });
    }

    const token = signToken({ role: 'teacher', schoolId: String(schoolId), teacherId: String(teacher._id) });
    res.json({ message: 'Login successful', token, teacher: toSafeTeacher(teacher) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ schoolId: req.schoolId, audience: 'teacher', teacherId: req.teacherId })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, schoolId: req.schoolId, audience: 'teacher', teacherId: req.teacherId });
    if (!notification) return res.status(404).json({ error: 'Notification not found.' });
    notification.read = true;
    await notification.save();
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyConversation = async (req, res) => {
  try {
    const conversation = await findOrCreateConversation(req.schoolId, 'teacher', req.teacherId);
    const Message = require('../models/Message');
    const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });

    if (conversation.unreadByParticipant > 0) {
      conversation.unreadByParticipant = 0;
      await conversation.save();
    }

    res.json({ conversation, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sendMyMessage = async (req, res) => {
  try {
    const conversation = await findOrCreateConversation(req.schoolId, 'teacher', req.teacherId);
    const message = await postMessage(conversation, 'teacher', req.body.text);
    res.status(201).json(message);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }
    const teacher = await Teacher.findOne({ _id: req.teacherId, schoolId: req.schoolId });
    if (!teacher) return res.status(404).json({ error: 'Account not found.' });
    if (!teacher.password || !(await verifyPassword(currentPassword || '', teacher.password))) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    teacher.password = await hashPassword(newPassword);
    await teacher.save();
    res.json({ message: 'Password updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateMyPhoto = async (req, res) => {
  try {
    const { photo = '' } = req.body;
    if (!isValidImage(photo)) {
      return res.status(400).json({ error: 'Photo must be a JPEG/PNG/WebP image under ~500KB.' });
    }
    const teacher = await Teacher.findOneAndUpdate(
      { _id: req.teacherId, schoolId: req.schoolId },
      { photo },
      { new: true }
    );
    if (!teacher) return res.status(404).json({ error: 'Account not found.' });
    res.json(toSafeTeacher(teacher));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
