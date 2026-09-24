const express = require('express');
const router = express.Router();

const {
  registerSchool,
  requestRegisterOtp,
  verifyRegisterOtp,
  schoolLogin,
  verifyLoginOtp,
  googleAuth,
  checkSchool,
  updateSchool,
  changePassword,
  changeEmail
} = require('../controllers/schoolController');
const { requireSchoolAuth, requireSchoolScope, loginRateLimit } = require('../middleware/auth');

// Public auth
router.post('/register-school', loginRateLimit, registerSchool);
router.post('/register/request-otp', loginRateLimit, requestRegisterOtp);
router.post('/register/verify-otp', loginRateLimit, verifyRegisterOtp);
router.post('/login', loginRateLimit, schoolLogin);
router.post('/login/verify-otp', loginRateLimit, verifyLoginOtp);
router.post('/auth/google', loginRateLimit, googleAuth);

router.use(requireSchoolAuth);
router.get('/check/:id', requireSchoolScope, checkSchool);
router.patch('/update/:id', requireSchoolScope, updateSchool);
router.patch('/change-password/:id', requireSchoolScope, changePassword);
router.patch('/change-email', changeEmail);

module.exports = router;
