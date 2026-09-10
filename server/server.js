const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Load models
require('./models/School');
require('./models/Student');
require('./models/Teacher');
require('./models/Attendance');
require('./models/LoginLog');
require('./models/ModuleRecord');
require('./models/AcademicYear');
require('./models/ClassSection');
require('./models/Subject');
require('./models/Examination');
require('./models/StudentMark');
require('./models/FeeRecord');
require('./models/TimetableEntry');
require('./models/Assignment');
require('./models/AssignmentSubmission');
require('./models/StudentDocument');
require('./models/FeePayment');
require('./models/JournalEntry');

// Initialize app
const app = express();

// Middleware
app.use(cors({
  origin: [
    'https://vends-frontend.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true
}));

app.use(express.json());

// Database connection middleware
const dbMiddleware = require('./middleware/dbMiddleware');
app.use(dbMiddleware);

// Load routes
const ceoRoutes = require('./routes/ceoRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const academicRoutes = require('./routes/academicRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const examinationRoutes = require('./routes/examinationRoutes');
const feeRoutes = require('./routes/feeRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const documentRoutes = require('./routes/documentRoutes');
const moduleRoutes = require('./routes/moduleRoutes');

// API Routes
app.use('/api/ceo', ceoRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/admin', ceoRoutes);
app.use('/api', academicRoutes);
app.use('/api', studentRoutes);
app.use('/api', teacherRoutes);
app.use('/api', attendanceRoutes);
app.use('/api/exams', examinationRoutes);
app.use('/api', feeRoutes);
app.use('/api', timetableRoutes);
app.use('/api', assignmentRoutes);
app.use('/api', documentRoutes);
app.use('/api', moduleRoutes);

// Debug route
app.get('/api/debug/db', async (req, res) => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/SchoolERP');
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

// Export for Vercel
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✓ Server running locally on port ${PORT}`);
  });
}

module.exports = app;
