const pool = require('../../config/database');

/** GET /api/user/notifications - list notifications for current user */
async function list(req, res) {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT id, order_id, message, read_at, created_at
       FROM user_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('Notifications list error:', err);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
}

/** PATCH /api/user/notifications/:id/read - mark as read */
async function markRead(req, res) {
  try {
    const userId = req.user.id;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid notification id' });
    const result = await pool.query(
      `UPDATE user_notifications SET read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to update' });
  }
}

module.exports = { list, markRead };
