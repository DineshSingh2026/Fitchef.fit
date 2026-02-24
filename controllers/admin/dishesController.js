const pool = require('../../config/database');
const path = require('path');

const CATEGORIES = ['Weight Loss', 'Muscle Gain', 'Keto', 'Vegan', 'Balanced', 'Custom'];

function parseNum(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function parseBool(v) {
  if (v === true || v === 'true' || v === '1' || v === 1) return true;
  if (v === false || v === 'false' || v === '0' || v === 0) return false;
  return null;
}

function buildDishFromBody(body, existingImageUrl) {
  const image_url = body.image_url || existingImageUrl || null;
  return {
    name: (body.name && String(body.name).trim()) || null,
    description: body.description != null ? String(body.description).trim() : null,
    category: (body.category && String(body.category).trim()) || null,
    tags: body.tags != null ? String(body.tags).trim() : null,
    image_url,
    calories: parseNum(body.calories),
    protein: parseNum(body.protein),
    carbs: parseNum(body.carbs),
    fats: parseNum(body.fats),
    fiber: parseNum(body.fiber),
    sugar: parseNum(body.sugar),
    sodium: parseNum(body.sodium),
    ingredients: body.ingredients != null ? String(body.ingredients).trim() : null,
    allergens: body.allergens != null ? String(body.allergens).trim() : null,
    benefits: body.benefits != null ? String(body.benefits).trim() : null,
    base_price: parseNum(body.base_price) != null ? parseNum(body.base_price) : 0,
    discount_price: parseNum(body.discount_price),
    portion_size: parseNum(body.portion_size),
    subscription_eligible: parseBool(body.subscription_eligible) === true,
    available: parseBool(body.available) !== false,
    featured: parseBool(body.featured) === true,
    chef_id: parseNum(body.chef_id) || null,
  };
}

async function list(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const search = req.query.search ? String(req.query.search).trim() : null;
    const category = req.query.category ? String(req.query.category).trim() : null;
    const proteinMin = parseNum(req.query.protein_min);
    const proteinMax = parseNum(req.query.protein_max);
    const sort = (req.query.sort || 'created_at').toLowerCase();
    const order = (req.query.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const allowedSort = ['created_at', 'name', 'base_price', 'protein', 'calories', 'category'];
    const orderBy = allowedSort.includes(sort) ? sort : 'created_at';

    const params = [];
    const conditions = [];
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
    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    const countParams = [...params];
    params.push(limit, offset);

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM dishes d ${where}`,
      countParams
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const result = await pool.query(
      `SELECT d.id, d.name, d.category, d.image_url, d.calories, d.protein, d.base_price, d.discount_price,
              d.available, d.featured, d.created_at, c.full_name AS chef_name
       FROM dishes d
       LEFT JOIN admin_chefs c ON c.id = d.chef_id
       ${where}
       ORDER BY d.${orderBy} ${order}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );
    res.json({ data: result.rows, total, page, limit });
  } catch (err) {
    console.error('Dishes list error:', err);
    res.status(500).json({ error: 'Failed to load dishes' });
  }
}

