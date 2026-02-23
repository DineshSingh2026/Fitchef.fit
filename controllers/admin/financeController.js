const pool = require('../../config/database');

async function getAnalytics(req, res) {
  try {
    const { period = '30' } = req.query;
    const [
      revenueByDay,
      paymentMethods,
      totalRevenue,
      totalOrders,
      avgOrderValue,
    ] = await Promise.all([
      pool.query(
        `SELECT DATE(paid_at) AS date, COALESCE(SUM(amount), 0)::numeric AS total
         FROM admin_payments WHERE status = 'completed' AND paid_at >= CURRENT_DATE - $1::integer
         GROUP BY DATE(paid_at) ORDER BY date`,
        [period]
      ),
      pool.query(
        `SELECT method, COALESCE(SUM(amount), 0)::numeric AS total, COUNT(*) AS count
         FROM admin_payments WHERE status = 'completed' AND paid_at >= CURRENT_DATE - $1::integer
         GROUP BY method`,
        [period]
      ),
      pool.query(
        "SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM admin_payments WHERE status = 'completed' AND paid_at >= CURRENT_DATE - $1::integer",
        [period]
      ),
      pool.query(
        "SELECT COUNT(*) AS c FROM admin_orders WHERE status != 'cancelled' AND order_date >= CURRENT_DATE - $1::integer",
        [period]
      ),
      pool.query(
        `SELECT COALESCE(AVG(total_amount), 0)::numeric AS avg
         FROM admin_orders WHERE status != 'cancelled' AND order_date >= CURRENT_DATE - $1::integer`,
        [period]
      ),
    ]);
    res.json({
      revenue_by_day: revenueByDay.rows.map((r) => ({ date: r.date, total: parseFloat(r.total) })),
      by_method: paymentMethods.rows.map((r) => ({
        method: r.method || 'unknown',
        total: parseFloat(r.total),
        count: parseInt(r.count, 10),
      })),
      total_revenue: parseFloat(totalRevenue.rows[0].total),
      total_orders: parseInt(totalOrders.rows[0].c, 10),
      avg_order_value: parseFloat(avgOrderValue.rows[0].avg),
      period_days: parseInt(period, 10),
    });
  } catch (err) {
    console.error('Finance analytics error:', err);
    res.status(500).json({ error: 'Failed to load finance analytics' });
  }
}

async function listPayments(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) AS total FROM admin_payments');
    const total = parseInt(countResult.rows[0].total, 10);
    const result = await pool.query(
      `SELECT p.*, o.order_number FROM admin_payments p
       LEFT JOIN admin_orders o ON o.id = p.order_id
       ORDER BY p.paid_at DESC NULLS LAST
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ data: result.rows, total, page, limit });
  } catch (err) {
    console.error('Payments list error:', err);
    res.status(500).json({ error: 'Failed to load payments' });
  }
}

async function createPayment(req, res) {
  try {
    const { order_id, amount, method, status } = req.body;
    if (amount == null) return res.status(400).json({ error: 'amount required' });
    const result = await pool.query(
      `INSERT INTO admin_payments (order_id, amount, method, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [order_id || null, Number(amount), method || null, status || 'completed']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Payment create error:', err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
}

module.exports = { getAnalytics, listPayments, createPayment };
