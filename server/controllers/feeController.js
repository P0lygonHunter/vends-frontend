const FeeRecord = require('../models/FeeRecord');
const FeePayment = require('../models/FeePayment');
const JournalEntry = require('../models/JournalEntry');
const Student = require('../models/Student');
const ClassSection = require('../models/ClassSection');
const mongoose = require('mongoose');

// Get Fees
exports.getFees = async (req, res) => {
  try {
    res.json(await FeeRecord.find({ schoolId: req.params.schoolId })
      .populate('studentId', 'name email')
      .populate('classSectionId', 'name')
      .sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Fee Payments
exports.getFeePayments = async (req, res) => {
  try {
    const fee = await FeeRecord.findById(req.params.id);
    if (!fee) return res.status(404).json({ error: 'Fee record not found.' });
    res.json(await FeePayment.find({ feeRecordId: fee._id, schoolId: fee.schoolId }).sort({ paidAt: -1 }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create Fee Payment
exports.createFeePayment = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { amount, method, reference = '' } = req.body;
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
    }

    let payment;
    await session.withTransaction(async () => {
      const fee = await FeeRecord.findById(req.params.id).session(session);
      if (!fee) throw new Error('Fee record not found.');
      if (Number(amount) > fee.balance) throw new Error('Payment cannot exceed the remaining balance.');

      const receiptNumber = `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      payment = await FeePayment.create([{
        schoolId: fee.schoolId,
        feeRecordId: fee._id,
        studentId: fee.studentId,
        amount: Number(amount),
        method,
        reference,
        receiptNumber
      }], { session });

      const newPaid = fee.paid + Number(amount);
      fee.paid = newPaid;
      fee.balance = fee.amount - newPaid;
      fee.status = fee.balance === 0 ? 'Paid' : 'Pending';
      await fee.save({ session });

      await JournalEntry.create([{
        schoolId: fee.schoolId,
        sourceType: 'FeePayment',
        sourceId: payment[0]._id,
        description: `Fee payment ${receiptNumber}`,
        lines: [
          { account: 'Cash and Bank', debit: Number(amount), credit: 0 },
          { account: 'Tuition Income', debit: 0, credit: Number(amount) }
        ]
      }], { session });

      payment = payment[0];
    });

    res.status(201).json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    await session.endSession();
  }
};

// Create Fee Record
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

    res.status(201).json(await fee.populate([{ path: 'studentId', select: 'name email' }, { path: 'classSectionId', select: 'name' }]));
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({ error: err.code === 11000 ? 'This fee record already exists for the student and month.' : err.message });
  }
};

// Update Fee Record
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
    .populate([{ path: 'studentId', select: 'name email' }, { path: 'classSectionId', select: 'name' }]);

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete Fee Record
exports.deleteFeeRecord = async (req, res) => {
  try {
    const fee = await FeeRecord.findByIdAndDelete(req.params.id);
    if (!fee) return res.status(404).json({ error: 'Fee record not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
