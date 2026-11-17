/**
 * Platform-wide module visibility (CEO kill-switch).
 * When a module is off: not in sidebar, routes 404, APIs reject — no "upgrade" leak.
 * Modules not in this catalog cannot be toggled (always available per plan rules).
 */

const PLATFORM_MODULES = [
  { key: 'storage', label: 'Storage', description: 'School storage dashboard & quotas' },
  { key: 'test_generator', label: 'Test Generator', description: 'Exam paper templates & print' },
  { key: 'date_sheet', label: 'Date Sheet', description: 'Date sheet generator' },
  { key: 'result_card', label: 'Result Card', description: 'Result card generator' },
  { key: 'reports', label: 'Reports', description: 'School reports module' },
  { key: 'documents', label: 'Documents', description: 'Documents library' },
  { key: 'financial_basic', label: 'Financial Management', description: 'Expenses, P&L, balance sheet' },
  { key: 'payroll', label: 'Payroll / Employees', description: 'Employees & payroll' },
  { key: 'exams', label: 'Exams & Results', description: 'Exams marks entry' },
  { key: 'assignments', label: 'Assignments', description: 'Homework / assignments' },
  { key: 'ai_insights', label: 'AI Insights', description: 'Dashboard AI insight cards' },
  { key: 'ai_ask', label: 'Ask AI', description: 'Ask AI drawer' },
  { key: 'chat', label: 'SE Community Chat', description: '1:1 parent/teacher chat (admin)' },
  { key: 'broadcast', label: 'Broadcast', description: 'Communication center broadcast' },
];

const TOGGLE_KEYS = PLATFORM_MODULES.map((m) => m.key);

/** Defaults: all ON */
function defaultVisibility() {
  const o = {};
  for (const k of TOGGLE_KEYS) o[k] = true;
  return o;
}

function normalizeVisibility(raw) {
  const base = defaultVisibility();
  if (!raw || typeof raw !== 'object') return base;
  for (const k of TOGGLE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(raw, k)) {
      base[k] = raw[k] !== false && raw[k] !== 0 && raw[k] !== 'false';
    }
  }
  return base;
}

function isToggleable(featureKey) {
  return TOGGLE_KEYS.includes(featureKey);
}

module.exports = {
  PLATFORM_MODULES,
  TOGGLE_KEYS,
  defaultVisibility,
  normalizeVisibility,
  isToggleable,
};
