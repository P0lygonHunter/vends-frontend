/**
 * Module access by subscription plan.
 * free_trial = full Premium feature set for the trial window.
 * Legacy lite → starter, zk → premium (via normalizePlanKey).
 */

/** Local normalize — avoid requiring plans.js (pulls mongoose/Pricing). */
function normalizePlanKey(plan) {
  if (plan === 'free_trial') return 'premium';
  if (plan === 'lite') return 'starter';
  if (plan === 'zk') return 'premium';
  if (plan === 'starter' || plan === 'standard' || plan === 'premium') return plan;
  // Missing plan must never grant premium (loading / bad data)
  return 'starter';
}

/** Rank: higher includes lower tiers for comparison helpers */
const PLAN_RANK = {
  starter: 1,
  standard: 2,
  premium: 3,
};

/**
 * Feature keys used by requireModuleAccess / frontend locks.
 * Keep in sync with Sidebar paths and route mounts.
 */
const FEATURES = {
  // Core — all plans including Starter + trial
  core: ['starter', 'standard', 'premium'],
  students: ['starter', 'standard', 'premium'],
  teachers: ['starter', 'standard', 'premium'],
  classes: ['starter', 'standard', 'premium'],
  attendance: ['starter', 'standard', 'premium'],
  timetable: ['starter', 'standard', 'premium'],
  basic_fees: ['starter', 'standard', 'premium'],
  documents: ['starter', 'standard', 'premium'],
  assignments: ['starter', 'standard', 'premium'],
  subjects: ['starter', 'standard', 'premium'],
  academic_years: ['starter', 'standard', 'premium'],
  chat: ['starter', 'standard', 'premium'], // V-Community 1:1 text

  // Standard+
  digital_payment_verify: ['standard', 'premium'],
  exams: ['standard', 'premium'],
  test_generator: ['standard', 'premium'],
  result_card: ['standard', 'premium'],
  reports: ['standard', 'premium'],
  broadcast: ['standard', 'premium'], // Communication Center bulk
  financial_basic: ['standard', 'premium'],

  // Premium only
  financial_full: ['premium'], // payroll etc.
  payroll: ['premium'],
  advanced_reports: ['premium'],
};

/** Path prefix → feature key for frontend route guards */
const PATH_FEATURE = {
  '/dashboard': 'core',
  '/academic-years': 'academic_years',
  '/classes': 'classes',
  '/students': 'students',
  '/teachers': 'teachers',
  '/subjects': 'subjects',
  '/attendance': 'attendance',
  '/exams-results': 'exams',
  '/assignments': 'assignments',
  '/fees': 'basic_fees',
  '/communication-center': 'chat', // page open; broadcast gated inside
  '/financial-management': 'financial_basic',
  '/employees': 'payroll',
  '/payroll': 'payroll',
  '/expenses': 'financial_basic',
  '/balance-sheet': 'financial_basic',
  '/trial-balance': 'financial_basic',
  '/profit-loss': 'financial_basic',
  '/chart-of-accounts': 'financial_basic',
  '/timetable': 'timetable',
  '/reports': 'reports',
  '/documents': 'documents',
  '/test-generator': 'test_generator',
  '/result-generator': 'result_card',
  '/subscription': 'core',
  '/settings': 'core',
};

function effectivePlanKey(plan) {
  return normalizePlanKey(plan);
}

function planAllows(plan, featureKey) {
  const key = effectivePlanKey(plan);
  const allowed = FEATURES[featureKey];
  if (!allowed) return true; // unknown feature → allow (safe default)
  return allowed.includes(key);
}

function featuresForSchoolPlan(plan) {
  const key = effectivePlanKey(plan);
  const out = {};
  for (const [feat, plans] of Object.entries(FEATURES)) {
    out[feat] = plans.includes(key);
  }
  return out;
}

function minPlanForFeature(featureKey) {
  const allowed = FEATURES[featureKey] || [];
  if (allowed.includes('starter')) return 'starter';
  if (allowed.includes('standard')) return 'standard';
  if (allowed.includes('premium')) return 'premium';
  return 'premium';
}

module.exports = {
  FEATURES,
  PATH_FEATURE,
  PLAN_RANK,
  effectivePlanKey,
  planAllows,
  featuresForSchoolPlan,
  minPlanForFeature,
};
