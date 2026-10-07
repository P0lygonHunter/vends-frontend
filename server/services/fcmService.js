/**
 * Firebase Cloud Messaging (web push) — Phase 5B
 * Env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */
let admin = null;
let initTried = false;
let initError = null;

function getAdmin() {
  if (initTried) return admin;
  initTried = true;
  try {
    const projectId = (process.env.FIREBASE_PROJECT_ID || '').trim();
    const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
    if (!projectId || !clientEmail || !privateKey) {
      initError = 'missing_env';
      console.warn('[FCM] Not configured — set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
      return null;
    }
    privateKey = privateKey.trim();
    if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');
    if (!privateKey.includes('BEGIN PRIVATE KEY')) {
      initError = 'private_key_format';
      console.error('[FCM] PRIVATE_KEY does not look like a PEM key');
      return null;
    }
    admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
    console.log('[FCM] firebase-admin initialized for', projectId);
  } catch (err) {
    initError = err.message;
    console.error('[FCM] init failed:', err.message);
    admin = null;
  }
  return admin;
}

function getStatus() {
  const configured = !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
  const fb = getAdmin();
  return {
    envPresent: configured,
    adminReady: !!fb,
    initError: initError || null,
  };
}

async function pruneTokens(doc, badTokens) {
  if (!doc || !badTokens?.length) return;
  doc.fcmTokens = (doc.fcmTokens || []).filter((t) => !badTokens.includes(t));
  await doc.save().catch(() => {});
}

const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'https://vends-frontend.vercel.app';

async function sendToTokens(tokens, { title, body, data = {} }) {
  const fb = getAdmin();
  if (!fb) {
    console.warn('[FCM] send skipped — admin not ready', initError);
    return { sent: 0, failed: 0, invalid: [], skipped: true };
  }
  const list = [...new Set((tokens || []).filter(Boolean))];
  if (!list.length) {
    console.warn('[FCM] send skipped — no tokens');
    return { sent: 0, failed: 0, invalid: [] };
  }

  let sent = 0;
  let failed = 0;
  const invalid = [];
  const icon = `${FRONTEND_ORIGIN}/pwa-icon-192.png`;

  for (let i = 0; i < list.length; i += 500) {
    const batch = list.slice(i, i + 500);
    try {
      const res = await fb.messaging().sendEachForMulticast({
        tokens: batch,
        notification: {
          title: String(title || 'V-Community').slice(0, 100),
          body: String(body || '').slice(0, 250),
        },
        data: Object.fromEntries(
          Object.entries(data || {}).map(([k, v]) => [String(k), String(v ?? '')])
        ),
        webpush: {
          headers: { Urgency: 'high' },
          notification: {
            icon,
            badge: icon,
          },
          fcmOptions: {
            link: data.link && String(data.link).startsWith('http')
              ? data.link
              : `${FRONTEND_ORIGIN}${data.link || '/open'}`,
          },
        },
      });
      sent += res.successCount;
      failed += res.failureCount;
      res.responses.forEach((r, idx) => {
        if (!r.success) {
          const code = r.error?.code || '';
          console.warn('[FCM] token fail', code, r.error?.message);
          if (
            code.includes('registration-token-not-registered') ||
            code.includes('invalid-registration-token') ||
            code.includes('invalid-argument')
          ) {
            invalid.push(batch[idx]);
          }
        }
      });
    } catch (err) {
      console.error('[FCM] sendEachForMulticast error:', err.message);
      failed += batch.length;
    }
  }

  console.log('[FCM] send result', { sent, failed, invalid: invalid.length });
  return { sent, failed, invalid };
}

async function addTokenToDoc(Model, id, token) {
  if (!token || !id) return;
  await Model.findByIdAndUpdate(id, { $addToSet: { fcmTokens: String(token).slice(0, 4096) } });
}

async function removeTokenFromDoc(Model, id, token) {
  if (!token || !id) return;
  await Model.findByIdAndUpdate(id, { $pull: { fcmTokens: String(token) } });
}

module.exports = {
  getAdmin,
  getStatus,
  sendToTokens,
  pruneTokens,
  addTokenToDoc,
  removeTokenFromDoc,
};
