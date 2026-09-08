const express = require('express');
const router = express.Router();

const {
  getFees,
  getFeePayments,
  createFeePayment,
  createFeeRecord,
  updateFeeRecord,
  deleteFeeRecord
} = require('../controllers/feeController');

// Fee Routes
router.get('/fees/:schoolId', getFees);
router.post('/fees', createFeeRecord);
router.patch('/fees/:id', updateFeeRecord);
router.delete('/fees/:id', deleteFeeRecord);
router.get('/fees/:id/payments', getFeePayments);
router.post('/fees/:id/payments', createFeePayment);

module.exports = router;
