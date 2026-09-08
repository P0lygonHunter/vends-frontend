const express = require('express');
const router = express.Router();

const {
  getModuleRecords,
  createModuleRecord,
  updateModuleRecord,
  deleteModuleRecord
} = require('../controllers/moduleController');

// Module Record Routes
router.get('/module-records/:module/:schoolId', getModuleRecords);
router.post('/module-records', createModuleRecord);
router.patch('/module-records/:id', updateModuleRecord);
router.delete('/module-records/:id', deleteModuleRecord);

module.exports = router;
