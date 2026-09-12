const express = require('express');
const router = express.Router();

const {
  ceoLogin,
  getAllSchools,
  getLoginLogs,
  getPricing,
  updatePricing,
  getRevenue,
  toggleBlock,
  deleteSchool,
  extendTrial,
  updatePlan
} = require('../controllers/ceoController');
const { requireCeoAuth, loginRateLimit } = require('../middleware/auth');

// CEO Routes
router.post('/login', loginRateLimit, ceoLogin);
router.use(requireCeoAuth);

// Admin Routes
router.get('/schools', getAllSchools);
router.get('/login-logs', getLoginLogs);
router.get('/pricing', getPricing);
router.patch('/pricing', updatePricing);
router.get('/revenue', getRevenue);
router.patch('/toggle-block/:id', toggleBlock);
router.delete('/delete-school/:id', deleteSchool);
router.patch('/extend-trial/:id', extendTrial);
router.patch('/update-plan/:id', updatePlan);

module.exports = router;
