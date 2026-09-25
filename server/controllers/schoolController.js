const crypto = require('crypto');
const School = require('../models/School');
const LoginLog = require('../models/LoginLog');
const EmailOtp = require('../models/EmailOtp');
const { hashPassword, verifyPassword } = require('../middleware/passwords');
const { signToken } = require('../middleware/auth');
const { sanitizeSchoolBody, sanitizeEmail, isValidEmail, sanitizeString } = require('../middleware/sanitize');
const { sendOtpEmail } = require('../services/emailService');

const toSafeSchool = (school) => {
  const safeSchool = school.toObject ? school.toObject() : { ...school };
  delete safeSchool.password;
  return safeSchool;
};

const supportContact = () => {
  const email = process.env.SUPPORT_EMAIL || '';
  const phone = process.env.SUPPORT_PHONE || '';
  return { supportEmail: email || null, supportPhone: phone || null };
};

const blockedMessage = () => {
  const { supportEmail, supportPhone } = supportContact();
  let msg = 'Account blocked. Contact support.';
  if (supportEmail || supportPhone) {
    const bits = [supportEmail, supportPhone].filter(Boolean).join(' · ');
    msg = `Account blocked. Contact support: ${bits}`;
  }
  return msg;
};

const hashOtp = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

async function issueOtp({ email, purpose, payload = {} }) {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await EmailOtp.deleteMany({ email, purpose });
  await EmailOtp.create({
    email,
    purpose,
    codeHash: hashOtp(code),
    payload,
    expiresAt,
    attempts: 0
  });

  let emailed = false;
  let devOtp = undefined;
  try {
    await sendOtpEmail(email, code, purpose === 'school_register' ? 'registration' : 'login');
    emailed = true;
  } catch (err) {
    if (err.code === 'SMTP_NOT_CONFIGURED' && process.env.ALLOW_DEV_OTP === 'true') {
      devOtp = code;
      console.warn(`[DEV OTP] ${email} ${purpose}: ${code}`);
    } else if (err.code === 'SMTP_NOT_CONFIGURED') {
      const e = new Error('Email verification is not configured on the server yet. Set SMTP_* env vars or ALLOW_DEV_OTP=true for testing.');
      e.status = 503;
      throw e;
    } else {
      throw err;
    }
  }

  return { emailed, devOtp, expiresInSec: 600 };
}

async function consumeOtp({ email, purpose, code }) {
  const doc = await EmailOtp.findOne({ email, purpose }).sort({ createdAt: -1 });
  if (!doc) return { ok: false, error: 'No verification code found. Request a new one.' };
  if (doc.expiresAt < new Date()) {
    await EmailOtp.deleteMany({ email, purpose });
    return { ok: false, error: 'Verification code expired. Request a new one.' };
  }
  if (doc.attempts >= 5) {
    await EmailOtp.deleteMany({ email, purpose });
    return { ok: false, error: 'Too many incorrect attempts. Request a new code.' };
  }
  if (doc.codeHash !== hashOtp(code)) {
    doc.attempts += 1;
    await doc.save();
    return { ok: false, error: 'Invalid verification code.' };
  }
  const payload = doc.payload || {};
  await EmailOtp.deleteMany({ email, purpose });
  return { ok: true, payload };
}

