const mongoose = require('mongoose');

const EmailOtpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  purpose: { type: String, enum: ['school_register', 'school_login', 'school_google_link'], required: true },
  codeHash: { type: String, required: true },
  payload: { type: Object, default: {} },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: true }
}, { timestamps: true });

EmailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('EmailOtp', EmailOtpSchema);
