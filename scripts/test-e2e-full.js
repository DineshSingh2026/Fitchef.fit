/**
 * E2E test: Sign up → Admin approve → User sign in → User dashboard → Place order → Admin open orders → Confirm → User notification.
 * Start server first: npm start (default port 3000). If server runs on another port, pass baseUrl.
 * Usage: node scripts/test-e2e-full.js [baseUrl]
 *        npm run test:e2e
 *        npm run test:e2e -- http://localhost:3001
 */
require('dotenv').config();
const base = process.argv[2] || process.env.TEST_BASE_URL || 'http://localhost:3000';

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

function pass(name, result) {
  return { name, pass: result !== false, status: null, error: null };
}
function fail(name, status, error) {
  return { name, pass: false, status: status || null, error: error || null };
}

async function run() {
  const results = [];
  const ts = Date.now();
  const testEmail = 'e2e-user-' + ts + '@test.com';
  const testPassword = 'TestPass123';
  let adminToken;
  let userToken;
  let approvedUserId;
  let orderId;
  let dishId;

  // --- 1. User sign up ---
  try {
    const r = await request('POST', '/api/auth/signup', {
      email: testEmail,
      password: testPassword,
      confirm_password: testPassword,
      full_name: 'E2E Test User',
      phone: '9876543210',
      city: 'Mumbai',
    });
    if (r.status === 201 && r.data && r.data.success === true) {
      results.push(pass('1. User sign up'));
    } else {
      results.push(fail('1. User sign up', r.status, r.data && r.data.message));
    }
  } catch (e) {
    results.push(fail('1. User sign up', null, e.message));
  }

  // --- 2. Admin login ---
  try {
    const r = await request('POST', '/api/admin/auth/login', {
      email: process.env.INITIAL_ADMIN_EMAIL || 'admin@fitchef.fit',
      password: process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123',
    });
    if (r.status === 200 && r.data && r.data.token) {
      adminToken = r.data.token;
      results.push(pass('2. Admin login'));
    } else {
      results.push(fail('2. Admin login', r.status, r.data && (r.data.error || r.data.message)));
    }
  } catch (e) {
    results.push(fail('2. Admin login', null, e.message));
  }

  if (!adminToken) {
    printResults(results);
    process.exit(1);
  }

  // --- 3. Admin: list pending signups and approve the new user ---
  try {
    const listRes = await request('GET', '/api/admin/pending-signups?limit=50', null, adminToken);
    const pendingList = Array.isArray(listRes.data) ? listRes.data : (listRes.data && listRes.data.data) || [];
    if (listRes.status !== 200 || !Array.isArray(pendingList)) {
      results.push(fail('3. Admin list pending signups', listRes.status, listRes.data && JSON.stringify(listRes.data).slice(0, 80)));
    } else {
      const pending = pendingList.find((u) => (u.email || '').toLowerCase() === testEmail.toLowerCase());
      if (!pending) {
        results.push(fail('3. Admin approve signup', null, 'New user not in pending list'));
      } else {
        approvedUserId = pending.id;
        const approveRes = await request('POST', '/api/admin/pending-signups/' + pending.id + '/approve', null, adminToken);
        if (approveRes.status === 200 && approveRes.data && approveRes.data.success === true) {
          results.push(pass('3. Admin approve signup'));
        } else {
          results.push(fail('3. Admin approve signup', approveRes.status, approveRes.data && approveRes.data.error));
        }
      }
    }
  } catch (e) {
    results.push(fail('3. Admin approve signup', null, e.message));
  }

  // --- 4. User sign in ---
  try {
    const r = await request('POST', '/api/auth/signin', { email: testEmail, password: testPassword });
    if (r.status === 200 && r.data && r.data.token && r.data.user) {
      userToken = r.data.token;
      results.push(pass('4. User sign in'));
    } else {
      results.push(fail('4. User sign in', r.status, r.data && (r.data.message || r.data.error)));
    }
  } catch (e) {
    results.push(fail('4. User sign in', null, e.message));
  }

  if (!userToken) {
    printResults(results);
    process.exit(1);
  }

  // --- 5. User dashboard: profile ---
  try {
    const r = await request('GET', '/api/user/profile', null, userToken);
    const ok = r.status === 200 && r.data != null && (typeof r.data !== 'object' || !r.data.error);
    if (ok) results.push(pass('5. User GET profile'));
    else results.push(fail('5. User GET profile', r.status, r.data && (r.data.error || (typeof r.data === 'object' ? 'invalid shape' : String(r.data).slice(0, 50)))));
  } catch (e) {
    results.push(fail('5. User GET profile', null, e.message));
  }

  // --- 6. User dashboard: orders list ---
  try {
    const r = await request('GET', '/api/user/orders', null, userToken);
    const ordersList = Array.isArray(r.data) ? r.data : (r.data && r.data.data) || [];
    if (r.status === 200 && Array.isArray(ordersList)) {
      results.push(pass('6. User GET orders'));
    } else {
      results.push(fail('6. User GET orders', r.status, r.data && (r.data.error || JSON.stringify(r.data).slice(0, 60))));
    }
  } catch (e) {
    results.push(fail('6. User GET orders', null, e.message));
  }

  // --- 7. Public dishes (for place order) ---
  try {
    const r = await request('GET', '/api/dishes?limit=5');
    const dishes = (r.data && r.data.data) || (Array.isArray(r.data) ? r.data : []);
    if (r.status === 200 && Array.isArray(dishes) && dishes.length > 0) {
      dishId = dishes[0].id;
      results.push(pass('7. GET dishes (menu)'));
    } else if (r.status === 200 && Array.isArray(dishes)) {
      results.push(pass('7. GET dishes (menu) – no dishes, skip order'));
    } else {
      results.push(fail('7. GET dishes', r.status, r.data && (r.data.error || 'no data')));
    }
  } catch (e) {
    results.push(fail('7. GET dishes', null, e.message));
  }

  // --- 8. User place order (if we have a dish) ---
  if (dishId) {
    try {
      const r = await request('POST', '/api/user/orders', { items: [{ dish_id: dishId, quantity: 1 }] }, userToken);
      if (r.status === 201 && r.data && r.data.id) {
        orderId = r.data.id;
        results.push(pass('8. User place order'));
      } else {
        results.push(fail('8. User place order', r.status, r.data && (r.data.error || r.data.message)));
      }
    } catch (e) {
      results.push(fail('8. User place order', null, e.message));
    }
  } else {
    results.push({ name: '8. User place order', pass: true, status: null, error: null }); // skipped
  }

  // --- 9. Admin: open orders list ---
  try {
    const r = await request('GET', '/api/admin/open-orders?status=Open&page=1&limit=10', null, adminToken);
    const openList = Array.isArray(r.data) ? r.data : (r.data && r.data.data) || [];
    if (r.status === 200 && Array.isArray(openList)) {
      results.push(pass('9. Admin GET open orders'));
    } else {
      results.push(fail('9. Admin GET open orders', r.status, r.data && (r.data.error || 'no data')));
    }
  } catch (e) {
    results.push(fail('9. Admin GET open orders', null, e.message));
  }

  // --- 10. Admin: confirm order (if we placed one) ---
  if (orderId) {
    try {
      const r = await request('PATCH', '/api/admin/open-orders/' + orderId + '/confirm', null, adminToken);
      if (r.status === 200 && r.data && r.data.success === true) {
        results.push(pass('10. Admin confirm order'));
      } else {
        results.push(fail('10. Admin confirm order', r.status, r.data && r.data.error));
      }
    } catch (e) {
      results.push(fail('10. Admin confirm order', null, e.message));
    }
  } else {
    results.push({ name: '10. Admin confirm order', pass: true, status: null, error: null });
  }

  // --- 11. User: notifications (after confirm) ---
  try {
    const r = await request('GET', '/api/user/notifications', null, userToken);
    const notifList = Array.isArray(r.data) ? r.data : (r.data && r.data.data) || [];
    if (r.status === 200 && Array.isArray(notifList)) {
      const hasConfirm = !orderId || notifList.some((n) => (n.message || '').indexOf('confirmed') !== -1);
      results.push(hasConfirm ? pass('11. User GET notifications') : fail('11. User GET notifications', null, 'No confirmation notification'));
    } else {
      results.push(fail('11. User GET notifications', r.status, r.data && (r.data.error || 'no data')));
    }
  } catch (e) {
    results.push(fail('11. User GET notifications', null, e.message));
  }

  // --- 12. Admin: dashboard KPIs ---
  try {
    const r = await request('GET', '/api/admin/dashboard/kpis', null, adminToken);
    const ok = r.status === 200 && r.data && (typeof r.data.total_orders === 'number' || typeof r.data.total_revenue === 'number');
    if (ok) results.push(pass('12. Admin dashboard KPIs'));
    else results.push(fail('12. Admin dashboard KPIs', r.status, r.data && (r.data.error || JSON.stringify(r.data).slice(0, 60))));
  } catch (e) {
    results.push(fail('12. Admin dashboard KPIs', null, e.message));
  }

  // --- 13. Admin: dishes list ---
  try {
    const r = await request('GET', '/api/admin/dishes?page=1&limit=5', null, adminToken);
    const adminDishes = Array.isArray(r.data) ? r.data : (r.data && r.data.data) || [];
    if (r.status === 200 && Array.isArray(adminDishes)) {
      results.push(pass('13. Admin GET dishes'));
    } else {
      results.push(fail('13. Admin GET dishes', r.status, r.data && (r.data.error || 'no data')));
    }
  } catch (e) {
    results.push(fail('13. Admin GET dishes', null, e.message));
  }

  printResults(results);
  const ok = results.filter((x) => x.pass).length;
  process.exit(ok === results.length ? 0 : 1);
}

function printResults(results) {
  console.log('\n--- E2E Full: Sign up → User dashboard → Admin dashboard ---\n');
  results.forEach(({ name, pass: p, status, error }) => {
    const s = p ? 'PASS' : 'FAIL';
    const extra = status != null ? ' (' + status + ')' : error ? ' ' + error : '';
    console.log('  ' + s + '  ' + name + extra);
  });
  const ok = results.filter((x) => x.pass).length;
  console.log('\nTotal: ' + ok + '/' + results.length + ' passed.\n');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
