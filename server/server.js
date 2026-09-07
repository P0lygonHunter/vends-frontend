const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const School = require('./models/School');
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const Attendance = require('./models/Attendance');
const LoginLog = require('./models/LoginLog');
const ModuleRecord = require('./models/ModuleRecord');
const AcademicYear = require('./models/AcademicYear');
const ClassSection = require('./models/ClassSection');
const Subject = require('./models/Subject');
const Examination = require('./models/Examination');
const StudentMark = require('./models/StudentMark');
const FeeRecord = require('./models/FeeRecord');

const app = express();

// ══════════════════════════════════
// MIDDLEWARE (CORS & Body Parser)
// ══════════════════════════════════
app.use(cors({
  origin: [
    'https://vends-frontend.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true
}));

app.use(express.json());

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);

    res.status(500).json({
      error: "Database connection failed",
      details: err.message
    });
  }
});

// ══════════════════════════════════
// DATABASE CONNECTION
// ══════════════════════════════════
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/SchoolERP';

let dbPromise;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!dbPromise) {
    dbPromise = mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000
    });
  }

  await dbPromise;
  console.log("✅ Database Connected Successfully");
};

// ══════════════════════════════════
// PRICING MODEL
// ══════════════════════════════════

const PricingSchema = new mongoose.Schema({
  freeTrial: {
    type: Number,
    default: 0
  },

  lite: {
    type: Number,
    default: 4999
  },

  zk: {
    type: Number,
    default: 14999
  }
}, {
  timestamps: true
});

const Pricing = mongoose.models.Pricing ||
  mongoose.model('Pricing', PricingSchema);


// ══════════════════════════════════
// HELPER
// ══════════════════════════════════

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


// ══════════════════════════════════
// CEO ROUTES
// ══════════════════════════════════

// CEO Login
app.post('/api/ceo/login', (req, res) => {
  const { email, password } = req.body;

  if (
    email === "ceo@vendseducore.pk" &&
    password === "Vends@CEO2026"
  ) {
    return res.status(200).json({
      message: "Success",
      token: "ceo-token-2026"
    });
  }

  res.status(401).json({
    message: "Invalid Credentials"
  });
});


// ══════════════════════════════════
// GET ALL SCHOOLS
// ══════════════════════════════════

