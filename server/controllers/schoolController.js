const School = require('../models/School');
const LoginLog = require('../models/LoginLog');
const { hashPassword, isPasswordHash, verifyPassword } = require('../middleware/passwords');
const { signToken } = require('../middleware/auth');

const toSafeSchool = (school) => {
  const safeSchool = school.toObject ? school.toObject() : { ...school };
  delete safeSchool.password;
  return safeSchool;
};

// Register School
exports.registerSchool = async (req, res) => {
  try {
    const { schoolName, principalName, phone, email, password, address, city, totalStudents } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !password || password.length < 8) {
      return res.status(400).json({ error: 'A valid email and a password of at least 8 characters are required.' });
    }

    const existing = await School.findOne({ adminEmail: normalizedEmail });
    if (existing) {
      return res.status(400).json({ error: "Email already registered!" });
    }

    let expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    const newSchool = new School({
      schoolName,
      principalName,
      adminEmail: normalizedEmail,
      password: await hashPassword(password),
      phone,
      address,
      city,
      totalStudents,
      expiryDate: expiry,
      studentLimit: 100,
      plan: 'free_trial',
      blocked: false
    });

    await newSchool.save();
    const token = signToken({ role: 'school', schoolId: String(newSchool._id) });
    res.status(201).json({ message: "School registered successfully!", token, school: toSafeSchool(newSchool) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// School Login
exports.schoolLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const school = await School.findOne({ adminEmail: normalizedEmail });

    if (!school) {
      await LoginLog.create({ schoolName: 'Unknown', email: normalizedEmail, status: 'Failed' });
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!await verifyPassword(password || '', school.password)) {
      await LoginLog.create({ schoolId: school._id, schoolName: school.schoolName, email: normalizedEmail, status: 'Failed' });
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (school.blocked) {
      await LoginLog.create({ schoolId: school._id, schoolName: school.schoolName, email: normalizedEmail, status: 'Blocked' });
      return res.status(403).json({ error: "Account blocked. Contact support." });
    }

    const now = new Date();
    if (now > school.expiryDate) {
      await LoginLog.create({ schoolId: school._id, schoolName: school.schoolName, email: normalizedEmail, status: 'Failed' });
      return res.status(403).json({ error: "Trial expired! Please subscribe.", expiryDate: school.expiryDate });
    }

    if (!isPasswordHash(school.password)) {
      school.password = await hashPassword(password);
      await school.save();
    }

    await LoginLog.create({ schoolId: school._id, schoolName: school.schoolName, email: normalizedEmail, status: 'Success' });
    const token = signToken({ role: 'school', schoolId: String(school._id) });
    res.status(200).json({ message: "Login successful", token, school: toSafeSchool(school) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Check School Status
exports.checkSchool = async (req, res) => {
  try {
    const school = await School.findById(req.schoolId);
    if (!school) return res.status(404).json({ error: "School not found" });
    if (school.blocked) return res.status(403).json({ error: "Account blocked" });

    const now = new Date();
    if (now > school.expiryDate) return res.status(403).json({ error: "Trial expired" });

    res.json({ ok: true, school: toSafeSchool(school) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update School Info
exports.updateSchool = async (req, res) => {
  try {
    const { schoolName, principalName, phone, email, city, address } = req.body;
    const school = await School.findById(req.schoolId);

    if (!school) return res.status(404).json({ error: "School not found" });

    if (!schoolName || !principalName || !phone || !email || !city || !address) {
      return res.status(400).json({ error: "All school information fields are required." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingEmail = await School.findOne({ adminEmail: normalizedEmail, _id: { $ne: req.schoolId } });
    if (existingEmail) {
      return res.status(400).json({ error: "This email is already registered with another school." });
    }

    school.schoolName = schoolName;
    school.principalName = principalName;
    school.phone = phone;
    school.adminEmail = normalizedEmail;
    school.city = city;
    school.address = address;

    await school.save();
    res.json({ message: "School information updated successfully!", school: toSafeSchool(school) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const school = await School.findById(req.schoolId);

    if (!school) return res.status(404).json({ error: "School not found." });
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required." });
    }
    if (!await verifyPassword(currentPassword, school.password)) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters." });
    }

    school.password = await hashPassword(newPassword);
    await school.save();

    res.json({ message: "Password changed successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
