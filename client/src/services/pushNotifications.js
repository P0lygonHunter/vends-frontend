import axios from 'axios'
import API_BASE_URL from '../config/api'
import { isFirebaseConfigured, requestFcmToken, listenForegroundMessages } from './firebaseApp'

function attachForegroundListener() {
  listenForegroundMessages((payload) => {
    // App is open — show one tray notification (tag prevents stack of duplicates)
    const title = payload.notification?.title || payload.data?.title || 'V-Community'
    const body = payload.notification?.body || payload.data?.body || 'New message'
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/pwa-icon-192.png',
          tag: payload.data?.tag || 'v-community',
          renotify: true,
        })
      } catch (_) {}
    }
  })
}

/**
 * role: 'parent' | 'teacher' | 'school'
 * Always requests a fresh FCM token and POSTs it to the backend (safe to call repeatedly).
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
  if (!token) {
    console.warn('[FCM] no token — permission denied or getToken failed')
    return { ok: false, reason: 'denied_or_failed' }
  }

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
    attachForegroundListener()
    console.log('[FCM] token registered for', role, token.slice(0, 12) + '…')
    return { ok: true, token }
  } catch (err) {
    console.warn('[FCM] register failed:', err?.response?.data || err.message)
    return { ok: false, reason: 'api_error', detail: err?.response?.data?.error || err.message }
  }
}

/**
 * After every login: always re-sync token to backend (reinstall / new device safe).
 */
export function schedulePushPrompt(role, delayMs = 2000) {
  try {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'denied') {
      console.warn('[FCM] Notification permission denied — user must enable in browser/site settings')
      return
    }
  } catch (_) {
    return
  }
  setTimeout(() => {
    enablePushForRole(role)
      .then((r) => {
        if (!r.ok) console.warn('[FCM] schedulePushPrompt result:', r)
      })
      .catch(() => {})
  }, delayMs)
}

/** Parent Settings / debug: live server token count */
export async function fetchParentFcmStatus() {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/parent/fcm-status`)
    return data
  } catch (err) {
    return {
      error: err?.response?.data?.error || err.message,
      hasToken: false,
      tokenCount: 0,
      server: null,
    }
  }
}
