const express = require('express');
const router = express.Router();

const {
  getAssignments,
  createAssignment,
  getSubmissions,
  updateSubmission,
  deleteAssignment
} = require('../controllers/assignmentController');

// Assignment Routes
router.get('/assignments/:schoolId', getAssignments);
router.post('/assignments', createAssignment);
router.delete('/assignments/:id', deleteAssignment);
router.get('/assignments/:id/submissions', getSubmissions);
router.patch('/assignments/submissions/:id', updateSubmission);

module.exports = router;
