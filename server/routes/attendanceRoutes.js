const express = require('express');
const router = express.Router();

const {
  getAttendanceStats,
  createAttendance,
  getAttendanceByDate
} = require('../controllers/attendanceController');
const { requireSchoolAuth, requireSchoolScope } = require('../middleware/auth');

router.use(requireSchoolAuth, requireSchoolScope);

// Attendance Routes
router.get('/attendance/stats/:schoolId', getAttendanceStats);
router.post('/attendance', createAttendance);
router.get('/attendance/:schoolId/:date', getAttendanceByDate);

module.exports = router;
