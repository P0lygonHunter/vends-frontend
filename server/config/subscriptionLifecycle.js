/**
 * Subscription lifecycle after expiryDate:
 *  0 … GRACE_DAYS-1  → soft lock (read-only + renew modal), still can pay
 *  >= GRACE_DAYS     → hard block (blocked=true via cron)
 *  >= PURGE_DAYS     → delete ALL operational data (keep only school login shell:
 *                       adminEmail, password, schoolName, plan/expiry metadata for CEO)
 * Default: grace 7 days, purge on day 10 past expiry (3 days after grace ends).
 */
const GRACE_DAYS = Math.max(1, Number(process.env.SUBSCRIPTION_GRACE_DAYS) || 7);
const PURGE_DAYS = Math.max(GRACE_DAYS + 1, Number(process.env.SUBSCRIPTION_PURGE_DAYS) || 10);

function daysPastExpiry(expiryDate, now = new Date()) {
  if (!expiryDate) return 0;
  const exp = new Date(expiryDate);
  if (Number.isNaN(exp.getTime())) return 0;
  const ms = now.getTime() - exp.getTime();
  if (ms <= 0) return 0;
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function getLifecycle(school, now = new Date()) {
  const expiryDate = school?.expiryDate;
  const expired = Boolean(expiryDate && now > new Date(expiryDate));
  const past = daysPastExpiry(expiryDate, now);
  const inGrace = expired && past < GRACE_DAYS;
  const pastGrace = expired && past >= GRACE_DAYS;
  const shouldPurge = expired && past >= PURGE_DAYS && !school?.purgedAt;
  const graceDaysLeft = expired ? Math.max(0, GRACE_DAYS - past) : null;

  return {
    expired,
    inGrace,
    pastGrace,
    graceDaysLeft,
    daysPastExpiry: past,
    graceDays: GRACE_DAYS,
    purgeDays: PURGE_DAYS,
    shouldBlock: pastGrace && !school?.blocked,
    shouldPurge,
    softLock: expired && !pastGrace, // still in grace or just expired
  };
}

module.exports = {
  GRACE_DAYS,
  PURGE_DAYS,
  daysPastExpiry,
  getLifecycle,
};
