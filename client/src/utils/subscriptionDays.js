/** Shared calendar-day remaining so Sidebar + TrialBadge never disagree. */
export function calendarDaysLeft(expiryDate) {
  if (!expiryDate) return 0
  const now = new Date()
  const exp = new Date(expiryDate)
  if (Number.isNaN(exp.getTime())) return 0

  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startExp = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate())
  const days = Math.round((startExp - startToday) / (1000 * 60 * 60 * 24))

  // Same calendar day but still before expiry time → show 1 day left (not 0)
  if (days === 0 && exp.getTime() > now.getTime()) return 1
  return days > 0 ? days : 0
}

export function planDisplayName(plan) {
  const map = {
    free_trial: 'Free Trial',
    starter: 'Starter',
    standard: 'Standard',
    premium: 'Premium',
    lite: 'Starter',
    zk: 'Premium',
  }
  return map[plan] || plan || 'Free Trial'
}
