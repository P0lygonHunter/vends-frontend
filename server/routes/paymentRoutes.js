const express = require('express');
const router = express.Router();
const {
  listActivePaymentMethods,
  createPayment,
  listSchoolPayments,
  listSchoolInvoices,
  getSchoolInvoice,
} = require('../controllers/paymentController');
const { requireSchoolAuth } = require('../middleware/auth');

router.get('/payment-methods', listActivePaymentMethods);

router.use(requireSchoolAuth);
router.post('/payments', createPayment);
router.get('/payments', listSchoolPayments);
router.get('/invoices', listSchoolInvoices);
router.get('/invoices/:id', getSchoolInvoice);

module.exports = router;
