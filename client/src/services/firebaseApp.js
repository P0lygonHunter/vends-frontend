import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let app = null
let messaging = null
let fgUnsub = null

export function isFirebaseConfigured() {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId && import.meta.env.VITE_FIREBASE_VAPID_KEY)
}

export async function getFirebaseMessaging() {
  if (!isFirebaseConfigured()) return null
  const ok = await isSupported().catch(() => false)
  if (!ok) return null
  if (!app) app = initializeApp(firebaseConfig)
  if (!messaging) messaging = getMessaging(app)
  return messaging
}

export async function requestFcmToken() {
  try {
    const messagingInstance = await getFirebaseMessaging()
    if (!messagingInstance) return null

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    let reg
    try {
      reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
    } catch (_) {
      reg = await navigator.serviceWorker.ready
    }
    await navigator.serviceWorker.ready

    const token = await getToken(messagingInstance, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: reg,
    })
    return token || null
  } catch (err) {
    console.warn('[FCM] requestFcmToken failed:', err?.message || err)
    return null
  }
}

export function listenForegroundMessages(handler) {
  getFirebaseMessaging().then((m) => {
    if (!m) return
    try {
      if (fgUnsub) fgUnsub()
    } catch (_) {}
    fgUnsub = onMessage(m, handler)
  })
}
