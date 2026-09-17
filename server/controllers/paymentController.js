const Payment = require('../models/Payment');
const PaymentMethod = require('../models/PaymentMethod');
const Invoice = require('../models/Invoice');
const School = require('../models/School');
const mongoose = require('mongoose');

const PLAN_LABELS = {
  free_trial: 'Free Trial',
  lite: 'Lite Edition',
  zk: 'ZK Edition',
};

const PricingSchema = new mongoose.Schema({
  freeTrial: { type: Number, default: 0 },
  lite: { type: Number, default: 4999 },
  zk: { type: Number, default: 14999 },
}, { timestamps: true });

const Pricing = mongoose.models.Pricing || mongoose.model('Pricing', PricingSchema);

const getStudentLimit = (plan) => {
  if (plan === 'lite' || plan === 'zk') return 1000;
  return 100;
};

const getPlanAmount = async (plan) => {
  let pricing = await Pricing.findOne();
  if (!pricing) {
    pricing = await Pricing.create({ freeTrial: 0, lite: 4999, zk: 14999 });
  }
  if (plan === 'lite') return pricing.lite;
  if (plan === 'zk') return pricing.zk;
  return null;
};

const nextInvoiceNumber = async () => {
  const count = await Invoice.countDocuments();
  const seq = String(count + 1).padStart(6, '0');
  return `VEN-${seq}`;
};

const DEFAULT_METHODS = [
  {
    type: 'jazzcash',
    label: 'JazzCash',
    accountDetail: '0300-0000000',
    accountTitle: 'Vends EduCore',
    instructions: 'Send payment via JazzCash and enter the transaction ID below.',
    isActive: true,
    sortOrder: 1,
  },
  {
    type: 'easypaisa',
    label: 'EasyPaisa',
    accountDetail: '0311-0000000',
    accountTitle: 'Vends EduCore',
    instructions: 'Send payment via EasyPaisa and enter the transaction ID below.',
    isActive: true,
    sortOrder: 2,
  },
  {
    type: 'bank',
    label: 'Bank Transfer',
    accountDetail: 'HBL · 0000-0000-0000',
    accountTitle: 'Vends EduCore',
    instructions: 'Transfer to the bank account and enter the reference number.',
    isActive: true,
    sortOrder: 3,
  },
];

const ensureDefaultMethods = async () => {
  const count = await PaymentMethod.countDocuments();
  if (count === 0) {
    await PaymentMethod.insertMany(DEFAULT_METHODS);
  }
};

