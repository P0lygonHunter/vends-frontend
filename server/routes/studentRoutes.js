const express = require('express');
const router = express.Router();

const {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent
} = require('../controllers/studentController');

// Student Routes
router.get('/students/:schoolId', getStudents);
router.post('/students', createStudent);
router.patch('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);

module.exports = router;
