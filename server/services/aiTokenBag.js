const { quotasForPlan } = require('./aiConfigService');

const FALLBACK_BAG = {
  free_trial: 5000,
  starter: 10000,
  standard: 20000,
  premium: 40000,
};

function utcDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function resetBagIfNeeded(school, today) {
  if (school.aiTokenBagDate !== today) {
    school.aiTokenBagDate = today;
    school.aiTokenBagUsed = 0;
  }
}

function tokenBagLimit(config, school) {
  const plan = school?.plan;
  const q = quotasForPlan(config || {}, plan, school);
  const fromPlan = Number(q.dailyTokenBag);
  if (Number.isFinite(fromPlan) && fromPlan >= 0) return fromPlan;
  const key =
    plan === 'free_trial' || plan === 'trial' ? 'free_trial'
      : ['starter', 'standard', 'premium'].includes(String(plan || '').toLowerCase())
        ? String(plan).toLowerCase()
        : 'starter';
  return FALLBACK_BAG[key] || FALLBACK_BAG.starter;
}

async function ensureTokenBag(school, config, { estimate, consume = true }) {
  const today = utcDateKey();
  resetBagIfNeeded(school, today);
  const limit = tokenBagLimit(config, school);
  const used = Number(school.aiTokenBagUsed) || 0;
  const need = Math.max(0, Math.ceil(Number(estimate) || 0));

  if (limit <= 0) {
    return { ok: false, code: 'TOKEN_BAG_DISABLED', error: 'AI token budget is not available on this plan.', limit: 0, used };
  }
  if (used + need > limit) {
    return {
      ok: false,
      code: 'TOKEN_BAG_LIMIT',
      error: `Daily AI token budget exceeded (${used}/${limit}). Try again tomorrow or upgrade plan.`,
      limit,
      used,
    };
  }
  if (consume && need > 0) {
    school.aiTokenBagUsed = used + need;
    school.aiTokenBagDate = today;
    await school.save();
  }
  return { ok: true, limit, used: Number(school.aiTokenBagUsed) || 0, estimate: need };
}

function estimateFromText(system, user, outputHint = 400) {
  const inChars = String(system || '').length + String(user || '').length;
  return Math.min(8000, Math.ceil(inChars / 3) + outputHint);
}

module.exports = { utcDateKey, tokenBagLimit, ensureTokenBag, estimateFromText, FALLBACK_BAG };
