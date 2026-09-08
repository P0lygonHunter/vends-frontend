const express = require('express');
const router = express.Router();

const {
  getTimetable,
  createTimetableEntry,
  deleteTimetableEntry
} = require('../controllers/timetableController');

// Timetable Routes
router.get('/timetable/:schoolId', getTimetable);
router.post('/timetable', createTimetableEntry);
router.delete('/timetable/:id', deleteTimetableEntry);

module.exports = router;
