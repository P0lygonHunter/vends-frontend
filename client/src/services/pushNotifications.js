import axios from 'axios'
import API_BASE_URL from '../config/api'
import { isFirebaseConfigured, requestFcmToken } from './firebaseApp'

/**
 * role: 'parent' | 'teacher' | 'school'
 * Registers FCM token with backend once per browser (localStorage flag soft).
 */
export async function enablePushForRole(role) {
  if (typeof window === 'undefined') return { ok: false, reason: 'ssr' }
  if (!isFirebaseConfigured()) return { ok: false, reason: 'not_configured' }
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
    return { ok: true, token }
  } catch (err) {
    console.warn('[FCM] register failed:', err?.response?.data || err.message)
    return { ok: false, reason: 'api_error' }
  }
}

/** Soft prompt once after login — does not force if previously denied. */
export function schedulePushPrompt(role, delayMs = 2500) {
  try {
    if (localStorage.getItem('fcmPromptDone') === '1') return
    if (Notification.permission === 'denied') return
  } catch (_) {
    return
  }
  setTimeout(async () => {
    const res = await enablePushForRole(role)
    if (res.ok || res.reason === 'denied_or_failed') {
      try {
        localStorage.setItem('fcmPromptDone', '1')
      } catch (_) {}
    }
  }, delayMs)
}