// ---------- Register: step 1 request OTP ----------
exports.requestRegisterOtp = async (req, res) => {
  try {
    const body = sanitizeSchoolBody(req.body);
    if (!isValidEmail(body.email) || !body.password || body.password.length < 8) {
      return res.status(400).json({ error: 'A valid email and a password of at least 8 characters are required.' });
    }
    if (!body.schoolName || !body.principalName || !body.phone) {
      return res.status(400).json({ error: 'School name, principal name, and phone are required.' });
    }

    const existing = await School.findOne({ adminEmail: body.email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered!' });
    }

    const otpMeta = await issueOtp({
      email: body.email,
      purpose: 'school_register',
      payload: {
        schoolName: body.schoolName,
        principalName: body.principalName,
        phone: body.phone,
        email: body.email,
        password: body.password,
        address: body.address,
        city: body.city,
        totalStudents: body.totalStudents
      }
    });

    res.json({
      message: 'Verification code sent to your email.',
      requiresOtp: true,
      email: body.email,
      ...otpMeta
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ---------- Register: step 2 verify OTP + create school ----------
exports.verifyRegisterOtp = async (req, res) => {
  try {
    const email = sanitizeEmail(req.body.email);
    const code = String(req.body.code || '').trim();
    if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Valid email and 6-digit code are required.' });
    }

    const result = await consumeOtp({ email, purpose: 'school_register', code });
    if (!result.ok) return res.status(400).json({ error: result.error });

    const p = result.payload || {};
    if (!p.email || !p.password) {
      return res.status(400).json({ error: 'Registration session expired. Start again.' });
    }

    const existing = await School.findOne({ adminEmail: email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered!' });
    }

    let expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    const newSchool = new School({
      schoolName: p.schoolName,
      principalName: p.principalName,
      adminEmail: email,
      password: await hashPassword(p.password),
      phone: p.phone,
      address: p.address || '',
      city: p.city || '',
      totalStudents: p.totalStudents,
      expiryDate: expiry,
      studentLimit: 100,
      plan: 'free_trial',
      blocked: false
    });

    await newSchool.save();
    const token = signToken({ role: 'school', schoolId: String(newSchool._id) });
    res.status(201).json({
      message: 'School registered successfully!',
      token,
      school: toSafeSchool(newSchool)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Legacy direct register (kept for compatibility; prefers OTP flow from frontend)
exports.registerSchool = async (req, res) => {
  try {
    const body = sanitizeSchoolBody(req.body);
    if (!isValidEmail(body.email) || !body.password || body.password.length < 8) {
      return res.status(400).json({ error: 'A valid email and a password of at least 8 characters are required.' });
    }

    const existing = await School.findOne({ adminEmail: body.email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered!' });
    }

    // If SMTP or dev OTP available, force OTP path instead of silent create
    if (process.env.SMTP_HOST || process.env.ALLOW_DEV_OTP === 'true') {
      return exports.requestRegisterOtp(req, res);
    }

    let expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    const newSchool = new School({
      schoolName: body.schoolName,
      principalName: body.principalName,
      adminEmail: body.email,
      password: await hashPassword(body.password),
      phone: body.phone,
      address: body.address,
      city: body.city,
      totalStudents: body.totalStudents,
      expiryDate: expiry,
      studentLimit: 100,
      plan: 'free_trial',
      blocked: false
    });

    await newSchool.save();
    const token = signToken({ role: 'school', schoolId: String(newSchool._id) });
    res.status(201).json({ message: 'School registered successfully!', token, school: toSafeSchool(newSchool) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------- Login: password then OTP ----------
exports.schoolLogin = async (req, res) => {
  try {
    const email = sanitizeEmail(req.body.email);
    const password = String(req.body.password || '');

    const school = await School.findOne({ adminEmail: email });

    if (!school) {
      await LoginLog.create({ schoolName: 'Unknown', email, status: 'Failed' });
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!(await verifyPassword(password, school.password))) {
      await LoginLog.create({ schoolId: school._id, schoolName: school.schoolName, email, status: 'Failed' });
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (school.blocked) {
      await LoginLog.create({ schoolId: school._id, schoolName: school.schoolName, email, status: 'Blocked' });
      return res.status(403).json({ error: blockedMessage(), ...supportContact() });
    }

    // Email OTP step when SMTP or dev OTP enabled
    if (process.env.SMTP_HOST || process.env.ALLOW_DEV_OTP === 'true') {
      const otpMeta = await issueOtp({
        email,
        purpose: 'school_login',
        payload: { schoolId: String(school._id) }
      });
      return res.json({
        message: 'Verification code sent to your email.',
        requiresOtp: true,
        email,
        ...otpMeta
      });
    }

    await LoginLog.create({ schoolId: school._id, schoolName: school.schoolName, email, status: 'Success' });
    const token = signToken({ role: 'school', schoolId: String(school._id) });
    res.json({ message: 'Login successful', token, school: toSafeSchool(school) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

exports.verifyLoginOtp = async (req, res) => {
  try {
    const email = sanitizeEmail(req.body.email);
    const code = String(req.body.code || '').trim();
    if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Valid email and 6-digit code are required.' });
    }

    const result = await consumeOtp({ email, purpose: 'school_login', code });
    if (!result.ok) return res.status(400).json({ error: result.error });

    const schoolId = result.payload?.schoolId;
    const school = await School.findById(schoolId);
    if (!school) return res.status(401).json({ error: 'School not found.' });
    if (school.blocked) {
      return res.status(403).json({ error: blockedMessage(), ...supportContact() });
    }

    await LoginLog.create({ schoolId: school._id, schoolName: school.schoolName, email, status: 'Success' });
    const token = signToken({ role: 'school', schoolId: String(school._id) });
    res.json({ message: 'Login successful', token, school: toSafeSchool(school) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------- Google Sign-In ----------
exports.googleAuth = async (req, res) => {
  try {
    const idToken = String(req.body.idToken || '').trim();
    if (!idToken) return res.status(400).json({ error: 'Google idToken is required.' });

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({ error: 'Google Sign-In is not configured (GOOGLE_CLIENT_ID).' });
    }

    const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!resp.ok) return res.status(401).json({ error: 'Invalid Google token.' });
    const info = await resp.json();

    if (info.aud !== clientId) {
      return res.status(401).json({ error: 'Google token audience mismatch.' });
    }
    if (String(info.email_verified) !== 'true' && info.email_verified !== true) {
      return res.status(401).json({ error: 'Google email is not verified.' });
    }

    const email = sanitizeEmail(info.email);
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Google account has no valid email.' });

    let school = await School.findOne({ adminEmail: email });

    if (!school) {
      // New school via Google — minimal profile; user can complete settings later
      let expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      const randomPass = crypto.randomBytes(24).toString('hex');
      school = await School.create({
        schoolName: sanitizeString(info.name || 'My School', 120) || 'My School',
        principalName: sanitizeString(info.name || 'Admin', 80),
        adminEmail: email,
        password: await hashPassword(randomPass),
        phone: '',
        address: '',
        city: '',
        expiryDate: expiry,
        studentLimit: 100,
        plan: 'free_trial',
        blocked: false
      });
    }

    if (school.blocked) {
      return res.status(403).json({ error: blockedMessage(), ...supportContact() });
    }

    await LoginLog.create({
      schoolId: school._id,
      schoolName: school.schoolName,
      email,
      status: 'Success'
    });

    const token = signToken({ role: 'school', schoolId: String(school._id) });
    res.json({ message: 'Google sign-in successful', token, school: toSafeSchool(school) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.checkSchool = async (req, res) => {
  try {
    const school = await School.findById(req.schoolId);
    if (!school) return res.status(404).json({ error: 'School not found' });
    if (school.blocked) return res.status(403).json({ error: blockedMessage(), ...supportContact() });

    const now = new Date();
    const expired = school.expiryDate && now > new Date(school.expiryDate);
    res.json({
      ok: true,
      school: toSafeSchool(school),
      subscriptionExpired: Boolean(expired),
      softLock: Boolean(expired),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSchool = async (req, res) => {
  try {
    const { schoolName, principalName, phone, email, city, address } = req.body;
    const school = await School.findById(req.schoolId);

    if (!school) return res.status(404).json({ error: 'School not found' });

    if (!schoolName || !principalName || !phone || !email || !city || !address) {
      return res.status(400).json({ error: 'All school information fields are required.' });
    }

    const normalizedEmail = sanitizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'A valid email is required.' });
    }
    const existingEmail = await School.findOne({ adminEmail: normalizedEmail, _id: { $ne: req.schoolId } });
    if (existingEmail) {
      return res.status(400).json({ error: 'This email is already registered with another school.' });
    }

    school.schoolName = sanitizeString(schoolName, 120);
    school.principalName = sanitizeString(principalName, 80);
    school.phone = sanitizeString(phone, 20);
    school.adminEmail = normalizedEmail;
    school.city = sanitizeString(city, 80);
    school.address = sanitizeString(address, 200);

    await school.save();
    res.json({ message: 'School information updated successfully!', school: toSafeSchool(school) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.changeEmail = async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body;
    const school = await School.findById(req.schoolId);
    if (!school) return res.status(404).json({ error: 'School not found.' });

    const normalized = sanitizeEmail(newEmail);
    if (!isValidEmail(normalized)) {
      return res.status(400).json({ error: 'A valid new email is required.' });
    }
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required to change email.' });
    }
    if (!(await verifyPassword(currentPassword, school.password))) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    if (normalized === String(school.adminEmail || '').toLowerCase()) {
      return res.status(400).json({ error: 'New email must be different from current email.' });
    }

    const taken = await School.findOne({ adminEmail: normalized, _id: { $ne: school._id } });
    if (taken) {
      return res.status(400).json({ error: 'This email is already registered with another school.' });
    }

    school.adminEmail = normalized;
    await school.save();

    res.json({
      message: 'Email updated successfully. Use the new email next time you sign in.',
      school: toSafeSchool(school)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const school = await School.findById(req.schoolId);

    if (!school) return res.status(404).json({ error: 'School not found.' });
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }
    if (!(await verifyPassword(currentPassword, school.password))) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    school.password = await hashPassword(newPassword);
    await school.save();

    res.json({ message: 'Password changed successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
