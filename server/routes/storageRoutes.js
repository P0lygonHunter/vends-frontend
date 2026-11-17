const express = require('express');
const router = express.Router();
const { requireSchoolAuth, requireModuleAccess } = require('../middleware/auth');
const { getStorageSummary, listStorageFiles, deleteStorageFile } = require('../controllers/storageController');

router.get('/storage/summary', requireSchoolAuth, requireModuleAccess('storage'), getStorageSummary);
router.get('/storage/files', requireSchoolAuth, requireModuleAccess('storage'), listStorageFiles);
router.post('/storage/delete-file', requireSchoolAuth, requireModuleAccess('storage'), deleteStorageFile);

module.exports = router;
