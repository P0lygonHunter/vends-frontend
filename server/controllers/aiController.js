const mongoose = require('mongoose');
const School = require('../models/School');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const FeeRecord = require('../models/FeeRecord');
const StudentMark = require('../models/StudentMark');
const { effectivePlanKey, planAllows } = require('../config/moduleAccess');
const { gatewayConfigured, chatCompletion } = require('../services/aiGateway');

const STANDARD_DAILY = 5;
const PREMIUM_DAILY = 30;
const CACHE_MS = 6 * 60 * 60 * 1000; // 6h

function utcDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function dailyLimitForPlan(planKey) {
  if (planKey === 'premium') return PREMIUM_DAILY;
  if (planKey === 'standard') return STANDARD_DAILY;
  return 0;
}

async function loadSchoolStats(schoolId) {
  const sid = mongoose.Types.ObjectId.isValid(schoolId)
    ? new mongoose.Types.ObjectId(String(schoolId))
    : schoolId;
  const today = utcDateKey();

  const [studentCount, teacherCount, feeAgg, attToday, attWeek, marks] = await Promise.all([
    Student.countDocuments({ schoolId: sid }),
    Teacher.countDocuments({ schoolId: sid }),
    FeeRecord.aggregate([
      { $match: { schoolId: sid, status: { $in: ['Pending', 'Overdue'] } } },
      { $group: { _id: null, balance: { $sum: '$balance' }, count: { $sum: 1 } } },
    ]).catch(() => []),
    Attendance.countDocuments({ schoolId: sid, date: today, status: 'A' }).catch(() => 0),
    Attendance.find({ schoolId: sid, status: 'A' })
      .sort({ date: -1 })
      .limit(200)
      .select('grade studentName date')
      .lean()
      .catch(() => []),
    StudentMark.aggregate([
      { $match: { schoolId: sid } },
      { $group: { _id: '$subjectName', avg: { $avg: '$percentage' }, n: { $sum: 1 } } },
      { $sort: { avg: 1 } },
      { $limit: 5 },
    ]).catch(() => []),
  ]);

  // Class-wise absence rough count from recent absences
  const gradeAbs = {};
  for (const a of attWeek || []) {
    const g = a.grade || 'Unknown';
    gradeAbs[g] = (gradeAbs[g] || 0) + 1;
  }
  const topAbsentGrade = Object.entries(gradeAbs).sort((a, b) => b[1] - a[1])[0];

  const pendingFees = feeAgg[0] || { balance: 0, count: 0 };
  const weakest = marks[0] || null;

  return {
    studentCount,
    teacherCount,
    absentToday: attToday,
    topAbsentGrade: topAbsentGrade ? { grade: topAbsentGrade[0], absences: topAbsentGrade[1] } : null,
    pendingFeeBalance: pendingFees.balance || 0,
    pendingFeeCount: pendingFees.count || 0,
    weakestSubject: weakest
      ? { name: weakest._id || 'Subject', avg: Math.round(weakest.avg || 0), samples: weakest.n }
      : null,
  };
}

