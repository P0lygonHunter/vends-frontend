import axios from 'axios'
import API_BASE_URL from '../config/api'
import { isFirebaseConfigured, requestFcmToken, listenForegroundMessages } from './firebaseApp'

/**
 * role: 'parent' | 'teacher' | 'school'
 */
export async function enablePushForRole(role) {
  if (typeof window === 'undefined') return { ok: false, reason: 'ssr' }
  if (!isFirebaseConfigured()) {
    console.warn('[FCM] Firebase env not configured on frontend build')
    return { ok: false, reason: 'not_configured' }
  }
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return { ok: false, reason: 'unsupported' }
  }

  const token = await requestFcmToken()
  if (!token) return { ok: false, reason: 'denied_or_failed' }

  try {
    localStorage.setItem('fcmToken', token)
    if (role === 'parent') {
      await axios.post(`${API_BASE_URL}/parent/fcm-token`, { token })
    } else if (role === 'teacher') {
      await axios.post(`${API_BASE_URL}/teacher-portal/fcm-token`, { token })
    } else if (role === 'school') {
      await axios.post(`${API_BASE_URL}/school/fcm-token`, { token })
    }
    localStorage.setItem('fcmRegisteredRole', role)
    localStorage.setItem('fcmPromptDone', '1')
    // Show system notification when app is open (foreground)
    listenForegroundMessages((payload) => {
      const title = payload.notification?.title || payload.data?.title || 'V-Community'
      const body = payload.notification?.body || payload.data?.body || 'New message'
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, { body, icon: '/pwa-icon-192.png' })
        } catch (_) {}
      }
    })
    return { ok: true, token }
  } catch (err) {
    console.warn('[FCM] register failed:', err?.response?.data || err.message)
    return { ok: false, reason: 'api_error', detail: err?.response?.data?.error || err.message }
  }
}

/** Soft prompt once after login — retries if previous attempt failed. */
export function schedulePushPrompt(role, delayMs = 2500) {
  try {
    if (Notification.permission === 'denied') return
    // Only skip auto-prompt if we already successfully registered this role
    if (
      localStorage.getItem('fcmPromptDone') === '1' &&
      localStorage.getItem('fcmRegisteredRole') === role &&
      localStorage.getItem('fcmToken')
    ) {
      // Still attach foreground listener
      listenForegroundMessages((payload) => {
        const title = payload.notification?.title || 'V-Community'
        const body = payload.notification?.body || 'New message'
        if (Notification.permission === 'granted') {
          try {
            new Notification(title, { body, icon: '/pwa-icon-192.png' })
          } catch (_) {}
        }
      })
      return
    }
  } catch (_) {
    return
  }
  setTimeout(() => {
    enablePushForRole(role).catch(() => {})
  }, delayMs)
}
