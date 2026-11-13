const mongoose = require('mongoose');
const AiActionDraft = require('../models/AiActionDraft');
const School = require('../models/School');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const FeeRecord = require('../models/FeeRecord');
const { findOrCreateConversation, postMessage } = require('./chatController');
const { getAiConfig } = require('../services/aiConfigService');
const { ensureTokenBag, tokenBagLimit } = require('../services/aiTokenBag');
const { chatCompletion, providersStatus } = require('../services/aiGateway');
const { effectivePlanKey } = require('../config/moduleAccess');

const DEFAULT_GENERATES = { free_trial: 3, starter: 5, standard: 12, premium: 25 };

function utcDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function resetActionCounters(school, today) {
  if (school.aiActionUsageDate !== today) {
    school.aiActionUsageDate = today;
    school.aiActionGenerateCount = 0;
    school.aiActionTokensUsed = 0;
  }
}

function generateLimitForPlan(plan) {
  const key = plan === 'free_trial' || plan === 'trial' ? 'free_trial' : effectivePlanKey(plan);
  return DEFAULT_GENERATES[key] || DEFAULT_GENERATES.starter;
}


function fillTemplate(tpl, vars) {
  let s = String(tpl || '');
  Object.keys(vars).forEach((k) => {
    s = s.split('{{' + k + '}}').join(String(vars[k] ?? ''));
  });
  return s.trim();
}

const DEFAULT_TMPL = {
  absence: 'Assalam o alaikum. Attendance notice: {{studentName}}{{gradePart}} is marked absent on {{date}}. Please contact the school if this is unexpected. — School Admin',
  fee: 'Assalam o alaikum. Fee reminder for {{studentName}}{{gradePart}}: outstanding balance PKR {{balance}}{{feePart}}. Please arrange payment at your earliest. — School Admin',
  monthly: 'Assalam o alaikum. Monthly attendance report for {{studentName}}{{gradePart}}: Present {{present}}, Absent {{absent}}, Leave {{leave}}, days recorded {{total}}. — School Admin',
};

function schoolTmpl(school, key) {
  const t = school?.messageTemplates?.[key];
  return (t && String(t).trim()) ? String(t).trim() : DEFAULT_TMPL[key];
}

function templateAbsence(school, { studentName, grade, date }) {
  const gradePart = grade ? ` (Class ${grade})` : '';
  return fillTemplate(schoolTmpl(school, 'absence'), { studentName, grade, gradePart, date });
}

function templateFee(school, { studentName, grade, balance, feeType, month }) {
  const gradePart = grade ? ` Class ${grade}` : '';
  const feePart = feeType ? ` (${feeType}${month ? `, ${month}` : ''})` : '';
  return fillTemplate(schoolTmpl(school, 'fee'), {
    studentName, grade, gradePart,
    balance: Number(balance || 0).toLocaleString(),
    feeType: feeType || '', month: month || '', feePart,
  });
}

function templateMonthly(school, { studentName, grade, present, absent, leave, total }) {
  const gradePart = grade ? ` (Class ${grade})` : '';
  return fillTemplate(schoolTmpl(school, 'monthly'), {
    studentName, grade, gradePart, present, absent, leave, total,
  });
}

async function parentByStudent(schoolId, studentId) {
  return Parent.findOne({ schoolId, studentIds: studentId }).select('name phone studentIds');
}

async function buildAbsenceDrafts(school, schoolId, today) {
  const rows = await Attendance.find({ schoolId, date: today, status: 'A' }).lean();
  const drafts = [];
  for (const row of rows) {
    const parent = await parentByStudent(schoolId, row.studentId);
    if (!parent) {
      drafts.push({ skip: true, reason: 'no_parent', studentName: row.studentName, grade: row.grade });
      continue;
    }
    drafts.push({
      type: 'absence_today',
      studentId: row.studentId,
      studentName: row.studentName,
      grade: row.grade || '',
      classSectionId: row.classSectionId || null,
      parentId: parent._id,
      parentName: parent.name,
      parentPhone: parent.phone,
      body: templateAbsence(school, { studentName: row.studentName, grade: row.grade, date: today }),
      groupKey: `absence:${today}:${row.grade || 'unknown'}`,
      meta: { date: today, status: row.status },
      source: 'rules',
      tokensEstimate: 0,
    });
  }
  return drafts;
}

