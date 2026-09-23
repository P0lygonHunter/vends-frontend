const express = require('express');
const router = express.Router();

const { communityLogin, sendBroadcast } = require('../controllers/communityController');
const { requireSchoolAuth, requireSchoolScope, loginRateLimit, broadcastRateLimit } = require('../middleware/auth');

// Public — the one login screen for both parents and teachers.
router.post('/community/login', loginRateLimit, communityLogin);

// Admin only — the Communication Center broadcast.
router.post('/community/broadcast', requireSchoolAuth, requireSchoolScope, broadcastRateLimit, sendBroadcast);

module.exports = router;
