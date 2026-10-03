const mongoose = require('mongoose');

const SchoolSchema = new mongoose.Schema({
  // Basic Info
  schoolName: { type: String, required: true },
  principalName: { type: String, default: '' },
  adminEmail: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  totalStudents: { type: Number, default: 0 },

  // Subscription
  plan: { type: String, default: 'free_trial' },
  studentLimit: { type: Number, default: 100 },
  teacherLimit: { type: Number, default: 10 },
  startDate: { type: Date, default: Date.now },
  expiryDate: { type: Date, required: true },

  // Control
  blocked: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  /** Set by cron after grace period ends (hard lock). */
  blockedReason: { type: String, default: '' },
  /** Operational data purged after PURGE_DAYS past expiry (school row kept for CEO). */
  purgedAt: { type: Date, default: null },

  // V-Community media usage (resets when chatUsageMonth changes YYYY-MM)
  chatUsageMonth: { type: String, default: '' },
  chatImageCount: { type: Number, default: 0 },
  chatAudioCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('School', SchoolSchema);