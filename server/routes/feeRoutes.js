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
const { requireSchoolAuth, requireSchoolScope, requireOwnedResource } = require('../middleware/auth');
const FeeRecord = require('../models/FeeRecord');

router.use(requireSchoolAuth, requireSchoolScope);

// Fee Routes
router.get('/fees/:schoolId', getFees);
router.post('/fees', createFeeRecord);
router.patch('/fees/:id', requireOwnedResource(FeeRecord), updateFeeRecord);
router.delete('/fees/:id', requireOwnedResource(FeeRecord), deleteFeeRecord);
router.get('/fees/:id/payments', requireOwnedResource(FeeRecord), getFeePayments);
router.post('/fees/:id/payments', requireOwnedResource(FeeRecord), createFeePayment);

module.exports = router;
