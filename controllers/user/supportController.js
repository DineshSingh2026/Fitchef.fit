const pool = require('../../config/database');

async function create(req, res) {
  try {
    const userId = req.user.id;
    const { subject, message, priority } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }
    const pri = (priority && String(priority)) || 'Medium';
    const allowed = ['Low', 'Medium', 'High'];
    const priorityVal = allowed.includes(pri) ? pri : 'Medium';

    await pool.query(
      `INSERT INTO user_support_tickets (user_id, subject, message, priority, status)
       VALUES ($1, $2, $3, $4, 'Open')`,
      [userId, subject.trim().slice(0, 200), message.trim(), priorityVal]
    );
    res.status(201).json({ success: true, message: 'Support ticket submitted. We will get back to you soon.' });
  } catch (err) {
    console.error('Support ticket error:', err);
    res.status(500).json({ error: 'Failed to submit ticket' });
  }
}

module.exports = { create };
