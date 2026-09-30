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
  startDate: { type: Date, default: Date.now },
  expiryDate: { type: Date, required: true },

  // Control
  blocked: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },

  // V-Community media usage (resets when chatUsageMonth changes YYYY-MM)
  chatUsageMonth: { type: String, default: '' },
  chatImageCount: { type: Number, default: 0 },
  chatAudioCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('School', SchoolSchema);