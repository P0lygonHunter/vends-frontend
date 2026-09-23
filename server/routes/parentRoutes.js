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
  markNotificationRead
} = require('../controllers/parentController');
const { requireParentAuth, requireParentOwnsStudent, loginRateLimit, paymentSubmitRateLimit } = require('../middleware/auth');
const Parent = require('../models/Parent');

// Public — no login yet, this is how a parent gets logged in.
router.post('/parent/register/check', loginRateLimit, checkParentRegistration);
router.post('/parent/register', loginRateLimit, registerParent);
router.post('/parent/login', loginRateLimit, parentLogin);

// Authenticated parent routes.
router.get('/parent/me/children', requireParentAuth, getMyChildren);
router.get('/parent/students/:studentId/fees', requireParentAuth, requireParentOwnsStudent(Parent), getChildFees);
router.post('/parent/fees/:feeRecordId/payments', requireParentAuth, paymentSubmitRateLimit, payChildFee);
router.get('/parent/notifications', requireParentAuth, getMyNotifications);
router.patch('/parent/notifications/:id/read', requireParentAuth, markNotificationRead);

module.exports = router;
