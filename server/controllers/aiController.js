const mongoose = require('mongoose');
const School = require('../models/School');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const FeeRecord = require('../models/FeeRecord');
const StudentMark = require('../models/StudentMark');
const { effectivePlanKey, planAllows } = require('../config/moduleAccess');
const { gatewayConfigured, chatCompletion, webSearch } = require('../services/aiGateway');
const { getAiConfig, quotasForPlan, pickModel } = require('../services/aiConfigService');

const CACHE_MS = 6 * 60 * 60 * 1000;

function utcDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function resetCountersIfNeeded(school, today) {
  if (school.aiUsageDate !== today) {
    school.aiUsageDate = today;
    school.aiUsageCount = 0;
  }
  if (school.searchUsageDate !== today) {
    school.searchUsageDate = today;
    school.searchUsageCount = 0;
  }
}

/**
 * @param {'ai'|'search'} type
 * @param {{ consume: boolean }} opts
 */
async function ensureQuota(school, planKey, type, { consume }, config) {
  const quotas = quotasForPlan(config, planKey);
  const limit = type === 'search' ? quotas.dailySearchQuota : quotas.dailyAiQuota;
  const today = utcDateKey();
  resetCountersIfNeeded(school, today);

  const used = type === 'search'
    ? Number(school.searchUsageCount) || 0
    : Number(school.aiUsageCount) || 0;

  if (limit <= 0) {
    return {
      ok: false,
      code: 'AI_PLAN',
      error: type === 'search'
        ? 'Web search is not included on your plan.'
        : 'AI features are not included on your plan.',
      limit: 0,
      used,
    };
  }

  if (consume) {
    if (used >= limit) {
      return {
        ok: false,
        code: 'AI_LIMIT',
        error: 'Daily AI limit exceeded. Upgrade your plan to unlock more queries.',
        limit,
        used,
      };
    }
    if (type === 'search') school.searchUsageCount = used + 1;
    else school.aiUsageCount = used + 1;
    await school.save();
  }

  return {
    ok: true,
    limit,
    used: type === 'search' ? Number(school.searchUsageCount) || 0 : Number(school.aiUsageCount) || 0,
    quotas,
  };
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
    ? Math.max(0, Math.ceil((new Date(school.expiryDate) - new Date()) / 86400000))
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

async function maybePolishWithAi(cards, stats, schoolName, config) {
  if (config.killSwitch || !gatewayConfigured()) {
    return { cards, source: 'rules', model: null };
  }
  try {
    const model = pickModel(config, 'general');
    const system =
      'You are an education analytics assistant for a school ERP in Pakistan. ' +
      'Given JSON stats and draft insight cards, return ONLY a JSON array of 3 objects with keys: ' +
      'id, type, title, badge, body, cta, href, tone. Keep body under 140 characters. Be factual. No markdown.';
    const user = JSON.stringify({ schoolName, stats, draftCards: cards.slice(0, 3) });
    const result = await chatCompletion({ system, user, maxTokens: 700, model });
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

function publicQuota(school, config, planKey) {
  const quotas = quotasForPlan(config, planKey);
  const today = utcDateKey();
  const aiUsed = school.aiUsageDate === today ? Number(school.aiUsageCount) || 0 : 0;
  const searchUsed = school.searchUsageDate === today ? Number(school.searchUsageCount) || 0 : 0;
  return {
    ai: { used: aiUsed, limit: quotas.dailyAiQuota },
    search: { used: searchUsed, limit: quotas.dailySearchQuota },
    // backward compat for existing Dashboard
    limit: quotas.dailyAiQuota,
    used: aiUsed,
  };
}

exports.getInsights = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ error: 'School not found.' });

    const config = await getAiConfig();
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
        return res.json({
          ...cached,
          cached: true,
          quota: publicQuota(school, config, planKey),
          killSwitch: Boolean(config.killSwitch),
        });
      } catch { /* regenerate */ }
    }

    const q = await ensureQuota(school, planKey, 'ai', { consume: true }, config);
    if (!q.ok) {
      if (school.aiInsightsCache) {
        try {
          const cached = JSON.parse(school.aiInsightsCache);
          return res.json({
            ...cached,
            cached: true,
            quota: publicQuota(school, config, planKey),
            limitReached: true,
            killSwitch: Boolean(config.killSwitch),
          });
        } catch { /* fallthrough */ }
      }
      return res.status(429).json({ error: q.error, code: q.code, quota: publicQuota(school, config, planKey) });
    }

    const stats = await loadSchoolStats(schoolId);
    const draft = ruleBasedCards(stats, school);
    const polished = await maybePolishWithAi(draft, stats, school.schoolName, config);

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
      quota: publicQuota(school, config, planKey),
      killSwitch: Boolean(config.killSwitch),
    });
  } catch (err) {
    console.error('[getInsights]', err);
    res.status(500).json({ error: err.message || 'Failed to load AI insights.' });
  }
};

