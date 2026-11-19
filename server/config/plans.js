const Pricing = require('../models/Pricing');

const PAID_PLANS = ['starter', 'standard', 'premium'];
const ALL_PLANS = ['free_trial', ...PAID_PLANS, 'lite', 'zk']; // lite/zk legacy

const normalizePlanKey = (plan) => {
  if (plan === 'lite') return 'starter';
  if (plan === 'zk') return 'premium';
  return plan;
};

const PLAN_LABELS = {
  free_trial: 'Free Trial',
  starter: 'Starter',
  standard: 'Standard',
  premium: 'Premium',
  lite: 'Starter', // legacy display
  zk: 'Premium',
};

async function getPricingDoc() {
  let pricing = await Pricing.findOne();
  if (!pricing) {
    pricing = await Pricing.create({});
  }
  // Migrate legacy-only rows once
  if ((pricing.starter == null || pricing.starter === 0) && pricing.lite) {
    pricing.starter = pricing.lite;
  }
  if ((pricing.premium == null || pricing.premium === 0) && pricing.zk) {
    pricing.premium = pricing.zk;
  }
  if (pricing.standard == null) pricing.standard = 8000;

  // One-time commercial pack (CEO can edit after). Revision 3 = Nov 2026 Synapse rates.
  const REV = 3;
  if (Number(pricing.pricingRevision || 0) < REV) {
    pricing.starter = 4000;
    pricing.standard = 8000;
    pricing.premium = 14000;
    pricing.listPriceStarter = 0;
    pricing.listPriceStandard = 9400;
    pricing.listPricePremium = 18500;
    pricing.studentLimitStarter = 150;
    pricing.studentLimitStandard = 350;
    pricing.studentLimitPremium = 700;
    pricing.teacherLimitStarter = 15;
    pricing.teacherLimitStandard = 40;
    pricing.teacherLimitPremium = 80;
    pricing.trialDays = 14;
    pricing.discountPercent = 0;
    pricing.promoOnStarter = false;
    pricing.promoOnStandard = true;
    pricing.promoOnPremium = true;
    pricing.promoLabel = 'Limited offer';
    pricing.yearlyMonthsFree = 2;
    pricing.featuresStarter = [
      'Up to 150 students (~Rs 35 / student story)',
      'Students, teachers, classes, attendance, timetable',
      'Basic fees + parent fee-receipt screenshot path',
      'SE Community: two-way text chat',
      'No voice / general file dump in chat (Starter)',
      'Test generator, date sheet & result cards: locked',
      'AI Actions & Ask AI (Neuron): locked',
      'Email support'
    ];
    pricing.featuresStandard = [
      'Up to 350 students (~Rs 30 / student story)',
      'Everything in Starter',
      'SE Community full: text + voice + attachments',
      'Communication Center (broadcast)',
      'Digital fee payment verification',
      'Test generator, date sheet & result card tools',
      'AI Actions (templates) + limited Ask AI / Neuron',
      'School analytics (standard)'
    ];
    pricing.featuresPremium = [
      'Up to 700 students (~Rs 25 / student story)',
      'Everything in Standard',
      'Higher AI Actions & Ask AI / Neuron daily caps',
      'Advanced analytics & priority support',
      'Multi-campus ready limits',
      'Best value per student at scale'
    ];
    pricing.pricingRevision = REV;
    pricing.markModified('featuresStarter');
    pricing.markModified('featuresStandard');
    pricing.markModified('featuresPremium');
    await pricing.save();
  }
  return pricing;
}

function studentLimitForPlan(pricing, plan) {
  const key = normalizePlanKey(plan);
  if (key === 'starter') return Number(pricing.studentLimitStarter) || 150;
  if (key === 'standard') return Number(pricing.studentLimitStandard) || 500;
  if (key === 'premium') return Number(pricing.studentLimitPremium) || 2000;
  return Number(pricing.studentLimitTrial) || 100;
}

function teacherLimitForPlan(pricing, plan) {
  const key = normalizePlanKey(plan);
  if (key === 'starter') return Number(pricing.teacherLimitStarter) || 15;
  if (key === 'standard') return Number(pricing.teacherLimitStandard) || 40;
  if (key === 'premium') return Number(pricing.teacherLimitPremium) || 100;
  return Number(pricing.teacherLimitTrial) || 10;
}

