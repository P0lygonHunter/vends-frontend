const Parent = require('../models/Parent');
const Student = require('../models/Student');
const FeeRecord = require('../models/FeeRecord');
const Notification = require('../models/Notification');
const { hashPassword, verifyPassword } = require('../middleware/passwords');
const { signToken } = require('../middleware/auth');
const { recordFeePayment } = require('./feeController');

const toSafeParent = (parent) => {
  const safe = parent.toObject ? parent.toObject() : { ...parent };
  delete safe.password;
  return safe;
};

// Step 1 of registration UX: given a roll number + phone, tell the frontend
// whether this will create a brand-new account or link onto an existing one —
// so the form can show "Set a new password" vs "Enter your existing password".
// This is a convenience check only; the real security check happens again,
// unconditionally, inside registerParent itself below.
exports.checkParentRegistration = async (req, res) => {
  try {
    const { schoolId, rollNumber, phone } = req.body;
    const normalizedPhone = String(phone || '').trim();
    const normalizedRoll = String(rollNumber || '').trim();
    if (!schoolId || !normalizedRoll || !normalizedPhone) {
      return res.status(400).json({ error: 'Roll number and phone number are required.' });
    }

    const student = await Student.findOne({ schoolId, rollNumber: normalizedRoll, phone: normalizedPhone });
    if (!student) {
      return res.status(404).json({ error: 'No student found matching that roll number and phone number. Check the details with the school office.' });
    }

    const accountExists = Boolean(await Parent.findOne({ schoolId, phone: normalizedPhone }).select('_id'));
    res.json({ studentName: student.name, accountExists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// A parent proves they belong to a student by supplying that student's roll number
// AND the phone number the school already has on file for that student — both facts
// only the real family (or the school) would know. First registration for a phone
// number creates the account; a second student registered with the same phone links
// as a sibling onto the existing account — but only after proving knowledge of that
// existing account's real password. Without this check, anyone who knew a sibling's
// roll number and the family's on-file phone number could set any password they liked
// and be logged straight into the whole family's account — this function must never
// skip that check for the "account already exists" branch.
exports.registerParent = async (req, res) => {
  try {
    const { schoolId, rollNumber, phone, name, password } = req.body;
    const normalizedPhone = String(phone || '').trim();
    const normalizedRoll = String(rollNumber || '').trim();

    if (!schoolId) return res.status(400).json({ error: 'Missing school reference in link.' });
    if (!normalizedRoll || !normalizedPhone || !password || password.length < 6) {
      return res.status(400).json({ error: 'Roll number, phone, and a password of at least 6 characters are required.' });
    }

    const student = await Student.findOne({ schoolId, rollNumber: normalizedRoll, phone: normalizedPhone });
    if (!student) {
      return res.status(400).json({ error: 'No student found matching that roll number and phone number. Check the details with the school office.' });
    }

    let parent = await Parent.findOne({ schoolId, phone: normalizedPhone });

    if (parent) {
      // Existing account: `password` here must be that account's REAL password,
      // proving the requester actually owns it — never treat it as a password to set.
      if (!(await verifyPassword(password, parent.password))) {
        return res.status(401).json({
          error: 'An account already exists for this phone number. Enter that account\'s password to link this child, or contact the school if you forgot it.'
        });
      }
      if (!parent.studentIds.some(id => String(id) === String(student._id))) {
        parent.studentIds.push(student._id);
        await parent.save();
      }
    } else {
      if (!name) return res.status(400).json({ error: 'Name is required to create a new account.' });
      parent = await Parent.create({
        schoolId,
        name: String(name).trim(),
        phone: normalizedPhone,
        password: await hashPassword(password),
        studentIds: [student._id]
      });
    }

    const token = signToken({ role: 'parent', schoolId: String(schoolId), parentId: String(parent._id) });
    res.status(201).json({ message: 'Success.', token, parent: toSafeParent(parent) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.parentLogin = async (req, res) => {
  try {
    const { schoolId, phone, password } = req.body;
    const normalizedPhone = String(phone || '').trim();
    if (!schoolId) return res.status(400).json({ error: 'Missing school reference in link.' });

    const parent = await Parent.findOne({ schoolId, phone: normalizedPhone });
    if (!parent || !(await verifyPassword(password || '', parent.password))) {
      return res.status(401).json({ error: 'Invalid phone number or password.' });
    }

    const token = signToken({ role: 'parent', schoolId: String(schoolId), parentId: String(parent._id) });
    res.json({ message: 'Login successful', token, parent: toSafeParent(parent) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Parent's own children + a quick fee snapshot for each (used by the dashboard's student list).
exports.getMyChildren = async (req, res) => {
  try {
    const parent = await Parent.findOne({ _id: req.parentId, schoolId: req.schoolId })
      .populate('studentIds', 'name rollNumber grade');
    if (!parent) return res.status(404).json({ error: 'Account not found.' });

    const students = parent.studentIds;
    const summaries = await Promise.all(students.map(async (student) => {
      const records = await FeeRecord.find({ schoolId: req.schoolId, studentId: student._id });
      const outstanding = records.reduce((sum, r) => sum + r.balance, 0);
      return { student, outstanding, feeRecordCount: records.length };
    }));

    res.json(summaries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Full fee history for one linked child. requireParentOwnsStudent already confirmed ownership.
exports.getChildFees = async (req, res) => {
  try {
    const records = await FeeRecord.find({ schoolId: req.schoolId, studentId: req.params.studentId })
      .populate('studentId', 'name rollNumber')
      .sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyNotifications = async (req, res) => {
  try {
    const parent = await Parent.findOne({ _id: req.parentId, schoolId: req.schoolId }).select('studentIds');
    if (!parent) return res.status(404).json({ error: 'Account not found.' });

    const notifications = await Notification.find({ schoolId: req.schoolId, audience: 'student', studentId: { $in: parent.studentIds } })
      .populate('studentId', 'name rollNumber')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const parent = await Parent.findOne({ _id: req.parentId, schoolId: req.schoolId }).select('studentIds');
    if (!parent) return res.status(404).json({ error: 'Account not found.' });

    const notification = await Notification.findOne({ _id: req.params.id, schoolId: req.schoolId, audience: 'student', studentId: { $in: parent.studentIds } });
    if (!notification) return res.status(404).json({ error: 'Notification not found.' });
    notification.read = true;
    await notification.save();
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Parent submits a payment against one of their child's fee records. Reuses the exact
// same validated, transactional, duplicate-guarded logic as the school-admin flow.
exports.payChildFee = async (req, res) => {
  try {
    const { amount, method, reference = '', screenshot = '' } = req.body;

    const fee = await FeeRecord.findOne({ _id: req.params.feeRecordId, schoolId: req.schoolId });
    if (!fee) return res.status(404).json({ error: 'Fee record not found.' });

    const parent = await Parent.findOne({ _id: req.parentId, schoolId: req.schoolId, studentIds: fee.studentId });
    if (!parent) return res.status(403).json({ error: 'This fee record does not belong to your account.' });

    const paymentDoc = await recordFeePayment(fee._id, { amount, method, reference, screenshot });
    res.status(201).json(paymentDoc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
