import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/**
 * PWA: always register a SW that has a fetch handler (Chrome installability).
 * Build writes the same shell into firebase-messaging-sw.js (+ FCM when env set).
 * Register on production; also register on localhost for QA.
 */
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const register = () => {
    const swUrl = '/firebase-messaging-sw.js'
    navigator.serviceWorker
      .register(swUrl, { scope: '/', updateViaCache: 'none' })
      .then((reg) => {
        try { reg.update() } catch (_) {}
      })
      .catch(() => {
        navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {})
      })
  }
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register)
}
