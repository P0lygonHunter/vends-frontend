const express = require('express');
const router = express.Router();

const {
  registerSchool,
  schoolLogin,
  checkSchool,
  updateSchool,
  changePassword
} = require('../controllers/schoolController');

// School Routes
router.post('/register-school', registerSchool);
router.post('/login', schoolLogin);
router.get('/check/:id', checkSchool);
router.patch('/update/:id', updateSchool);
router.patch('/change-password/:id', changePassword);

module.exports = router;
