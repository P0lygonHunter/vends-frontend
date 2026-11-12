const mongoose = require('mongoose');
const School = require('../models/School');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const FeeRecord = require('../models/FeeRecord');
const StudentMark = require('../models/StudentMark');
const { effectivePlanKey, planAllows } = require('../config/moduleAccess');
const { gatewayConfigured, chatCompletion, webSearch, providersStatus } = require('../services/aiGateway');
const { getAiConfig, quotasForPlan, pickModel, resolveProvider } = require('../services/aiConfigService');
const { ensureTokenBag, estimateFromText, tokenBagLimit } = require('../services/aiTokenBag');

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
  if (school.insightsUsageDate !== today) {
    school.insightsUsageDate = today;
    school.insightsUsageCount = 0;
  }
}

/**
 * @param {'ai'|'search'} type
 * @param {{ consume: boolean }} opts
 */
async function ensureQuota(school, planKey, type, { consume }, config) {
  const quotas = quotasForPlan(config, planKey, school);
  const today = utcDateKey();
  resetCountersIfNeeded(school, today);

  let limit;
  let used;
  if (type === 'search') {
    limit = quotas.dailySearchQuota;
    used = Number(school.searchUsageCount) || 0;
  } else if (type === 'insights') {
    limit = quotas.dailyInsightsQuota;
    used = Number(school.insightsUsageCount) || 0;
  } else {
    limit = quotas.dailyAskQuota > 0 ? quotas.dailyAskQuota : quotas.dailyAiQuota;
    used = Number(school.aiUsageCount) || 0;
  }

  if (limit <= 0) {
    return {
      ok: false,
      code: 'AI_PLAN',
      error: type === 'search'
        ? 'Web search is not included on your plan.'
        : type === 'insights'
          ? 'AI Insights is not included on your plan.'
          : 'Ask AI is not included on your plan.',
      limit: 0,
      used,
    };
  }

  if (consume) {
    if (used >= limit) {
      return {
        ok: false,
        code: 'AI_LIMIT',
        error: 'Daily AI limit exceeded. Upgrade your plan or try again tomorrow.',
        limit,
        used,
      };
    }
    if (type === 'search') school.searchUsageCount = used + 1;
    else if (type === 'insights') school.insightsUsageCount = used + 1;
    else school.aiUsageCount = used + 1;
    await school.save();
  }

  const usedNow =
    type === 'search' ? Number(school.searchUsageCount) || 0
      : type === 'insights' ? Number(school.insightsUsageCount) || 0
        : Number(school.aiUsageCount) || 0;

  return { ok: true, limit, used: usedNow, quotas };
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
      cta: 'Open AI Actions',
      href: '/ai-actions?focus=absence',
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
      cta: stats.absentToday > 0 ? 'Open AI Actions' : 'Mark attendance',
      href: stats.absentToday > 0 ? '/ai-actions?focus=absence' : '/attendance',
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
    cta: pkr > 0 ? 'Send reminders' : 'View fees',
    href: pkr > 0 ? '/ai-actions?focus=fee' : '/fees',
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
  if (config.killSwitch) {
    return { cards, source: 'rules', model: null };
  }
  const _ps = providersStatus();
  if (!_ps.gateway && !_ps.groq && !_ps.gemini) {
    return { cards, source: 'rules', model: null };
  }
  try {
    const meta = pickModel(config, 'insights');
    const provider = resolveProvider(config, 'insights', meta);
    const system =
      'You are an education analytics assistant for a school ERP in Pakistan. ' +
      'Given JSON stats and draft insight cards, return ONLY a JSON array of 3 objects with keys: ' +
      'id, type, title, badge, body, cta, href, tone. Keep body under 140 characters. Be factual. No markdown.';
    const user = JSON.stringify({ schoolName, stats, draftCards: cards.slice(0, 3) });
    const result = await chatCompletion({
      system, user, maxTokens: 700,
      model: meta.modelId, provider,
      fallbackModel: config.searchFallbackModelId || 'openai/gpt-4o-mini',
      fallbackProvider: config.fallbackProvider || 'gateway',
    });
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
    const cleaned = parsed.slice(0, 3).map((c, i) => {
      const id = String(c.id || cards[i]?.id || `c${i}`);
      const type = String(c.type || cards[i]?.type || 'info');
      let href = String(c.href || cards[i]?.href || '/dashboard').slice(0, 80);
      let cta = String(c.cta || cards[i]?.cta || 'Open').slice(0, 24);
      if (id === 'fees' || type === 'fees') {
        if (href === '/fees' || /remind|send/i.test(cta)) {
          href = '/ai-actions?focus=fee';
          cta = /view/i.test(cta) ? cta : 'Send reminders';
        }
      }
      if ((id === 'attendance' || type === 'attendance') && (cards[i]?.href || '').includes('ai-actions')) {
        href = '/ai-actions?focus=absence';
        cta = 'Open AI Actions';
      }
      return {
        id, type,
        title: String(c.title || 'Insight').slice(0, 40),
        badge: String(c.badge || '').slice(0, 24),
        body: String(c.body || '').slice(0, 180),
        cta, href,
        tone: ['warn', 'ok', 'info'].includes(c.tone) ? c.tone : 'info',
      };
    });
    return { cards: cleaned, source: 'ai', model: result.model };
  } catch (err) {
    console.error('[aiInsights polish]', err.message);
    return { cards, source: 'rules', model: null };
  }
}

