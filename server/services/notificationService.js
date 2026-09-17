/**
 * Notification Service
 * - Email: works when SMTP_* env vars are set
 * - WhatsApp: structure ready (Baileys / official API later)
 * Never throws – failures are logged only so payment flow is not blocked.
 */

const Student = require('../models/Student');

function formatCurrency(amount) {
  return `PKR ${Number(amount).toLocaleString('en-PK')}`;
}

function buildPaymentMessage({ studentName, rollNumber, amount, balance, receiptNumber, method }) {
  return `Dear Parent, ${formatCurrency(amount)} fee for ${studentName}${rollNumber ? ` (Roll: ${rollNumber})` : ''} received successfully via ${method}. Receipt: ${receiptNumber}. Remaining Balance: ${formatCurrency(balance)}.`;
}

function buildDueReminderMessage({ studentName, rollNumber, amount, dueDate, feeType }) {
  const due = dueDate ? new Date(dueDate).toLocaleDateString('en-PK') : 'soon';
  return `Dear Parent, reminder: ${formatCurrency(amount)} ${feeType || 'fee'} for ${studentName}${rollNumber ? ` (Roll: ${rollNumber})` : ''} is due on ${due}. Please pay on time.`;
}

async function sendEmail({ to, subject, text }) {
  if (!to || !process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log('[Notification] Email skipped (missing SMTP config or recipient):', subject);
    return { ok: false, reason: 'not_configured' };
  }
  try {
    // Lazy require so server boots even if nodemailer is not installed yet
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text
    });
    return { ok: true };
  } catch (err) {
    console.error('[Notification] Email failed:', err.message);
    return { ok: false, reason: err.message };
  }
}

async function sendWhatsApp({ phone, message }) {
  // Placeholder: connect Baileys or WhatsApp Business Cloud API here.
  // Root package already has @whiskeysockets/baileys – integrate when session is ready.
  if (!phone) {
    return { ok: false, reason: 'no_phone' };
  }
  console.log('[Notification] WhatsApp (not yet connected):', phone, message.slice(0, 80) + '...');
  return { ok: false, reason: 'whatsapp_not_connected' };
}

/**
 * Call after a payment is Completed (cash or after admin approval).
 */
async function notifyPaymentReceived(payment, feeRecord) {
  try {
    const student = await Student.findById(payment.studentId).select('name phone email rollNumber');
    if (!student) return;

    const message = buildPaymentMessage({
      studentName: student.name,
      rollNumber: student.rollNumber,
      amount: payment.amount,
      balance: feeRecord ? feeRecord.balance : 0,
      receiptNumber: payment.receiptNumber,
      method: payment.method
    });

    const subject = `Fee Received – ${payment.receiptNumber}`;

    await Promise.all([
      sendEmail({ to: student.email, subject, text: message }),
      sendWhatsApp({ phone: student.phone, message })
    ]);
  } catch (err) {
    console.error('[Notification] notifyPaymentReceived error:', err.message);
  }
}

/**
 * Optional due-date reminder (can be triggered by cron later).
 */
async function notifyFeeDue(feeRecord) {
  try {
    const student = await Student.findById(feeRecord.studentId).select('name phone email rollNumber');
    if (!student) return;

    const message = buildDueReminderMessage({
      studentName: student.name,
      rollNumber: student.rollNumber,
      amount: feeRecord.balance || feeRecord.amount,
      dueDate: feeRecord.dueDate,
      feeType: feeRecord.feeType
    });

    await Promise.all([
      sendEmail({ to: student.email, subject: 'Fee Due Reminder', text: message }),
      sendWhatsApp({ phone: student.phone, message })
    ]);
  } catch (err) {
    console.error('[Notification] notifyFeeDue error:', err.message);
  }
}

module.exports = {
  notifyPaymentReceived,
  notifyFeeDue,
  buildPaymentMessage,
  sendEmail,
  sendWhatsApp
};
