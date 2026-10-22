const express = require('express');
const router = express.Router();
const { requireSchoolAuth } = require('../middleware/auth');
const { getInsights, askAi, getAiUsage } = require('../controllers/aiController');

router.get('/ai/insights', requireSchoolAuth, getInsights);
router.get('/ai/usage', requireSchoolAuth, getAiUsage);
router.post('/ai/ask', requireSchoolAuth, askAi);

module.exports = router;