function publicQuota(school, config, planKey) {
  const quotas = quotasForPlan(config, planKey, school);
  const today = utcDateKey();
  const aiUsed = school.aiUsageDate === today ? Number(school.aiUsageCount) || 0 : 0;
  const insightsUsed = school.insightsUsageDate === today ? Number(school.insightsUsageCount) || 0 : 0;
  const searchUsed = school.searchUsageDate === today ? Number(school.searchUsageCount) || 0 : 0;
  const bagUsed = school.aiTokenBagDate === today ? Number(school.aiTokenBagUsed) || 0 : 0;
  const bagLimit = tokenBagLimit(config, school);
  return {
    tokenBag: { used: bagUsed, limit: bagLimit },
    ai: { used: aiUsed, limit: quotas.dailyAskQuota || quotas.dailyAiQuota },
    ask: { used: aiUsed, limit: quotas.dailyAskQuota || quotas.dailyAiQuota },
    insights: { used: insightsUsed, limit: quotas.dailyInsightsQuota },
    search: { used: searchUsed, limit: quotas.dailySearchQuota },
    limit: quotas.dailyAskQuota || quotas.dailyAiQuota,
    dailyAiQuota: quotas.dailyAiQuota,
    dailyAskQuota: quotas.dailyAskQuota,
    dailyInsightsQuota: quotas.dailyInsightsQuota,
    dailySearchQuota: quotas.dailySearchQuota,
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

    const q = await ensureQuota(school, planKey, 'insights', { consume: true }, config);
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
    let polished = { cards: draft, source: 'rules', model: null };
    const polishEstimate = 900;
    const bag = await ensureTokenBag(school, config, { estimate: polishEstimate, consume: false });
    if (bag.ok) {
      polished = await maybePolishWithAi(draft, stats, school.schoolName, config);
      if (polished.source === 'ai') {
        await ensureTokenBag(school, config, { estimate: polishEstimate, consume: true });
      }
    }

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
    const quotas = quotasForPlan(config, planKey, school);
    if ((quotas.dailyAskQuota || quotas.dailyAiQuota) <= 0) {
      return res.status(403).json({
        error: 'Ask AI is not available on your plan.',
        code: 'AI_PLAN',
        locked: true,
      });
    }

    const question = String(req.body.question || '').trim().slice(0, 800);
    if (!question) return res.status(400).json({ error: 'Question is required.' });

    const wantSearch = Boolean(req.body.webSearch !== false && config.webSearchEnabled);
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

    const aq = await ensureQuota(school, planKey, 'ask', { consume: true }, config);
    if (!aq.ok) {
      return res.status(429).json({ error: aq.error, code: aq.code, quota: publicQuota(school, config, planKey) });
    }

    const status = providersStatus();
    if (!status.gateway && !status.groq && !status.gemini) {
      return res.status(503).json({
        error: 'AI is not available right now. Please try again later.',
        code: 'AI_GATEWAY',
      });
    }

    const stats = await loadSchoolStats(schoolId);
    const role = usedSearch ? 'search' : 'ask';
    const meta = pickModel(config, role);
    const provider = resolveProvider(config, role, meta);

    const system =
      'You are Eve, assistant for Synapse EduCore school admins (Pakistan). ' +
      'Answer from school stats when relevant (students, teachers, absent today, pending fees). ' +
      'Never claim you already sent messages or changed records. ' +
      'If the admin wants reminders/notices sent, tell them to use the action buttons or AI Actions to create Pending drafts, then Approve. ' +
      'Web search results: use and cite briefly when provided.';

    let user = `School: ${school.schoolName}\nSchool stats JSON: ${JSON.stringify(stats)}\n\nQuestion: ${question}`;
    if (searchContext) {
      user += `\n\nWeb search results:\n${searchContext}`;
    }

    const est = estimateFromText(system, user, 500);
    const bagAsk = await ensureTokenBag(school, config, { estimate: est, consume: true });
    if (!bagAsk.ok) {
      return res.status(429).json({ error: bagAsk.error, code: bagAsk.code, quota: publicQuota(school, config, planKey) });
    }

    const result = await chatCompletion({
      system, user, maxTokens: 700,
      model: meta.modelId, provider,
      fallbackModel: config.searchFallbackModelId || 'openai/gpt-4o-mini',
      fallbackProvider: config.fallbackProvider || 'gateway',
    });

    const answer = result?.text || 'No response from AI.';
    const suggestedActions = detectAskActions(question, stats);
    res.json({
      answer,
      model: result?.model || meta.modelId,
      usedSearch,
      suggestedActions,
      quota: publicQuota(school, config, planKey),
      disclaimer: 'Suggestion only — messages are never sent without your Approve in AI Actions.',
    });
  } catch (err) {
    console.error('[askAi]', err);
    res.status(500).json({ error: err.message || 'Ask AI failed.' });
  }
};