async function buildFeeDrafts(school, schoolId) {
  let list = await FeeRecord.find({ schoolId, balance: { $gt: 0 }, status: { $in: ['Pending', 'Overdue'] } }).limit(100).lean();
  if (!list.length) list = await FeeRecord.find({ schoolId, balance: { $gt: 0 } }).limit(100).lean();
  const drafts = [];
  for (const row of list) {
    const student = await Student.findById(row.studentId).select('name grade classSectionId').lean();
    const studentName = student?.name || 'Student';
    const grade = student?.grade || '';
    const parent = await parentByStudent(schoolId, row.studentId);
    if (!parent) {
      drafts.push({ skip: true, reason: 'no_parent', studentName, grade });
      continue;
    }
    drafts.push({
      type: 'fee_reminder',
      studentId: row.studentId,
      studentName,
      grade,
      classSectionId: row.classSectionId || student?.classSectionId || null,
      parentId: parent._id,
      parentName: parent.name,
      parentPhone: parent.phone,
      body: templateFee(school, { studentName, grade, balance: row.balance, feeType: row.feeType, month: row.month }),
      groupKey: `fee:${String(row._id)}`,
      meta: { balance: row.balance, feeType: row.feeType, month: row.month, feeRecordId: String(row._id) },
      source: 'rules',
      tokensEstimate: 0,
    });
  }
  return drafts;
}

