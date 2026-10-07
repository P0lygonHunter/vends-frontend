const express = require('express');
const router = express.Router();

const {
  registerParent,
  checkParentRegistration,
  parentLogin,
  getMyChildren,
  getChildFees,
  payChildFee,
  getMyNotifications,
  markNotificationRead,
  getMyConversation,
  sendMyMessage,
  changeMyPassword,
  updateMyPhoto,
  getChatCapabilities,
  registerFcmToken,
  unregisterFcmToken,
} = require('../controllers/parentController');
const { requireParentAuth, requireParentOwnsStudent, loginRateLimit, paymentSubmitRateLimit } = require('../middleware/auth');
const Parent = require('../models/Parent');

// Public
router.post('/parent/register/check', loginRateLimit, checkParentRegistration);
router.post('/parent/register', loginRateLimit, registerParent);
router.post('/parent/login', loginRateLimit, parentLogin);

// Authenticated
router.get('/parent/me/children', requireParentAuth, getMyChildren);
router.get('/parent/students/:studentId/fees', requireParentAuth, requireParentOwnsStudent(Parent), getChildFees);
router.post('/parent/fees/:feeRecordId/payments', requireParentAuth, paymentSubmitRateLimit, payChildFee);
router.get('/parent/notifications', requireParentAuth, getMyNotifications);
router.patch('/parent/notifications/:id/read', requireParentAuth, markNotificationRead);
router.get('/parent/conversation', requireParentAuth, getMyConversation);
router.post('/parent/conversation/messages', requireParentAuth, sendMyMessage);
router.post('/parent/change-password', requireParentAuth, changeMyPassword);
router.patch('/parent/photo', requireParentAuth, updateMyPhoto);
router.get('/parent/chat-capabilities', requireParentAuth, getChatCapabilities);
router.post('/parent/fcm-token', requireParentAuth, registerFcmToken);
router.delete('/parent/fcm-token', requireParentAuth, unregisterFcmToken);

module.exports = router;
