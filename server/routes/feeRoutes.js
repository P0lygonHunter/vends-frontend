const express = require('express');
const router = express.Router();

const {
  getFees,
  getFeePayments,
  createFeePayment,
  createFeeRecord,
  updateFeeRecord,
  deleteFeeRecord,
  getPendingVerifications,
  getDailyCashReport,
  approveFeePayment,
  rejectFeePayment
} = require('../controllers/feeController');
const { requireSchoolAuth, requireSchoolScope, requireModuleAccess, requireOwnedResource } = require('../middleware/auth');
const FeeRecord = require('../models/FeeRecord');

router.use(requireSchoolAuth, requireSchoolScope);

// Fee Records
router.get('/fees/:schoolId', getFees);
router.post('/fees', createFeeRecord);
router.patch('/fees/:id', requireOwnedResource(FeeRecord), updateFeeRecord);
router.delete('/fees/:id', requireOwnedResource(FeeRecord), deleteFeeRecord);

// Payments on a fee record
router.get('/fees/:id/payments', requireOwnedResource(FeeRecord), getFeePayments);
router.post('/fees/:id/payments', requireOwnedResource(FeeRecord), createFeePayment);

// Verification & reports
router.get('/fees/:schoolId/pending-verifications', requireModuleAccess('digital_payment_verify'), getPendingVerifications);
router.get('/fees/:schoolId/daily-cash', getDailyCashReport);
router.post('/fees/:schoolId/payments/:paymentId/approve', requireModuleAccess('digital_payment_verify'), approveFeePayment);
router.post('/fees/:schoolId/payments/:paymentId/reject', requireModuleAccess('digital_payment_verify'), rejectFeePayment);

module.exports = router;
