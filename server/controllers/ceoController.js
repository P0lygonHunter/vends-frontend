const mongoose = require('mongoose');
const School = require('../models/School');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const LoginLog = require('../models/LoginLog');
const CeoConfig = require('../models/CeoConfig');
const { hashPassword, verifyPassword, isPasswordHash } = require('../middleware/passwords');
const { signToken } = require('../middleware/auth');

// Pricing Model
const PricingSchema = new mongoose.Schema({
  freeTrial: { type: Number, default: 0 },
  lite: { type: Number, default: 4999 },
  zk: { type: Number, default: 14999 }
}, { timestamps: true });

const Pricing = mongoose.models.Pricing || mongoose.model('Pricing', PricingSchema);

const getDefaultPricing = () => ({
  freeTrial: 0,
  lite: 4999,
  zk: 14999
});

const getStudentLimit = (plan) => {
  if (plan === 'free_trial') return 100;
  if (plan === 'lite') return 1000;
  if (plan === 'zk') return 1000;
  return 100;
};

const CEO_MIN_PASSWORD_LENGTH = 12;

const getCeoCredentials = async () => {
  const envEmail = String(process.env.CEO_EMAIL || '').trim().toLowerCase();
  const envHash = process.env.CEO_PASSWORD_HASH || '';

  let config = await CeoConfig.findOne({ key: 'ceo' });

  // Prefer DB hash (runtime-changeable). Fall back to env for first boot / migration.
  if (config && isPasswordHash(config.passwordHash)) {
    return {
      email: (config.email || envEmail).trim().toLowerCase(),
      passwordHash: config.passwordHash,
      source: 'db',
    };
  }

  if (envEmail && isPasswordHash(envHash)) {
    return {
      email: envEmail,
      passwordHash: envHash,
      source: 'env',
    };
  }

  return null;
};

