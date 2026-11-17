/**
 * CEO platform module visibility — merged into planFeatures from checkSchool.
 * When a feature is false here (or missing after merge), hide completely (no lock icon).
 */
const LS_KEY = 'se_platform_modules'

export function cachePlatformFromPlanFeatures(planFeatures) {
  if (!planFeatures || typeof planFeatures !== 'object') return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(planFeatures))
  } catch (_) {}
}

export function getCachedPlanFeatures() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}')
  } catch {
    return {}
  }
}

/** Sidebar / route: if platform killed the module, hide — do not show 🔒 */
export function isModuleVisible(featureKey, planFeatures) {
  if (!featureKey) return true
  const src = planFeatures && Object.keys(planFeatures).length ? planFeatures : getCachedPlanFeatures()
  if (src && Object.prototype.hasOwnProperty.call(src, featureKey) && src[featureKey] === false) {
    return false
  }
  return true
}
