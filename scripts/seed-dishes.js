/**
 * Seed 5 sample dishes for FitChef admin dashboard.
 * Run: node scripts/seed-dishes.js
 * Requires DATABASE_URL in .env
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../config/database');
const { ensureDb } = require('../config/ensureDb');

const SAMPLE_DISHES = [
  {
    name: 'Grilled Chicken & Quinoa Bowl',
    description: 'Lean grilled chicken breast over fluffy quinoa with roasted vegetables and a light lemon-herb dressing. Perfect for muscle recovery and sustained energy.',
    category: 'Muscle Gain',
    tags: 'High Protein, Low Carb, Gluten Free, Balanced',
    image_url: null,
    calories: 420,
    protein: 42,
    carbs: 35,
    fats: 12,
    fiber: 5,
    sugar: 3,
    sodium: 380,
    ingredients: 'Chicken breast, quinoa, broccoli, bell peppers, zucchini, olive oil, lemon, herbs',
    allergens: 'None',
    benefits: 'Supports lean muscle growth\nHigh satiety\nRich in B vitamins\nGut-friendly',
    base_price: 299,
    discount_price: 269,
    portion_size: 450,
    subscription_eligible: true,
    available: true,
    featured: true,
  },
  {
    name: 'Keto Salmon with Avocado Salsa',
    description: 'Pan-seared Atlantic salmon with creamy avocado salsa, served with sautéed spinach and a drizzle of olive oil. Ultra-low carb, high healthy fats.',
    category: 'Keto',
    tags: 'Keto, High Protein, Omega-3, Gluten Free',
    image_url: null,
    calories: 520,
    protein: 38,
    carbs: 8,
    fats: 38,
    fiber: 4,
    sugar: 2,
    sodium: 320,
    ingredients: 'Atlantic salmon, avocado, lime, red onion, cilantro, spinach, olive oil, garlic',
    allergens: 'None',
    benefits: 'Boosts metabolism\nHeart-healthy omega-3\nKeto-friendly\nSupports brain function',
    base_price: 349,
    discount_price: 319,
    portion_size: 400,
    subscription_eligible: true,
    available: true,
    featured: true,
  },
  {
    name: 'Vegan Buddha Bowl',
    description: 'Colorful bowl with chickpeas, roasted sweet potato, kale, hummus, and tahini drizzle. 100% plant-based, high fiber, and diabetic-friendly.',
    category: 'Vegan',
    tags: 'Vegan, High Protein, High Fiber, Diabetic-Friendly',
    image_url: null,
    calories: 380,
    protein: 18,
    carbs: 52,
    fats: 14,
    fiber: 12,
    sugar: 8,
    sodium: 420,
    ingredients: 'Chickpeas, sweet potato, kale, hummus, tahini, cucumber, cherry tomatoes, lemon',
    allergens: 'None',
    benefits: 'Gut-friendly\nDiabetic-friendly\nSupports weight loss\nPlant-based protein',
    base_price: 249,
    discount_price: null,
    portion_size: 420,
    subscription_eligible: true,
    available: true,
    featured: false,
  },
  {
    name: 'Turmeric Chicken & Brown Rice',
    description: 'Tender chicken in a mild turmeric-ginger sauce with brown rice and steamed greens. Anti-inflammatory and ideal for weight loss.',
    category: 'Weight Loss',
    tags: 'Weight Loss, Anti-inflammatory, High Protein, Low Fat',
    image_url: null,
    calories: 395,
    protein: 36,
    carbs: 42,
    fats: 8,
    fiber: 4,
    sugar: 2,
    sodium: 290,
    ingredients: 'Chicken thigh, brown rice, turmeric, ginger, garlic, broccoli, green beans',
    allergens: 'None',
    benefits: 'Anti-inflammatory\nSupports weight loss\nBoosts immunity\nSustained energy',
    base_price: 279,
    discount_price: 249,
    portion_size: 400,
    subscription_eligible: true,
    available: true,
    featured: true,
  },
  {
    name: 'Protein-Packed Paneer Tikka Bowl',
    description: 'Grilled cottage cheese (paneer) tikka with mint chutney, jeera rice, and a side of raita. Vegetarian high-protein option for muscle gain.',
    category: 'Balanced',
    tags: 'High Protein, Vegetarian, Gluten Free, Indian',
    image_url: null,
    calories: 465,
    protein: 35,
    carbs: 38,
    fats: 22,
    fiber: 3,
    sugar: 6,
    sodium: 480,
    ingredients: 'Paneer, yogurt, spices, bell peppers, onion, basmati rice, mint, cucumber raita',
    allergens: 'Dairy',
    benefits: 'Supports lean muscle growth\nVegetarian protein\nGut-friendly\nSatiating',
    base_price: 269,
    discount_price: null,
    portion_size: 430,
    subscription_eligible: true,
    available: true,
    featured: false,
  },
];

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set. Skipping seed.');
    process.exit(1);
  }
  try {
    await ensureDb();
    const count = await pool.query('SELECT COUNT(*) AS c FROM dishes');
    if (parseInt(count.rows[0].c, 10) > 0) {
      console.log('Dishes already exist. Skipping seed (run DELETE FROM dishes first to re-seed).');
      process.exit(0);
    }
    for (const d of SAMPLE_DISHES) {
      await pool.query(
        `INSERT INTO dishes (
          name, description, category, tags, image_url, calories, protein, carbs, fats,
          fiber, sugar, sodium, ingredients, allergens, benefits, base_price, discount_price,
          portion_size, subscription_eligible, available, featured
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
        [
          d.name, d.description, d.category, d.tags, d.image_url, d.calories, d.protein, d.carbs, d.fats,
          d.fiber, d.sugar, d.sodium, d.ingredients, d.allergens, d.benefits, d.base_price, d.discount_price,
          d.portion_size, d.subscription_eligible, d.available, d.featured,
        ]
      );
      console.log('Inserted:', d.name);
    }
    console.log('Done. Seeded', SAMPLE_DISHES.length, 'dishes.');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
