const AiPlatformConfig = require('../models/AiPlatformConfig');
const { effectivePlanKey } = require('../config/moduleAccess');

const DEFAULT_MODELS = [
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', role: 'general', enabled: true },
  { id: 'openai/gpt-4o', label: 'GPT-4o', role: 'erp', enabled: false },
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', role: 'search', enabled: true },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', role: 'erp', enabled: false },
  { id: 'deepseek/deepseek-v4-flash-0731', label: 'DeepSeek Flash', role: 'general', enabled: true },
];

const DEFAULT_QUOTAS = {
  free_trial: { dailyAiQuota: 15, dailySearchQuota: 5 },
  starter: { dailyAiQuota: 50, dailySearchQuota: 15 },
  standard: { dailyAiQuota: 200, dailySearchQuota: 50 },
  premium: { dailyAiQuota: 1000, dailySearchQuota: 250 },
};

function defaultsDoc() {
  return {
    key: 'ai',
    killSwitch: false,
    webSearchEnabled: true,
    models: DEFAULT_MODELS,
    generalModelId: 'openai/gpt-4o-mini',
    erpModelId: 'openai/gpt-4o-mini',
    searchModelId: 'google/gemini-2.5-flash',
    searchFallbackModelId: 'openai/gpt-4o-mini',
    planQuotas: DEFAULT_QUOTAS,
    monthlySoftCapUsd: 5,
  };
}

async function getAiConfig() {
  let doc = await AiPlatformConfig.findOne({ key: 'ai' });
  if (!doc) {
    doc = await AiPlatformConfig.create(defaultsDoc());
  }
  return doc;
}

function quotasForPlan(config, plan) {
  const key = effectivePlanKey(plan);
  const q = (config.planQuotas && config.planQuotas[key]) || DEFAULT_QUOTAS[key] || DEFAULT_QUOTAS.starter;
  return {
    dailyAiQuota: Math.max(0, Number(q.dailyAiQuota) || 0),
    dailySearchQuota: Math.max(0, Number(q.dailySearchQuota) || 0),
  };
}

function pickModel(config, role = 'general') {
  const preferred =
    role === 'search' ? config.searchModelId
      : role === 'erp' ? config.erpModelId
        : config.generalModelId;
  const list = Array.isArray(config.models) ? config.models : [];
  const enabled = list.filter((m) => m && m.enabled && m.id);
  const hit = enabled.find((m) => m.id === preferred && (role === 'general' || m.role === role || m.role === 'general'));
  if (hit) return hit.id;
  const byRole = enabled.find((m) => m.role === role);
  if (byRole) return byRole.id;
  if (enabled[0]) return enabled[0].id;
  return preferred || 'openai/gpt-4o-mini';
}

module.exports = {
  DEFAULT_MODELS,
  DEFAULT_QUOTAS,
  getAiConfig,
  quotasForPlan,
  pickModel,
  defaultsDoc,
};
