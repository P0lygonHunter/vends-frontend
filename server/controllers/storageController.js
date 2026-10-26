const School = require('../models/School');
const StudentDocument = require('../models/StudentDocument');
const FeePayment = require('../models/FeePayment');
const Message = require('../models/Message');
const storage = require('../services/storageService');

exports.getStorageSummary = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const snap = await storage.recalculateUsedBytes(schoolId);
    const remaining = Math.max(0, snap.quotaBytes - snap.usedBytes);
    const pct = snap.quotaBytes > 0 ? Math.min(100, Math.round((snap.usedBytes / snap.quotaBytes) * 100)) : 0;
    const byCategory = {};
    for (const f of snap.files) {
      const k = f.category || f.kind;
      byCategory[k] = (byCategory[k] || 0) + (f.sizeBytes || 0);
    }
    res.json({
      includedBytes: snap.includedBytes,
      addonBytes: snap.addonBytes,
      quotaBytes: snap.quotaBytes,
      usedBytes: snap.usedBytes,
      remainingBytes: remaining,
      usedPercent: pct,
      fileCount: snap.files.length,
      byCategory,
      note: 'Quota is additive: included + purchased add-ons.',
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Storage summary failed.' });
  }
};

exports.listStorageFiles = async (req, res) => {
  try {
    const snap = await storage.recalculateUsedBytes(req.auth.schoolId);
    res.json({
      files: snap.files,
      usedBytes: snap.usedBytes,
      quotaBytes: snap.quotaBytes,
      remainingBytes: Math.max(0, snap.quotaBytes - snap.usedBytes),
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'File list failed.' });
  }
};

exports.deleteStorageFile = async (req, res) => {
  try {
    const schoolId = String(req.auth.schoolId);
    const { kind, id } = req.body || {};
    if (!kind || !id) return res.status(400).json({ error: 'kind and id required.' });
    let freed = 0;

    if (kind === 'document') {
      const doc = await StudentDocument.findById(id).select('+fileData size schoolId');
      if (!doc || String(doc.schoolId) !== schoolId) return res.status(404).json({ error: 'Document not found.' });
      freed = Number(doc.size) > 0 ? Number(doc.size) : storage.byteLenOfString(doc.fileData);
      await StudentDocument.findByIdAndDelete(id);
    } else if (kind === 'fee_screenshot') {
      const pay = await FeePayment.findById(id);
      if (!pay || String(pay.schoolId) !== schoolId) return res.status(404).json({ error: 'Payment not found.' });
      freed = storage.byteLenOfString(pay.screenshot);
      pay.screenshot = '';
      await pay.save();
    } else if (kind === 'chat_media') {
      const msg = await Message.findById(id);
      if (!msg || String(msg.schoolId) !== schoolId) return res.status(404).json({ error: 'Message not found.' });
      freed = storage.byteLenOfString(msg.mediaData);
      msg.mediaData = '';
      msg.mediaType = 'none';
      if (!msg.text) msg.text = '[Attachment removed to free storage]';
      await msg.save();
    } else if (kind === 'brand_logo') {
      const school = await School.findById(schoolId);
      if (!school) return res.status(404).json({ error: 'School not found.' });
      freed = storage.byteLenOfString(school.brandLogo);
      school.brandLogo = '';
      await school.save();
    } else {
      return res.status(400).json({ error: 'Unknown file kind.' });
    }

    await storage.subtractUsedBytes(schoolId, freed);
    const snap = await storage.recalculateUsedBytes(schoolId);
    res.json({
      success: true, freedBytes: freed, usedBytes: snap.usedBytes,
      quotaBytes: snap.quotaBytes, remainingBytes: Math.max(0, snap.quotaBytes - snap.usedBytes),
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Delete failed.' });
  }
};
