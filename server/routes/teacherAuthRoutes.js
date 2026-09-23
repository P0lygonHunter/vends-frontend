const express = require('express');
const router = express.Router();

const { registerTeacher, teacherLogin, getMyNotifications, markNotificationRead } = require('../controllers/teacherAuthController');
const { requireTeacherAuth, loginRateLimit } = require('../middleware/auth');

// Public — this is how a teacher gets logged in.
router.post('/teacher-portal/register', loginRateLimit, registerTeacher);
router.post('/teacher-portal/login', loginRateLimit, teacherLogin);

// Authenticated.
router.get('/teacher-portal/notifications', requireTeacherAuth, getMyNotifications);
router.patch('/teacher-portal/notifications/:id/read', requireTeacherAuth, markNotificationRead);

module.exports = router;
