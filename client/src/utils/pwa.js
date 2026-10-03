import API_BASE_URL from '../config/api'

/** Point the document manifest at default or school-branded JSON. */
export function applyPwaManifest(schoolId) {
  if (typeof document === 'undefined') return
  let link = document.querySelector('link[rel="manifest"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'manifest'
    document.head.appendChild(link)
  }
  const base = API_BASE_URL.replace(/\/$/, '')
  if (schoolId) {
    link.href = `${base}/pwa/manifest/${schoolId}`
  } else {
    link.href = '/manifest.webmanifest'
  }
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch {
    return null
  }
}
