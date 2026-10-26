const express = require('express');
const router = express.Router();
const { requireSchoolAuth } = require('../middleware/auth');
const { getStorageSummary, listStorageFiles, deleteStorageFile } = require('../controllers/storageController');

router.get('/storage/summary', requireSchoolAuth, getStorageSummary);
router.get('/storage/files', requireSchoolAuth, listStorageFiles);
router.post('/storage/delete-file', requireSchoolAuth, deleteStorageFile);

module.exports = router;
