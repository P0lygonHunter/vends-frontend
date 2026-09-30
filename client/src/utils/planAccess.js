/**
 * Client-side plan feature map — keep in sync with server/config/moduleAccess.js
 * free_trial (explicit) → premium features.
 * Missing/unknown plan while loading → Starter floor (never unlock paid modules).
 */

const normalize = (plan) => {
  if (plan === 'free_trial') return 'premium'
  if (plan === 'lite') return 'starter'
  if (plan === 'zk') return 'premium'
  if (plan === 'starter' || plan === 'standard' || plan === 'premium') return plan
  // null / undefined / garbage while loading → starter floor (safe)
  return 'starter'
}

const FEATURES = {
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
  chat: ['starter', 'standard', 'premium'],
  chat_attachments: ['standard', 'premium'],
  chat_voice: ['standard', 'premium'],
  chat_emoji: ['starter', 'standard', 'premium'],
  digital_payment_verify: ['standard', 'premium'],
  exams: ['standard', 'premium'],
  test_generator: ['standard', 'premium'],
  result_card: ['standard', 'premium'],
  reports: ['standard', 'premium'],
  broadcast: ['standard', 'premium'],
  financial_basic: ['standard', 'premium'],
  financial_full: ['premium'],
  payroll: ['premium'],
  advanced_reports: ['premium'],
}

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
  '/communication-center': 'chat',
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
}

export function effectivePlanKey(plan) {
  return normalize(plan)
}

export function planAllows(plan, featureKey, planFeatures) {
  if (planFeatures && typeof planFeatures[featureKey] === 'boolean') {
    return planFeatures[featureKey]
  }
  const key = normalize(plan)
  const allowed = FEATURES[featureKey]
  if (!allowed) return true
  return allowed.includes(key)
}

export function pathAllowed(plan, path, planFeatures) {
  const base = Object.keys(PATH_FEATURE)
    .filter((p) => path === p || path.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0]
  if (!base) return true
  return planAllows(plan, PATH_FEATURE[base], planFeatures)
}

export function minPlanLabel(featureKey) {
  const allowed = FEATURES[featureKey] || []
  if (allowed.includes('starter')) return 'Starter'
  if (allowed.includes('standard')) return 'Standard'
  return 'Premium'
}

/** Mirror of server chatCapsForPlan for UI gates */
export function chatCapsForPlan(plan) {
  const key = effectivePlanKey(plan)
  if (key === 'starter') {
    return { image: false, audio: false, emoji: true, maxImageChars: 0, maxAudioChars: 0, maxAudioSeconds: 0 }
  }
  if (key === 'standard') {
    return { image: true, audio: true, emoji: true, maxImageChars: 700000, maxAudioChars: 400000, maxAudioSeconds: 60 }
  }
  return { image: true, audio: true, emoji: true, maxImageChars: 2800000, maxAudioChars: 2500000, maxAudioSeconds: 300 }
}

export { PATH_FEATURE, FEATURES }
