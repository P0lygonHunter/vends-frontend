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
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://127.0.0.1:27017/SchoolERP')
.then(() => console.log("✅ Database Connected"))
.catch((err) => console.log("❌ DB Error", err));

// ══════════════════════════════════
// CEO ROUTES
// ══════════════════════════════════

// CEO Login
app.post('/api/ceo/login', (req, res) => {
  const { email, password } = req.body;

  if (email === "ceo@vendseducore.pk" && password === "Vends@CEO2026") {
    res.status(200).json({
      message: "Success",
      token: "ceo-token-2026"
    });
  } else {
    res.status(401).json({
      message: "Invalid Credentials"
    });
  }
});

// Get All Schools
app.get('/api/admin/schools', async (req, res) => {
  try {
    const schools = await School.find();
    res.json(schools);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Login Logs
app.get('/api/admin/login-logs', async (req, res) => {
  try {
    const logs = await LoginLog.find()
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Block/Unblock
app.patch('/api/admin/toggle-block/:id', async (req, res) => {
  try {
    const school = await School.findById(req.params.id);

    school.blocked = !school.blocked;

    await school.save();

    res.json({
      message: `School status updated. Blocked: ${school.blocked}`,
      schoolName: school.schoolName
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete School
app.delete('/api/admin/delete-school/:id', async (req, res) => {
  try {
    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({
        error: "School not found"
      });
    }

    await Student.deleteMany({ schoolId: req.params.id });
    await Teacher.deleteMany({ schoolId: req.params.id });
    await Attendance.deleteMany({ schoolId: req.params.id });
    await School.findByIdAndDelete(req.params.id);

    res.json({
      message: `${school.schoolName} deleted permanently!`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Extend Trial / Change Plan
app.patch('/api/admin/extend-trial/:id', async (req, res) => {
  try {
    const { days, plan } = req.body;

    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({
        error: "School not found"
      });
    }

    let newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + parseInt(days));

    const updateData = {
      expiryDate: newExpiry
    };

    if (plan) {
      updateData.plan = plan;
    }

    const updated = await School.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json({
      message: `${school.schoolName}'s plan updated! New expiry in ${days} days.`,
      school: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Plan & Limit
app.patch('/api/admin/update-plan/:id', async (req, res) => {
  try {
    const { plan, studentLimit, daysToAdd } = req.body;

    let updateData = {
      plan,
      studentLimit
    };

    if (daysToAdd) {
      let newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + daysToAdd);

      updateData.expiryDate = newExpiry;
    }

    const updated = await School.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json({
      message: "Plan updated!",
      school: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════
// SCHOOL ROUTES
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

// School Login
app.post('/api/school/login', async (req, res) => {
  try {
    const { email, password } = req.body;

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

// Check School Status
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

    if (!schoolName || !principalName || !phone || !email || !city || !address) {
      return res.status(400).json({
        error: "All school information fields are required."
      });
    }

    const existingEmail = await School.findOne({
      adminEmail: email,
      _id: { $ne: req.params.id }
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

// Add Student
app.post('/api/students', async (req, res) => {
  try {
    const school = await School.findById(req.body.schoolId);

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
        error: `Student limit reached! Your ${school.plan === 'free_trial' ? 'Free Trial' : 'current'} plan allows maximum ${school.studentLimit} students. Please upgrade your plan.`
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

// Edit Student
app.patch('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(student);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// Delete Student
app.delete('/api/students/:id', async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);

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

// Add Teacher
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

    const school = await School.findById(schoolId);

    if (!school) {
      return res.status(404).json({
        error: "School not found!"
      });
    }

    if (!name || !email || !phone || !subject) {
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

// Edit Teacher
app.patch('/api/teachers/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);

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

    if (!name || !email || !phone || !subject) {
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

// Delete Teacher
app.delete('/api/teachers/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        error: "Teacher not found!"
      });
    }

    await Teacher.findByIdAndDelete(req.params.id);

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
    const today = new Date().toISOString().split('T')[0];

    const records = await Attendance.find({
      schoolId: req.params.schoolId,
      date: today
    });

    const present = records.filter(r => r.status === 'P').length;
    const absent = records.filter(r => r.status === 'A').length;
    const total = records.length;

    const rate = total > 0
      ? Math.round((present / total) * 100)
      : 0;

    res.json({
      present,
      absent,
      total,
      rate
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// Save Attendance
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

// Get Attendance by Date
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

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is flying on port ${PORT}`);
});