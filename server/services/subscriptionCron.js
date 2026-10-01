const School = require('../models/School');
const { getLifecycle, GRACE_DAYS, PURGE_DAYS } = require('../config/subscriptionLifecycle');

const COLLECTIONS = [
  'Student',
  'Teacher',
  'Attendance',
  'AcademicYear',
  'ClassSection',
  'Subject',
  'Examination',
  'StudentMark',
  'FeeRecord',
  'FeePayment',
  'TimetableEntry',
  'Assignment',
  'AssignmentSubmission',
  'StudentDocument',
  'JournalEntry',
  'ModuleRecord',
  'Parent',
  'Notification',
  'Conversation',
  'Message',
  'LoginLog',
];

function model(name) {
  try {
    return require(`../models/${name}`);
  } catch {
    return null;
  }
}

async function purgeSchoolData(schoolId) {
  const results = {};
  for (const name of COLLECTIONS) {
    const M = model(name);
    if (!M) continue;
    try {
      const r = await M.deleteMany({ schoolId });
      results[name] = r.deletedCount || 0;
    } catch (err) {
      results[name] = `error: ${err.message}`;
    }
  }
  return results;
}

/**
 * Run one lifecycle pass:
 * 1) Past grace → blocked=true
 * 2) Past purge days → delete operational data + mark purgedAt
 */
async function runSubscriptionLifecycle() {
  const now = new Date();
  const summary = { blocked: 0, purged: 0, errors: [] };

  const schools = await School.find({
    isActive: true,
    expiryDate: { $lt: now },
  }).select('_id schoolName adminEmail expiryDate blocked purgedAt plan');

  for (const school of schools) {
    try {
      const life = getLifecycle(school, now);

      if (life.pastGrace && !school.blocked) {
        school.blocked = true;
        school.blockedReason = `Subscription ended; grace period of ${GRACE_DAYS} days expired. Renew via support/CEO.`;
        await school.save();
        summary.blocked += 1;
      }

      if (life.shouldPurge) {
        const deleted = await purgeSchoolData(school._id);
        school.purgedAt = now;
        school.blocked = true;
        school.isActive = false;
        school.blockedReason =
          school.blockedReason ||
          `Data purged after ${PURGE_DAYS} days past expiry. Contact support to restore access after payment.`;
        school.markModified('blockedReason');
        await school.save();
        summary.purged += 1;
        summary[`purge_${school._id}`] = deleted;
      }
    } catch (err) {
      summary.errors.push({ schoolId: String(school._id), error: err.message });
    }
  }

  return summary;
}

module.exports = {
  runSubscriptionLifecycle,
  purgeSchoolData,
};
