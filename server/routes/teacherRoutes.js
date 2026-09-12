const express = require('express');
const router = express.Router();

const {
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher
} = require('../controllers/teacherController');
const { requireSchoolAuth, requireSchoolScope, requireOwnedResource } = require('../middleware/auth');
const Teacher = require('../models/Teacher');

router.use(requireSchoolAuth, requireSchoolScope);

// Teacher Routes
router.get('/teachers/:schoolId', getTeachers);
router.post('/teachers', createTeacher);
router.patch('/teachers/:id', requireOwnedResource(Teacher), updateTeacher);
router.delete('/teachers/:id', requireOwnedResource(Teacher), deleteTeacher);

module.exports = router;
