const School = require('../models/School');
const LoginLog = require('../models/LoginLog');

// Register School
exports.registerSchool = async (req, res) => {
  try {
    const { schoolName, principalName, phone, email, password, address, city, totalStudents } = req.body;

    const existing = await School.findOne({ adminEmail: email });
    if (existing) {
      return res.status(400).json({ error: "Email already registered!" });
    }

    let expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    const newSchool = new School({
      schoolName,
      principalName,
      adminEmail: email,
      password,
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
    res.status(201).json({ message: "School registered successfully!", school: newSchool });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// School Login
exports.schoolLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const school = await School.findOne({ adminEmail: email });

    if (!school) {
      await LoginLog.create({ schoolName: 'Unknown', email, status: 'Failed' });
      return res.status(404).json({ error: "School not found!" });
    }

    if (school.password !== password) {
      await LoginLog.create({ schoolId: school._id, schoolName: school.schoolName, email, status: 'Failed' });
      return res.status(401).json({ error: "Wrong password!" });
    }

    if (school.blocked) {
      await LoginLog.create({ schoolId: school._id, schoolName: school.schoolName, email, status: 'Blocked' });
      return res.status(403).json({ error: "Account blocked. Contact support." });
    }

    const now = new Date();
    if (now > school.expiryDate) {
      await LoginLog.create({ schoolId: school._id, schoolName: school.schoolName, email, status: 'Failed' });
      return res.status(403).json({ error: "Trial expired! Please subscribe.", expiryDate: school.expiryDate });
    }

    await LoginLog.create({ schoolId: school._id, schoolName: school.schoolName, email, status: 'Success' });
    res.status(200).json({ message: "Login successful", school });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Check School Status
exports.checkSchool = async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ error: "School not found" });
    if (school.blocked) return res.status(403).json({ error: "Account blocked" });

    const now = new Date();
    if (now > school.expiryDate) return res.status(403).json({ error: "Trial expired" });

    res.json({ ok: true, school });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update School Info
exports.updateSchool = async (req, res) => {
  try {
    const { schoolName, principalName, phone, email, city, address } = req.body;
    const school = await School.findById(req.params.id);

    if (!school) return res.status(404).json({ error: "School not found" });

    if (!schoolName || !principalName || !phone || !email || !city || !address) {
      return res.status(400).json({ error: "All school information fields are required." });
    }

    const existingEmail = await School.findOne({ adminEmail: email, _id: { $ne: req.params.id } });
    if (existingEmail) {
      return res.status(400).json({ error: "This email is already registered with another school." });
    }

    school.schoolName = schoolName;
    school.principalName = principalName;
    school.phone = phone;
    school.adminEmail = email;
    school.city = city;
    school.address = address;

    await school.save();
    res.json({ message: "School information updated successfully!", school });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const school = await School.findById(req.params.id);

    if (!school) return res.status(404).json({ error: "School not found." });
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required." });
    }
    if (school.password !== currentPassword) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters." });
    }

    school.password = newPassword;
    await school.save();

    res.json({ message: "Password changed successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
