const AiPlatformConfig = require('../models/AiPlatformConfig');
const { effectivePlanKey } = require('../config/moduleAccess');

const DEFAULT_MODELS = [
  { id: 'allam-2-7b', label: 'Groq Allam 2 7B', role: 'insights', provider: 'groq', enabled: true },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (Gateway)', role: 'general', provider: 'gateway', enabled: true },
  { id: 'nvidia/nemotron-3.5-lightning-free', label: 'Nemotron Free (Gateway)', role: 'search', provider: 'gateway', enabled: true },
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', role: 'search', provider: 'gemini', enabled: true },
  { id: 'google/gemini-2.5-flash-lite', label: 'Gemini Flash-Lite', role: 'general', provider: 'gemini', enabled: true },
];

const DEFAULT_QUOTAS = {
  free_trial: { dailyAiQuota: 10, dailyInsightsQuota: 5, dailyAskQuota: 5, dailySearchQuota: 2 },
  starter: { dailyAiQuota: 25, dailyInsightsQuota: 10, dailyAskQuota: 15, dailySearchQuota: 5 },
  standard: { dailyAiQuota: 60, dailyInsightsQuota: 20, dailyAskQuota: 40, dailySearchQuota: 15 },
  premium: { dailyAiQuota: 140, dailyInsightsQuota: 40, dailyAskQuota: 100, dailySearchQuota: 30 },
};

function defaultsDoc() {
  return {
    key: 'ai',
    killSwitch: false,
    webSearchEnabled: true,
    models: DEFAULT_MODELS,
    generalModelId: 'allam-2-7b',
    erpModelId: 'allam-2-7b',
    insightsModelId: 'allam-2-7b',
    askModelId: 'allam-2-7b',
    searchModelId: 'nvidia/nemotron-3.5-lightning-free',
    searchFallbackModelId: 'openai/gpt-4o-mini',
    insightsProvider: 'groq',
    askProvider: 'groq',
    webAnswerProvider: 'gateway',
    fallbackProvider: 'gateway',
    planQuotas: DEFAULT_QUOTAS,
    monthlySoftCapUsd: 5,
  };
}

async function getAiConfig() {
  let doc = await AiPlatformConfig.findOne({ key: 'ai' });
  if (!doc) doc = await AiPlatformConfig.create(defaultsDoc());
  return doc;
}

function quotasForPlan(config, plan, school = null) {
  const key = effectivePlanKey(plan);
  const base = (config.planQuotas && config.planQuotas[key]) || DEFAULT_QUOTAS[key] || DEFAULT_QUOTAS.starter;
  let dailyInsightsQuota = Number(base.dailyInsightsQuota);
  let dailyAskQuota = Number(base.dailyAskQuota);
  let dailySearchQuota = Number(base.dailySearchQuota);
  let dailyAiQuota = Number(base.dailyAiQuota);
  if (!Number.isFinite(dailyInsightsQuota) || dailyInsightsQuota < 0) {
    dailyInsightsQuota = Math.max(0, Math.floor((Number(base.dailyAiQuota) || 15) / 2));
  }
  if (!Number.isFinite(dailyAskQuota) || dailyAskQuota < 0) {
    dailyAskQuota = Math.max(0, Number(base.dailyAiQuota) || 15);
  }
  if (!Number.isFinite(dailySearchQuota) || dailySearchQuota < 0) {
    dailySearchQuota = Math.max(0, Number(base.dailySearchQuota) || 5);
  }
  if (!Number.isFinite(dailyAiQuota) || dailyAiQuota < 0) {
    dailyAiQuota = dailyInsightsQuota + dailyAskQuota;
  }
  const ov = school && school.aiQuotaOverrides ? school.aiQuotaOverrides : null;
  if (ov) {
    if (ov.dailyInsightsQuota != null && ov.dailyInsightsQuota !== '') dailyInsightsQuota = Math.max(0, Number(ov.dailyInsightsQuota) || 0);
    if (ov.dailyAskQuota != null && ov.dailyAskQuota !== '') dailyAskQuota = Math.max(0, Number(ov.dailyAskQuota) || 0);
    if (ov.dailySearchQuota != null && ov.dailySearchQuota !== '') dailySearchQuota = Math.max(0, Number(ov.dailySearchQuota) || 0);
    if (ov.dailyAiQuota != null && ov.dailyAiQuota !== '') dailyAiQuota = Math.max(0, Number(ov.dailyAiQuota) || 0);
  }
  return {
    dailyInsightsQuota,
    dailyAskQuota,
    dailySearchQuota,
    dailyAiQuota: dailyAiQuota > 0 ? dailyAiQuota : dailyInsightsQuota + dailyAskQuota,
  };
}

function pickModel(config, role = 'general') {
  const preferred =
    role === 'search' ? config.searchModelId
      : role === 'insights' ? (config.insightsModelId || config.generalModelId)
        : role === 'ask' ? (config.askModelId || config.generalModelId)
          : role === 'erp' ? config.erpModelId
            : config.generalModelId;
  const list = Array.isArray(config.models) ? config.models : [];
  const enabled = list.filter((m) => m && m.enabled && m.id);
  const hit = enabled.find((m) => m.id === preferred);
  if (hit) return { modelId: hit.id, provider: hit.provider || 'auto', role };
  const byRole = enabled.find((m) => m.role === role);
  if (byRole) return { modelId: byRole.id, provider: byRole.provider || 'auto', role };
  if (enabled[0]) return { modelId: enabled[0].id, provider: enabled[0].provider || 'auto', role };
  return { modelId: preferred || 'allam-2-7b', provider: 'auto', role };
}

function resolveProvider(config, role, modelMeta) {
  if (modelMeta && modelMeta.provider && modelMeta.provider !== 'auto') return modelMeta.provider;
  if (role === 'insights') return config.insightsProvider || 'groq';
  if (role === 'ask') return config.askProvider || 'groq';
  if (role === 'search') return config.webAnswerProvider || 'gateway';
  return config.fallbackProvider || 'gateway';
}

module.exports = {
  DEFAULT_MODELS, DEFAULT_QUOTAS, getAiConfig, quotasForPlan, pickModel, resolveProvider, defaultsDoc,
};
