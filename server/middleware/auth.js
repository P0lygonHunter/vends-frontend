const jwt = require('jsonwebtoken');
const School = require('../models/School');
const { planAllows, minPlanForFeature, effectivePlanKey } = require('../config/moduleAccess');
const { getLifecycle } = require('../config/subscriptionLifecycle');

const TOKEN_TTL = '14d';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET || 'super_secret_key_vends_educore_2026_secure';
  if (secret.length < 32) {
    throw new Error('Server authentication is not configured. Set a strong JWT_SECRET.');
  }
  return secret;
};

exports.signToken = (payload) => jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_TTL });

exports.requireAuth = (...roles) => (req, res, next) => {
  try {
    const authorization = req.get('authorization') || '';
    const [, token] = authorization.match(/^Bearer\s+(.+)$/i) || [];
    if (!token) return res.status(401).json({ error: 'Authentication required.' });

    const claims = jwt.verify(token, getJwtSecret());
    if (!claims.role || (roles.length && !roles.includes(claims.role))) {
      return res.status(403).json({ error: 'You are not authorized for this action.' });
    }

    req.auth = claims;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    if (err.message.includes('authentication is not configured')) return res.status(500).json({ error: 'Server authentication is not configured.' });
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
};

exports.requireSchoolAuth = async (req, res, next) => {
  exports.requireAuth('school')(req, res, async (err) => {
    if (err || !req.auth) return;
    try {
      const school = await School.findById(req.auth.schoolId).select('_id blocked expiryDate plan');
      if (!school) return res.status(401).json({ error: 'School session is no longer valid.' });
      if (school.blocked) {
        const email = process.env.SUPPORT_EMAIL || '';
        const phone = process.env.SUPPORT_PHONE || '';
        const bits = [email, phone].filter(Boolean).join(' · ');
        const msg = bits ? `Account blocked. Contact support: ${bits}` : 'Account blocked. Contact support.';
        return res.status(403).json({ error: msg, supportEmail: email || null, supportPhone: phone || null });
      }
      const life = getLifecycle(school);
      req.subscriptionExpired = life.expired;
      req.subscriptionLifecycle = life;
      req.schoolId = String(school._id);
      req.schoolPlan = school.plan || 'free_trial';
      req.effectivePlan = effectivePlanKey(req.schoolPlan);
      // Expired (grace or past-grace before cron block): reads + billing only
      if (life.expired) {
        const method = (req.method || 'GET').toUpperCase();
        const url = String(req.originalUrl || req.url || '');
        const isRead = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
        const isBilling = /\/payments|\/invoices|\/pricing|\/school\/(check|update)/i.test(url);
        if (!isRead && !isBilling) {
          return res.status(403).json({
            error: life.pastGrace
              ? 'Grace period ended. Account is locked for changes until you renew — open Subscription or contact support.'
              : `Your trial or plan has ended. Grace period: ${life.graceDaysLeft} day(s) left to renew. Adding/editing is locked — open Subscription to renew.`,
            code: life.pastGrace ? 'SUBSCRIPTION_GRACE_ENDED' : 'SUBSCRIPTION_EXPIRED',
            softLock: !life.pastGrace,
            pastGrace: life.pastGrace,
            graceDaysLeft: life.graceDaysLeft,
          });
        }
      }
      next();
    } catch (dbError) {
      next(dbError);
    }
  });
};

/**
 * Route-level plan gate. Use after requireSchoolAuth.
 * Example: router.post('/community/broadcast', requireSchoolAuth, requireModuleAccess('broadcast'), sendBroadcast)
 */
exports.requireModuleAccess = (featureKey) => (req, res, next) => {
  const plan = req.schoolPlan || 'free_trial';
  if (planAllows(plan, featureKey)) return next();
  const need = minPlanForFeature(featureKey);
  return res.status(403).json({
    error: `This feature requires the ${need.charAt(0).toUpperCase() + need.slice(1)} plan or higher. Upgrade from Subscription.`,
    code: 'PLAN_REQUIRED',
    feature: featureKey,
    requiredPlan: need,
    currentPlan: plan,
  });
};

exports.requireCeoAuth = exports.requireAuth('ceo');

exports.requireParentAuth = async (req, res, next) => {
  exports.requireAuth('parent')(req, res, async (err) => {
    if (err || !req.auth) return;
    try {
      const school = await School.findById(req.auth.schoolId).select('_id blocked expiryDate');
      if (!school) return res.status(401).json({ error: 'School session is no longer valid.' });
      if (school.blocked) return res.status(403).json({ error: 'This school\'s account is blocked. Contact the school.' });
      if (school.expiryDate && new Date() > school.expiryDate) return res.status(403).json({ error: 'This school\'s subscription has expired.' });
      req.schoolId = String(school._id);
      req.parentId = req.auth.parentId;
      next();
    } catch (dbError) {
      next(dbError);
    }
  });
};

// Ensures the :studentId in the route actually belongs to the authenticated parent,
// so one parent cannot view or pay another family's fee records by guessing an ID.
exports.requireParentOwnsStudent = (Parent) => async (req, res, next) => {
  try {
    const studentId = req.params.studentId;
    const parent = await Parent.findOne({ _id: req.parentId, schoolId: req.schoolId, studentIds: studentId }).select('_id');
    if (!parent) return res.status(403).json({ error: 'This student is not linked to your account.' });
    next();
  } catch (err) {
    return res.status(403).json({ error: 'This student is not linked to your account.' });
  }
};

exports.requireTeacherAuth = async (req, res, next) => {
  exports.requireAuth('teacher')(req, res, async (err) => {
    if (err || !req.auth) return;
    try {
      const school = await School.findById(req.auth.schoolId).select('_id blocked expiryDate');
      if (!school) return res.status(401).json({ error: 'School session is no longer valid.' });
      if (school.blocked) return res.status(403).json({ error: 'This school\'s account is blocked. Contact the school.' });
      if (school.expiryDate && new Date() > school.expiryDate) return res.status(403).json({ error: 'This school\'s subscription has expired.' });
      req.schoolId = String(school._id);
      req.teacherId = req.auth.teacherId;
      next();
    } catch (dbError) {
      next(dbError);
    }
  });
};

exports.requireSchoolScope = (req, res, next) => {
  const suppliedSchoolId = req.params.schoolId || req.body?.schoolId || req.query.schoolId;
  if (suppliedSchoolId && String(suppliedSchoolId) !== String(req.schoolId)) {
    return res.status(403).json({ error: 'You cannot access another school\'s data.' });
  }
  if (req.body && typeof req.body === 'object') req.body.schoolId = req.schoolId;
  next();
};

exports.requireOwnedResource = (Model, idParam = 'id') => async (req, res, next) => {
  try {
    const record = await Model.findOne({ _id: req.params[idParam], schoolId: req.schoolId }).select('_id');
    if (!record) return res.status(404).json({ error: 'Record not found.' });
    next();
  } catch (err) {
    return res.status(404).json({ error: 'Record not found.' });
  }
};

const attempts = new Map();
exports.loginRateLimit = (req, res, next) => {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const email = String(req.body?.email || req.body?.phone || '').toLowerCase().trim();
  const key = `${ip}|${email || 'none'}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 10;
  const current = attempts.get(key) || { count: 0, startedAt: now };
  if (now - current.startedAt >= windowMs) {
    current.count = 0;
    current.startedAt = now;
  }
  current.count += 1;
  attempts.set(key, current);
  if (current.count > maxAttempts) {
    return res.status(429).json({ error: 'Too many attempts. Please try again in 15 minutes.' });
  }
  next();
};


// Generic in-memory rate limiter factory
const makeRateLimit = (options) => {
  const store = new Map();
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const max = options.max || 10;
  const message = options.message || 'Too many requests. Please try again later.';
  return (req, res, next) => {
    const keyBase = options.keyFn
      ? options.keyFn(req)
      : (req.ip || req.socket?.remoteAddress || 'unknown');
    const key = String(keyBase);
    const now = Date.now();
    const current = store.get(key) || { count: 0, startedAt: now };
    if (now - current.startedAt >= windowMs) {
      current.count = 0;
      current.startedAt = now;
    }
    current.count += 1;
    store.set(key, current);
    if (current.count > max) {
      return res.status(429).json({ error: message });
    }
    next();
  };
};

// Payment submit: max 8 per school per 15 minutes
exports.paymentSubmitRateLimit = makeRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: 'Too many payment requests. Please wait before submitting again.',
  keyFn: (req) => `pay:${req.schoolId || req.ip || 'unknown'}`,
});

// Communication Center broadcast: max 20 per school per 15 minutes
exports.broadcastRateLimit = makeRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many broadcasts sent. Please wait before sending more.',
  keyFn: (req) => `broadcast:${req.schoolId || req.ip || 'unknown'}`,
});
