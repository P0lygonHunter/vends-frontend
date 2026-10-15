const express = require('express');
const router = express.Router();
const { requireSchoolAuth } = require('../middleware/auth');
const { getInsights, askAi } = require('../controllers/aiController');

router.get('/ai/insights', requireSchoolAuth, getInsights);
router.post('/ai/ask', requireSchoolAuth, askAi);

module.exports = router;
