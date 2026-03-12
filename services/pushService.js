const webpush = require('web-push');
const pool = require('../config/database');

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:support@fitchef.fit', VAPID_PUBLIC, VAPID_PRIVATE);
}

async function sendPushToRole(role, { title = 'FitChef', body = '', tag, data = {} }) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  try {
    const r = await pool.query(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE role = $1',
      [role]
    );
    const payload = JSON.stringify({ title, body, tag, ...data });
    await Promise.all(
      r.rows.map((row) =>
        webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          payload,
          { TTL: 86400 }
        ).catch((err) => {
          if (err.statusCode === 404 || err.statusCode === 410) {
            pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [row.endpoint]).catch(() => {});
          }
        })
      )
    );
  } catch (err) {
    console.error('Push sendToRole error:', err.message);
  }
}

async function sendPush(role, roleUserId, { title = 'FitChef', body = '', tag, data = {} }) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  try {
    const r = await pool.query(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE role = $1 AND role_user_id = $2',
      [role, roleUserId]
    );
    const payload = JSON.stringify({ title, body, tag, ...data });
    await Promise.all(
      r.rows.map((row) =>
        webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          payload,
          { TTL: 86400 }
        ).catch((err) => {
          if (err.statusCode === 404 || err.statusCode === 410) {
            pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [row.endpoint]).catch(() => {});
          }
        })
      )
    );
  } catch (err) {
    console.error('Push send error:', err.message);
  }
}

function getVapidPublic() {
  return VAPID_PUBLIC || null;
}

module.exports = { sendPush, sendPushToRole, getVapidPublic };