// CEO Login
exports.ceoLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const creds = await getCeoCredentials();

    if (!creds) {
      return res.status(500).json({ error: 'CEO authentication is not configured.' });
    }

    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (normalizedEmail !== creds.email || !(await verifyPassword(password || '', creds.passwordHash))) {
      return res.status(401).json({ error: 'Invalid Credentials' });
    }

    // Seed DB from env on first successful login so password can be changed later.
    if (creds.source === 'env') {
      await CeoConfig.findOneAndUpdate(
        { key: 'ceo' },
        { key: 'ceo', email: creds.email, passwordHash: creds.passwordHash },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    return res.status(200).json({
      message: 'Success',
      token: signToken({ role: 'ceo', email: creds.email }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// CEO Change Password (dashboard)
exports.changeCeoPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirm password do not match.' });
    }

    if (String(newPassword).length < CEO_MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        error: `New password must be at least ${CEO_MIN_PASSWORD_LENGTH} characters long.`,
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password.' });
    }

    const creds = await getCeoCredentials();
    if (!creds) {
      return res.status(500).json({ error: 'CEO authentication is not configured.' });
    }

    if (!(await verifyPassword(currentPassword, creds.passwordHash))) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const newHash = await hashPassword(newPassword);

    await CeoConfig.findOneAndUpdate(
      { key: 'ceo' },
      { key: 'ceo', email: creds.email, passwordHash: newHash },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ message: 'Password changed successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get All Schools

// CEO Change Email
exports.changeCeoEmail = async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body;
    const normalized = String(newEmail || '').trim().toLowerCase();

    if (!normalized || !normalized.includes('@')) {
      return res.status(400).json({ error: 'A valid new email is required.' });
    }
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required to change email.' });
    }

    const creds = await getCeoCredentials();
    if (!creds) {
      return res.status(500).json({ error: 'CEO authentication is not configured.' });
    }

    if (!(await verifyPassword(currentPassword, creds.passwordHash))) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    if (normalized === creds.email) {
      return res.status(400).json({ error: 'New email must be different from current email.' });
    }

    await CeoConfig.findOneAndUpdate(
      { key: 'ceo' },
      { key: 'ceo', email: normalized, passwordHash: creds.passwordHash },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      message: 'Email updated successfully. Please sign in again with the new email.',
      email: normalized,
      token: signToken({ role: 'ceo', email: normalized }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCeoProfile = async (req, res) => {
  try {
    const creds = await getCeoCredentials();
    if (!creds) {
      return res.status(500).json({ error: 'CEO authentication is not configured.' });
    }
    res.json({ success: true, email: creds.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllSchools = async (req, res) => {
  try {
    const schools = await School.find().sort({ createdAt: -1 });
    res.json(schools);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Login Logs
exports.getLoginLogs = async (req, res) => {
  try {
    const logs = await LoginLog.find().sort({ createdAt: -1 }).limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Pricing
exports.getPricing = async (req, res) => {
  try {
    let pricing = await Pricing.findOne();
    if (!pricing) {
      pricing = await Pricing.create(getDefaultPricing());
    }
    res.json({ success: true, pricing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Pricing
exports.updatePricing = async (req, res) => {
  try {
    const { freeTrial, lite, zk } = req.body;

    if (freeTrial === undefined || lite === undefined || zk === undefined) {
      return res.status(400).json({ error: "All pricing fields are required." });
    }

    const freeTrialPrice = Number(freeTrial);
    const litePrice = Number(lite);
    const zkPrice = Number(zk);

    if (Number.isNaN(freeTrialPrice) || Number.isNaN(litePrice) || Number.isNaN(zkPrice)) {
      return res.status(400).json({ error: "Pricing values must be valid numbers." });
    }

    if (freeTrialPrice < 0 || litePrice < 0 || zkPrice < 0) {
      return res.status(400).json({ error: "Pricing cannot be negative." });
    }

    let pricing = await Pricing.findOne();
    if (!pricing) {
      pricing = new Pricing();
    }

    pricing.freeTrial = freeTrialPrice;
    pricing.lite = litePrice;
    pricing.zk = zkPrice;

    await pricing.save();

    res.json({ success: true, message: "Pricing updated successfully!", pricing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Revenue
exports.getRevenue = async (req, res) => {
  try {
    let pricing = await Pricing.findOne();
    if (!pricing) {
      pricing = await Pricing.create(getDefaultPricing());
    }

    const schools = await School.find();

    const freeTrialCount = schools.filter(s => s.plan === 'free_trial').length;
    const liteCount = schools.filter(s => s.plan === 'lite').length;
    const zkCount = schools.filter(s => s.plan === 'zk').length;

    const liteRevenue = liteCount * pricing.lite;
    const zkRevenue = zkCount * pricing.zk;
    const monthlyRevenue = liteRevenue + zkRevenue;

    res.json({
      success: true,
      revenue: {
        freeTrialCount,
        liteCount,
        zkCount,
        liteRevenue,
        zkRevenue,
        monthlyRevenue
      },
      pricing: {
        freeTrial: pricing.freeTrial,
        lite: pricing.lite,
        zk: pricing.zk
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Toggle Block/Unblock
exports.toggleBlock = async (req, res) => {
  try {
    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    school.blocked = !school.blocked;
    await school.save();

    res.json({
      message: `School status updated. Blocked: ${school.blocked}`,
      schoolName: school.schoolName,
      blocked: school.blocked
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete School
exports.deleteSchool = async (req, res) => {
  try {
    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    await Student.deleteMany({ schoolId: req.params.id });
    await Teacher.deleteMany({ schoolId: req.params.id });
    await Attendance.deleteMany({ schoolId: req.params.id });
    await LoginLog.deleteMany({ schoolId: req.params.id });
    await School.findByIdAndDelete(req.params.id);

    res.json({ message: `${school.schoolName} deleted permanently!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Extend Trial / Change Plan
exports.extendTrial = async (req, res) => {
  try {
    const { days, plan } = req.body;
    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const parsedDays = Number(days);
    if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
      return res.status(400).json({ error: "Days must be a valid positive number." });
    }

    let newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + parsedDays);

    const updateData = { expiryDate: newExpiry };

    if (plan) {
      updateData.plan = plan;
      updateData.studentLimit = getStudentLimit(plan);
    }

    const updated = await School.findByIdAndUpdate(req.params.id, updateData, { new: true });

    res.json({
      message: `${school.schoolName}'s plan updated! New expiry in ${parsedDays} days.`,
      school: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Plan & Limit
exports.updatePlan = async (req, res) => {
  try {
    const { plan, studentLimit, daysToAdd } = req.body;
    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const updateData = {
      plan,
      studentLimit: studentLimit || getStudentLimit(plan)
    };

    if (daysToAdd) {
      const parsedDays = Number(daysToAdd);
      if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
        return res.status(400).json({ error: "daysToAdd must be a positive number." });
      }

      let newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + parsedDays);
      updateData.expiryDate = newExpiry;
    }

    const updated = await School.findByIdAndUpdate(req.params.id, updateData, { new: true });

    res.json({ message: "Plan updated!", school: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
