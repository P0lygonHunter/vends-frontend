const express = require('express');
const router = express.Router();
const { getStudents, createStudent, updateStudent, deleteStudent, findByPhone, changeFamilyPhone } = require('../controllers/studentController');
const { requireSchoolAuth, requireSchoolScope, requireOwnedResource } = require('../middleware/auth');
const Student = require('../models/Student');

router.use(requireSchoolAuth, requireSchoolScope);
router.get('/students/:schoolId', getStudents);
router.get('/students-by-phone', findByPhone);
router.post('/students/change-family-phone', changeFamilyPhone);
router.post('/students', createStudent);
router.patch('/students/:id', requireOwnedResource(Student), updateStudent);
router.delete('/students/:id', requireOwnedResource(Student), deleteStudent);
module.exports = router;
