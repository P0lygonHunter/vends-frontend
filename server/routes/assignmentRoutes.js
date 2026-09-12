const express = require('express');
const router = express.Router();

const {
  getAssignments,
  createAssignment,
  getSubmissions,
  updateSubmission,
  deleteAssignment
} = require('../controllers/assignmentController');
const { requireSchoolAuth, requireSchoolScope, requireOwnedResource } = require('../middleware/auth');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');

router.use(requireSchoolAuth, requireSchoolScope);

// Assignment Routes
router.get('/assignments/:schoolId', getAssignments);
router.post('/assignments', createAssignment);
router.delete('/assignments/:id', requireOwnedResource(Assignment), deleteAssignment);
router.get('/assignments/:id/submissions', requireOwnedResource(Assignment), getSubmissions);
router.patch('/assignments/submissions/:id', requireOwnedResource(AssignmentSubmission), updateSubmission);

module.exports = router;
