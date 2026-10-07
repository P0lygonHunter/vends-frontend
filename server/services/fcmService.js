/**
 * Firebase Cloud Messaging (web push) — Phase 5B
 * Requires env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */
let admin = null;
let initTried = false;

function getAdmin() {
  if (initTried) return admin;
  initTried = true;
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
    if (!projectId || !clientEmail || !privateKey) {
      console.warn('[FCM] Not configured — push disabled until FIREBASE_* env is set');
      return null;
    }
    // Vercel often stores newlines as \n
    privateKey = privateKey.replace(/\\n/g, '\n');
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
    console.log('[FCM] firebase-admin initialized');
  } catch (err) {
    console.error('[FCM] init failed:', err.message);
    admin = null;
  }
  return admin;
}

/** Remove invalid tokens from a document that has fcmTokens[] */
async function pruneTokens(doc, badTokens) {
  if (!doc || !badTokens?.length) return;
  doc.fcmTokens = (doc.fcmTokens || []).filter((t) => !badTokens.includes(t));
  await doc.save().catch(() => {});
}

/**
 * Send push to a list of FCM tokens.
 * @returns {{ sent: number, failed: number }}
 */
async function sendToTokens(tokens, { title, body, data = {} }) {
  const fb = getAdmin();
  if (!fb) return { sent: 0, failed: 0 };
  const list = [...new Set((tokens || []).filter(Boolean))];
  if (!list.length) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const invalid = [];

  // Send in batches of 500 (FCM limit)
  for (let i = 0; i < list.length; i += 500) {
    const batch = list.slice(i, i + 500);
    try {
      const res = await fb.messaging().sendEachForMulticast({
        tokens: batch,
        notification: { title: String(title || 'Vends').slice(0, 100), body: String(body || '').slice(0, 250) },
        data: Object.fromEntries(
          Object.entries(data || {}).map(([k, v]) => [String(k), String(v ?? '')])
        ),
        webpush: {
          notification: {
            icon: '/pwa-icon-192.png',
            badge: '/pwa-icon-192.png',
          },
          fcmOptions: {
            link: data.link || '/',
          },
        },
      });
      sent += res.successCount;
      failed += res.failureCount;
      res.responses.forEach((r, idx) => {
        if (!r.success) {
          const code = r.error?.code || '';
          if (
            code.includes('registration-token-not-registered') ||
            code.includes('invalid-registration-token')
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
  sendToTokens,
  pruneTokens,
  addTokenToDoc,
  removeTokenFromDoc,
};
