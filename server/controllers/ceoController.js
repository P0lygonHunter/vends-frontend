const mongoose = require('mongoose');
const School = require('../models/School');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const LoginLog = require('../models/LoginLog');
const { verifyPassword, isPasswordHash } = require('../middleware/passwords');
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

// CEO Login
exports.ceoLogin = async (req, res) => {
  const { email, password } = req.body;
  const ceoEmail = String(process.env.CEO_EMAIL || '').trim().toLowerCase();
  const ceoPasswordHash = process.env.CEO_PASSWORD_HASH || '';

  if (!ceoEmail || !isPasswordHash(ceoPasswordHash)) {
    return res.status(500).json({ error: 'CEO authentication is not configured.' });
  }

  if (String(email || '').trim().toLowerCase() === ceoEmail && await verifyPassword(password || '', ceoPasswordHash)) {
    return res.status(200).json({
      message: "Success",
      token: signToken({ role: 'ceo', email: ceoEmail })
    });
  }

  res.status(401).json({ error: "Invalid Credentials" });
};

// Get All Schools
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
