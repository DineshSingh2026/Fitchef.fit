const pool = require('../config/database');

function parseNum(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

/** GET /api/dishes - list available dishes for user/menu (no auth required) */
async function list(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const offset = (page - 1) * limit;
    const search = req.query.search ? String(req.query.search).trim() : null;
    const category = req.query.category ? String(req.query.category).trim() : null;
    const proteinMin = parseNum(req.query.protein_min);
    const proteinMax = parseNum(req.query.protein_max);
    const priceMin = parseNum(req.query.price_min);
    const priceMax = parseNum(req.query.price_max);
    const dietary = req.query.dietary ? String(req.query.dietary).trim() : null;

    const conditions = ['d.available = true'];
    const params = [];
    let idx = 1;
    if (search) {
      conditions.push(`(d.name ILIKE $${idx} OR d.description ILIKE $${idx} OR d.tags ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (category) {
      conditions.push(`d.category = $${idx}`);
      params.push(category);
      idx++;
    }
    if (proteinMin != null) {
      conditions.push(`d.protein >= $${idx}`);
      params.push(proteinMin);
      idx++;
    }
    if (proteinMax != null) {
      conditions.push(`d.protein <= $${idx}`);
      params.push(proteinMax);
      idx++;
    }
    if (priceMin != null) {
      conditions.push(`COALESCE(d.discount_price, d.base_price) >= $${idx}`);
      params.push(priceMin);
      idx++;
    }
    if (priceMax != null) {
      conditions.push(`COALESCE(d.discount_price, d.base_price) <= $${idx}`);
      params.push(priceMax);
      idx++;
    }
    if (dietary) {
      conditions.push(`(d.category = $${idx} OR d.tags ILIKE $${idx + 1})`);
      params.push(dietary, `%${dietary}%`);
      idx += 2;
    }
    const where = ' WHERE ' + conditions.join(' AND ');
    const countParams = [...params];
    params.push(limit, offset);

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM dishes d ${where}`,
      countParams
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const result = await pool.query(
      `SELECT d.id, d.name, d.description, d.category, d.tags, d.image_url,
              d.calories, d.protein, d.carbs, d.fats, d.benefits,
              d.base_price, d.discount_price, d.portion_size
       FROM dishes d ${where}
       ORDER BY d.featured DESC, d.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );
    res.json({ data: result.rows, total, page, limit });
  } catch (err) {
    console.error('Public dishes list error:', err);
    res.status(500).json({ error: 'Failed to load menu' });
  }
}

/** GET /api/dishes/:id - single dish detail (public) */
async function getOne(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, name, description, category, tags, image_url, calories, protein, carbs, fats, fiber, sugar, sodium, ingredients, allergens, benefits, base_price, discount_price, portion_size FROM dishes WHERE id = $1 AND available = true',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Dish not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Public dish get error:', err);
    res.status(500).json({ error: 'Failed to load dish' });
  }
}

module.exports = { list, getOne };
