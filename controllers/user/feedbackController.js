const pool = require('../../config/database');

async function create(req, res) {
  try {
    const userId = req.user.id;
    const { order_id, overall_rating, food_rating, delivery_rating, recommend, comments } = req.body;

    if (!order_id) return res.status(400).json({ error: 'order_id is required' });
    const or = parseInt(overall_rating, 10);
    const fr = parseInt(food_rating, 10);
    const dr = parseInt(delivery_rating, 10);
    if (isNaN(or) || or < 1 || or > 5) return res.status(400).json({ error: 'Overall rating must be 1-5' });
    if (isNaN(fr) || fr < 1 || fr > 5) return res.status(400).json({ error: 'Food rating must be 1-5' });
    if (isNaN(dr) || dr < 1 || dr > 5) return res.status(400).json({ error: 'Delivery rating must be 1-5' });

    const orderCheck = await pool.query(
      'SELECT id FROM user_orders WHERE id = $1 AND user_id = $2 AND status = $3',
      [order_id, userId, 'Delivered']
    );
    if (orderCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Order not found or not delivered' });
    }

    const recommendVal = recommend === true || recommend === 'true' || recommend === '1';

    await pool.query(
      `INSERT INTO user_feedback (user_id, order_id, overall_rating, food_rating, delivery_rating, recommend, comments)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, order_id, or, fr, dr, recommendVal, comments || null]
    );
    res.status(201).json({ success: true, message: 'Thank you for your feedback!' });
  } catch (err) {
    console.error('Feedback create error:', err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
}

module.exports = { create };