async function getStats(req, res) {
  try {
    const [total, active, featured, avgProtein] = await Promise.all([
      pool.query('SELECT COUNT(*) AS c FROM dishes'),
      pool.query("SELECT COUNT(*) AS c FROM dishes WHERE available = true"),
      pool.query("SELECT COUNT(*) AS c FROM dishes WHERE featured = true"),
      pool.query('SELECT COALESCE(AVG(protein), 0)::numeric AS avg FROM dishes WHERE available = true'),
    ]);
    res.json({
      total_dishes: parseInt(total.rows[0].c, 10),
      active_dishes: parseInt(active.rows[0].c, 10),
      featured_dishes: parseInt(featured.rows[0].c, 10),
      avg_protein_per_dish: parseFloat(avgProtein.rows[0].avg || 0),
    });
  } catch (err) {
    console.error('Dishes stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
}

async function getOne(req, res) {
  try {
    const id = req.params.id;
    const result = await pool.query(
      `SELECT d.*, c.full_name AS chef_name FROM dishes d
       LEFT JOIN admin_chefs c ON c.id = d.chef_id
       WHERE d.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Dish not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Dish get error:', err);
    res.status(500).json({ error: 'Failed to load dish' });
  }
}

async function create(req, res) {
  try {
    const body = req.body || {};
    let imageUrl = null;
    if (req.file && req.file.filename) {
      imageUrl = '/uploads/dishes/' + req.file.filename;
    }
    const d = buildDishFromBody(body, imageUrl);
    if (!d.name || !d.category) {
      return res.status(400).json({ error: 'Dish name and category are required' });
    }
    const result = await pool.query(
      `INSERT INTO dishes (
        name, description, category, tags, image_url, calories, protein, carbs, fats,
        fiber, sugar, sodium, ingredients, allergens, benefits, base_price, discount_price,
        portion_size, subscription_eligible, available, featured, chef_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *`,
      [
        d.name, d.description, d.category, d.tags, d.image_url, d.calories, d.protein, d.carbs, d.fats,
        d.fiber, d.sugar, d.sodium, d.ingredients, d.allergens, d.benefits, d.base_price, d.discount_price,
        d.portion_size, d.subscription_eligible, d.available, d.featured, d.chef_id,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Dish create error:', err);
    res.status(500).json({ error: 'Failed to create dish', message: err.message });
  }
}

async function update(req, res) {
  try {
    const id = req.params.id;
    const existing = await pool.query('SELECT id, image_url FROM dishes WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Dish not found' });
    const currentImage = existing.rows[0].image_url;
    let imageUrl = currentImage;
    if (req.file && req.file.filename) {
      imageUrl = '/uploads/dishes/' + req.file.filename;
    }
    const body = req.body || {};
    const d = buildDishFromBody(body, imageUrl);
    if (!d.name || !d.category) {
      return res.status(400).json({ error: 'Dish name and category are required' });
    }
    await pool.query(
      `UPDATE dishes SET
        name = $1, description = $2, category = $3, tags = $4, image_url = $5,
        calories = $6, protein = $7, carbs = $8, fats = $9, fiber = $10, sugar = $11, sodium = $12,
        ingredients = $13, allergens = $14, benefits = $15, base_price = $16, discount_price = $17,
        portion_size = $18, subscription_eligible = $19, available = $20, featured = $21, chef_id = $22,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $23`,
      [
        d.name, d.description, d.category, d.tags, d.image_url, d.calories, d.protein, d.carbs, d.fats,
        d.fiber, d.sugar, d.sodium, d.ingredients, d.allergens, d.benefits, d.base_price, d.discount_price,
        d.portion_size, d.subscription_eligible, d.available, d.featured, d.chef_id, id,
      ]
    );
    const updated = await pool.query('SELECT * FROM dishes WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('Dish update error:', err);
    res.status(500).json({ error: 'Failed to update dish', message: err.message });
  }
}

async function remove(req, res) {
  try {
    const id = req.params.id;
    const result = await pool.query(
      'UPDATE dishes SET available = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Dish not found' });
    res.json({ success: true, message: 'Dish deactivated (soft delete).' });
  } catch (err) {
    console.error('Dish delete error:', err);
    res.status(500).json({ error: 'Failed to delete dish' });
  }
}

async function toggleFeatured(req, res) {
  try {
    const id = req.params.id;
    const result = await pool.query(
      'UPDATE dishes SET featured = NOT COALESCE(featured, false), updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, featured',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Dish not found' });
    res.json({ success: true, featured: result.rows[0].featured });
  } catch (err) {
    console.error('Dish toggle featured error:', err);
    res.status(500).json({ error: 'Failed to toggle featured' });
  }
}

async function toggleAvailable(req, res) {
  try {
    const id = req.params.id;
    const result = await pool.query(
      'UPDATE dishes SET available = NOT COALESCE(available, true), updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, available',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Dish not found' });
    res.json({ success: true, available: result.rows[0].available });
  } catch (err) {
    console.error('Dish toggle available error:', err);
    res.status(500).json({ error: 'Failed to toggle availability' });
  }
}

module.exports = {
  list,
  getStats,
  getOne,
  create,
  update,
  remove,
  toggleFeatured,
  toggleAvailable,
  CATEGORIES,
};
