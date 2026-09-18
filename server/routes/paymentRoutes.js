const express = require('express');
const router = express.Router();
const {
  listActivePaymentMethods,
  createPayment,
  listSchoolPayments,
  listSchoolInvoices,
  getSchoolInvoice,
  getPublicPricing,
} = require('../controllers/paymentController');
const { requireSchoolAuth, paymentSubmitRateLimit } = require('../middleware/auth');

router.get('/payment-methods', listActivePaymentMethods);
router.get('/pricing', getPublicPricing);

router.use(requireSchoolAuth);
router.post('/payments', paymentSubmitRateLimit, createPayment);
router.get('/payments', listSchoolPayments);
router.get('/invoices', listSchoolInvoices);
router.get('/invoices/:id', getSchoolInvoice);

module.exports = router;
