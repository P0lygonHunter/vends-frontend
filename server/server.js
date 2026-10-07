const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { requireCeoAuth } = require('./middleware/auth');

// Load models
require('./models/School');
require('./models/Student');
require('./models/Teacher');
require('./models/Attendance');
require('./models/LoginLog');
require('./models/ModuleRecord');
require('./models/AcademicYear');
require('./models/ClassSection');
require('./models/Subject');
require('./models/Examination');
require('./models/StudentMark');
require('./models/FeeRecord');
require('./models/TimetableEntry');
require('./models/Assignment');
require('./models/AssignmentSubmission');
require('./models/StudentDocument');
require('./models/FeePayment');
require('./models/JournalEntry');
require('./models/CeoConfig');
require('./models/PaymentMethod');
require('./models/Payment');
require('./models/Invoice');
require('./models/Parent');
require('./models/Notification');
require('./models/Conversation');
require('./models/Message');
require('./models/VServiceMessage');
require('./models/EmailOtp');
require('./models/Pricing');

// Initialize app
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-XSS-Protection', '0');
  next();
});

// Middleware — CORS must answer OPTIONS preflight before any DB/auth work
const ALLOWED_ORIGINS = [
  'https://vends-frontend.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];
function isAllowedOrigin(origin) {
  if (!origin) return true; // same-origin / curl / server
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Vercel preview deployments of this frontend
  if (/^https:\/\/vends-frontend[\w-]*\.vercel\.app$/.test(origin)) return true;
  return false;
}
const corsOptions = {
  origin(origin, cb) {
    if (isAllowedOrigin(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-cron-secret'],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '5mb' }));

// Database connection middleware (skip preflight)
const dbMiddleware = require('./middleware/dbMiddleware');
app.use(dbMiddleware);

// Load routes
const ceoRoutes = require('./routes/ceoRoutes');
const pwaRoutes = require('./routes/pwaRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const academicRoutes = require('./routes/academicRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const examinationRoutes = require('./routes/examinationRoutes');
const feeRoutes = require('./routes/feeRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const documentRoutes = require('./routes/documentRoutes');
const moduleRoutes = require('./routes/moduleRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const financialRoutes = require('./routes/financialRoutes');
const parentRoutes = require('./routes/parentRoutes');
const teacherAuthRoutes = require('./routes/teacherAuthRoutes');
const communityRoutes = require('./routes/communityRoutes');

// API Routes
// IMPORTANT: Public community/parent/teacher-portal + public pricing must mount
// BEFORE any router that does router.use(requireSchoolAuth) on '/api'.
// Otherwise Express hits school-auth middleware first and returns 401 on public endpoints.
app.use('/api/ceo', ceoRoutes);
app.use('/api', pwaRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/admin', ceoRoutes);
app.use('/api', parentRoutes);
app.use('/api', teacherAuthRoutes);
app.use('/api', communityRoutes);
app.use('/api', paymentRoutes);
app.use('/api', academicRoutes);
app.use('/api', studentRoutes);
app.use('/api', teacherRoutes);
app.use('/api', attendanceRoutes);
app.use('/api/exams', examinationRoutes);
app.use('/api', feeRoutes);
app.use('/api', timetableRoutes);
app.use('/api', assignmentRoutes);
app.use('/api', documentRoutes);
app.use('/api', moduleRoutes);
app.use('/api', financialRoutes);

// Debug route
if (process.env.NODE_ENV !== 'production') app.get('/api/debug/db', requireCeoAuth, async (req, res) => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/SchoolERP');
    res.json({
      success: true,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      database: mongoose.connection.name
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      readyState: mongoose.connection.readyState
    });
  }
});


// Subscription lifecycle: grace → block, then purge (also available as CEO POST /api/ceo/lifecycle/run)
const { runSubscriptionLifecycle } = require('./services/subscriptionCron');
const CRON_MS = Math.max(60 * 60 * 1000, Number(process.env.SUBSCRIPTION_CRON_MS) || 6 * 60 * 60 * 1000);

async function safeLifecycleTick() {
  try {
    const summary = await runSubscriptionLifecycle();
    if (summary.blocked || summary.purged || (summary.errors && summary.errors.length)) {
      console.log('[subscription-lifecycle]', JSON.stringify(summary));
    }
  } catch (err) {
    console.error('[subscription-lifecycle] failed', err.message);
  }
}

// Secured HTTP trigger for external cron (Vercel Cron / GitHub Actions)
app.post('/api/internal/subscription-lifecycle', async (req, res) => {
  const secret = process.env.CRON_SECRET || process.env.JWT_SECRET;
  const got = req.get('x-cron-secret') || req.query.secret;
  if (!secret || got !== secret) {
    return res.status(401).json({ error: 'Unauthorized cron.' });
  }
  try {
    const summary = await runSubscriptionLifecycle();
    res.json({ ok: true, ...summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SUBSCRIPTION_CRON === 'true') {
  setTimeout(safeLifecycleTick, 15 * 1000);
  setInterval(safeLifecycleTick, CRON_MS);
}

// Export for Vercel
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✓ Server running locally on port ${PORT}`);
  });
}

module.exports = app;