async function buildMonthlyAttendanceDrafts(school, schoolId) {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-11 current month
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 0));
  const from = start.toISOString().slice(0, 10);
  const to = end.toISOString().slice(0, 10);

  const agg = await Attendance.aggregate([
    {
      $match: {
        schoolId: new mongoose.Types.ObjectId(String(schoolId)),
        date: { $gte: from, $lte: to },
      },
    },
    {
      $group: {
        _id: '$studentId',
        studentName: { $last: '$studentName' },
        grade: { $last: '$grade' },
        present: { $sum: { $cond: [{ $eq: ['$status', 'P'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$status', 'A'] }, 1, 0] } },
        leave: { $sum: { $cond: [{ $in: ['$status', ['L', 'Leave', 'leave']] }, 1, 0] } },
        total: { $sum: 1 },
      },
    },
  ]);

  const drafts = [];
  for (const row of agg) {
    const parent = await parentByStudent(schoolId, row._id);
    if (!parent) {
      drafts.push({ skip: true, reason: 'no_parent', studentName: row.studentName, grade: row.grade });
      continue;
    }
    drafts.push({
      type: 'monthly_attendance',
      studentId: row._id,
      studentName: row.studentName,
      grade: row.grade || '',
      parentId: parent._id,
      parentName: parent.name,
      parentPhone: parent.phone,
      body: templateMonthly(school, {
        studentName: row.studentName,
        grade: row.grade,
        present: row.present,
        absent: row.absent,
        leave: row.leave,
        total: row.total,
      }),
      groupKey: `monthly:${y}-${m + 1}:${row._id}`,
      meta: { from, to, present: row.present, absent: row.absent, leave: row.leave, total: row.total },
      source: 'rules',
      tokensEstimate: 0,
    });
  }
  return drafts;
}

async function polishBodiesWithAi(schoolName, items, config) {
  if (!items.length) return items;
  const status = providersStatus();
  if (!status.groq && !status.gateway && !status.gemini) return items;
  if (config.killSwitch) return items;
  const payload = items.slice(0, 15).map((d, i) => ({
    i, type: d.type, studentName: d.studentName, grade: d.grade, body: d.body,
  }));
  const system =
    'You polish short school-to-parent messages for Pakistan schools. Return ONLY JSON array of { "i": number, "body": string }. Max 280 chars each. Keep facts. No markdown.';
  try {
    const result = await chatCompletion({
      system,
      user: JSON.stringify({ schoolName, items: payload }),
      maxTokens: 1200,
      model: config.insightsModelId || config.generalModelId || 'allam-2-7b',
      provider: config.insightsProvider || 'groq',
      fallbackModel: config.searchFallbackModelId || 'openai/gpt-4o-mini',
      fallbackProvider: config.fallbackProvider || 'gateway',
    });
    const match = (result?.text || '').match(/\[[\s\S]*\]/);
    if (!match) return items;
    const arr = JSON.parse(match[0]);
    const map = new Map(arr.map((x) => [Number(x.i), String(x.body || '').trim().slice(0, 2000)]));
    return items.map((d, idx) => {
      const body = map.get(idx);
      return body ? { ...d, body, source: 'ai', tokensEstimate: Math.min(500, Math.ceil(body.length / 3)) } : d;
    });
  } catch (err) {
    console.error('[aiActions polish]', err.message);
    return items;
  }
}

async function sendDraftInternal(doc, schoolId) {
  const isTeacher = doc.type === 'teacher_message' || doc.targetAudience === 'teacher' || doc.teacherId;
  if (isTeacher) {
    if (!doc.teacherId) throw new Error('No teacher linked');
    const conversation = await findOrCreateConversation(schoolId, 'teacher', doc.teacherId);
    const message = await postMessage(conversation, 'admin', { text: doc.body });
    doc.status = 'sent';
    doc.sentAt = new Date();
    doc.approvedAt = doc.approvedAt || new Date();
    doc.conversationId = conversation._id;
    doc.sentMessageId = message._id;
    doc.error = '';
    await doc.save();
    return doc;
  }
  if (!doc.parentId) throw new Error('No parent linked');
  const conversation = await findOrCreateConversation(schoolId, 'parent', doc.parentId);
  const message = await postMessage(conversation, 'admin', { text: doc.body });
  doc.status = 'sent';
  doc.sentAt = new Date();
  doc.approvedAt = doc.approvedAt || new Date();
  doc.conversationId = conversation._id;
  doc.sentMessageId = message._id;
  doc.error = '';
  await doc.save();
  return doc;
}

exports.generateActions = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ error: 'School not found' });

    const today = utcDateKey();
    resetActionCounters(school, today);
    const genLimit = generateLimitForPlan(school.plan);
    if (school.aiActionGenerateCount >= genLimit) {
      return res.status(429).json({
        error: `Daily AI Actions generate limit reached (${genLimit}).`,
        code: 'ACTION_GENERATE_LIMIT',
        used: school.aiActionGenerateCount,
        limit: genLimit,
      });
    }

    const types = Array.isArray(req.body?.types) && req.body.types.length
      ? req.body.types
      : ['absence_today', 'fee_reminder'];
    const useAi = Boolean(req.body?.useAi);

    let raw = [];
    if (types.includes('absence_today')) raw = raw.concat(await buildAbsenceDrafts(school, schoolId, today));
    if (types.includes('fee_reminder')) raw = raw.concat(await buildFeeDrafts(school, schoolId));
    if (types.includes('monthly_attendance')) raw = raw.concat(await buildMonthlyAttendanceDrafts(school, schoolId));

    const skipped = raw.filter((d) => d.skip);
    let candidates = raw.filter((d) => !d.skip);

    const existing = await AiActionDraft.find({
      schoolId,
      status: 'pending',
      createdAt: { $gte: new Date(today + 'T00:00:00.000Z') },
    }).select('type studentId parentId groupKey').lean();
    const existKey = new Set(existing.map((e) => `${e.type}:${e.studentId}:${e.parentId}:${e.groupKey || ''}`));
    candidates = candidates.filter((d) => !existKey.has(`${d.type}:${d.studentId}:${d.parentId}:${d.groupKey || ''}`));

    let tokenDelta = 0;
    const planKey = effectivePlanKey(school.plan);
    const polishAllowed = planKey === 'standard' || planKey === 'premium';
    if (useAi && candidates.length && polishAllowed) {
      const config = await getAiConfig();
      const est = Math.min(2500, 200 + candidates.length * 120);
      const bag = await ensureTokenBag(school, config, { estimate: est, consume: false });
      if (bag.ok) {
        candidates = await polishBodiesWithAi(school.schoolName, candidates, config);
        if (candidates.some((c) => c.source === 'ai')) {
          tokenDelta = est;
          await ensureTokenBag(school, config, { estimate: est, consume: true });
        }
      }
    }

    const docs = await AiActionDraft.insertMany(candidates.map((d) => ({ ...d, schoolId, status: 'pending' })));

    let autoSent = 0;
    if (school.aiActionSettings?.autoApproveTemplates && !useAi) {
      for (const doc of docs) {
        try {
          await sendDraftInternal(doc, schoolId);
          autoSent += 1;
        } catch (e) {
          doc.status = 'failed';
          doc.error = e.message || 'send failed';
          await doc.save();
        }
      }
    }

    school.aiActionGenerateCount = (Number(school.aiActionGenerateCount) || 0) + 1;
    school.aiActionTokensUsed = (Number(school.aiActionTokensUsed) || 0) + tokenDelta;
    await school.save();

    res.json({
      message: 'AI Actions generated',
      created: docs.length,
      skipped: skipped.length,
      skippedSamples: skipped.slice(0, 10),
      autoSent,
      usage: {
        generates: school.aiActionGenerateCount,
        generateLimit: genLimit,
        tokensUsed: Number(school.aiTokenBagUsed) || 0,
        tokenBudget: tokenBagLimit(await getAiConfig(), school),
      },
    });
  } catch (err) {
    console.error('[generateActions]', err);
    res.status(500).json({ error: err.message || 'Generate failed' });
  }
};

