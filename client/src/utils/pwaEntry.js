/**
 * Role-isolated PWA entry.
 * Invite link visits set role + schoolId; /open routes only that portal.
 */
const KEY = 'vendsPwaEntry'

export function setPwaEntry(role, schoolId = '') {
  try {
    const entry = {
      role: String(role || ''),
      schoolId: String(schoolId || ''),
      at: Date.now(),
    }
    localStorage.setItem(KEY, JSON.stringify(entry))
    if (schoolId) localStorage.setItem('lastCommunitySchoolId', String(schoolId))
  } catch (_) {}
}

export function getPwaEntry() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const e = JSON.parse(raw)
    if (!e || !e.role) return null
    return e
  } catch {
    return null
  }
}

export function clearPwaEntry() {
  try {
    localStorage.removeItem(KEY)
  } catch (_) {}
}