function ruleBasedCards(stats, school) {
  const cards = [];
  const daysLeft = school.expiryDate
    ? Math.max(0, Math.ceil((new Date(school.expiryDate) - new Date()) / (86400000)))
    : null;

  if (stats.topAbsentGrade && stats.topAbsentGrade.absences > 0) {
    cards.push({
      id: 'attendance',
      type: 'attendance',
      title: 'Attendance alert',
      badge: stats.topAbsentGrade.grade,
      body: `Higher absences in ${stats.topAbsentGrade.grade} recently (${stats.topAbsentGrade.absences} recorded). Today: ${stats.absentToday} absent.`,
      cta: 'View students',
      href: '/attendance',
      tone: 'warn',
    });
  } else {
    cards.push({
      id: 'attendance',
      type: 'attendance',
      title: 'Attendance',
      badge: 'Today',
      body: stats.absentToday > 0
        ? `${stats.absentToday} student(s) marked absent today out of ${stats.studentCount}.`
        : stats.studentCount
          ? 'No absences recorded for today yet — keep marking attendance.'
          : 'Add students and mark attendance to unlock alerts.',
      cta: 'View students',
      href: '/attendance',
      tone: 'info',
    });
  }

  const pkr = Math.round(stats.pendingFeeBalance || 0);
  cards.push({
    id: 'fees',
    type: 'fees',
    title: 'Fees',
    badge: pkr > 0 ? 'Pending' : 'Clear',
    body: pkr > 0
      ? `PKR ${pkr.toLocaleString()} pending across ${stats.pendingFeeCount} fee record(s).`
      : 'No pending or overdue fee balances right now.',
    cta: 'Send reminders',
    href: '/fees',
    tone: pkr > 0 ? 'warn' : 'ok',
  });

  if (stats.weakestSubject && stats.weakestSubject.samples > 0) {
    cards.push({
      id: 'exams',
      type: 'exams',
      title: 'Exams',
      badge: stats.weakestSubject.name,
      body: `${stats.weakestSubject.name} is weakest so far — avg ${stats.weakestSubject.avg}% (${stats.weakestSubject.samples} mark entries).`,
      cta: 'Open report',
      href: '/exams-results',
      tone: 'warn',
    });
  } else {
    cards.push({
      id: 'exams',
      type: 'exams',
      title: 'Exams',
      badge: 'Results',
      body: 'Not enough exam marks yet. Enter results to get subject-strength insights.',
      cta: 'Open report',
      href: '/exams-results',
      tone: 'info',
    });
  }

  if (daysLeft !== null && daysLeft <= 7) {
    cards.push({
      id: 'subscription',
      type: 'subscription',
      title: 'Subscription',
      badge: `${daysLeft}d`,
      body: `Plan window ends in ${daysLeft} day(s). Renew from Subscription to avoid feature locks.`,
      cta: 'Subscription',
      href: '/subscription',
      tone: 'warn',
    });
  }

  return cards.slice(0, 4);
}

async function maybePolishWithAi(cards, stats, schoolName) {
  if (!gatewayConfigured()) {
    return { cards, source: 'rules', model: null };
  }
  try {
    const system =
      'You are an education analytics assistant for a school ERP in Pakistan. ' +
      'Given JSON stats and draft insight cards, return ONLY a JSON array of 3 objects with keys: ' +
      'id, type, title, badge, body, cta, href, tone. Keep body under 140 characters. Be factual. No markdown.';
    const user = JSON.stringify({
      schoolName,
      stats,
      draftCards: cards.slice(0, 3),
    });
    const result = await chatCompletion({ system, user, maxTokens: 700 });
    if (!result?.text) return { cards, source: 'rules', model: null };

    let parsed = null;
    const raw = result.text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\[[\s\S]*\]/);
      if (m) parsed = JSON.parse(m[0]);
    }
    if (!Array.isArray(parsed) || !parsed.length) {
      return { cards, source: 'rules', model: result.model };
    }
    const cleaned = parsed.slice(0, 3).map((c, i) => ({
      id: String(c.id || cards[i]?.id || `c${i}`),
      type: String(c.type || cards[i]?.type || 'info'),
      title: String(c.title || 'Insight').slice(0, 40),
      badge: String(c.badge || '').slice(0, 24),
      body: String(c.body || '').slice(0, 180),
      cta: String(c.cta || cards[i]?.cta || 'Open').slice(0, 24),
      href: String(c.href || cards[i]?.href || '/dashboard').slice(0, 64),
      tone: ['warn', 'ok', 'info'].includes(c.tone) ? c.tone : 'info',
    }));
    return { cards: cleaned, source: 'ai', model: result.model };
  } catch (err) {
    console.error('[aiInsights polish]', err.message);
    return { cards, source: 'rules', model: null };
  }
}

async function ensureQuota(school, planKey, { consume }) {
  const limit = dailyLimitForPlan(planKey);
  if (limit <= 0) {
    return { ok: false, code: 'AI_PLAN', error: 'AI Insights requires Standard or Premium.', limit: 0, used: 0 };
  }
  const today = utcDateKey();
  let used = school.aiUsageDate === today ? Number(school.aiUsageCount) || 0 : 0;
  if (consume) {
    if (used >= limit) {
      return {
        ok: false,
        code: 'AI_LIMIT',
        error: `Daily AI limit reached (${limit}/day on your plan). Try again tomorrow or upgrade.`,
        limit,
        used,
      };
    }
    school.aiUsageDate = today;
    school.aiUsageCount = used + 1;
    used = school.aiUsageCount;
    await school.save();
  }
  return { ok: true, limit, used: school.aiUsageDate === today ? Number(school.aiUsageCount) || 0 : 0 };
}

