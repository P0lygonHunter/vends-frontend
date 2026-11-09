const express = require('express');
const router = express.Router();
const { requireSchoolAuth, requireSchoolScope } = require('../middleware/auth');
const { getInsights, askAi, getAiUsage } = require('../controllers/aiController');
const {
  generateActions, listActions, updateAction, approveAction, approveBulk, rejectAction,
  updateActionSettings, generateWeeklySummaries, generateMonthlyReports,
} = require('../controllers/aiActionsController');

router.get('/ai/insights', requireSchoolAuth, getInsights);
router.get('/ai/usage', requireSchoolAuth, getAiUsage);
router.post('/ai/ask', requireSchoolAuth, askAi);

router.post('/ai/actions/generate', requireSchoolAuth, requireSchoolScope, generateActions);
router.get('/ai/actions', requireSchoolAuth, requireSchoolScope, listActions);
router.patch('/ai/actions/settings', requireSchoolAuth, requireSchoolScope, updateActionSettings);
router.post('/ai/actions/weekly', requireSchoolAuth, requireSchoolScope, generateWeeklySummaries);
router.post('/ai/actions/monthly', requireSchoolAuth, requireSchoolScope, generateMonthlyReports);
router.post('/ai/actions/approve-bulk', requireSchoolAuth, requireSchoolScope, approveBulk);
router.patch('/ai/actions/:id', requireSchoolAuth, requireSchoolScope, updateAction);
router.post('/ai/actions/:id/approve', requireSchoolAuth, requireSchoolScope, approveAction);
router.post('/ai/actions/:id/reject', requireSchoolAuth, requireSchoolScope, rejectAction);

module.exports = router;
