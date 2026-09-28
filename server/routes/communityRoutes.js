const express = require('express');
const router = express.Router();
const {
  communityLogin, sendBroadcast, listConversations, listContacts,
  openConversation, getConversationMessages, sendAdminMessage,
} = require('../controllers/communityController');
const { requireSchoolAuth, requireSchoolScope, loginRateLimit, broadcastRateLimit } = require('../middleware/auth');

router.post('/community/login', loginRateLimit, communityLogin);
router.post('/community/broadcast', requireSchoolAuth, requireSchoolScope, broadcastRateLimit, sendBroadcast);
router.get('/community/contacts', requireSchoolAuth, requireSchoolScope, listContacts);
router.get('/community/conversations', requireSchoolAuth, requireSchoolScope, listConversations);
router.post('/community/conversations/open', requireSchoolAuth, requireSchoolScope, openConversation);
router.get('/community/conversations/:id/messages', requireSchoolAuth, requireSchoolScope, getConversationMessages);
router.post('/community/conversations/:id/messages', requireSchoolAuth, requireSchoolScope, sendAdminMessage);
module.exports = router;
