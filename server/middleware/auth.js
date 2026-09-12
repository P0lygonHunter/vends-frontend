const jwt = require('jsonwebtoken');
const School = require('../models/School');

const TOKEN_TTL = '8h';

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('Server authentication is not configured. Set a strong JWT_SECRET.');
  }
  return process.env.JWT_SECRET;
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
      const school = await School.findById(req.auth.schoolId).select('_id blocked expiryDate');
      if (!school) return res.status(401).json({ error: 'School session is no longer valid.' });
      if (school.blocked) return res.status(403).json({ error: 'Account blocked. Contact support.' });
      if (school.expiryDate && new Date() > school.expiryDate) return res.status(403).json({ error: 'Trial expired! Please subscribe.' });
      req.schoolId = String(school._id);
      next();
    } catch (dbError) {
      next(dbError);
    }
  });
};

exports.requireCeoAuth = exports.requireAuth('ceo');

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
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const current = attempts.get(key) || { count: 0, startedAt: now };
  if (now - current.startedAt >= windowMs) {
    current.count = 0;
    current.startedAt = now;
  }
  current.count += 1;
  attempts.set(key, current);
  if (current.count > 5) return res.status(429).json({ error: 'Too many login attempts. Please try again in 15 minutes.' });
  next();
};