exports.getInsights = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ error: 'School not found.' });

    const planKey = effectivePlanKey(school.plan);
    if (!planAllows(school.plan, 'ai_insights')) {
      return res.status(403).json({
        error: 'AI Insights is available on Standard and Premium plans.',
        code: 'AI_PLAN',
        locked: true,
        minPlan: 'standard',
      });
    }

    const force = String(req.query.refresh || '') === '1';
    const cacheFresh =
      !force &&
      school.aiInsightsCache &&
      school.aiInsightsCachedAt &&
      Date.now() - new Date(school.aiInsightsCachedAt).getTime() < CACHE_MS;

    if (cacheFresh) {
      try {
        const cached = JSON.parse(school.aiInsightsCache);
        const q = await ensureQuota(school, planKey, { consume: false });
        return res.json({
          ...cached,
          cached: true,
          quota: { limit: q.limit, used: q.used },
          gateway: gatewayConfigured(),
        });
      } catch {
        /* regenerate */
      }
    }

    // Generating counts toward daily quota (refresh or first load after cache expiry)
    const q = await ensureQuota(school, planKey, { consume: true });
    if (!q.ok) {
      // If limit hit but old cache exists, return cache without consume
      if (school.aiInsightsCache) {
        try {
          const cached = JSON.parse(school.aiInsightsCache);
          return res.json({
            ...cached,
            cached: true,
            quota: { limit: q.limit, used: q.used },
            gateway: gatewayConfigured(),
            limitReached: true,
          });
        } catch { /* fallthrough */ }
      }
      return res.status(403).json({ error: q.error, code: q.code, limit: q.limit, used: q.used });
    }

    const stats = await loadSchoolStats(schoolId);
    const draft = ruleBasedCards(stats, school);
    const polished = await maybePolishWithAi(draft, stats, school.schoolName);

    const payload = {
      cards: polished.cards.slice(0, 3),
      source: polished.source,
      model: polished.model,
      statsSummary: {
        students: stats.studentCount,
        teachers: stats.teacherCount,
        absentToday: stats.absentToday,
        pendingFeeBalance: stats.pendingFeeBalance,
      },
      generatedAt: new Date().toISOString(),
    };

    school.aiInsightsCache = JSON.stringify(payload);
    school.aiInsightsCachedAt = new Date();
    await school.save();

    res.json({
      ...payload,
      cached: false,
      quota: { limit: q.limit, used: q.used },
      gateway: gatewayConfigured(),
    });
  } catch (err) {
    console.error('[getInsights]', err);
    res.status(500).json({ error: err.message || 'Failed to load AI insights.' });
  }
};

exports.askAi = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ error: 'School not found.' });

    if (!planAllows(school.plan, 'ai_ask')) {
      return res.status(403).json({
        error: 'Ask AI is available on Premium plan.',
        code: 'AI_PLAN',
        locked: true,
        minPlan: 'premium',
      });
    }

    const question = String(req.body.question || '').trim().slice(0, 500);
    if (!question) return res.status(400).json({ error: 'Question is required.' });

    const planKey = effectivePlanKey(school.plan);
    const q = await ensureQuota(school, planKey, { consume: true });
    if (!q.ok) return res.status(403).json({ error: q.error, code: q.code, limit: q.limit, used: q.used });

    if (!gatewayConfigured()) {
      return res.status(503).json({
        error: 'AI Gateway is not configured. Set AI_GATEWAY_API_KEY on the server.',
        code: 'AI_GATEWAY',
      });
    }

    const stats = await loadSchoolStats(schoolId);
    const system =
      'You are a helpful school management assistant for Synapse EduCore (Pakistan). ' +
      'Answer briefly using the provided school stats. Do not invent student names. ' +
      'If data is missing, say what the admin should enter. No automatic actions — suggestions only.';
    const user = `School: ${school.schoolName}\nStats: ${JSON.stringify(stats)}\nQuestion: ${question}`;
    const result = await chatCompletion({ system, user, maxTokens: 500 });

    res.json({
      answer: result?.text || 'No response from AI.',
      model: result?.model || null,
      quota: { limit: q.limit, used: q.used },
      disclaimer: 'Suggestion only — review before acting.',
    });
  } catch (err) {
    console.error('[askAi]', err);
    res.status(500).json({ error: err.message || 'Ask AI failed.' });
  }
};
