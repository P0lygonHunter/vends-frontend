const express = require('express');
const router = express.Router();

const {
  getModuleRecords,
  createModuleRecord,
  updateModuleRecord,
  deleteModuleRecord
} = require('../controllers/moduleController');
const { requireSchoolAuth, requireSchoolScope, requireOwnedResource } = require('../middleware/auth');
const ModuleRecord = require('../models/ModuleRecord');

router.use(requireSchoolAuth, requireSchoolScope);

// Module Record Routes
router.get('/module-records/:module/:schoolId', getModuleRecords);
router.post('/module-records', createModuleRecord);
router.patch('/module-records/:id', requireOwnedResource(ModuleRecord), updateModuleRecord);
router.delete('/module-records/:id', requireOwnedResource(ModuleRecord), deleteModuleRecord);

module.exports = router;
