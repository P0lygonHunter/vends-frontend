const express = require('express');
const router = express.Router();

const {
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher
} = require('../controllers/teacherController');

// Teacher Routes
router.get('/teachers/:schoolId', getTeachers);
router.post('/teachers', createTeacher);
router.patch('/teachers/:id', updateTeacher);
router.delete('/teachers/:id', deleteTeacher);

module.exports = router;
