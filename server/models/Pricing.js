const mongoose = require('mongoose');

/**
 * Single source of truth for public + CEO pricing.
 * Trial is automatic on register (not a purchasable card).
 * Paid: starter · standard · premium
 */
const PricingSchema = new mongoose.Schema({
  // Monthly prices (PKR)
  freeTrial: { type: Number, default: 0 },
  /** Default free trial length for NEW school registrations (CEO-controlled) */
  trialDays: { type: Number, default: 30 },

  starter: { type: Number, default: 2999 },
  standard: { type: Number, default: 5999 },
  premium: { type: Number, default: 12999 },
  // Legacy fields kept so old DB rows still load
  lite: { type: Number, default: 4999 },
  zk: { type: Number, default: 14999 },

  studentLimitStarter: { type: Number, default: 150 },
  studentLimitStandard: { type: Number, default: 500 },
  studentLimitPremium: { type: Number, default: 2000 },
  studentLimitTrial: { type: Number, default: 100 },

  featuresStarter: {
    type: [String],
    default: [
      'Up to 150 students',
      'Student & teacher management',
      'Attendance',
      'Basic fees module',
      'V-Community parent access'
    ]
  },
  featuresStandard: {
    type: [String],
    default: [
      'Up to 500 students',
      'Full fees + payment verification',
      'Exams, results & report cards',
      'Test generator',
      'School analytics',
      'V-Community + communication center'
    ]
  },
  featuresPremium: {
    type: [String],
    default: [
      'Up to 2,000 students',
      'Everything in Standard',
      'Priority support',
      'Advanced analytics',
      'AI insights (when enabled)',
      'Multi-campus ready limits'
    ]
  },

  // Promo
  discountPercent: { type: Number, default: 0 }, // e.g. 20 = 20% off selected plans
  promoLabel: { type: String, default: '' },
  yearlyMonthsFree: { type: Number, default: 2 },
  // Which paid plans get the discount (CEO checkboxes)
  promoOnStarter: { type: Boolean, default: true },
  promoOnStandard: { type: Boolean, default: true },
  promoOnPremium: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.models.Pricing || mongoose.model('Pricing', PricingSchema);