/** Ask AI: chat + optional web search (search only here). */
exports.askAi = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ error: 'School not found.' });

    const config = await getAiConfig();
    if (config.killSwitch) {
      return res.status(503).json({ error: 'AI is temporarily paused by the platform.', code: 'AI_KILLED' });
    }

    if (!planAllows(school.plan, 'ai_ask') && !planAllows(school.plan, 'ai_insights')) {
      // Allow Ask on plans that have ai_insights at minimum; premium preferred for full
      // User plan: starter has quotas too - open Ask for any plan with dailyAiQuota > 0
    }

    const planKey = effectivePlanKey(school.plan);
    const quotas = quotasForPlan(config, planKey);
    if (quotas.dailyAiQuota <= 0) {
      return res.status(403).json({
        error: 'Ask AI is not available on your plan.',
        code: 'AI_PLAN',
        locked: true,
      });
    }

    const question = String(req.body.question || '').trim().slice(0, 800);
    if (!question) return res.status(400).json({ error: 'Question is required.' });

    const wantSearch = Boolean(req.body.webSearch !== false && config.webSearchEnabled);
    // Heuristic: user asked about web / news / current / outside school
    const searchHint = /\b(search|google|news|internet|web|current|today|latest|who is|what is)\b/i.test(question)
      || Boolean(req.body.forceSearch);

    let usedSearch = false;
    let searchContext = '';

    if (wantSearch && searchHint) {
      const sq = await ensureQuota(school, planKey, 'search', { consume: true }, config);
      if (sq.ok) {
        const ws = await webSearch(question);
        if (ws.ok && ws.context) {
          searchContext = ws.context;
          usedSearch = true;
        }
      }
    }

    const aq = await ensureQuota(school, planKey, 'ai', { consume: true }, config);
    if (!aq.ok) {
      return res.status(429).json({ error: aq.error, code: aq.code, quota: publicQuota(school, config, planKey) });
    }

    if (!gatewayConfigured()) {
      return res.status(503).json({
        error: 'AI is not available right now. Please try again later.',
        code: 'AI_GATEWAY',
      });
    }

    const stats = await loadSchoolStats(schoolId);
    const model = usedSearch
      ? pickModel(config, 'search')
      : pickModel(config, 'general');

    const system =
      'You are Eve, a helpful assistant for Synapse EduCore school admins (Pakistan). ' +
      'You can chat about school data and general questions. ' +
      'Never claim you sent emails, WhatsApp, or changed database records — suggestions only. ' +
      'If web search results are provided, use them and cite briefly. If school stats are provided, prefer them for school questions.';

    let user = `School: ${school.schoolName}\nSchool stats JSON: ${JSON.stringify(stats)}\n\nQuestion: ${question}`;
    if (searchContext) {
      user += `\n\nWeb search results:\n${searchContext}`;
    }

    const result = await chatCompletion({ system, user, maxTokens: 700, model });

    res.json({
      answer: result?.text || 'No response from AI.',
      model: result?.model || model,
      usedSearch,
      quota: publicQuota(school, config, planKey),
      disclaimer: 'Suggestion only — review before acting.',
    });
  } catch (err) {
    console.error('[askAi]', err);
    res.status(500).json({ error: err.message || 'Ask AI failed.' });
  }
};

/** Public usage for dashboard banner */
exports.getAiUsage = async (req, res) => {
  try {
    const school = await School.findById(req.auth.schoolId);
    if (!school) return res.status(404).json({ error: 'School not found.' });
    const config = await getAiConfig();
    const planKey = effectivePlanKey(school.plan);
    res.json({
      quota: publicQuota(school, config, planKey),
      killSwitch: Boolean(config.killSwitch),
      webSearchEnabled: Boolean(config.webSearchEnabled),
      plan: planKey,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
