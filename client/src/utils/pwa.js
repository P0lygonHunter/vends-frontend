/**
 * PWA helpers — role-aware manifest so install "remembers" portal + school.
 * Parent/teacher install from invite link → start_url includes schoolId.
 * School admin install from website login → starts at school login, not community.
 */

const BASE_MANIFEST = {
  id: '/open',
  description: 'Synapse EduCore — school ERP and SE Community.',
  scope: '/',
  display: 'standalone',
  display_override: ['standalone', 'minimal-ui'],
  orientation: 'portrait-primary',
  background_color: '#0f172a',
  theme_color: '#0284c7',
  lang: 'en',
  dir: 'ltr',
  icons: [
    { src: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  prefer_related_applications: false,
  categories: ['education', 'business'],
}

let blobUrl = null

/**
 * @param {string} [schoolId]
 * @param {'admin'|'parent'|'teacher'|''} [role]
 */
export function applyPwaManifest(schoolId = '', role = '') {
  if (typeof document === 'undefined') return

  const sid = String(schoolId || '').trim()
  const r = String(role || '').toLowerCase()

  let start_url = '/open?source=pwa'
  let name = 'Synapse EduCore'
  let short_name = 'Synapse'
  let id = '/open'

  if ((r === 'parent' || r === 'teacher') && sid) {
    start_url = `/community/${encodeURIComponent(sid)}/login?role=${r}&source=pwa`
    name = r === 'teacher' ? 'SE Community (Teachers)' : 'SE Community (Parents)'
    short_name = 'SE Community'
    id = `/community/${sid}`
  } else if (r === 'admin') {
    start_url = '/open?source=pwa&role=admin'
    name = 'Synapse EduCore'
    short_name = 'EduCore'
    id = '/open-admin'
  }

  const manifest = {
    ...BASE_MANIFEST,
    id,
    name,
    short_name,
    start_url,
  }

  let link = document.querySelector('link[rel="manifest"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'manifest'
    document.head.appendChild(link)
  }

  try {
    if (blobUrl) URL.revokeObjectURL(blobUrl)
  } catch (_) {}

  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' })
  blobUrl = URL.createObjectURL(blob)
  link.href = blobUrl
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch {
    return null
  }
}

/** Parse schoolId from invite URL or raw id */
export function parseSchoolIdFromInput(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  try {
    if (s.includes('/community/')) {
      const m = s.match(/\/community\/([a-fA-F0-9]{24})/)
      if (m) return m[1]
    }
    if (/^[a-fA-F0-9]{24}$/.test(s)) return s
  } catch (_) {}
  return s
}
