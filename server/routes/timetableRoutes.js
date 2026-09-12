const express = require('express');
const router = express.Router();

const {
  getTimetable,
  createTimetableEntry,
  deleteTimetableEntry
} = require('../controllers/timetableController');
const { requireSchoolAuth, requireSchoolScope, requireOwnedResource } = require('../middleware/auth');
const TimetableEntry = require('../models/TimetableEntry');

router.use(requireSchoolAuth, requireSchoolScope);

// Timetable Routes
router.get('/timetable/:schoolId', getTimetable);
router.post('/timetable', createTimetableEntry);
router.delete('/timetable/:id', requireOwnedResource(TimetableEntry), deleteTimetableEntry);

module.exports = router;
