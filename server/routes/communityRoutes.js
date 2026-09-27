const express = require('express');
const router = express.Router();

const { communityLogin, sendBroadcast, listConversations, getConversationMessages, sendAdminMessage } = require('../controllers/communityController');
const { requireSchoolAuth, requireSchoolScope, loginRateLimit, broadcastRateLimit } = require('../middleware/auth');

// Public — the one login screen for both parents and teachers.
router.post('/community/login', loginRateLimit, communityLogin);

// Admin only — the Communication Center broadcast.
router.post('/community/broadcast', requireSchoolAuth, requireSchoolScope, broadcastRateLimit, sendBroadcast);

// Admin only — the V Community chat inbox (2-way conversations with parents/teachers).
router.get('/community/conversations', requireSchoolAuth, requireSchoolScope, listConversations);
router.get('/community/conversations/:id/messages', requireSchoolAuth, requireSchoolScope, getConversationMessages);
router.post('/community/conversations/:id/messages', requireSchoolAuth, requireSchoolScope, sendAdminMessage);

module.exports = router;
