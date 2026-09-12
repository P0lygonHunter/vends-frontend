const express = require('express');
const router = express.Router();

const {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent
} = require('../controllers/studentController');
const { requireSchoolAuth, requireSchoolScope, requireOwnedResource } = require('../middleware/auth');
const Student = require('../models/Student');

router.use(requireSchoolAuth, requireSchoolScope);

// Student Routes
router.get('/students/:schoolId', getStudents);
router.post('/students', createStudent);
router.patch('/students/:id', requireOwnedResource(Student), updateStudent);
router.delete('/students/:id', requireOwnedResource(Student), deleteStudent);

module.exports = router;
