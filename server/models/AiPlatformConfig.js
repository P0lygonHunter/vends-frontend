const mongoose = require('mongoose');

const ModelEntrySchema = new mongoose.Schema({
  id: { type: String, required: true, trim: true },
  label: { type: String, default: '' },
  role: {
    type: String,
    enum: ['general', 'erp', 'search', 'insights', 'ask'],
    default: 'general',
  },
  provider: {
    type: String,
    enum: ['gateway', 'groq', 'gemini', 'auto'],
    default: 'auto',
  },
  enabled: { type: Boolean, default: true },
}, { _id: false });

const PlanQuotaSchema = new mongoose.Schema({
  dailyAiQuota: { type: Number, default: 50 },
  dailyInsightsQuota: { type: Number, default: 10 },
  dailyAskQuota: { type: Number, default: 15 },
  dailySearchQuota: { type: Number, default: 5 },
}, { _id: false });

const AiPlatformConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'ai' },
  killSwitch: { type: Boolean, default: false },
  webSearchEnabled: { type: Boolean, default: true },
  models: { type: [ModelEntrySchema], default: [] },
  generalModelId: { type: String, default: 'allam-2-7b' },
  erpModelId: { type: String, default: 'allam-2-7b' },
  insightsModelId: { type: String, default: 'allam-2-7b' },
  askModelId: { type: String, default: 'allam-2-7b' },
  searchModelId: { type: String, default: 'nvidia/nemotron-3.5-lightning-free' },
  searchFallbackModelId: { type: String, default: 'openai/gpt-4o-mini' },
  insightsProvider: { type: String, default: 'groq' },
  askProvider: { type: String, default: 'groq' },
  webAnswerProvider: { type: String, default: 'gateway' },
  fallbackProvider: { type: String, default: 'gateway' },
  planQuotas: {
    free_trial: {
      type: PlanQuotaSchema,
      default: () => ({ dailyAiQuota: 10, dailyInsightsQuota: 5, dailyAskQuota: 5, dailySearchQuota: 2 }),
    },
    starter: {
      type: PlanQuotaSchema,
      default: () => ({ dailyAiQuota: 25, dailyInsightsQuota: 10, dailyAskQuota: 15, dailySearchQuota: 5 }),
    },
    standard: {
      type: PlanQuotaSchema,
      default: () => ({ dailyAiQuota: 60, dailyInsightsQuota: 20, dailyAskQuota: 40, dailySearchQuota: 15 }),
    },
    premium: {
      type: PlanQuotaSchema,
      default: () => ({ dailyAiQuota: 140, dailyInsightsQuota: 40, dailyAskQuota: 100, dailySearchQuota: 30 }),
    },
  },
  monthlySoftCapUsd: { type: Number, default: 5 },
}, { timestamps: true });

module.exports = mongoose.models.AiPlatformConfig || mongoose.model('AiPlatformConfig', AiPlatformConfigSchema);
