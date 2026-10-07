import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Phase 5A/5B — one SW: FCM messaging SW when configured, else shell SW
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const hasFirebase = !!(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID)
    const swUrl = hasFirebase ? '/firebase-messaging-sw.js' : '/sw.js'
    navigator.serviceWorker.register(swUrl).catch(() => {})
  })
}
