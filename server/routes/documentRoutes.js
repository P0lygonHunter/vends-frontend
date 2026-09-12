const express = require('express');
const router = express.Router();

const {
  getDocumentList,
  getDocumentFile,
  uploadDocument,
  deleteDocument
} = require('../controllers/documentController');
const { requireSchoolAuth, requireSchoolScope, requireOwnedResource } = require('../middleware/auth');
const StudentDocument = require('../models/StudentDocument');

router.use(requireSchoolAuth, requireSchoolScope);

// Document Routes
router.get('/documents/:schoolId', getDocumentList);
router.get('/documents/:id/file', requireOwnedResource(StudentDocument), getDocumentFile);
router.post('/documents', uploadDocument);
router.delete('/documents/:id', requireOwnedResource(StudentDocument), deleteDocument);

module.exports = router;
