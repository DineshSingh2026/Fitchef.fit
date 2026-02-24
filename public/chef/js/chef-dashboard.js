(function () {
  'use strict';
  var TOKEN_KEY = 'chefToken';
  var USER_KEY = 'chefUser';
  var API = '/api/chef';

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function getAuthHeaders() {
    var t = getToken();
    return { 'Content-Type': 'application/json', 'Authorization': t ? 'Bearer ' + t : '' };
  }

  if (!getToken()) {
    window.location.href = 'index.html';
    return;
  }

  var user = JSON.parse(localStorage.getItem(USER_KEY) || '{}');
  document.getElementById('chefName').textContent = user.name || user.email || 'Chef';

  var titles = { overview: 'Dashboard Overview', profile: 'My Profile', openOrders: 'Open Orders', completed: 'Completed Orders' };
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('open'); }
  function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('open'); }
  document.getElementById('navToggle').addEventListener('click', openSidebar);
  overlay.addEventListener('click', closeSidebar);

  document.querySelectorAll('.chef-nav-link').forEach(function (a) {
    if (a.id === 'chefLogoutLink') return;
    a.addEventListener('click', function (e) {
      e.preventDefault();
      switchView(a.getAttribute('data-view'));
      closeSidebar();
    });
  });
  document.getElementById('chefLogoutLink').addEventListener('click', function (e) { e.preventDefault(); logout(); });
  document.getElementById('chefLogoutBtn').addEventListener('click', logout);
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = 'index.html';
  }

  function switchView(name) {
    document.querySelectorAll('.chef-view').forEach(function (v) { v.classList.remove('active'); });
    document.querySelectorAll('.chef-nav-link').forEach(function (n) { n.classList.toggle('active', n.getAttribute('data-view') === name); });
    var el = document.getElementById('view-' + name);
    if (el) el.classList.add('active');
    document.getElementById('viewTitle').textContent = titles[name] || 'Chef Dashboard';
    if (name === 'overview') loadOverview();
    else if (name === 'profile') loadProfile();
    else if (name === 'openOrders') loadOpenOrders();
    else if (name === 'completed') loadCompletedOrders();
  }

  function loadOverview() {
    var el = document.getElementById('overviewStats');
    el.innerHTML = '<div class="chef-stat-card chef-skeleton" style="height:80px"></div><div class="chef-stat-card chef-skeleton" style="height:80px"></div>';
    fetch(API + '/orders/open', { headers: getAuthHeaders() }).then(function (r) { return r.json(); }).then(function (res) {
      var openCount = (res.data || []).length;
      return fetch(API + '/orders/completed?filter=week', { headers: getAuthHeaders() }).then(function (r2) { return r2.json(); }).then(function (res2) {
        var completedCount = (res2.data || []).length;
        el.innerHTML =
          '<div class="chef-stat-card"><div class="label">Open Orders</div><div class="value">' + openCount + '</div></div>' +
          '<div class="chef-stat-card"><div class="label">Completed (This Week)</div><div class="value">' + completedCount + '</div></div>';
      });
    }).catch(function () { el.innerHTML = '<div class="chef-stat-card"><div class="label">Open Orders</div><div class="value">0</div></div>'; });
  }

  function loadProfile() {
    fetch(API + '/profile', { headers: getAuthHeaders() }).then(function (r) { return r.json(); }).then(function (p) {
      document.getElementById('pf_name').value = p.name || '';
      document.getElementById('pf_email').value = p.email || '';
      document.getElementById('pf_mobile').value = p.mobile || '';
      document.getElementById('pf_address').value = p.address || '';
    }).catch(function () {});
    document.getElementById('profileForm').onsubmit = function (e) {
      e.preventDefault();
      var btn = document.getElementById('profileSaveBtn');
      btn.disabled = true;
      fetch(API + '/profile', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: document.getElementById('pf_name').value.trim(),
          mobile: document.getElementById('pf_mobile').value.trim(),
          address: document.getElementById('pf_address').value.trim()
        })
      }).then(function (r) { return r.json(); }).then(function () { btn.disabled = false; alert('Profile saved.'); }).catch(function () { btn.disabled = false; alert('Failed to save.'); });
    };
  }

  function loadOpenOrders() {
    var listEl = document.getElementById('openOrdersList');
    listEl.innerHTML = '<div class="chef-skeleton" style="height:120px;margin-bottom:16px"></div><div class="chef-skeleton" style="height:120px"></div>';
    fetch(API + '/orders/open', { headers: getAuthHeaders() }).then(function (r) { return r.json(); }).then(function (res) {
      var orders = res.data || [];
      if (orders.length === 0) {
        listEl.innerHTML = '<p style="color:var(--text-muted)">No open orders assigned to you.</p>';
        return;
      }
      listEl.innerHTML = orders.map(function (o) {
        var dateStr = o.created_at ? new Date(o.created_at).toLocaleString() : '';
        var idShort = (o.id || '').toString().slice(0, 8) + '…';
        var address = o.delivery_address || '—';
        var instructions = o.delivery_instructions ? ('Instructions: ' + o.delivery_instructions) : '';
        var customerName = o.customer_first_name || 'Customer';
        var dishesHtml = (o.items || []).map(function (d) {
          var meta = [d.calories ? d.calories + ' kcal' : '', d.protein ? 'P ' + d.protein + 'g' : '', d.portion_size ? d.portion_size + 'g portion' : ''].filter(Boolean).join(' · ');
          return '<div class="chef-dish-row"><span class="chef-dish-name">' + (d.dish_name || '') + '</span><span class="chef-dish-qty">× ' + (d.quantity || 1) + '</span>' +
            (d.ingredients ? '<span class="chef-dish-meta">' + (d.ingredients || '').replace(/</g, '&lt;').slice(0, 80) + (d.ingredients.length > 80 ? '…' : '') + '</span>' : '') +
            (meta ? '<span class="chef-dish-meta">' + meta + '</span>' : '') + '</div>';
        }).join('');
        var allergies = (o.allergy_notes || []).filter(Boolean);
        var allergyHtml = allergies.length
          ? '<div class="chef-allergy-box"><span class="title">⚠ Allergies:</span><ul><li>' + allergies.join('</li><li>') + '</li></ul></div>'
          : '<div class="chef-allergy-box empty"><span class="title">No allergy notes for this order.</span></div>';
        return '<div class="chef-order-card" data-order-id="' + o.id + '">' +
          '<div class="chef-order-card-header"><span class="chef-order-id">' + idShort + '</span><span class="chef-order-date">' + dateStr + '</span><span class="chef-order-customer">' + (customerName || '').replace(/</g, '&lt;') + '</span></div>' +
          '<div class="chef-order-address">' + (address || '').replace(/</g, '&lt;') + '</div>' +
          (instructions ? '<div class="chef-order-instructions">' + (instructions || '').replace(/</g, '&lt;') + '</div>' : '') +
          '<div class="chef-dishes-list">' + dishesHtml + '</div>' +
          allergyHtml +
          '<div class="chef-order-actions"><button type="button" class="chef-btn-ready mark-ready-btn" data-order-id="' + o.id + '">Mark as Ready for Dispatch</button></div></div>';
      }).join('');
      listEl.querySelectorAll('.mark-ready-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var orderId = btn.getAttribute('data-order-id');
          if (!orderId || !confirm('Mark this order as Ready for Dispatch? Admin and customer will be notified.')) return;
          btn.disabled = true;
          fetch(API + '/orders/' + orderId + '/ready', { method: 'PATCH', headers: getAuthHeaders() })
            .then(function (r) { return r.json(); })
            .then(function (data) {
              if (data.success) { alert(data.message || 'Done.'); loadOpenOrders(); loadOverview(); } else alert(data.error || 'Failed'); btn.disabled = false;
            })
            .catch(function () { alert('Failed.'); btn.disabled = false; });
        });
      });
    }).catch(function () { listEl.innerHTML = '<p style="color:var(--text-muted)">Failed to load orders.</p>'; });
  }

  var completedFilter = '';
  function loadCompletedOrders() {
    var listEl = document.getElementById('completedOrdersList');
    var q = completedFilter ? '?filter=' + completedFilter : '';
    listEl.innerHTML = '<div class="chef-skeleton" style="height:80px"></div>';
    fetch(API + '/orders/completed' + q, { headers: getAuthHeaders() }).then(function (r) { return r.json(); }).then(function (res) {
      var orders = res.data || [];
      document.querySelectorAll('.chef-completed-filters button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-filter') === completedFilter); });
      if (orders.length === 0) {
        listEl.innerHTML = '<p style="color:var(--text-muted)">No completed orders in this period.</p>';
        return;
      }
      listEl.innerHTML = orders.map(function (o) {
        var dateStr = o.created_at ? new Date(o.created_at).toLocaleString() : '';
        var completedStr = o.completed_at ? new Date(o.completed_at).toLocaleString() : '—';
        var idShort = (o.id || '').toString().slice(0, 8) + '…';
        var statusClass = (o.status || '').toLowerCase().replace(/\s/g, '');
        var dishesStr = (o.items || []).map(function (d) { return (d.quantity || 1) + '× ' + (d.dish_name || ''); }).join(', ');
        return '<div class="chef-order-card">' +
          '<div class="chef-order-card-header"><span class="chef-order-id">' + idShort + '</span><span class="chef-order-date">' + dateStr + '</span><span class="chef-order-status ' + statusClass + '">' + (o.status || '') + '</span></div>' +
          '<div class="chef-order-address">' + (o.delivery_address || '—').replace(/</g, '&lt;') + '</div>' +
          '<p class="chef-dish-meta">' + dishesStr + '</p>' +
          '<p class="chef-completed-at">Completed: ' + completedStr + '</p></div>';
      }).join('');
    }).catch(function () { listEl.innerHTML = '<p style="color:var(--text-muted)">Failed to load orders.</p>'; });
  }

  document.querySelectorAll('.chef-completed-filters button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      completedFilter = btn.getAttribute('data-filter') || '';
      loadCompletedOrders();
    });
  });

  loadOverview();
})();
