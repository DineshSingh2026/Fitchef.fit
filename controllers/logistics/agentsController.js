const pool = require('../../config/database');

/**
 * GET /api/logistics/agents
 * List delivery agents (for assignment dropdown). Only id, name, mobile, vehicle_number, availability_status.
 */
async function list(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, mobile, vehicle_number, availability_status
       FROM delivery_agents
       ORDER BY name`
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('Logistics agents list error:', err);
    res.status(500).json({ error: 'Failed to load agents' });
  }
}

module.exports = { list };