function detectAskActions(question, stats) {
  const q = String(question || '').toLowerCase();
  const actions = [];
  if (/fee|fees|pending|overdue|balance|reminder|remind/.test(q) && (stats?.pendingFeeCount > 0 || /send|bhej|remind/.test(q))) {
    actions.push({
      id: 'generate_fee_drafts',
      label: 'Create fee reminder drafts',
      description: 'Opens queue as Pending — you Approve & send',
    });
  }
  if (/absent|absence|attendance|haziri/.test(q) && (stats?.absentToday > 0 || /send|notice|bhej|remind/.test(q))) {
    actions.push({
      id: 'generate_absence_drafts',
      label: 'Create today absence drafts',
      description: 'Parent notices for students marked absent today',
    });
  }
  if (/teacher|teachers|timetable|schedule|announcement|event|notice/.test(q) && /send|msg|message|announce|bhej|draft/.test(q)) {
    actions.push({
      id: 'draft_teacher_or_event',
      label: 'Draft teacher / event message',
      description: 'Create a pending draft — edit then Approve in AI Actions',
    });
  }
  if (!actions.length && /remind|bhej|send message|send msg/.test(q)) {
    actions.push({ id: 'generate_fee_drafts', label: 'Create fee reminder drafts', description: 'If fees are pending' });
    actions.push({ id: 'generate_absence_drafts', label: 'Create absence drafts', description: 'If absences marked today' });
  }
  return actions.slice(0, 4);
}


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