app.get('/api/admin/schools', async (req, res) => {
  try {
    const schools = await School.find().sort({ createdAt: -1 });

    res.json(schools);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


// ══════════════════════════════════
// LOGIN LOGS
// ══════════════════════════════════

app.get('/api/admin/login-logs', async (req, res) => {
  try {
    const logs = await LoginLog.find()
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(logs);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


// ══════════════════════════════════
// CEO PRICING
// ══════════════════════════════════

// Get current pricing
app.get('/api/admin/pricing', async (req, res) => {
  try {
    let pricing = await Pricing.findOne();

    if (!pricing) {
      pricing = await Pricing.create(getDefaultPricing());
    }

    res.json({
      success: true,
      pricing
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


// Update pricing
app.patch('/api/admin/pricing', async (req, res) => {
  try {
    const {
      freeTrial,
      lite,
      zk
    } = req.body;

    if (
      freeTrial === undefined ||
      lite === undefined ||
      zk === undefined
    ) {
      return res.status(400).json({
        error: "All pricing fields are required."
      });
    }

    const freeTrialPrice = Number(freeTrial);
    const litePrice = Number(lite);
    const zkPrice = Number(zk);

    if (
      Number.isNaN(freeTrialPrice) ||
      Number.isNaN(litePrice) ||
      Number.isNaN(zkPrice)
    ) {
      return res.status(400).json({
        error: "Pricing values must be valid numbers."
      });
    }

    if (
      freeTrialPrice < 0 ||
      litePrice < 0 ||
      zkPrice < 0
    ) {
      return res.status(400).json({
        error: "Pricing cannot be negative."
      });
    }

    let pricing = await Pricing.findOne();

    if (!pricing) {
      pricing = new Pricing();
    }

    pricing.freeTrial = freeTrialPrice;
    pricing.lite = litePrice;
    pricing.zk = zkPrice;

    await pricing.save();

    res.json({
      success: true,
      message: "Pricing updated successfully!",
      pricing
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


// ══════════════════════════════════
// REAL REVENUE
// ══════════════════════════════════

app.get('/api/admin/revenue', async (req, res) => {
  try {
    let pricing = await Pricing.findOne();

    if (!pricing) {
      pricing = await Pricing.create(getDefaultPricing());
    }

    const schools = await School.find();

    const freeTrialCount = schools.filter(
      s => s.plan === 'free_trial'
    ).length;

    const liteCount = schools.filter(
      s => s.plan === 'lite'
    ).length;

    const zkCount = schools.filter(
      s => s.plan === 'zk'
    ).length;

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
    res.status(500).json({
      error: err.message
    });
  }
});


// ══════════════════════════════════
// TOGGLE BLOCK / UNBLOCK
// ══════════════════════════════════

app.patch('/api/admin/toggle-block/:id', async (req, res) => {
  try {
    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({
        error: "School not found"
      });
    }

    school.blocked = !school.blocked;

    await school.save();

    res.json({
      message: `School status updated. Blocked: ${school.blocked}`,
      schoolName: school.schoolName,
      blocked: school.blocked
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


// ══════════════════════════════════
// DELETE SCHOOL
// ══════════════════════════════════

app.delete('/api/admin/delete-school/:id', async (req, res) => {
  try {
    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({
        error: "School not found"
      });
    }

    await Student.deleteMany({
      schoolId: req.params.id
    });

    await Teacher.deleteMany({
      schoolId: req.params.id
    });

    await Attendance.deleteMany({
      schoolId: req.params.id
    });

    await LoginLog.deleteMany({
      schoolId: req.params.id
    });

    await School.findByIdAndDelete(req.params.id);

    res.json({
      message: `${school.schoolName} deleted permanently!`
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


// ══════════════════════════════════
// EXTEND TRIAL / CHANGE PLAN
// ══════════════════════════════════

app.patch('/api/admin/extend-trial/:id', async (req, res) => {
  try {
    const {
      days,
      plan
    } = req.body;

    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({
        error: "School not found"
      });
    }

    const parsedDays = Number(days);

    if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
      return res.status(400).json({
        error: "Days must be a valid positive number."
      });
    }

    let newExpiry = new Date();

    newExpiry.setDate(
      newExpiry.getDate() + parsedDays
    );

    const updateData = {
      expiryDate: newExpiry
    };

    if (plan) {
      updateData.plan = plan;
      updateData.studentLimit = getStudentLimit(plan);
    }

    const updated = await School.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true
      }
    );

    res.json({
      message: `${school.schoolName}'s plan updated! New expiry in ${parsedDays} days.`,
      school: updated
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


// ══════════════════════════════════
// UPDATE PLAN & LIMIT
// ══════════════════════════════════

app.patch('/api/admin/update-plan/:id', async (req, res) => {
  try {
    const {
      plan,
      studentLimit,
      daysToAdd
    } = req.body;

    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({
        error: "School not found"
      });
    }

    const updateData = {
      plan,
      studentLimit: studentLimit || getStudentLimit(plan)
    };

    if (daysToAdd) {
      const parsedDays = Number(daysToAdd);

      if (
        !Number.isFinite(parsedDays) ||
        parsedDays <= 0
      ) {
        return res.status(400).json({
          error: "daysToAdd must be a positive number."
        });
      }

      let newExpiry = new Date();

      newExpiry.setDate(
        newExpiry.getDate() + parsedDays
      );

      updateData.expiryDate = newExpiry;
    }

    const updated = await School.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true
      }
    );

    res.json({
      message: "Plan updated!",
      school: updated
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


// ══════════════════════════════════
// SCHOOL REGISTRATION
// ══════════════════════════════════

// School Registration
app.post('/api/register-school', async (req, res) => {
  try {
    const {
      schoolName,
      principalName,
      phone,
      email,
      password,
      address,
      city,
      totalStudents
    } = req.body;

    const existing = await School.findOne({
      adminEmail: email
    });

    if (existing) {
      return res.status(400).json({
        error: "Email already registered!"
      });
    }

    let expiry = new Date();

    expiry.setDate(
      expiry.getDate() + 30
    );

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

    res.status(201).json({
      message: "School registered successfully!",
      school: newSchool
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


// ══════════════════════════════════
// SCHOOL LOGIN
// ══════════════════════════════════

app.post('/api/school/login', async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body;

    const school = await School.findOne({
      adminEmail: email
    });

    if (!school) {

      await LoginLog.create({
        schoolName: 'Unknown',
        email,
        status: 'Failed'
      });

      return res.status(404).json({
        error: "School not found!"
      });
    }

    if (school.password !== password) {

      await LoginLog.create({
        schoolId: school._id,
        schoolName: school.schoolName,
        email,
        status: 'Failed'
      });

      return res.status(401).json({
        error: "Wrong password!"
      });
    }

    if (school.blocked) {

      await LoginLog.create({
        schoolId: school._id,
        schoolName: school.schoolName,
        email,
        status: 'Blocked'
      });

      return res.status(403).json({
        error: "Account blocked. Contact support."
      });
    }

    const now = new Date();

    if (now > school.expiryDate) {

      await LoginLog.create({
        schoolId: school._id,
        schoolName: school.schoolName,
        email,
        status: 'Failed'
      });

      return res.status(403).json({
        error: "Trial expired! Please subscribe.",
        expiryDate: school.expiryDate
      });
    }

    await LoginLog.create({
      schoolId: school._id,
      schoolName: school.schoolName,
      email,
      status: 'Success'
    });

    res.status(200).json({
      message: "Login successful",
      school
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


// ══════════════════════════════════
// CHECK SCHOOL STATUS
// ══════════════════════════════════

app.get('/api/school/check/:id', async (req, res) => {
  try {
    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({
        error: "School not found"
      });
    }

    if (school.blocked) {
      return res.status(403).json({
        error: "Account blocked"
      });
    }

    const now = new Date();

    if (now > school.expiryDate) {
      return res.status(403).json({
        error: "Trial expired"
      });
    }

    res.json({
      ok: true,
      school
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


// ══════════════════════════════════
// SCHOOL SETTINGS
// ══════════════════════════════════

// Update School Information
app.patch('/api/school/update/:id', async (req, res) => {
  try {
    const {
      schoolName,
      principalName,
      phone,
      email,
      city,
      address
    } = req.body;

    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({
        error: "School not found"
      });
    }

    if (
      !schoolName ||
      !principalName ||
      !phone ||
      !email ||
      !city ||
      !address
    ) {
      return res.status(400).json({
        error: "All school information fields are required."
      });
    }

    const existingEmail = await School.findOne({
      adminEmail: email,
      _id: {
        $ne: req.params.id
      }
    });

    if (existingEmail) {
      return res.status(400).json({
        error: "This email is already registered with another school."
      });
    }

    school.schoolName = schoolName;
    school.principalName = principalName;
    school.phone = phone;
    school.adminEmail = email;
    school.city = city;
    school.address = address;

    await school.save();

    res.json({
      message: "School information updated successfully!",
      school
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


// ══════════════════════════════════
// PASSWORD CHANGE
// ══════════════════════════════════

app.patch('/api/school/change-password/:id', async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword
    } = req.body;

    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({
        error: "School not found."
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: "Current password and new password are required."
      });
    }

    if (school.password !== currentPassword) {
      return res.status(401).json({
        error: "Current password is incorrect."
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "New password must be at least 6 characters."
      });
    }

    school.password = newPassword;

    await school.save();

    res.json({
      message: "Password changed successfully!"
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


// ══════════════════════════════════
// ACADEMIC FOUNDATION ROUTES
// ══════════════════════════════════
app.get('/api/academic-years/:schoolId', async (req, res) => {
  try {
    let years = await AcademicYear.find({ schoolId: req.params.schoolId }).sort({ startDate: -1 });
    if (!years.some(year => year.isCurrent)) {
      const activeYears = years.filter(year => year.status === 'Active');
      if (activeYears.length === 1) {
        activeYears[0].isCurrent = true;
        await activeYears[0].save();
        years = await AcademicYear.find({ schoolId: req.params.schoolId }).sort({ startDate: -1 });
      }
    }
    res.json(years);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/academic-years', async (req, res) => {
  try {
    const { schoolId, name, startDate, endDate, status = 'Active', isCurrent = false } = req.body;
    if (!schoolId || !name || !startDate || !endDate) return res.status(400).json({ error: 'schoolId, name, startDate and endDate are required.' });
    if (new Date(startDate) >= new Date(endDate)) return res.status(400).json({ error: 'End date must be after start date.' });
    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ error: 'School not found.' });
    if (isCurrent) await AcademicYear.updateMany({ schoolId }, { isCurrent: false });
    const year = await AcademicYear.create({ schoolId, name, startDate, endDate, status, isCurrent });
    res.status(201).json(year);
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({ error: err.code === 11000 ? 'This academic year already exists.' : err.message });
  }
});

app.patch('/api/academic-years/:id', async (req, res) => {
  try {
    const current = await AcademicYear.findById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Academic year not found.' });
    if (req.body.startDate && req.body.endDate && new Date(req.body.startDate) >= new Date(req.body.endDate)) return res.status(400).json({ error: 'End date must be after start date.' });
    if (req.body.isCurrent) await AcademicYear.updateMany({ schoolId: current.schoolId, _id: { $ne: current._id } }, { isCurrent: false });
    const year = await AcademicYear.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(year);
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({ error: err.code === 11000 ? 'This academic year already exists.' : err.message });
  }
});

app.delete('/api/academic-years/:id', async (req, res) => {
  try {
    const classCount = await ClassSection.countDocuments({ academicYearId: req.params.id });
    if (classCount) return res.status(409).json({ error: 'This academic year has classes. Deactivate it instead of deleting it.' });
    const year = await AcademicYear.findByIdAndDelete(req.params.id);
    if (!year) return res.status(404).json({ error: 'Academic year not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/classes/:schoolId', async (req, res) => {
  try {
    const classes = await ClassSection.find({ schoolId: req.params.schoolId }).populate('academicYearId', 'name').sort({ name: 1 });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/classes', async (req, res) => {
  try {
    const { schoolId, academicYearId, name, room = '', capacity = 40, status = 'Active' } = req.body;
    const year = await AcademicYear.findOne({ _id: academicYearId, schoolId });
    if (!year) return res.status(400).json({ error: 'Select a valid academic year for this school.' });
    const classSection = await ClassSection.create({ schoolId, academicYearId, name, room, capacity, status });
    res.status(201).json(await classSection.populate('academicYearId', 'name'));
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({ error: err.code === 11000 ? 'This class already exists in the academic year.' : err.message });
  }
});

app.patch('/api/classes/:id', async (req, res) => {
  try {
    const current = await ClassSection.findById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Class section not found.' });
    if (req.body.academicYearId) {
      const year = await AcademicYear.findOne({ _id: req.body.academicYearId, schoolId: current.schoolId });
      if (!year) return res.status(400).json({ error: 'Select a valid academic year for this school.' });
    }
    const classSection = await ClassSection.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('academicYearId', 'name');
    res.json(classSection);
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({ error: err.code === 11000 ? 'This class already exists in the academic year.' : err.message });
  }
});

app.delete('/api/classes/:id', async (req, res) => {
  try {
    const classSection = await ClassSection.findByIdAndDelete(req.params.id);
    if (!classSection) return res.status(404).json({ error: 'Class section not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/subjects/:schoolId', async (req, res) => {
  try {
    res.json(await Subject.find({ schoolId: req.params.schoolId }).sort({ name: 1 }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/subjects', async (req, res) => {
  try {
    const { schoolId, name, code, description = '', status = 'Active' } = req.body;
    if (!schoolId || !name || !code) return res.status(400).json({ error: 'schoolId, name and code are required.' });
    const subject = await Subject.create({ schoolId, name, code, description, status });
    res.status(201).json(subject);
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({ error: err.code === 11000 ? 'This subject code already exists.' : err.message });
  }
});

app.patch('/api/subjects/:id', async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!subject) return res.status(404).json({ error: 'Subject not found.' });
    res.json(subject);
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({ error: err.code === 11000 ? 'This subject code already exists.' : err.message });
  }
});

app.delete('/api/subjects/:id', async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ error: 'Subject not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ══════════════════════════════════
// EXAMS AND RESULTS ROUTES
// ══════════════════════════════════
app.get('/api/examinations/:schoolId', async (req, res) => {
  try {
    const examinations = await Examination.find({ schoolId: req.params.schoolId }).populate('academicYearId', 'name').populate('classSectionId', 'name').sort({ startDate: -1 });
    res.json(examinations);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/examinations', async (req, res) => {
  try {
    const { schoolId, academicYearId, classSectionId, name, type, startDate, endDate, maximumMarks, passMarks, status = 'Draft' } = req.body;
    const classSection = await ClassSection.findOne({ _id: classSectionId, schoolId, academicYearId });
    if (!classSection) return res.status(400).json({ error: 'Selected class and academic year do not match this school.' });
    if (new Date(startDate) > new Date(endDate)) return res.status(400).json({ error: 'End date must be on or after start date.' });
    if (Number(passMarks) > Number(maximumMarks)) return res.status(400).json({ error: 'Pass marks cannot exceed maximum marks.' });
    const examination = await Examination.create({ schoolId, academicYearId, classSectionId, name, type, startDate, endDate, maximumMarks, passMarks, status });
    res.status(201).json(await examination.populate([{ path: 'academicYearId', select: 'name' }, { path: 'classSectionId', select: 'name' }]));
  } catch (err) { res.status(err.code === 11000 ? 409 : 400).json({ error: err.code === 11000 ? 'This examination already exists for the selected class.' : err.message }); }
});

app.patch('/api/examinations/:id', async (req, res) => {
  try {
    const examination = await Examination.findById(req.params.id);
    if (!examination) return res.status(404).json({ error: 'Examination not found.' });
    if (req.body.classSectionId || req.body.academicYearId) {
      const classSection = await ClassSection.findOne({ _id: req.body.classSectionId || examination.classSectionId, schoolId: examination.schoolId, academicYearId: req.body.academicYearId || examination.academicYearId });
      if (!classSection) return res.status(400).json({ error: 'Selected class and academic year do not match.' });
    }
    const updated = await Examination.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate([{ path: 'academicYearId', select: 'name' }, { path: 'classSectionId', select: 'name' }]);
    res.json(updated);
  } catch (err) { res.status(err.code === 11000 ? 409 : 400).json({ error: err.code === 11000 ? 'This examination already exists for the selected class.' : err.message }); }
});

app.delete('/api/examinations/:id', async (req, res) => {
  try {
    const examination = await Examination.findByIdAndDelete(req.params.id);
    if (!examination) return res.status(404).json({ error: 'Examination not found.' });
    await StudentMark.deleteMany({ examinationId: examination._id });
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/examinations/:id/marks', async (req, res) => {
  try { res.json(await StudentMark.find({ examinationId: req.params.id }).populate('studentId', 'name').populate('subjectId', 'name code')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/examinations/:id/marks', async (req, res) => {
  try {
    const examination = await Examination.findById(req.params.id);
    if (!examination) return res.status(404).json({ error: 'Examination not found.' });
    const { subjectId, marks } = req.body;
    const saved = [];
    for (const mark of marks || []) {
      const student = await Student.findOne({ _id: mark.studentId, schoolId: examination.schoolId, classSectionId: examination.classSectionId });
      if (!student) return res.status(400).json({ error: 'One or more students do not belong to this examination class.' });
      const obtainedMarks = Number(mark.obtainedMarks);
      if (obtainedMarks < 0 || obtainedMarks > examination.maximumMarks) return res.status(400).json({ error: 'Obtained marks must be within the maximum marks.' });
      const percentage = Number(((obtainedMarks / examination.maximumMarks) * 100).toFixed(2));
      const grade = percentage >= 80 ? 'A+' : percentage >= 70 ? 'A' : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : percentage >= 33 ? 'D' : 'F';
      saved.push(await StudentMark.findOneAndUpdate({ examinationId: examination._id, studentId: student._id, subjectId }, { schoolId: examination.schoolId, obtainedMarks, percentage, grade }, { upsert: true, new: true, runValidators: true }));
    }
    await Examination.findByIdAndUpdate(examination._id, { status: saved.length ? 'Marks Pending' : examination.status });
    res.status(201).json(saved);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ══════════════════════════════════
// FEES ROUTES
// ══════════════════════════════════
app.get('/api/fees/:schoolId', async (req, res) => {
  try { res.json(await FeeRecord.find({ schoolId: req.params.schoolId }).populate('studentId', 'name email').populate('classSectionId', 'name').sort({ createdAt: -1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/fees', async (req, res) => {
  try {
    const { schoolId, studentId, classSectionId = null, academicYearId = null, feeType, month, amount, paid = 0, dueDate = null } = req.body;
    const student = await Student.findOne({ _id: studentId, schoolId });
    if (!student) return res.status(400).json({ error: 'Selected student does not belong to this school.' });
    if (classSectionId && !(await ClassSection.findOne({ _id: classSectionId, schoolId }))) return res.status(400).json({ error: 'Selected class does not belong to this school.' });
    if (Number(paid) > Number(amount)) return res.status(400).json({ error: 'Paid amount cannot exceed total amount.' });
    const balance = Number(amount) - Number(paid);
    const status = balance === 0 ? 'Paid' : dueDate && new Date(dueDate) < new Date() ? 'Overdue' : 'Pending';
    const fee = await FeeRecord.create({ schoolId, studentId, classSectionId, academicYearId, feeType, month, amount, paid, balance, dueDate, status });
    res.status(201).json(await fee.populate([{ path: 'studentId', select: 'name email' }, { path: 'classSectionId', select: 'name' }]));
  } catch (err) { res.status(err.code === 11000 ? 409 : 400).json({ error: err.code === 11000 ? 'This fee record already exists for the student and month.' : err.message }); }
});

app.patch('/api/fees/:id', async (req, res) => {
  try {
    const fee = await FeeRecord.findById(req.params.id);
    if (!fee) return res.status(404).json({ error: 'Fee record not found.' });
    const amount = Number(req.body.amount ?? fee.amount);
    const paid = Number(req.body.paid ?? fee.paid);
    if (paid > amount) return res.status(400).json({ error: 'Paid amount cannot exceed total amount.' });
    const balance = amount - paid;
    const status = balance === 0 ? 'Paid' : req.body.dueDate && new Date(req.body.dueDate) < new Date() ? 'Overdue' : 'Pending';
    const updated = await FeeRecord.findByIdAndUpdate(req.params.id, { ...req.body, amount, paid, balance, status }, { new: true, runValidators: true }).populate([{ path: 'studentId', select: 'name email' }, { path: 'classSectionId', select: 'name' }]);
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/fees/:id', async (req, res) => {
  try { const fee = await FeeRecord.findByIdAndDelete(req.params.id); if (!fee) return res.status(404).json({ error: 'Fee record not found.' }); res.json({ success: true }); }
  catch (err) { res.status(400).json({ error: err.message }); }
});

// ══════════════════════════════════
// STUDENT ROUTES
// ══════════════════════════════════

// Get Students
app.get('/api/students/:schoolId', async (req, res) => {
  try {
    const students = await Student.find({
      schoolId: req.params.schoolId
    });

    res.json(students);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


app.post('/api/students', async (req, res) => {
  try {
    const school = await School.findById(
      req.body.schoolId
    );

    if (!school) {
      return res.status(404).json({
        error: "School not found!"
      });
    }

    const studentCount = await Student.countDocuments({
      schoolId: req.body.schoolId
    });

    if (studentCount >= school.studentLimit) {
      return res.status(403).json({
        error: `Student limit reached! Your ${
          school.plan === 'free_trial'
            ? 'Free Trial'
            : 'current'
        } plan allows maximum ${
          school.studentLimit
        } students. Please upgrade your plan.`
      });
    }

    if (req.body.classSectionId) {
      const classSection = await ClassSection.findOne({ _id: req.body.classSectionId, schoolId: req.body.schoolId });
      if (!classSection) return res.status(400).json({ error: 'Selected class does not belong to this school.' });
      if (req.body.academicYearId && String(classSection.academicYearId) !== String(req.body.academicYearId)) return res.status(400).json({ error: 'Selected class does not belong to the selected academic year.' });
    }

    const student = new Student(req.body);

    await student.save();

    res.status(201).json(student);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


app.patch('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true
      }
    );

    res.json(student);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


app.delete('/api/students/:id', async (req, res) => {
  try {
    await Student.findByIdAndDelete(
      req.params.id
    );

    res.json({
      message: "Student deleted!"
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


// ══════════════════════════════════
// TEACHER ROUTES
// ══════════════════════════════════

// Get Teachers
app.get('/api/teachers/:schoolId', async (req, res) => {
  try {
    const teachers = await Teacher.find({
      schoolId: req.params.schoolId
    });

    res.json(teachers);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


app.post('/api/teachers', async (req, res) => {
  try {
    const {
      schoolId,
      name,
      email,
      phone,
      subject,
      grades,
      status
    } = req.body;

    if (!schoolId) {
      return res.status(400).json({
        error: "School ID is required."
      });
    }

    const school = await School.findById(
      schoolId
    );

    if (!school) {
      return res.status(404).json({
        error: "School not found!"
      });
    }

    if (
      !name ||
      !email ||
      !phone ||
      !subject
    ) {
      return res.status(400).json({
        error: "Please fill all required teacher fields."
      });
    }

    const teacher = new Teacher({
      schoolId,
      name,
      email,
      phone,
      subject,
      grades,
      status: status || 'Active'
    });

    await teacher.save();

    res.status(201).json(teacher);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


app.patch('/api/teachers/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findById(
      req.params.id
    );

    if (!teacher) {
      return res.status(404).json({
        error: "Teacher not found!"
      });
    }

    const {
      name,
      email,
      phone,
      subject,
      grades,
      status
    } = req.body;

    if (
      !name ||
      !email ||
      !phone ||
      !subject
    ) {
      return res.status(400).json({
        error: "Please fill all required teacher fields."
      });
    }

    teacher.name = name;
    teacher.email = email;
    teacher.phone = phone;
    teacher.subject = subject;
    teacher.grades = grades;
    teacher.status = status;

    await teacher.save();

    res.json(teacher);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


app.delete('/api/teachers/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findById(
      req.params.id
    );

    if (!teacher) {
      return res.status(404).json({
        error: "Teacher not found!"
      });
    }

    await Teacher.findByIdAndDelete(
      req.params.id
    );

    res.json({
      message: "Teacher deleted!"
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


// ══════════════════════════════════
// ATTENDANCE ROUTES
// ══════════════════════════════════

// Get Attendance Stats
app.get('/api/attendance/stats/:schoolId', async (req, res) => {
  try {
    const today = new Date()
      .toISOString()
      .split('T')[0];

    const [students, records] = await Promise.all([
      Student.find({ schoolId: req.params.schoolId }),
      Attendance.find({
        schoolId: req.params.schoolId,
        date: today
      })
    ]);

    const onLeaveStudentIds = new Set(
      students
        .filter(student => student.status === 'On Leave')
        .map(student => student._id.toString())
    );

    const eligibleRecords = records.filter(
      record => !onLeaveStudentIds.has(record.studentId.toString())
    );

    const present = eligibleRecords.filter(
      r => r.status === 'P'
    ).length;

    const absent = eligibleRecords.filter(
      r => r.status === 'A'
    ).length;

    const onLeave = students.filter(
      student => student.status === 'On Leave'
    ).length;

    const total = students.length;

    const rate = total > 0
      ? Math.round((present / total) * 100)
      : 0;

    res.json({
      present,
      absent,
      onLeave,
      total,
      rate
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


app.post('/api/attendance', async (req, res) => {
  try {
    const {
      schoolId,
      date,
      records
    } = req.body;

    const classSection = req.body.classSectionId
      ? await ClassSection.findOne({ _id: req.body.classSectionId, schoolId })
      : null;
    if (req.body.classSectionId && !classSection) return res.status(400).json({ error: 'Selected class does not belong to this school.' });

    const studentIds = records.map(record => record.studentId);
    const students = await Student.find({ _id: { $in: studentIds }, schoolId }).select('_id');
    if (students.length !== studentIds.length) return res.status(400).json({ error: 'Attendance contains a student outside this school.' });

    await Attendance.deleteMany({
      schoolId,
      date,
      ...(req.body.classSectionId ? { classSectionId: req.body.classSectionId } : {})
    });

    const attendance = await Attendance.insertMany(
      records.map(r => ({
        schoolId,
        date,
        studentId: r.studentId,
        academicYearId: r.academicYearId || classSection?.academicYearId || null,
        classSectionId: r.classSectionId || req.body.classSectionId || null,
        studentName: r.studentName,
        grade: r.grade,
        status: r.status
      }))
    );

    res.status(201).json({
      message: "Attendance saved!",
      attendance
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


app.get('/api/attendance/:schoolId/:date', async (req, res) => {
  try {
    const attendance = await Attendance.find({
      schoolId: req.params.schoolId,
      date: req.params.date,
      ...(req.query.classSectionId ? { classSectionId: req.query.classSectionId } : {})
    });

    res.json(attendance);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


// ══════════════════════════════════
// GENERIC SCHOOL MODULE RECORDS
// ══════════════════════════════════
app.get('/api/module-records/:module/:schoolId', async (req, res) => {
  try {
    const records = await ModuleRecord.find({ schoolId: req.params.schoolId, module: req.params.module }).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/module-records', async (req, res) => {
  try {
    const { schoolId, module, data } = req.body;
    if (!schoolId || !module || !data || typeof data !== 'object') return res.status(400).json({ error: 'schoolId, module and data are required.' });
    const record = await ModuleRecord.create({ schoolId, module, data });
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/module-records/:id', async (req, res) => {
  try {
    const record = await ModuleRecord.findOneAndUpdate({ _id: req.params.id, schoolId: req.body.schoolId }, { data: req.body.data }, { new: true, runValidators: true });
    if (!record) return res.status(404).json({ error: 'Record not found.' });
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/module-records/:id', async (req, res) => {
  try {
    const record = await ModuleRecord.findOneAndDelete({ _id: req.params.id, schoolId: req.query.schoolId });
    if (!record) return res.status(404).json({ error: 'Record not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ══════════════════════════════════
// SERVER EXPORT FOR VERCEL
// ══════════════════════════════════
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running locally on port ${PORT}`);
  });
}

app.get('/api/debug/db', async (req, res) => {
  try {
    await mongoose.connect(MONGO_URI);

    res.json({
      success: true,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      database: mongoose.connection.name
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      readyState: mongoose.connection.readyState
    });
  }
});

module.exports = app;