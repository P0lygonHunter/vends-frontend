const FeeRecord = require('../models/FeeRecord');
const FeePayment = require('../models/FeePayment');
const JournalEntry = require('../models/JournalEntry');
const Student = require('../models/Student');
const ClassSection = require('../models/ClassSection');
const mongoose = require('mongoose');
const { notifyPaymentReceived } = require('../services/notificationService');

const MAX_SCREENSHOT_CHARS = 700000; // ~500KB base64 safety limit
const ALLOWED_SCREENSHOT_PREFIXES = ['data:image/jpeg', 'data:image/jpg', 'data:image/png', 'data:image/webp'];

function isValidScreenshot(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return true;
  if (dataUrl.length > MAX_SCREENSHOT_CHARS) return false;
  return ALLOWED_SCREENSHOT_PREFIXES.some(p => dataUrl.startsWith(p));
}

function isDigitalMethod(method) {
  return ['Bank Transfer', 'JazzCash', 'EasyPaisa', 'Other'].includes(method);
}

exports.getFees = async (req, res) => {
  try {
    res.json(await FeeRecord.find({ schoolId: req.params.schoolId })
      .populate('studentId', 'name email phone rollNumber')
      .populate('classSectionId', 'name')
      .sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFeePayments = async (req, res) => {
  try {
    const fee = await FeeRecord.findById(req.params.id);
    if (!fee) return res.status(404).json({ error: 'Fee record not found.' });
    res.json(await FeePayment.find({ feeRecordId: fee._id, schoolId: fee.schoolId })
      .populate('studentId', 'name rollNumber')
      .sort({ paidAt: -1 }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPendingVerifications = async (req, res) => {
  try {
    const list = await FeePayment.find({
      schoolId: req.params.schoolId,
      status: 'Pending Verification'
    })
      .populate('studentId', 'name rollNumber phone email')
      .populate('feeRecordId', 'feeType month amount paid balance')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDailyCashReport = async (req, res) => {
  try {
    const schoolId = req.params.schoolId;
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
    const start = new Date(dateStr + 'T00:00:00.000Z');
    const end = new Date(dateStr + 'T23:59:59.999Z');

    const payments = await FeePayment.find({
      schoolId,
      method: 'Cash',
      status: 'Completed',
      paidAt: { $gte: start, $lte: end }
    })
      .populate('studentId', 'name rollNumber')
      .populate('feeRecordId', 'feeType month')
      .sort({ paidAt: 1 });

    const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    res.json({
      date: dateStr,
      totalCash: total,
      count: payments.length,
      payments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createFeePayment = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { amount, method, reference = '', screenshot = '' } = req.body;
    const allowedMethods = ['Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa', 'Other'];

    if (!allowedMethods.includes(method)) {
      return res.status(400).json({ error: 'Invalid payment method.' });
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
    }
    if (!isValidScreenshot(screenshot)) {
      return res.status(400).json({ error: 'Screenshot must be a JPEG/PNG/WebP image under ~500KB.' });
    }
    if (isDigitalMethod(method) && !String(reference || '').trim() && !screenshot) {
      return res.status(400).json({ error: 'Digital payments require a reference number or screenshot.' });
    }

    let paymentDoc;
    let updatedFee;

    await session.withTransaction(async () => {
      const fee = await FeeRecord.findById(req.params.id).session(session);
      if (!fee) throw new Error('Fee record not found.');
      if (Number(amount) > fee.balance) throw new Error('Payment cannot exceed the remaining balance.');

      const status = method === 'Cash' ? 'Completed' : 'Pending Verification';
      const receiptNumber = `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const created = await FeePayment.create([{
        schoolId: fee.schoolId,
        feeRecordId: fee._id,
        studentId: fee.studentId,
        amount: Number(amount),
        method,
        reference: String(reference || '').trim(),
        screenshot: screenshot || '',
        status,
        receiptNumber,
        paidAt: new Date()
      }], { session });

      paymentDoc = created[0];

      if (status === 'Completed') {
        const newPaid = fee.paid + Number(amount);
        fee.paid = newPaid;
        fee.balance = Math.max(0, fee.amount - newPaid);
        fee.status = fee.balance === 0 ? 'Paid' : (fee.dueDate && new Date(fee.dueDate) < new Date() ? 'Overdue' : 'Pending');
        await fee.save({ session });
        updatedFee = fee;

        await JournalEntry.create([{
          schoolId: fee.schoolId,
          sourceType: 'FeePayment',
          sourceId: paymentDoc._id,
          description: `Fee payment ${receiptNumber}`,
          lines: [
            { account: 'Cash and Bank', debit: Number(amount), credit: 0 },
            { account: 'Tuition Income', debit: 0, credit: Number(amount) }
          ]
        }], { session });
      }
    });

    if (paymentDoc.status === 'Completed' && updatedFee) {
      notifyPaymentReceived(paymentDoc, updatedFee).catch(() => {});
    }

    res.status(201).json(paymentDoc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    await session.endSession();
  }
};

exports.approveFeePayment = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let paymentDoc;
    let updatedFee;

    await session.withTransaction(async () => {
      const payment = await FeePayment.findById(req.params.paymentId).session(session);
      if (!payment) throw new Error('Payment not found.');
      if (String(payment.schoolId) !== String(req.params.schoolId)) {
        throw new Error('Payment does not belong to this school.');
      }
      if (payment.status !== 'Pending Verification') {
        throw new Error('Only pending payments can be approved.');
      }

      const fee = await FeeRecord.findById(payment.feeRecordId).session(session);
      if (!fee) throw new Error('Related fee record not found.');
      if (payment.amount > fee.balance) {
        throw new Error('Payment amount exceeds current remaining balance.');
      }

      payment.status = 'Completed';
      payment.verifiedAt = new Date();
      payment.verifiedBy = req.params.schoolId;
      payment.rejectionReason = '';
      await payment.save({ session });
      paymentDoc = payment;

      const newPaid = fee.paid + Number(payment.amount);
      fee.paid = newPaid;
      fee.balance = Math.max(0, fee.amount - newPaid);
      fee.status = fee.balance === 0 ? 'Paid' : (fee.dueDate && new Date(fee.dueDate) < new Date() ? 'Overdue' : 'Pending');
      await fee.save({ session });
      updatedFee = fee;

      await JournalEntry.create([{
        schoolId: fee.schoolId,
        sourceType: 'FeePayment',
        sourceId: payment._id,
        description: `Fee payment ${payment.receiptNumber} (verified)`,
        lines: [
          { account: 'Cash and Bank', debit: Number(payment.amount), credit: 0 },
          { account: 'Tuition Income', debit: 0, credit: Number(payment.amount) }
        ]
      }], { session });
    });

    if (paymentDoc && updatedFee) {
      notifyPaymentReceived(paymentDoc, updatedFee).catch(() => {});
    }

    res.json(paymentDoc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    await session.endSession();
  }
};

exports.rejectFeePayment = async (req, res) => {
  try {
    const { reason = '' } = req.body;
    const payment = await FeePayment.findById(req.params.paymentId);
    if (!payment) return res.status(404).json({ error: 'Payment not found.' });
    if (String(payment.schoolId) !== String(req.params.schoolId)) {
      return res.status(403).json({ error: 'Payment does not belong to this school.' });
    }
    if (payment.status !== 'Pending Verification') {
      return res.status(400).json({ error: 'Only pending payments can be rejected.' });
    }

    payment.status = 'Rejected';
    payment.verifiedAt = new Date();
    payment.verifiedBy = req.params.schoolId;
    payment.rejectionReason = String(reason || '').trim().slice(0, 500);
    await payment.save();

    res.json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.createFeeRecord = async (req, res) => {
  try {
    const { schoolId, studentId, classSectionId = null, academicYearId = null, feeType, month, amount, paid = 0, dueDate = null } = req.body;

    const student = await Student.findOne({ _id: studentId, schoolId });
    if (!student) return res.status(400).json({ error: 'Selected student does not belong to this school.' });

    if (classSectionId && !(await ClassSection.findOne({ _id: classSectionId, schoolId }))) {
      return res.status(400).json({ error: 'Selected class does not belong to this school.' });
    }

    if (Number(paid) > Number(amount)) {
      return res.status(400).json({ error: 'Paid amount cannot exceed total amount.' });
    }

    const balance = Number(amount) - Number(paid);
    const status = balance === 0 ? 'Paid' : dueDate && new Date(dueDate) < new Date() ? 'Overdue' : 'Pending';

    const fee = await FeeRecord.create({
      schoolId,
      studentId,
      classSectionId,
      academicYearId,
      feeType,
      month,
      amount,
      paid,
      balance,
      dueDate,
      status
    });

    res.status(201).json(await fee.populate([
      { path: 'studentId', select: 'name email phone rollNumber' },
      { path: 'classSectionId', select: 'name' }
    ]));
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({
      error: err.code === 11000
        ? 'This fee record already exists for the student and month.'
        : err.message
    });
  }
};

exports.updateFeeRecord = async (req, res) => {
  try {
    const fee = await FeeRecord.findById(req.params.id);
    if (!fee) return res.status(404).json({ error: 'Fee record not found.' });

    const amount = Number(req.body.amount ?? fee.amount);
    const paid = Number(req.body.paid ?? fee.paid);

    if (paid > amount) {
      return res.status(400).json({ error: 'Paid amount cannot exceed total amount.' });
    }

    const balance = amount - paid;
    const status = balance === 0 ? 'Paid' : req.body.dueDate && new Date(req.body.dueDate) < new Date() ? 'Overdue' : 'Pending';

    const updated = await FeeRecord.findByIdAndUpdate(req.params.id, {
      ...req.body,
      amount,
      paid,
      balance,
      status
    }, { new: true, runValidators: true })
      .populate([
        { path: 'studentId', select: 'name email phone rollNumber' },
        { path: 'classSectionId', select: 'name' }
      ]);

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteFeeRecord = async (req, res) => {
  try {
    const fee = await FeeRecord.findByIdAndDelete(req.params.id);
    if (!fee) return res.status(404).json({ error: 'Fee record not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
