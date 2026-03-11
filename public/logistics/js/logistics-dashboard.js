(function () {
  'use strict';
  var TOKEN_KEY = 'logisticsToken';
  var USER_KEY = 'logisticsUser';
  var API = '/api/logistics';

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
  document.getElementById('logisticsUserName').textContent = user.name || user.email || 'Logistics';

  var titles = {
    overview: 'Dashboard Overview',
    open: 'Open Orders',
    ready: 'Ready for Dispatch',
    out: 'Out for Delivery',
    delivered: 'Delivered Orders'
  };
  var pwaBannerLogistics = document.getElementById('pwaBannerLogistics');
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }
  function openSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('open');
  }
  var navToggle = document.getElementById('navToggle');
  if (navToggle) navToggle.addEventListener('click', openSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);

  document.querySelectorAll('.logistics-nav-link').forEach(function (a) {
    if (a.id === 'logisticsLogoutLink') return;
    a.addEventListener('click', function (e) {
      e.preventDefault();
      switchView(a.getAttribute('data-view'));
      closeSidebar();
    });
  });
  document.getElementById('logisticsLogoutLink').addEventListener('click', function (e) { e.preventDefault(); logout(); });
  document.getElementById('logisticsLogoutBtn').addEventListener('click', logout);
  var logisticsRefreshBtn = document.getElementById('logisticsRefreshBtn');
  if (logisticsRefreshBtn) logisticsRefreshBtn.addEventListener('click', function () { window.location.reload(); });
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = 'index.html';
  }

  function switchView(name) {
    document.querySelectorAll('.logistics-view').forEach(function (v) { v.classList.remove('active'); });
    document.querySelectorAll('.logistics-nav-link').forEach(function (n) { n.classList.toggle('active', n.getAttribute('data-view') === name); });
    document.querySelectorAll('.bottom-nav a').forEach(function (n) { n.classList.toggle('active', n.getAttribute('data-view') === name); });
    var el = document.getElementById('view-' + name);
    if (el) el.classList.add('active');
    document.getElementById('viewTitle').textContent = titles[name] || 'Logistics';
    if (pwaBannerLogistics && !localStorage.getItem('fitchef_pwa_banner_dismissed_logistics')) {
      pwaBannerLogistics.style.display = name === 'overview' ? '' : 'none';
    }
    if (name === 'overview') loadOverview();
    else if (name === 'open') loadOpenOrders();
    else if (name === 'ready') loadReadyOrders();
    else if (name === 'out') loadOutOrders();
    else if (name === 'delivered') loadDeliveredOrders();
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.toLocaleString();
  }
  function shortId(id) { return (id || '').toString().slice(0, 8) + '…'; }

  function loadOverview() {
    var el = document.getElementById('overviewStats');
    el.innerHTML = '<div class="logistics-stat-card logistics-skeleton" style="height:100px"></div><div class="logistics-stat-card logistics-skeleton" style="height:100px"></div><div class="logistics-stat-card logistics-skeleton" style="height:100px"></div><div class="logistics-stat-card logistics-skeleton" style="height:100px"></div><div class="logistics-stat-card logistics-skeleton" style="height:100px"></div>';
    fetch(API + '/overview', { headers: getAuthHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var d = (res.data || {});
        var avg = d.avg_delivery_minutes != null ? d.avg_delivery_minutes + ' min' : '—';
        el.innerHTML =
          '<div class="logistics-stat-card confirmed"><div class="label">Open Orders</div><div class="value">' + (d.open_count || 0) + '</div></div>' +
          '<div class="logistics-stat-card ready"><div class="label">Ready for Dispatch</div><div class="value">' + (d.ready_count || 0) + '</div></div>' +
          '<div class="logistics-stat-card out"><div class="label">Out for Delivery</div><div class="value">' + (d.out_count || 0) + '</div></div>' +
          '<div class="logistics-stat-card delivered"><div class="label">Delivered Today</div><div class="value">' + (d.delivered_today || 0) + '</div></div>' +
          '<div class="logistics-stat-card"><div class="label">Avg Delivery Time</div><div class="value">' + avg + '</div><div class="sub">From dispatch to delivered</div></div>';
      })
      .catch(function () {
        el.innerHTML = '<div class="logistics-stat-card"><div class="label">Overview</div><div class="value">—</div><div class="sub">Failed to load</div></div>';
      });
  }

    var logDetailModal = document.getElementById('logisticsOrderDetailModal');
  var logDetailBody = document.getElementById('logisticsOrderDetailBody');
  var logDetailFooter = document.getElementById('logisticsOrderDetailFooter');
  function openLogisticsOrderDetail(o, viewType, agents) {
    function fd(d) { return d ? new Date(d).toLocaleDateString() : '—'; }
    var html = '<p><strong>Order ID</strong> ' + (o.id || '') + '</p><p><strong>User</strong> ' + (o.user_name || '—').replace(/</g, '&lt;') + '</p><p><strong>Mobile</strong> ' + (o.user_mobile || '—').replace(/</g, '&lt;') + '</p><p><strong>Delivery date</strong> ' + fd(o.requested_delivery_date) + '</p><p><strong>Address</strong> ' + (o.delivery_address || '—').replace(/</g, '&lt;') + '</p><p><strong>Time slot</strong> ' + (o.delivery_time_slot || '—').replace(/</g, '&lt;') + '</p><p><strong>Kitchen</strong> ' + (o.kitchen_location || '—').replace(/</g, '&lt;') + '</p>';
    if (o.dispatch_time) html += '<p><strong>Dispatch</strong> ' + fmtDate(o.dispatch_time) + '</p>';
    if (o.delivered_time) html += '<p><strong>Delivered</strong> ' + fmtDate(o.delivered_time) + '</p>';
    if (o.agent_name) html += '<p><strong>Agent</strong> ' + (o.agent_name || '—').replace(/</g, '&lt;') + '</p>';
    logDetailBody.innerHTML = html;
    logDetailFooter.innerHTML = '';
    if (viewType === 'ready' && agents && agents.length) {
      var opts = '<option value="">Select agent</option>' + agents.map(function (a) { var sel = (o.assigned_agent_id && a.id === o.assigned_agent_id) ? ' selected' : ''; return '<option value="' + a.id + '"' + sel + '>' + (a.name || '').replace(/</g, '&lt;') + ' – ' + (a.mobile || '').replace(/</g, '&lt;') + '</option>'; }).join('');
      logDetailFooter.innerHTML = '<div class="logistics-assign-row"><select id="logModalAgentSelect">' + opts + '</select><button type="button" class="logistics-btn-primary" id="logModalAssignBtn" data-order-id="' + o.id + '">Assign</button></div>';
      if (o.assigned_agent_id) logDetailFooter.innerHTML += ' <button type="button" class="logistics-btn-primary logistics-btn-out-delivery" id="logModalOutBtn" data-order-id="' + o.id + '">Mark as Out for Delivery</button>';
      document.getElementById('logModalAssignBtn').addEventListener('click', function () {
        var sel = document.getElementById('logModalAgentSelect');
        var agentId = sel && sel.value ? sel.value.trim() : '';
        if (!agentId) { alert('Select an agent.'); return; }
        var btn = this; btn.disabled = true;
        fetch(API + '/orders/' + o.id + '/assign-agent', { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ agent_id: parseInt(agentId, 10) }) }).then(function (r) { return r.json(); }).then(function (data) { if (data.success) { logDetailModal.classList.remove('open'); loadReadyOrders(); loadOverview(); } else alert(data.error || 'Failed'); }).catch(function () { alert('Failed'); }).finally(function () { btn.disabled = false; });
      });
      var outBtn = document.getElementById('logModalOutBtn');
      if (outBtn) outBtn.addEventListener('click', function () {
        if (!confirm('Mark as Out for Delivery?')) return;
        var b = this; b.disabled = true;
        fetch(API + '/orders/' + o.id + '/out-for-delivery', { method: 'PUT', headers: getAuthHeaders() }).then(function (r) { return r.json(); }).then(function (data) { if (data.success) { logDetailModal.classList.remove('open'); loadReadyOrders(); loadOutOrders(); loadOverview(); } else alert(data.error || 'Failed'); }).catch(function () { alert('Failed'); }).finally(function () { b.disabled = false; });
      });
    } else if (viewType === 'out') {
      logDetailFooter.innerHTML = '<button type="button" class="logistics-btn-primary logistics-btn-delivered" id="logModalDeliveredBtn" data-order-id="' + o.id + '">Mark as Delivered</button>';
      document.getElementById('logModalDeliveredBtn').addEventListener('click', function () {
        if (!confirm('Mark as Delivered?')) return;
        var b = this; b.disabled = true;
        fetch(API + '/orders/' + o.id + '/delivered', { method: 'PUT', headers: getAuthHeaders() }).then(function (r) { return r.json(); }).then(function (data) { if (data.success) { logDetailModal.classList.remove('open'); loadOutOrders(); loadDeliveredOrders(); loadOverview(); } else alert(data.error || 'Failed'); }).catch(function () { alert('Failed'); }).finally(function () { b.disabled = false; });
      });
    }
    logDetailModal.classList.add('open');
    logDetailModal.setAttribute('aria-hidden', 'false');
  }
  document.getElementById('logisticsOrderDetailClose').addEventListener('click', function () { logDetailModal.classList.remove('open'); logDetailModal.setAttribute('aria-hidden', 'true'); });
  logDetailModal.addEventListener('click', function (e) { if (e.target === logDetailModal) logDetailModal.classList.remove('open'); });

  function loadOpenOrders() {
    var listEl = document.getElementById('openOrdersList');
    listEl.innerHTML = '<tr><td colspan="4" class="loading">Loading…</td></tr>';
    fetch(API + '/orders/open', { headers: getAuthHeaders() }).then(function (r) { return r.json(); }).then(function (res) {
      var orders = res.data || [];
      if (orders.length === 0) { listEl.innerHTML = '<tr><td colspan="4" class="empty">No open orders.</td></tr>'; return; }
      function fd(d) { return d ? new Date(d).toLocaleDateString() : '—'; }
      listEl.innerHTML = orders.map(function (o) { return '<tr><td>' + shortId(o.id) + '</td><td>' + (o.user_name || '—').replace(/</g, '&lt;') + '</td><td>' + fd(o.requested_delivery_date) + '</td><td><button type="button" class="btn-view view-log-order-btn" data-id="' + o.id + '">View</button></td></tr>'; }).join('');
      listEl.querySelectorAll('.view-log-order-btn').forEach(function (btn) { var o = orders.find(function (x) { return String(x.id) === btn.getAttribute('data-id'); }); if (o) btn.addEventListener('click', function () { openLogisticsOrderDetail(o, 'open'); }); });
    }).catch(function () { listEl.innerHTML = '<tr><td colspan="4" class="loading">Failed to load.</td></tr>'; });
  }

  function loadReadyOrders() {
    var listEl = document.getElementById('readyOrdersList');
    listEl.innerHTML = '<tr><td colspan="4" class="loading">Loading…</td></tr>';
    Promise.all([
      fetch(API + '/orders/ready', { headers: getAuthHeaders() }).then(function (r) { return r.json(); }),
      fetch(API + '/agents', { headers: getAuthHeaders() }).then(function (r) { return r.json(); })
    ]).then(function (results) {
      var orders = (results[0].data || []);
      var agents = (results[1].data || []);
      if (orders.length === 0) { listEl.innerHTML = '<tr><td colspan="4" class="empty">No orders ready for dispatch.</td></tr>'; return; }
      listEl.innerHTML = orders.map(function (o) {
        return '<tr><td>' + shortId(o.id) + '</td><td>' + (o.user_name || '—').replace(/</g, '&lt;') + '</td><td>' + (o.agent_name || '—').replace(/</g, '&lt;') + '</td><td><button type="button" class="btn-view view-log-order-btn" data-id="' + o.id + '">View</button></td></tr>';
      }).join('');
      listEl.querySelectorAll('.view-log-order-btn').forEach(function (btn) {
        var o = orders.find(function (x) { return String(x.id) === btn.getAttribute('data-id'); });
        if (o) btn.addEventListener('click', function () { openLogisticsOrderDetail(o, 'ready', agents); });
      });
    }).catch(function () { listEl.innerHTML = '<tr><td colspan="4" class="loading">Failed to load.</td></tr>'; });
  }

  function loadOutOrders() {
    var listEl = document.getElementById('outOrdersList');
    listEl.innerHTML = '<tr><td colspan="4" class="loading">Loading…</td></tr>';
    fetch(API + '/orders/out', { headers: getAuthHeaders() }).then(function (r) { return r.json(); }).then(function (res) {
      var orders = res.data || [];
      if (orders.length === 0) { listEl.innerHTML = '<tr><td colspan="4" class="empty">No orders out for delivery.</td></tr>'; return; }
      listEl.innerHTML = orders.map(function (o) {
        return '<tr><td>' + shortId(o.id) + '</td><td>' + (o.user_name || '—').replace(/</g, '&lt;') + '</td><td>' + (o.agent_name || '—').replace(/</g, '&lt;') + '</td><td><button type="button" class="btn-view view-log-order-btn" data-id="' + o.id + '">View</button></td></tr>';
      }).join('');
      listEl.querySelectorAll('.view-log-order-btn').forEach(function (btn) {
        var o = orders.find(function (x) { return String(x.id) === btn.getAttribute('data-id'); });
        if (o) btn.addEventListener('click', function () { openLogisticsOrderDetail(o, 'out'); });
      });
    }).catch(function () { listEl.innerHTML = '<tr><td colspan="4" class="loading">Failed to load.</td></tr>'; });
  }

  var deliveredFilter = '';
  function loadDeliveredOrders() {
    var listEl = document.getElementById('deliveredOrdersList');
    var q = deliveredFilter ? '?filter=' + deliveredFilter : '';
    listEl.innerHTML = '<tr><td colspan="4" class="loading">Loading…</td></tr>';
    fetch(API + '/orders/delivered' + q, { headers: getAuthHeaders() }).then(function (r) { return r.json(); }).then(function (res) {
      var orders = res.data || [];
      document.querySelectorAll('.logistics-delivered-filters button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-filter') === deliveredFilter); });
      if (orders.length === 0) { listEl.innerHTML = '<tr><td colspan="4" class="empty">No delivered orders for this filter.</td></tr>'; return; }
      listEl.innerHTML = orders.map(function (o) {
        var delStr = o.delivered_time ? fmtDate(o.delivered_time) : '—';
        return '<tr><td>' + shortId(o.id) + '</td><td>' + (o.user_name || '—').replace(/</g, '&lt;') + '</td><td>' + delStr + '</td><td><button type="button" class="btn-view view-log-order-btn" data-id="' + o.id + '">View</button></td></tr>';
      }).join('');
      listEl.querySelectorAll('.view-log-order-btn').forEach(function (btn) {
        var o = orders.find(function (x) { return String(x.id) === btn.getAttribute('data-id'); });
        if (o) btn.addEventListener('click', function () { openLogisticsOrderDetail(o, 'delivered'); });
      });
    }).catch(function () { listEl.innerHTML = '<tr><td colspan="4" class="loading">Failed to load.</td></tr>'; });
  }
  document.querySelectorAll('.logistics-delivered-filters button').forEach(function (b) {
    b.addEventListener('click', function () {
      deliveredFilter = b.getAttribute('data-filter') || '';
      loadDeliveredOrders();
    });
  });

  document.querySelectorAll('.bottom-nav a').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var view = link.getAttribute('data-view');
      if (view) switchView(view);
    });
  });

  switchView('overview');
})();
