const express = require('express');
const router = express.Router();

const { registerTeacher, teacherLogin, getMyNotifications, markNotificationRead, getMyConversation, sendMyMessage, changeMyPassword, updateMyPhoto } = require('../controllers/teacherAuthController');
const { requireTeacherAuth, loginRateLimit } = require('../middleware/auth');

// Public — this is how a teacher gets logged in.
router.post('/teacher-portal/register', loginRateLimit, registerTeacher);
router.post('/teacher-portal/login', loginRateLimit, teacherLogin);

// Authenticated.
router.get('/teacher-portal/notifications', requireTeacherAuth, getMyNotifications);
router.patch('/teacher-portal/notifications/:id/read', requireTeacherAuth, markNotificationRead);
router.get('/teacher-portal/conversation', requireTeacherAuth, getMyConversation);
router.post('/teacher-portal/conversation/messages', requireTeacherAuth, sendMyMessage);
router.post('/teacher-portal/change-password', requireTeacherAuth, changeMyPassword);
router.patch('/teacher-portal/photo', requireTeacherAuth, updateMyPhoto);

module.exports = router;
