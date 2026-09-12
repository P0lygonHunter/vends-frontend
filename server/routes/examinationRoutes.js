const express = require('express');
const router = express.Router();

const {
  getExaminations,
  createExamination,
  updateExamination,
  deleteExamination,
  getExaminationMarks,
  saveExaminationMarks
} = require('../controllers/examinationController');
const { requireSchoolAuth, requireSchoolScope, requireOwnedResource } = require('../middleware/auth');
const Examination = require('../models/Examination');

router.use(requireSchoolAuth, requireSchoolScope);

// Updated endpoints to match frontend requests (/exams)
router.get('/:schoolId', getExaminations);
router.post('/', createExamination);
router.patch('/:id', requireOwnedResource(Examination), updateExamination);
router.delete('/:id', requireOwnedResource(Examination), deleteExamination);
router.get('/:id/marks', requireOwnedResource(Examination), getExaminationMarks);
router.post('/:id/marks', requireOwnedResource(Examination), saveExaminationMarks);

module.exports = router;
