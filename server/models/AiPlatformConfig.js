const mongoose = require('mongoose');

/**
 * Singleton platform AI settings (CEO-controlled).
 * Gateway API key stays in server env (AI_GATEWAY_API_KEY) — never store secrets here.
 */
const ModelEntrySchema = new mongoose.Schema({
  id: { type: String, required: true, trim: true }, // e.g. openai/gpt-4o-mini
  label: { type: String, default: '' },
  role: {
    type: String,
    enum: ['general', 'erp', 'search'],
    default: 'general',
  },
  enabled: { type: Boolean, default: true },
}, { _id: false });

const PlanQuotaSchema = new mongoose.Schema({
  dailyAiQuota: { type: Number, default: 50 },
  dailySearchQuota: { type: Number, default: 15 },
}, { _id: false });

const AiPlatformConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'ai' },

  /** Master kill — no Gateway calls when true */
  killSwitch: { type: Boolean, default: false },

  /** Ask AI may use web search (still human-facing; uses search quota) */
  webSearchEnabled: { type: Boolean, default: true },

  models: { type: [ModelEntrySchema], default: [] },

  /** Preferred model ids (must exist in models list when possible) */
  generalModelId: { type: String, default: 'openai/gpt-4o-mini' },
  erpModelId: { type: String, default: 'openai/gpt-4o-mini' },
  searchModelId: { type: String, default: 'google/gemini-2.5-flash' },
  searchFallbackModelId: { type: String, default: 'openai/gpt-4o-mini' },

  planQuotas: {
    free_trial: { type: PlanQuotaSchema, default: () => ({ dailyAiQuota: 15, dailySearchQuota: 5 }) },
    starter: { type: PlanQuotaSchema, default: () => ({ dailyAiQuota: 50, dailySearchQuota: 15 }) },
    standard: { type: PlanQuotaSchema, default: () => ({ dailyAiQuota: 200, dailySearchQuota: 50 }) },
    premium: { type: PlanQuotaSchema, default: () => ({ dailyAiQuota: 1000, dailySearchQuota: 250 }) },
  },

  /** Soft note for CEO telemetry (not auto-billing) */
  monthlySoftCapUsd: { type: Number, default: 5 },
}, { timestamps: true });

module.exports = mongoose.models.AiPlatformConfig || mongoose.model('AiPlatformConfig', AiPlatformConfigSchema);
