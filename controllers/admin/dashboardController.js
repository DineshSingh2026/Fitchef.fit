const pool = require('../../config/database');

async function getKpis(req, res) {
  try {
    const [
      ordersCount,
      ordersRevenue,
      customersCount,
      chefsCount,
      leadsCount,
      deliveriesPending,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) AS c FROM admin_orders"),
      pool.query("SELECT COALESCE(SUM(total_amount), 0)::numeric AS total FROM admin_orders WHERE status != 'cancelled'"),
      pool.query("SELECT COUNT(*) AS c FROM admin_customers"),
      pool.query("SELECT COUNT(*) AS c FROM admin_chefs WHERE status = 'active'"),
      pool.query("SELECT COUNT(*) AS c FROM admin_leads WHERE status = 'new'"),
      pool.query("SELECT COUNT(*) AS c FROM admin_deliveries WHERE status IN ('scheduled', 'in_transit')"),
    ]);
    res.json({
      total_orders: parseInt(ordersCount.rows[0].c, 10),
      total_revenue: parseFloat(ordersRevenue.rows[0].total),
      total_customers: parseInt(customersCount.rows[0].c, 10),
      total_chefs: parseInt(chefsCount.rows[0].c, 10),
      new_leads: parseInt(leadsCount.rows[0].c, 10),
      pending_deliveries: parseInt(deliveriesPending.rows[0].c, 10),
    });
  } catch (err) {
    console.error('Dashboard KPIs error:', err);
    res.status(500).json({ error: 'Failed to load KPIs' });
  }
}

async function getRevenueChart(req, res) {
  try {
    const { period = '30' } = req.query; // days
    const result = await pool.query(
      `SELECT DATE(order_date) AS date, COALESCE(SUM(total_amount), 0)::numeric AS revenue
       FROM admin_orders
       WHERE status != 'cancelled' AND order_date >= CURRENT_DATE - $1::integer
       GROUP BY DATE(order_date)
       ORDER BY date`,
      [period]
    );
    res.json(result.rows.map((r) => ({ date: r.date, revenue: parseFloat(r.revenue) })));
  } catch (err) {
    console.error('Revenue chart error:', err);
    res.status(500).json({ error: 'Failed to load revenue data' });
  }
}

module.exports = { getKpis, getRevenueChart };
