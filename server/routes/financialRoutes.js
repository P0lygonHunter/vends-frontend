const express = require('express');
const router = express.Router();
const { getFinancialSummary } = require('../controllers/financialController');
const { requireSchoolAuth, requireSchoolScope, requireModuleAccess } = require('../middleware/auth');

router.use(requireSchoolAuth, requireSchoolScope, requireModuleAccess('financial_basic'));
router.get('/finance/:schoolId/summary', getFinancialSummary);

module.exports = router;
