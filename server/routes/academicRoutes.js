const express = require('express');
const router = express.Router();

const {
  getAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject
} = require('../controllers/academicController');

// Academic Year Routes
router.get('/academic-years/:schoolId', getAcademicYears);
router.post('/academic-years', createAcademicYear);
router.patch('/academic-years/:id', updateAcademicYear);
router.delete('/academic-years/:id', deleteAcademicYear);

// Class Routes
router.get('/classes/:schoolId', getClasses);
router.post('/classes', createClass);
router.patch('/classes/:id', updateClass);
router.delete('/classes/:id', deleteClass);

// Subject Routes
router.get('/subjects/:schoolId', getSubjects);
router.post('/subjects', createSubject);
router.patch('/subjects/:id', updateSubject);
router.delete('/subjects/:id', deleteSubject);

module.exports = router;
