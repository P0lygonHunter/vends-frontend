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
  if (pricing.standard == null) pricing.standard = 5999;
  return pricing;
}

function studentLimitForPlan(pricing, plan) {
  const key = normalizePlanKey(plan);
  if (key === 'starter') return pricing.studentLimitStarter ?? 150;
  if (key === 'standard') return pricing.studentLimitStandard ?? 500;
  if (key === 'premium') return pricing.studentLimitPremium ?? 2000;
  return pricing.studentLimitTrial ?? 100;
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

/** Apply promo % off to monthly price */
function effectivePrice(pricing, plan) {
  const base = basePriceForPlan(pricing, plan);
  const pct = Number(pricing.discountPercent) || 0;
  if (pct > 0 && pct < 100) {
    return Math.round(base * (1 - pct / 100));
  }
  return base;
}

function publicPlansPayload(pricing) {
  const discountPercent = Number(pricing.discountPercent) || 0;
  const promoLabel = pricing.promoLabel || '';
  const yearlyMonthsFree = Number(pricing.yearlyMonthsFree) || 0;

  const build = (key, name, color, bg, icon) => {
    const price = basePriceForPlan(pricing, key);
    const sale = effectivePrice(pricing, key);
    return {
      key,
      name,
      color,
      bg,
      icon,
      price,
      salePrice: sale,
      discountPercent: discountPercent > 0 ? discountPercent : 0,
      period: '/ month',
      studentLimit: studentLimitForPlan(pricing, key),
      features: featuresForPlan(pricing, key),
      description:
        key === 'starter'
          ? 'For small schools getting started.'
          : key === 'standard'
            ? 'Best for most growing schools.'
            : 'For large campuses and full power.',
    };
  };

  return {
    trialDays: 30,
    promoLabel,
    yearlyMonthsFree,
    discountPercent,
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
  featuresForPlan,
  basePriceForPlan,
  effectivePrice,
  publicPlansPayload,
};
