const express = require('express');
const router = express.Router();
const { getFinancialSummary } = require('../controllers/financialController');
const { requireSchoolAuth, requireSchoolScope } = require('../middleware/auth');

router.use(requireSchoolAuth, requireSchoolScope);
router.get('/finance/:schoolId/summary', getFinancialSummary);

module.exports = router;
