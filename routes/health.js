const express = require('express');
const pool = require('../config/database');

const router = express.Router();

/**
 * GET /api/health
 * Returns 200 if DB is reachable, 503 otherwise.
 * Use for load balancers, monitoring, and uptime checks.
 */
router.get('/', async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({
      status: 'unhealthy',
      db: 'not_configured',
      message: 'DATABASE_URL not set',
    });
  }
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({
      status: 'ok',
      db: 'connected',
    });
  } catch (err) {
    return res.status(503).json({
      status: 'unhealthy',
      db: 'disconnected',
      message: err.message || 'Database connection failed',
    });
  }
});

module.exports = router;
