const express = require('express');
const router = express.Router();

const {
  getDocumentList,
  getDocumentFile,
  uploadDocument,
  deleteDocument
} = require('../controllers/documentController');

// Document Routes
router.get('/documents/:schoolId', getDocumentList);
router.get('/documents/:id/file', getDocumentFile);
router.post('/documents', uploadDocument);
router.delete('/documents/:id', deleteDocument);

module.exports = router;
