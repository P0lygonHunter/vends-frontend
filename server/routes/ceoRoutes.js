const express = require('express');
const router = express.Router();

const {
  ceoLogin,
  changeCeoPassword,
  changeCeoEmail,
  getCeoProfile,
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

const {
  listPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  listAllPayments,
  approvePayment,
  rejectPayment,
  listAllInvoices,
} = require('../controllers/paymentController');

const { requireCeoAuth, loginRateLimit } = require('../middleware/auth');

router.post('/login', loginRateLimit, ceoLogin);
router.use(requireCeoAuth);

router.get('/profile', getCeoProfile);
router.patch('/change-password', changeCeoPassword);
router.patch('/change-email', changeCeoEmail);

router.get('/schools', getAllSchools);
router.get('/login-logs', getLoginLogs);
router.get('/pricing', getPricing);
router.patch('/pricing', updatePricing);
router.get('/revenue', getRevenue);
router.patch('/toggle-block/:id', toggleBlock);
router.delete('/delete-school/:id', deleteSchool);
router.patch('/extend-trial/:id', extendTrial);
router.patch('/update-plan/:id', updatePlan);

// Payment methods
router.get('/payment-methods', listPaymentMethods);
router.post('/payment-methods', createPaymentMethod);
router.patch('/payment-methods/:id', updatePaymentMethod);
router.delete('/payment-methods/:id', deletePaymentMethod);

// Payments & invoices
router.get('/payments', listAllPayments);
router.patch('/payments/:id/approve', approvePayment);
router.patch('/payments/:id/reject', rejectPayment);
router.get('/invoices', listAllInvoices);

module.exports = router;
