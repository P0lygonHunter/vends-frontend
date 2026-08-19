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
    const attendanceTotal = total - onLeave;

    const rate = attendanceTotal > 0
      ? Math.round((present / attendanceTotal) * 100)
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

    await Attendance.deleteMany({
      schoolId,
      date
    });

    const attendance = await Attendance.insertMany(
      records.map(r => ({
        schoolId,
        date,
        studentId: r.studentId,
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
      date: req.params.date
    });

    res.json(attendance);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
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