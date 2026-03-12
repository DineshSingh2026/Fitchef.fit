const pool = require('../config/database');
const pushService = require('../services/pushService');

/** POST /api/push/subscribe - store push subscription (called after Notification.requestPermission) */
async function subscribe(req, res) {
  try {
    const role = req.user.role;
    const roleUserId = req.user.id;
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }
    await pool.query(
      'INSERT INTO push_subscriptions (role, role_user_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4, $5)',
      [role, roleUserId, endpoint, keys.p256dh, keys.auth]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Push subscribe error:', err);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
}

/** GET /api/push/vapid-public - return VAPID public key for client */
function getVapidPublic(req, res) {
  const key = pushService.getVapidPublic();
  if (!key) return res.status(503).json({ error: 'Push not configured' });
  res.json({ vapidPublicKey: key });
}

module.exports = { subscribe, getVapidPublic };
