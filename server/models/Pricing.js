const mongoose = require('mongoose');

/**
 * Single source of truth for public + CEO pricing.
 * Trial is automatic on register (not a purchasable card).
 * Paid: starter · standard · premium
 * CEO can edit all fields anytime; pricingRevision seeds recommended pack once.
 */
const PricingSchema = new mongoose.Schema({
  freeTrial: { type: Number, default: 0 },
  trialDays: { type: Number, default: 14 },

  // What schools PAY (PKR / month)
  starter: { type: Number, default: 4000 },
  standard: { type: Number, default: 8000 },
  premium: { type: Number, default: 14000 },
  lite: { type: Number, default: 4000 },
  zk: { type: Number, default: 14000 },

  // Optional "Was" prices for strikethrough (0 = hide)
  listPriceStarter: { type: Number, default: 0 },
  listPriceStandard: { type: Number, default: 9400 },
  listPricePremium: { type: Number, default: 18500 },

  studentLimitStarter: { type: Number, default: 150 },
  studentLimitStandard: { type: Number, default: 350 },
  studentLimitPremium: { type: Number, default: 700 },
  studentLimitTrial: { type: Number, default: 100 },
  teacherLimitTrial: { type: Number, default: 10 },
  teacherLimitStarter: { type: Number, default: 15 },
  teacherLimitStandard: { type: Number, default: 40 },
  teacherLimitPremium: { type: Number, default: 80 },

  featuresStarter: {
    type: [String],
    default: [
      'Up to 150 students (~Rs 35 / student story)',
      'Students, teachers, classes, attendance, timetable',
      'Basic fees + parent fee-receipt screenshot path',
      'SE Community: two-way text chat',
      'No voice / general file dump in chat (Starter)',
      'Test generator, date sheet & result cards: locked',
      'AI Actions & Ask AI (Neuron): locked',
      'Email support'
    ]
  },
  featuresStandard: {
    type: [String],
    default: [
      'Up to 350 students (~Rs 30 / student story)',
      'Everything in Starter',
      'SE Community full: text + voice + attachments',
      'Communication Center (broadcast)',
      'Digital fee payment verification',
      'Test generator, date sheet & result card tools',
      'AI Actions (templates) + limited Ask AI / Neuron',
      'School analytics (standard)'
    ]
  },
  featuresPremium: {
    type: [String],
    default: [
      'Up to 700 students (~Rs 25 / student story)',
      'Everything in Standard',
      'Higher AI Actions & Ask AI / Neuron daily caps',
      'Advanced analytics & priority support',
      'Multi-campus ready limits',
      'Best value per student at scale'
    ]
  },

  discountPercent: { type: Number, default: 0 },
  promoLabel: { type: String, default: 'Limited offer' },
  yearlyMonthsFree: { type: Number, default: 2 },
  promoOnStarter: { type: Boolean, default: false },
  promoOnStandard: { type: Boolean, default: true },
  promoOnPremium: { type: Boolean, default: true },

  /** Bump to re-seed recommended commercial pack once on server */
  pricingRevision: { type: Number, default: 3 },
}, { timestamps: true });

module.exports = mongoose.models.Pricing || mongoose.model('Pricing', PricingSchema);
