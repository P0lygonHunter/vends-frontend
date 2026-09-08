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

// Examination Routes
router.get('/examinations/:schoolId', getExaminations);
router.post('/examinations', createExamination);
router.patch('/examinations/:id', updateExamination);
router.delete('/examinations/:id', deleteExamination);
router.get('/examinations/:id/marks', getExaminationMarks);
router.post('/examinations/:id/marks', saveExaminationMarks);

module.exports = router;
