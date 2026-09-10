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

// Updated endpoints to match frontend requests (/exams)
router.get('/:schoolId', getExaminations);
router.post('/', createExamination);
router.patch('/:id', updateExamination);
router.delete('/:id', deleteExamination);
router.get('/:id/marks', getExaminationMarks);
router.post('/:id/marks', saveExaminationMarks);

module.exports = router;