const express = require('express');
const router = express.Router();

const {
  registerSchool,
  schoolLogin,
  checkSchool,
  updateSchool,
  changePassword
} = require('../controllers/schoolController');
const { requireSchoolAuth, requireSchoolScope, loginRateLimit } = require('../middleware/auth');

// School Routes
router.post('/register-school', registerSchool);
router.post('/login', loginRateLimit, schoolLogin);
router.use(requireSchoolAuth);
router.get('/check/:id', requireSchoolScope, checkSchool);
router.patch('/update/:id', requireSchoolScope, updateSchool);
router.patch('/change-password/:id', requireSchoolScope, changePassword);

module.exports = router;
