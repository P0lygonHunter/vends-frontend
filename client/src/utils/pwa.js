/**
 * PWA helpers.
 * IMPORTANT: manifest link MUST be same-origin as the page.
 * Cross-origin manifest (e.g. vends-backend.vercel.app) → Chrome: "This app cannot be installed."
 */
export function applyPwaManifest(/* schoolId ignored for installability */) {
  if (typeof document === 'undefined') return
  let link = document.querySelector('link[rel="manifest"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'manifest'
    document.head.appendChild(link)
  }
  // Always same-origin static manifest (Starter V logo for all installs on this domain)
  link.href = '/manifest.webmanifest'
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch {
    return null
  }
}