function featuresForPlan(pricing, plan) {
  const key = normalizePlanKey(plan);
  if (key === 'starter') return pricing.featuresStarter || [];
  if (key === 'standard') return pricing.featuresStandard || [];
  if (key === 'premium') return pricing.featuresPremium || [];
  return ['30-day trial', 'Core modules', 'Up to trial student limit'];
}

function basePriceForPlan(pricing, plan) {
  const key = normalizePlanKey(plan);
  if (key === 'starter') return Number(pricing.starter) || 0;
  if (key === 'standard') return Number(pricing.standard) || 0;
  if (key === 'premium') return Number(pricing.premium) || 0;
  return 0;
}

function planHasPromo(pricing, plan) {
  const key = normalizePlanKey(plan);
  const pct = Number(pricing.discountPercent) || 0;
  if (pct <= 0 || pct >= 100) return false;
  if (key === 'starter') return pricing.promoOnStarter !== false;
  if (key === 'standard') return pricing.promoOnStandard !== false;
  if (key === 'premium') return pricing.promoOnPremium !== false;
  return false;
}

/** Apply promo % off only if that plan is selected in CEO promo checkboxes */
function effectivePrice(pricing, plan) {
  const base = basePriceForPlan(pricing, plan);
  if (!planHasPromo(pricing, plan)) return base;
  const pct = Number(pricing.discountPercent) || 0;
  return Math.round(base * (1 - pct / 100));
}

function publicPlansPayload(pricing) {
  const discountPercent = Number(pricing.discountPercent) || 0;
  const promoLabel = pricing.promoLabel || '';
  const yearlyMonthsFree = Number(pricing.yearlyMonthsFree) || 0;

  const listPriceFor = (key) => {
    if (key === 'starter') return Number(pricing.listPriceStarter) || 0;
    if (key === 'standard') return Number(pricing.listPriceStandard) || 0;
    if (key === 'premium') return Number(pricing.listPricePremium) || 0;
    return 0;
  };

  const build = (key, name, color, bg, icon) => {
    const pay = effectivePrice(pricing, key);
    const list = listPriceFor(key);
    const hasListPromo = list > pay;
    const hasPctPromo = planHasPromo(pricing, key) && effectivePrice(pricing, key) < basePriceForPlan(pricing, key);
    const hasPromo = hasListPromo || hasPctPromo;
    const displayWas = hasListPromo ? list : (hasPctPromo ? basePriceForPlan(pricing, key) : pay);
    return {
      key,
      name,
      color,
      bg,
      icon,
      price: displayWas,
      salePrice: pay,
      hasPromo,
      discountPercent: hasPctPromo ? discountPercent : (hasListPromo && displayWas ? Math.round((1 - pay / displayWas) * 100) : 0),
      period: '/ month',
      studentLimit: studentLimitForPlan(pricing, key),
      teacherLimit: teacherLimitForPlan(pricing, key),
      features: featuresForPlan(pricing, key),
      description:
        key === 'starter'
          ? 'Small schools — core ops + text chat.'
          : key === 'standard'
            ? 'Growing schools — papers, full chat, AI Actions.'
            : 'Larger schools — higher AI caps & priority.',
    };
  };

  return {
    trialDays: Math.max(1, Number(pricing.trialDays) || 30),
    studentLimitTrial: studentLimitForPlan(pricing, 'free_trial'),
    teacherLimitTrial: teacherLimitForPlan(pricing, 'free_trial'),
    promoLabel,
    yearlyMonthsFree,
    discountPercent,
    promoOnStarter: pricing.promoOnStarter !== false,
    promoOnStandard: pricing.promoOnStandard !== false,
    promoOnPremium: pricing.promoOnPremium !== false,
    plans: [
      build('starter', 'Starter', '#0ea5e9', '#e0f2fe', '🚀'),
      build('standard', 'Standard', '#4f46e5', '#e0e7ff', '⭐'),
      build('premium', 'Premium', '#7c3aed', '#ede9fe', '👑'),
    ],
  };
}

module.exports = {
  PAID_PLANS,
  ALL_PLANS,
  PLAN_LABELS,
  normalizePlanKey,
  getPricingDoc,
  studentLimitForPlan,
  teacherLimitForPlan,
  featuresForPlan,
  basePriceForPlan,
  effectivePrice,
  planHasPromo,
  publicPlansPayload,
};
