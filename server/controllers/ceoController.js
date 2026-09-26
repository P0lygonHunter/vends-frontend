const mongoose = require('mongoose');
const School = require('../models/School');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const LoginLog = require('../models/LoginLog');
const CeoConfig = require('../models/CeoConfig');
const { hashPassword, verifyPassword, isPasswordHash } = require('../middleware/passwords');
const { signToken } = require('../middleware/auth');

const Pricing = require('../models/Pricing');
const {
  getPricingDoc,
  studentLimitForPlan,
  normalizePlanKey,
  PLAN_LABELS,
} = require('../config/plans');

const getStudentLimit = async (plan) => {
  const pricing = await getPricingDoc();
  return studentLimitForPlan(pricing, plan);
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
    const pricing = await getPricingDoc();
    res.json({ success: true, pricing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Pricing — prices, limits, feature bullets, promo
exports.updatePricing = async (req, res) => {
  try {
    const body = req.body || {};
    const pricing = await getPricingDoc();

    const numFields = [
      'freeTrial', 'trialDays', 'starter', 'standard', 'premium',
      'studentLimitTrial', 'studentLimitStarter', 'studentLimitStandard', 'studentLimitPremium',
      'discountPercent', 'yearlyMonthsFree',
      // legacy mirrors
      'lite', 'zk',
    ];
    for (const f of numFields) {
      if (body[f] !== undefined && body[f] !== null && body[f] !== '') {
        const n = Number(body[f]);
        if (Number.isNaN(n) || n < 0) {
          return res.status(400).json({ error: `${f} must be a valid non-negative number.` });
        }
        pricing[f] = n;
      }
    }

    if (body.promoLabel !== undefined) {
      pricing.promoLabel = String(body.promoLabel || '').slice(0, 120);
    }
    for (const flag of ['promoOnStarter', 'promoOnStandard', 'promoOnPremium']) {
      if (body[flag] !== undefined) {
        pricing[flag] = Boolean(body[flag]);
      }
    }

    const listFields = ['featuresStarter', 'featuresStandard', 'featuresPremium'];
    for (const f of listFields) {
      if (body[f] !== undefined) {
        if (Array.isArray(body[f])) {
          pricing[f] = body[f].map((x) => String(x).trim()).filter(Boolean).slice(0, 20);
        } else if (typeof body[f] === 'string') {
          pricing[f] = body[f].split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 20);
        }
      }
    }

    // Keep legacy fields in sync for old dashboards
    if (body.starter !== undefined) pricing.lite = pricing.starter;
    if (body.premium !== undefined) pricing.zk = pricing.premium;

    await pricing.save();
    res.json({ success: true, message: 'Pricing updated successfully!', pricing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Revenue

// CEO Notifications (derived from live data — no separate store required)
exports.getCeoNotifications = async (req, res) => {
  try {
    const Payment = require('../models/Payment');
    const now = new Date();
    const calendarDaysLeft = (expiryDate) => {
      if (!expiryDate) return 0;
      const exp = new Date(expiryDate);
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startExp = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
      const days = Math.round((startExp - startToday) / (1000 * 60 * 60 * 24));
      return days > 0 ? days : 0;
    };
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [pendingPayments, recentPaid, schools] = await Promise.all([
      Payment.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(20),
      Payment.find({ status: 'paid' }).sort({ approvedAt: -1 }).limit(10),
      School.find().sort({ createdAt: -1 }),
    ]);

    const items = [];

    for (const p of pendingPayments) {
      items.push({
        id: `pay-pending-${p._id}`,
        type: 'payment_pending',
        title: 'Pending payment',
        message: `${p.schoolName} submitted ${p.plan} payment (PKR ${Number(p.amount).toLocaleString('en-PK')})`,
        createdAt: p.createdAt,
        meta: { paymentId: p._id, schoolId: p.schoolId },
        severity: 'warning',
      });
    }

    for (const p of recentPaid) {
      items.push({
        id: `pay-paid-${p._id}`,
        type: 'payment_paid',
        title: 'Payment approved',
        message: `${p.schoolName} — ${p.plan} · Invoice ${p.invoiceNumber || '—'}`,
        createdAt: p.approvedAt || p.updatedAt,
        meta: { paymentId: p._id },
        severity: 'success',
      });
    }

    for (const s of schools) {
      const exp = s.expiryDate ? new Date(s.expiryDate) : null;
      if (s.createdAt && new Date(s.createdAt) >= dayAgo) {
        items.push({
          id: `school-new-${s._id}`,
          type: 'school_registered',
          title: 'New school registered',
          message: `${s.schoolName} (${s.adminEmail})`,
          createdAt: s.createdAt,
          meta: { schoolId: s._id },
          severity: 'info',
        });
      }
      const dLeft = calendarDaysLeft(s.expiryDate);
      if (exp && dLeft === 0 && exp < now && !s.blocked) {
        items.push({
          id: `school-expired-${s._id}`,
          type: 'school_expired',
          title: 'School expired',
          message: `${s.schoolName} expired on ${exp.toLocaleDateString('en-PK')}`,
          createdAt: exp,
          meta: { schoolId: s._id },
          severity: 'danger',
        });
      } else if (dLeft >= 1 && dLeft <= 7 && !s.blocked) {
        items.push({
          id: `school-expiring-${s._id}`,
          type: 'trial_expiring',
          title: 'Expiring within 7 days',
          message: `${s.schoolName} · ${s.plan} · expires ${exp.toLocaleDateString('en-PK')} · ${dLeft} day(s) left`,
          createdAt: exp,
          meta: { schoolId: s._id },
          severity: 'warning',
        });
      }
      if (s.blocked) {
        items.push({
          id: `school-blocked-${s._id}`,
          type: 'school_blocked',
          title: 'School blocked',
          message: s.schoolName,
          createdAt: s.updatedAt || s.createdAt,
          meta: { schoolId: s._id },
          severity: 'danger',
        });
      }
    }

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      notifications: items.slice(0, 50),
      counts: {
        pendingPayments: pendingPayments.length,
        total: items.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRevenue = async (req, res) => {
  try {
    let pricing = await Pricing.findOne();
    if (!pricing) {
      pricing = await Pricing.create(getDefaultPricing());
    }

    const schools = await School.find();

    const freeTrialCount = schools.filter(s => s.plan === 'free_trial').length;
    const liteCount = schools.filter(s => s.plan === 'lite' || s.plan === 'starter').length;
    const zkCount = schools.filter(s => s.plan === 'zk' || s.plan === 'premium' || s.plan === 'standard').length;

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

    const sid = req.params.id;
    const Payment = require('../models/Payment');
    const Invoice = require('../models/Invoice');
    const AcademicYear = require('../models/AcademicYear');
    const ClassSection = require('../models/ClassSection');
    const Subject = require('../models/Subject');
    const Examination = require('../models/Examination');
    const StudentMark = require('../models/StudentMark');
    const FeeRecord = require('../models/FeeRecord');
    const FeePayment = require('../models/FeePayment');
    const TimetableEntry = require('../models/TimetableEntry');
    const Assignment = require('../models/Assignment');
    const AssignmentSubmission = require('../models/AssignmentSubmission');
    const StudentDocument = require('../models/StudentDocument');
    const ModuleRecord = require('../models/ModuleRecord');
    const JournalEntry = require('../models/JournalEntry');

    await Promise.all([
      Student.deleteMany({ schoolId: sid }),
      Teacher.deleteMany({ schoolId: sid }),
      Attendance.deleteMany({ schoolId: sid }),
      LoginLog.deleteMany({ schoolId: sid }),
      Payment.deleteMany({ schoolId: sid }),
      Invoice.deleteMany({ schoolId: sid }),
      AcademicYear.deleteMany({ schoolId: sid }),
      ClassSection.deleteMany({ schoolId: sid }),
      Subject.deleteMany({ schoolId: sid }),
      Examination.deleteMany({ schoolId: sid }),
      StudentMark.deleteMany({ schoolId: sid }),
      FeeRecord.deleteMany({ schoolId: sid }),
      FeePayment.deleteMany({ schoolId: sid }),
      TimetableEntry.deleteMany({ schoolId: sid }),
      Assignment.deleteMany({ schoolId: sid }),
      AssignmentSubmission.deleteMany({ schoolId: sid }),
      StudentDocument.deleteMany({ schoolId: sid }),
      ModuleRecord.deleteMany({ schoolId: sid }),
      JournalEntry.deleteMany({ schoolId: sid }),
    ]);
    await School.findByIdAndDelete(sid);

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
      updateData.studentLimit = await getStudentLimit(plan);
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
      studentLimit: studentLimit || await getStudentLimit(plan)
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
