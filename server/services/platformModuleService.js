const CeoConfig = require('../models/CeoConfig');
const { defaultVisibility, normalizeVisibility, isToggleable } = require('../config/platformModules');

let cache = { at: 0, data: null };
const TTL_MS = 15_000;

async function loadVisibility() {
  const now = Date.now();
  if (cache.data && now - cache.at < TTL_MS) return cache.data;
  let doc = await CeoConfig.findOne({ key: 'ceo' }).select('moduleVisibility').lean();
  const data = normalizeVisibility(doc?.moduleVisibility);
  cache = { at: now, data };
  return data;
}

function invalidateModuleVisibilityCache() {
  cache = { at: 0, data: null };
}

async function getModuleVisibility() {
  return loadVisibility();
}

async function setModuleVisibility(partial, updatedBy) {
  const current = await loadVisibility();
  const next = normalizeVisibility({ ...current, ...partial });
  await CeoConfig.findOneAndUpdate(
    { key: 'ceo' },
    {
      $set: {
        moduleVisibility: next,
        moduleVisibilityUpdatedAt: new Date(),
        moduleVisibilityUpdatedBy: updatedBy || 'ceo',
      },
    },
    { upsert: true, new: true }
  );
  invalidateModuleVisibilityCache();
  return next;
}

/** true if module may be used (non-toggleable always true) */
async function isPlatformModuleEnabled(featureKey) {
  if (!isToggleable(featureKey)) return true;
  const vis = await loadVisibility();
  return vis[featureKey] !== false;
}

/** Apply platform kills to planFeatures object (mutate copy) */
async function applyPlatformToFeatures(planFeatures) {
  const vis = await loadVisibility();
  const out = { ...(planFeatures || {}) };
  for (const [k, on] of Object.entries(vis)) {
    if (!on) out[k] = false;
  }
  return out;
}

module.exports = {
  getModuleVisibility,
  setModuleVisibility,
  isPlatformModuleEnabled,
  applyPlatformToFeatures,
  invalidateModuleVisibilityCache,
};
