const School = require('../models/School');
const StudentDocument = require('../models/StudentDocument');
const FeePayment = require('../models/FeePayment');
const Message = require('../models/Message');

const DEFAULT_INCLUDED = 350 * 1024 * 1024;

function byteLenOfString(s) {
  if (!s) return 0;
  try { return Buffer.byteLength(String(s), 'utf8'); }
  catch { return String(s).length; }
}

function effectiveQuota(school) {
  const included = Math.max(0, Number(school.storageIncludedBytes) || DEFAULT_INCLUDED);
  const addon = Math.max(0, Number(school.storageAddonBytes) || 0);
  return { included, addon, total: included + addon };
}

async function recalculateUsedBytes(schoolId) {
  const [docs, fees, messages, school] = await Promise.all([
    StudentDocument.find({ schoolId }).select('size fileData fileName mimeType category name createdAt studentId').lean(),
    FeePayment.find({ schoolId }).select('screenshot amount method createdAt receiptNumber').lean().catch(() => []),
    Message.find({ schoolId, mediaType: { $in: ['image', 'audio'] } })
      .select('mediaType mediaData text createdAt conversationId senderType').lean(),
    School.findById(schoolId).select('brandLogo storageIncludedBytes storageAddonBytes storageQuotaBytes').lean(),
  ]);

  let used = 0;
  const files = [];

  for (const d of docs || []) {
    const size = Number(d.size) > 0 ? Number(d.size) : byteLenOfString(d.fileData);
    used += size;
    files.push({
      id: String(d._id), kind: 'document', name: d.name || d.fileName || 'Document',
      category: d.category || 'Document', sizeBytes: size, createdAt: d.createdAt,
      ref: { studentId: d.studentId },
    });
  }
  for (const f of fees || []) {
    const size = byteLenOfString(f.screenshot);
    if (size <= 0) continue;
    used += size;
    files.push({
      id: String(f._id), kind: 'fee_screenshot', name: `Fee receipt ${f.receiptNumber || ''}`.trim(),
      category: 'Fee screenshot', sizeBytes: size, createdAt: f.createdAt, ref: {},
    });
  }
  for (const m of messages || []) {
    const size = byteLenOfString(m.mediaData);
    if (size <= 0) continue;
    used += size;
    files.push({
      id: String(m._id), kind: 'chat_media',
      name: m.mediaType === 'audio' ? 'Voice note' : 'Chat photo',
      category: m.mediaType === 'audio' ? 'Chat audio' : 'Chat image',
      sizeBytes: size, createdAt: m.createdAt,
      ref: { conversationId: m.conversationId, senderType: m.senderType },
    });
  }
  if (school?.brandLogo) {
    const size = byteLenOfString(school.brandLogo);
    used += size;
    files.push({
      id: 'brand-logo', kind: 'brand_logo', name: 'School app icon',
      category: 'Branding', sizeBytes: size, createdAt: null, ref: {},
    });
  }

  const q = effectiveQuota(school || {});
  await School.findByIdAndUpdate(schoolId, {
    storageUsedBytes: used,
    storageUsedUpdatedAt: new Date(),
    storageQuotaBytes: q.total,
    storageIncludedBytes: q.included,
    storageAddonBytes: q.addon,
  });
  files.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
  return { usedBytes: used, quotaBytes: q.total, includedBytes: q.included, addonBytes: q.addon, files };
}

async function assertCanUpload(schoolId, incomingBytes) {
  const school = await School.findById(schoolId);
  if (!school) {
    const err = new Error('School not found.');
    err.status = 404;
    throw err;
  }
  let used = Number(school.storageUsedBytes) || 0;
  const q = effectiveQuota(school);
  if (used === 0) {
    const snap = await recalculateUsedBytes(schoolId);
    used = snap.usedBytes;
  }
  const need = Math.max(0, Number(incomingBytes) || 0);
  if (used + need > q.total) {
    const mb = (n) => ((Number(n) || 0) / (1024 * 1024)).toFixed(1);
    const err = new Error(`Storage full. Used ${mb(used)} / ${mb(q.total)} MB. Free space or request more storage.`);
    err.status = 413;
    err.code = 'STORAGE_QUOTA';
    throw err;
  }
  return { school, usedBytes: used, quotaBytes: q.total };
}

async function addUsedBytes(schoolId, delta) {
  if (!delta) return;
  await School.findByIdAndUpdate(schoolId, {
    $inc: { storageUsedBytes: Math.max(0, delta) },
    storageUsedUpdatedAt: new Date(),
  });
}

async function subtractUsedBytes(schoolId, delta) {
  if (!delta) return;
  const school = await School.findById(schoolId).select('storageUsedBytes');
  if (!school) return;
  school.storageUsedBytes = Math.max(0, (Number(school.storageUsedBytes) || 0) - Math.max(0, delta));
  school.storageUsedUpdatedAt = new Date();
  await school.save();
}

async function setSchoolQuota(schoolId, { includedBytes, addonBytes }) {
  const school = await School.findById(schoolId);
  if (!school) {
    const err = new Error('School not found.');
    err.status = 404;
    throw err;
  }
  if (includedBytes != null) school.storageIncludedBytes = Math.max(0, Number(includedBytes));
  if (addonBytes != null) school.storageAddonBytes = Math.max(0, Number(addonBytes));
  const q = effectiveQuota(school);
  school.storageQuotaBytes = q.total;
  await school.save();
  return q;
}

async function grantAddonBytes(schoolId, extraBytes) {
  const add = Math.max(0, Number(extraBytes) || 0);
  const school = await School.findById(schoolId);
  if (!school) {
    const err = new Error('School not found.');
    err.status = 404;
    throw err;
  }
  school.storageAddonBytes = Math.max(0, Number(school.storageAddonBytes) || 0) + add;
  const q = effectiveQuota(school);
  school.storageQuotaBytes = q.total;
  await school.save();
  return q;
}

module.exports = {
  DEFAULT_INCLUDED, effectiveQuota, recalculateUsedBytes, assertCanUpload,
  addUsedBytes, subtractUsedBytes, setSchoolQuota, grantAddonBytes, byteLenOfString,
};
