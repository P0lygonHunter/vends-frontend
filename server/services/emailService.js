/**
 * Email delivery for OTP. Configure SMTP_* env vars (Gmail app password, Resend SMTP, etc.).
 * If SMTP is not configured and ALLOW_DEV_OTP=true, OTP is returned in API for local testing only.
 */
async function sendEmail({ to, subject, text, html }) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || 'noreply@vends-educore.local';

  if (!host || !user || !pass) {
    const err = new Error('Email service is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS.');
    err.code = 'SMTP_NOT_CONFIGURED';
    throw err;
  }

  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch {
    const err = new Error('nodemailer package is missing on the server.');
    err.code = 'SMTP_NOT_CONFIGURED';
    throw err;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: { user, pass }
  });

  await transporter.sendMail({ from, to, subject, text, html });
}

async function sendOtpEmail(to, code, purposeLabel) {
  const subject = `Vends EduCore verification code: ${code}`;
  const text = `Your ${purposeLabel} verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`;
  const html = `<p>Your <strong>${purposeLabel}</strong> verification code is:</p>
    <p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p>
    <p>This code expires in 10 minutes.</p>`;
  await sendEmail({ to, subject, text, html });
}

module.exports = { sendEmail, sendOtpEmail };
