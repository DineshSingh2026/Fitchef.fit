/**
 * Run API + DB connection tests. Start server first: npm start (or PORT=3020 node server.js)
 * Usage: node scripts/test-api-e2e.js [baseUrl]
 * Default baseUrl: http://localhost:3020
 */
require('dotenv').config();
const base = process.argv[2] || process.env.TEST_BASE_URL || 'http://localhost:3020';

async function request(method, path, body, token) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(base + path, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (_) { data = text; }
  return { status: res.status, data };
}

async function run() {
  const results = [];
  let ok = 0;

  // 1. Early access
  try {
    const r = await request('POST', '/api/early-access', { email: 'e2e-' + Date.now() + '@test.com' });
    const pass = r.status === 201 && r.data && (r.data.success === true || r.data.data);
    results.push({ name: 'Early-access (DB)', pass: !!pass, status: r.status });
    if (pass) ok++;
  } catch (e) {
    results.push({ name: 'Early-access (DB)', pass: false, error: e.message });
  }

  // 2. Consultation (minimal)
  try {
    const r = await request('POST', '/api/consultation', {
      full_name: 'E2E User',
      email: 'e2e-consult-' + Date.now() + '@test.com',
      city: 'Mumbai',
    });
    const pass = r.status === 201 && r.data && r.data.success === true;
    results.push({ name: 'Consultation (DB)', pass: !!pass, status: r.status });
    if (pass) ok++;
  } catch (e) {
    results.push({ name: 'Consultation (DB)', pass: false, error: e.message });
  }

  // 2b. Consultation form (full payload – like real form submit)
  try {
    const r = await request('POST', '/api/consultation', {
      full_name: 'E2E Full Form User',
      email: 'e2e-full-' + Date.now() + '@test.com',
      city: 'Hyderabad',
      phone: '9876543210',
      delivery_frequency: '3x per week',
      goals: ['Fat Loss', 'Clean Eating'],
      age: 30,
      gender: 'Male',
      height: 175,
      weight: 72,
      activity_level: 'Moderate',
      diet_type: 'Vegan',
      spice_preference: 'Mild',
      start_timeline: 'Immediately',
      allergies: 'None',
    });
    const pass = r.status === 201 && r.data && r.data.success === true;
    results.push({ name: 'Consultation form (full)', pass: !!pass, status: r.status });
    if (pass) ok++;
  } catch (e) {
    results.push({ name: 'Consultation form (full)', pass: false, error: e.message });
  }

  // 3. Admin login
  let token;
  try {
    const r = await request('POST', '/api/admin/auth/login', {
      email: process.env.INITIAL_ADMIN_EMAIL || 'admin@fitchef.fit',
      password: process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123',
    });
    const pass = r.status === 200 && r.data && r.data.token;
    if (pass) token = r.data.token;
    results.push({ name: 'Admin login', pass: !!pass, status: r.status });
    if (pass) ok++;
  } catch (e) {
    results.push({ name: 'Admin login', pass: false, error: e.message });
  }

  // 4. Admin dashboard KPIs (protected)
  if (token) {
    try {
      const r = await request('GET', '/api/admin/dashboard/kpis', null, token);
      const pass = r.status === 200 && typeof r.data.total_orders === 'number';
      results.push({ name: 'Admin dashboard KPIs', pass: !!pass, status: r.status });
      if (pass) ok++;
    } catch (e) {
      results.push({ name: 'Admin dashboard KPIs', pass: false, error: e.message });
    }
  }

  // 5. Admin orders list
  if (token) {
    try {
      const r = await request('GET', '/api/admin/orders?page=1&limit=5', null, token);
      const pass = r.status === 200 && Array.isArray(r.data.data);
      results.push({ name: 'Admin orders API', pass: !!pass, status: r.status });
      if (pass) ok++;
    } catch (e) {
      results.push({ name: 'Admin orders API', pass: false, error: e.message });
    }
  }

  console.log('\n--- API & DB E2E checks ---\n');
  results.forEach(({ name, pass, status, error }) => {
    const s = pass ? 'PASS' : 'FAIL';
    const extra = status != null ? ' (' + status + ')' : (error ? ' ' + error : '');
    console.log('  ' + s + '  ' + name + extra);
  });
  console.log('\nTotal: ' + ok + '/' + results.length + ' passed.\n');
  process.exit(ok === results.length ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