exports.listActions = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const status = req.query.status || 'pending';
    const filter = { schoolId };
    if (status !== 'all') filter.status = status;
    const list = await AiActionDraft.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    const school = await School.findById(schoolId).select('aiActionUsageDate aiActionGenerateCount aiActionTokensUsed aiTokenBagDate aiTokenBagUsed plan aiActionSettings messageTemplates');
    const today = utcDateKey();
    res.json({
      actions: list,
      usage: {
        generates: school?.aiActionUsageDate === today ? school.aiActionGenerateCount : 0,
        generateLimit: generateLimitForPlan(school?.plan),
        tokensUsed: school?.aiTokenBagDate === today ? school.aiTokenBagUsed : 0,
        tokenBudget: tokenBagLimit(await getAiConfig(), school),
      },
      settings: school?.aiActionSettings || {},
      templates: school?.messageTemplates || {},
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateAction = async (req, res) => {
  try {
    const doc = await AiActionDraft.findOne({ _id: req.params.id, schoolId: req.auth.schoolId });
    if (!doc) return res.status(404).json({ error: 'Draft not found' });
    if (doc.status !== 'pending') return res.status(400).json({ error: 'Only pending drafts can be edited' });
    if (req.body.body != null) doc.body = String(req.body.body).trim().slice(0, 2000);
    await doc.save();
    res.json({ action: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approveAction = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const doc = await AiActionDraft.findOne({ _id: req.params.id, schoolId });
    if (!doc) return res.status(404).json({ error: 'Draft not found' });
    if (doc.status !== 'pending') return res.status(400).json({ error: 'Draft is not pending' });
    if (req.body.body != null) doc.body = String(req.body.body).trim().slice(0, 2000);
    doc.status = 'approved';
    doc.approvedAt = new Date();
    if (doc.type === 'event_notice') {
      doc.status = 'approved';
      doc.error = '';
      await doc.save();
      return res.json({
        message: 'Event notice approved (not auto-broadcast). Copy text into Communication Center if needed.',
        action: doc,
      });
    }
    try {
      await sendDraftInternal(doc, schoolId);
      res.json({ message: 'Approved and sent via SE Community', action: doc });
    } catch (e) {
      doc.status = 'failed';
      doc.error = e.message || 'Send failed';
      await doc.save();
      res.status(500).json({ error: doc.error, action: doc });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approveBulk = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    const results = { sent: 0, failed: 0, errors: [] };
    for (const id of ids.slice(0, 50)) {
      const doc = await AiActionDraft.findOne({ _id: id, schoolId, status: 'pending' });
      if (!doc) continue;
      try {
        doc.approvedAt = new Date();
        await sendDraftInternal(doc, schoolId);
        results.sent += 1;
      } catch (e) {
        doc.status = 'failed';
        doc.error = e.message || 'Send failed';
        await doc.save();
        results.failed += 1;
        results.errors.push({ id, error: doc.error });
      }
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rejectAction = async (req, res) => {
  try {
    const doc = await AiActionDraft.findOne({ _id: req.params.id, schoolId: req.auth.schoolId });
    if (!doc) return res.status(404).json({ error: 'Draft not found' });
    if (doc.status !== 'pending') return res.status(400).json({ error: 'Only pending can be rejected' });
    doc.status = 'rejected';
    doc.rejectedAt = new Date();
    await doc.save();
    res.json({ action: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateActionSettings = async (req, res) => {
  try {
    const school = await School.findById(req.auth.schoolId);
    if (!school) return res.status(404).json({ error: 'School not found' });
    const s = school.aiActionSettings || {};
    const body = req.body || {};
    if (typeof body.weeklyEnabled === 'boolean') s.weeklyEnabled = body.weeklyEnabled;
    if (body.weeklyDay != null) s.weeklyDay = Math.min(6, Math.max(0, Number(body.weeklyDay) || 1));
    if (body.weeklyHour != null) s.weeklyHour = Math.min(23, Math.max(0, Number(body.weeklyHour) || 9));
    if (typeof body.dailyAbsenceEnabled === 'boolean') s.dailyAbsenceEnabled = body.dailyAbsenceEnabled;
    if (body.dailyAbsenceHour != null) s.dailyAbsenceHour = Math.min(23, Math.max(0, Number(body.dailyAbsenceHour) || 9));
    if (typeof body.monthlyReportEnabled === 'boolean') s.monthlyReportEnabled = body.monthlyReportEnabled;
    if (body.monthlyReportDay != null) s.monthlyReportDay = Math.min(28, Math.max(1, Number(body.monthlyReportDay) || 1));
    if (body.monthlyReportHour != null) s.monthlyReportHour = Math.min(23, Math.max(0, Number(body.monthlyReportHour) || 10));
    if (typeof body.autoApproveTemplates === 'boolean') s.autoApproveTemplates = body.autoApproveTemplates;
    school.aiActionSettings = s;
    school.markModified('aiActionSettings');
    await school.save();
    res.json({ settings: school.aiActionSettings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.generateWeeklySummaries = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceStr = since.toISOString().slice(0, 10);
    const today = utcDateKey();
    const absents = await Attendance.aggregate([
      { $match: { schoolId: new mongoose.Types.ObjectId(String(schoolId)), status: 'A', date: { $gte: sinceStr, $lte: today } } },
      { $group: { _id: '$studentId', count: { $sum: 1 }, studentName: { $last: '$studentName' }, grade: { $last: '$grade' } } },
    ]);
    let created = 0;
    for (const row of absents) {
      const parent = await parentByStudent(schoolId, row._id);
      if (!parent) continue;
      const body =
        `Assalam o alaikum. Weekly attendance summary for ${row.studentName}` +
        (row.grade ? ` (Class ${row.grade})` : '') +
        `: marked absent on ${row.count} day(s) in the last 7 days. — School Admin`;
      await AiActionDraft.create({
        schoolId, type: 'weekly_summary', status: 'pending', studentId: row._id,
        studentName: row.studentName, grade: row.grade || '', parentId: parent._id,
        parentName: parent.name, parentPhone: parent.phone, body,
        groupKey: `weekly:${today}:${row._id}`, meta: { daysAbsent: row.count, from: sinceStr, to: today }, source: 'rules',
      });
      created += 1;
    }
    res.json({ message: 'Weekly summary drafts created (pending approval)', created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.generateMonthlyReports = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ error: 'School not found' });
    const raw = await buildMonthlyAttendanceDrafts(school, schoolId);
    const skipped = raw.filter((d) => d.skip);
    const candidates = raw.filter((d) => !d.skip);
    const docs = await AiActionDraft.insertMany(candidates.map((d) => ({ ...d, schoolId, status: 'pending' })));
    res.json({ message: 'Monthly attendance report drafts created (pending approval)', created: docs.length, skipped: skipped.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateMessageTemplates = async (req, res) => {
  try {
    const school = await School.findById(req.auth.schoolId);
    if (!school) return res.status(404).json({ error: 'School not found' });
    const body = req.body || {};
    const mt = school.messageTemplates || {};
    if (body.absence != null) mt.absence = String(body.absence).slice(0, 1500);
    if (body.fee != null) mt.fee = String(body.fee).slice(0, 1500);
    if (body.monthly != null) mt.monthly = String(body.monthly).slice(0, 1500);
    school.messageTemplates = mt;
    school.markModified('messageTemplates');
    await school.save();
    res.json({ templates: school.messageTemplates, message: 'Message templates saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/** Phase 3–4: Ask AI triggers draft creation only (never auto-send) */
exports.runAskAction = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ error: 'School not found' });
    const action = String(req.body.action || '');
    const text = String(req.body.text || '').trim().slice(0, 2000);
    const teacherId = req.body.teacherId || null;

    if (action === 'generate_fee_drafts') {
      req.body = { types: ['fee_reminder'], useAi: false };
      return exports.generateActions(req, res);
    }
    if (action === 'generate_absence_drafts') {
      req.body = { types: ['absence_today'], useAi: false };
      return exports.generateActions(req, res);
    }
    if (action === 'draft_teacher_message') {
      const bodyText = text || 'Assalam o alaikum. Please check the school notice and confirm with the office if needed. — School Admin';
      if (!teacherId) return res.status(400).json({ error: 'Select a teacher first.' });
      const teacher = await Teacher.findOne({ _id: teacherId, schoolId });
      if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
      const doc = await AiActionDraft.create({
        schoolId,
        type: 'teacher_message',
        status: 'pending',
        teacherId: teacher._id,
        teacherName: teacher.name || '',
        targetAudience: 'teacher',
        body: bodyText,
        groupKey: `teacher:${teacher._id}:${Date.now()}`,
        source: 'rules',
        meta: { fromAsk: true },
      });
      return res.json({
        message: `Teacher draft for ${teacher.name || 'teacher'} created (Pending). Open AI Actions → Approve & send.`,
        created: 1,
        draftIds: [doc._id],
        openPath: '/ai-actions',
      });
    }
    if (action === 'draft_event_notice') {
      const bodyText = text || 'School event / announcement — please see details with the office. — School Admin';
      const doc = await AiActionDraft.create({
        schoolId,
        type: 'event_notice',
        status: 'pending',
        targetAudience: 'event',
        body: bodyText,
        studentName: 'All / Event',
        groupKey: `event:${Date.now()}`,
        source: 'rules',
        meta: { fromAsk: true, note: 'Not mass-sent on approve. Use Communication Center for broadcast.' },
      });
      return res.json({
        message: 'Event notice draft saved (Pending). Edit in AI Actions; mass send via Communication Center if needed.',
        created: 1,
        draftIds: [doc._id],
        openPath: '/ai-actions',
      });
    }
    if (action === 'draft_teacher_or_event') {
      const bodyText = text || 'School notice — please check the details with the office. — School Admin';
      if (teacherId) {
        const teacher = await Teacher.findOne({ _id: teacherId, schoolId });
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
        const doc = await AiActionDraft.create({
          schoolId,
          type: 'teacher_message',
          status: 'pending',
          teacherId: teacher._id,
          teacherName: teacher.name || '',
          targetAudience: 'teacher',
          body: bodyText,
          groupKey: `teacher:${teacher._id}:${Date.now()}`,
          source: 'rules',
          meta: { fromAsk: true },
        });
        return res.json({
          message: 'Teacher message draft created (Pending). Approve in AI Actions to send.',
          created: 1,
          draftIds: [doc._id],
          openPath: '/ai-actions',
        });
      }
      // Event notice: one pending draft for admin to copy/broadcast after edit — not auto-sent to all
      const doc = await AiActionDraft.create({
        schoolId,
        type: 'event_notice',
        status: 'pending',
        targetAudience: 'event',
        body: bodyText,
        studentName: 'All / Event',
        groupKey: `event:${Date.now()}`,
        source: 'rules',
        meta: { fromAsk: true, note: 'Approve does not mass-send; use Communication Center broadcast after edit, or add recipients later.' },
      });
      return res.json({
        message: 'Event notice draft saved (Pending). Edit in AI Actions; mass send uses Communication Center until recipients are linked.',
        created: 1,
        draftIds: [doc._id],
        openPath: '/ai-actions',
      });
    }
    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('[runAskAction]', err);
    res.status(500).json({ error: err.message || 'Action failed' });
  }
};
