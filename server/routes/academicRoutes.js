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
const { requireSchoolAuth, requireSchoolScope, requireOwnedResource } = require('../middleware/auth');
const AcademicYear = require('../models/AcademicYear');
const ClassSection = require('../models/ClassSection');
const Subject = require('../models/Subject');

router.use(requireSchoolAuth, requireSchoolScope);

// Academic Year Routes
router.get('/academic-years/:schoolId', getAcademicYears);
router.post('/academic-years', createAcademicYear);
router.patch('/academic-years/:id', requireOwnedResource(AcademicYear), updateAcademicYear);
router.delete('/academic-years/:id', requireOwnedResource(AcademicYear), deleteAcademicYear);

// Class Routes
router.get('/classes/:schoolId', getClasses);
router.post('/classes', createClass);
router.patch('/classes/:id', requireOwnedResource(ClassSection), updateClass);
router.delete('/classes/:id', requireOwnedResource(ClassSection), deleteClass);

// Subject Routes
router.get('/subjects/:schoolId', getSubjects);
router.post('/subjects', createSubject);
router.patch('/subjects/:id', requireOwnedResource(Subject), updateSubject);
router.delete('/subjects/:id', requireOwnedResource(Subject), deleteSubject);

module.exports = router;
