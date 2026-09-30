const express = require('express');
const router = express.Router();

const {
  getModuleRecords,
  createModuleRecord,
  updateModuleRecord,
  deleteModuleRecord
} = require('../controllers/moduleController');
const { requireSchoolAuth, requireSchoolScope, requireOwnedResource } = require('../middleware/auth');
const ModuleRecord = require('../models/ModuleRecord');
const { planAllows, minPlanForFeature } = require('../config/moduleAccess');

router.use(requireSchoolAuth, requireSchoolScope);

const MODULE_TO_FEATURE = {
  employees: 'payroll',
  employee: 'payroll',
  payroll: 'payroll',
  expenses: 'financial_basic',
  'chart-of-accounts': 'financial_basic',
  'balance-sheet': 'financial_basic',
  'profit-loss': 'financial_basic',
  'trial-balance': 'financial_basic',
  reports: 'reports',
  'test-generator': 'test_generator',
  'result-card': 'result_card',
  'result-generator': 'result_card',
};

function featureForModuleName(name) {
  if (!name) return null;
  const key = String(name).toLowerCase().trim();
  return MODULE_TO_FEATURE[key] || null;
}

function deny(res, plan, feature) {
  const need = minPlanForFeature(feature);
  return res.status(403).json({
    error: `This feature requires the ${need.charAt(0).toUpperCase() + need.slice(1)} plan or higher. Upgrade from Subscription.`,
    code: 'PLAN_REQUIRED',
    feature,
    requiredPlan: need,
    currentPlan: plan,
  });
}

function rejectIfModuleLocked(req, res, next) {
  const mod = req.params.module || req.body?.module;
  const feature = featureForModuleName(mod);
  if (!feature) return next();
  const plan = req.schoolPlan || 'free_trial';
  if (planAllows(plan, feature)) return next();
  return deny(res, plan, feature);
}

async function rejectIfRecordModuleLocked(req, res, next) {
  try {
    const plan = req.schoolPlan || 'free_trial';
    let mod = req.body?.module;
    if (!mod && req.params.id) {
      const rec = await ModuleRecord.findById(req.params.id).select('module schoolId');
      if (rec) mod = rec.module;
    }
    const feature = featureForModuleName(mod);
    if (!feature) return next();
    if (planAllows(plan, feature)) return next();
    return deny(res, plan, feature);
  } catch (err) {
    return next(err);
  }
}

router.get('/module-records/:module/:schoolId', rejectIfModuleLocked, getModuleRecords);
router.post('/module-records', rejectIfModuleLocked, createModuleRecord);
router.patch('/module-records/:id', rejectIfRecordModuleLocked, requireOwnedResource(ModuleRecord), updateModuleRecord);
router.delete('/module-records/:id', rejectIfRecordModuleLocked, requireOwnedResource(ModuleRecord), deleteModuleRecord);

module.exports = router;