// --- Payment methods (CEO) ---
exports.listPaymentMethods = async (req, res) => {
  try {
    await ensureDefaultMethods();
    const methods = await PaymentMethod.find().sort({ sortOrder: 1, createdAt: 1 });
    res.json({ success: true, methods });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listActivePaymentMethods = async (req, res) => {
  try {
    await ensureDefaultMethods();
    const methods = await PaymentMethod.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 });
    res.json({ success: true, methods });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPaymentMethod = async (req, res) => {
  try {
    const { type, label, accountDetail, accountTitle, instructions, isActive, sortOrder } = req.body;
    if (!type || !label || !accountDetail) {
      return res.status(400).json({ error: 'Type, label and account detail are required.' });
    }
    const method = await PaymentMethod.create({
      type,
      label: String(label).trim(),
      accountDetail: String(accountDetail).trim(),
      accountTitle: String(accountTitle || '').trim(),
      instructions: String(instructions || '').trim(),
      isActive: isActive !== false,
      sortOrder: Number(sortOrder) || 0,
    });
    res.status(201).json({ success: true, method });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePaymentMethod = async (req, res) => {
  try {
    const method = await PaymentMethod.findById(req.params.id);
    if (!method) return res.status(404).json({ error: 'Payment method not found.' });

    const { type, label, accountDetail, accountTitle, instructions, isActive, sortOrder } = req.body;
    if (type) method.type = type;
    if (label !== undefined) method.label = String(label).trim();
    if (accountDetail !== undefined) method.accountDetail = String(accountDetail).trim();
    if (accountTitle !== undefined) method.accountTitle = String(accountTitle).trim();
    if (instructions !== undefined) method.instructions = String(instructions).trim();
    if (isActive !== undefined) method.isActive = Boolean(isActive);
    if (sortOrder !== undefined) method.sortOrder = Number(sortOrder) || 0;

    await method.save();
    res.json({ success: true, method });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deletePaymentMethod = async (req, res) => {
  try {
    const method = await PaymentMethod.findByIdAndDelete(req.params.id);
    if (!method) return res.status(404).json({ error: 'Payment method not found.' });
    res.json({ success: true, message: 'Payment method deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- School: create payment (pending) ---
exports.createPayment = async (req, res) => {
  try {
    const schoolId = req.schoolId;
    const { plan, methodId, transactionId, notes } = req.body;

    if (!plan || !['lite', 'zk'].includes(plan)) {
      return res.status(400).json({ error: 'A valid paid plan (lite or zk) is required.' });
    }
    if (!methodId || !transactionId || String(transactionId).trim().length < 4) {
      return res.status(400).json({ error: 'Payment method and a valid transaction ID are required.' });
    }

    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ error: 'School not found.' });

    const method = await PaymentMethod.findOne({ _id: methodId, isActive: true });
    if (!method) return res.status(400).json({ error: 'Selected payment method is not available.' });

    const amount = await getPlanAmount(plan);
    if (amount === null || amount < 0) {
      return res.status(400).json({ error: 'Invalid plan pricing.' });
    }

    const existingPending = await Payment.findOne({
      schoolId,
      status: 'pending',
      plan,
    });
    if (existingPending) {
      return res.status(400).json({
        error: 'You already have a pending payment for this plan. Please wait for verification.',
      });
    }

    const payment = await Payment.create({
      schoolId: school._id,
      schoolName: school.schoolName,
      schoolEmail: school.adminEmail,
      plan,
      amount,
      methodType: method.type,
      methodLabel: method.label,
      accountDetail: method.accountDetail,
      transactionId: String(transactionId).trim(),
      notes: String(notes || '').trim(),
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Payment submitted. Status is pending verification.',
      payment,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listSchoolPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ schoolId: req.schoolId }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listSchoolInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ schoolId: req.schoolId }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, invoices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSchoolInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });
    res.json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- CEO: payments ---
exports.listAllPayments = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const payments = await Payment.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approvePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found.' });
    if (payment.status === 'paid') {
      return res.status(400).json({ error: 'Payment is already approved.' });
    }
    if (payment.status === 'rejected') {
      return res.status(400).json({ error: 'Rejected payment cannot be approved.' });
    }

    const school = await School.findById(payment.schoolId);
    if (!school) return res.status(404).json({ error: 'School not found.' });

    const days = 30;
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + days);

    school.plan = payment.plan;
    school.studentLimit = getStudentLimit(payment.plan);
    school.expiryDate = newExpiry;
    school.blocked = false;
    await school.save();

    const invoiceNumber = await nextInvoiceNumber();
    const paidAt = new Date();

    const invoice = await Invoice.create({
      invoiceNumber,
      paymentId: payment._id,
      schoolId: school._id,
      schoolName: school.schoolName,
      schoolEmail: school.adminEmail,
      plan: payment.plan,
      planLabel: PLAN_LABELS[payment.plan] || payment.plan,
      amount: payment.amount,
      methodLabel: payment.methodLabel,
      transactionId: payment.transactionId,
      status: 'PAID',
      paidAt,
    });

    payment.status = 'paid';
    payment.invoiceNumber = invoiceNumber;
    payment.approvedAt = paidAt;
    await payment.save();

    res.json({
      success: true,
      message: 'Payment approved. Plan activated and invoice generated.',
      payment,
      invoice,
      school: {
        _id: school._id,
        plan: school.plan,
        expiryDate: school.expiryDate,
        studentLimit: school.studentLimit,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rejectPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found.' });
    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending payments can be rejected.' });
    }

    payment.status = 'rejected';
    payment.rejectedAt = new Date();
    payment.rejectionReason = String(req.body?.reason || '').trim();
    await payment.save();

    res.json({ success: true, message: 'Payment rejected.', payment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, invoices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Public / school-facing plan prices (no secrets)
exports.getPublicPricing = async (req, res) => {
  try {
    let pricing = await Pricing.findOne();
    if (!pricing) {
      pricing = await Pricing.create({ freeTrial: 0, lite: 4999, zk: 14999 });
    }
    res.json({
      success: true,
      pricing: {
        freeTrial: pricing.freeTrial,
        lite: pricing.lite,
        zk: pricing.zk,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
