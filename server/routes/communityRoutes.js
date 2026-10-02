const express = require('express');
const router = express.Router();
const {
  communityLogin, sendBroadcast, sendBulkChat, listConversations, listContacts,
  openConversation, getConversationMessages, sendAdminMessage,
} = require('../controllers/communityController');
const { requireSchoolAuth, requireSchoolScope, requireModuleAccess, loginRateLimit, broadcastRateLimit } = require('../middleware/auth');

router.post('/community/login', loginRateLimit, communityLogin);

// Broadcast — all plans (Starter+)
router.post('/community/broadcast', requireSchoolAuth, requireSchoolScope, requireModuleAccess('broadcast'), broadcastRateLimit, sendBroadcast);

// 1:1 chat — Standard+ only
router.post('/community/bulk-chat', requireSchoolAuth, requireSchoolScope, requireModuleAccess('chat'), broadcastRateLimit, sendBulkChat);
router.get('/community/contacts', requireSchoolAuth, requireSchoolScope, requireModuleAccess('chat'), listContacts);
router.get('/community/conversations', requireSchoolAuth, requireSchoolScope, requireModuleAccess('chat'), listConversations);
router.post('/community/conversations/open', requireSchoolAuth, requireSchoolScope, requireModuleAccess('chat'), openConversation);
router.get('/community/conversations/:id/messages', requireSchoolAuth, requireSchoolScope, requireModuleAccess('chat'), getConversationMessages);
router.post('/community/conversations/:id/messages', requireSchoolAuth, requireSchoolScope, requireModuleAccess('chat'), sendAdminMessage);

module.exports = router;
