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
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('open'); }
  function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('open'); }
  document.getElementById('navToggle').addEventListener('click', openSidebar);
  overlay.addEventListener('click', closeSidebar);

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
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = 'index.html';
  }

  function switchView(name) {
    document.querySelectorAll('.logistics-view').forEach(function (v) { v.classList.remove('active'); });
    document.querySelectorAll('.logistics-nav-link').forEach(function (n) { n.classList.toggle('active', n.getAttribute('data-view') === name); });
    var el = document.getElementById('view-' + name);
    if (el) el.classList.add('active');
    document.getElementById('viewTitle').textContent = titles[name] || 'Logistics';
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

  function loadOpenOrders() {
    var listEl = document.getElementById('openOrdersList');
    listEl.innerHTML = '<div class="logistics-skeleton" style="height:140px;margin-bottom:16px"></div>';
    fetch(API + '/orders/open', { headers: getAuthHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var orders = res.data || [];
        if (orders.length === 0) {
          listEl.innerHTML = '<p style="color:var(--log-text-muted);font-size:1.1rem">No open orders (Confirmed, admin-approved).</p>';
          return;
        }
        listEl.innerHTML = orders.map(function (o) {
          return '<div class="logistics-order-card status-confirmed" data-order-id="' + o.id + '">' +
            '<div class="logistics-order-card-header"><span class="logistics-order-id">' + shortId(o.id) + '</span><span class="logistics-order-meta">' + fmtDate(o.created_at) + '</span></div>' +
            '<div class="logistics-order-row"><strong>User:</strong> ' + (o.user_name || '—').replace(/</g, '&lt;') + '</div>' +
            '<div class="logistics-order-row"><strong>Mobile:</strong> ' + (o.user_mobile || '—').replace(/</g, '&lt;') + '</div>' +
            '<div class="logistics-order-row"><strong>Address:</strong> ' + (o.delivery_address || '—').replace(/</g, '&lt;') + '</div>' +
            '<div class="logistics-order-row"><strong>Time slot:</strong> ' + (o.delivery_time_slot || '—').replace(/</g, '&lt;') + '</div>' +
            '<div class="logistics-order-row"><strong>Kitchen:</strong> ' + (o.kitchen_location || '—').replace(/</g, '&lt;') + '</div>' +
            '</div>';
        }).join('');
      })
      .catch(function () { listEl.innerHTML = '<p style="color:var(--log-text-muted)">Failed to load orders.</p>'; });
  }

  function loadReadyOrders() {
    var listEl = document.getElementById('readyOrdersList');
    listEl.innerHTML = '<div class="logistics-skeleton" style="height:140px"></div>';
    Promise.all([
      fetch(API + '/orders/ready', { headers: getAuthHeaders() }).then(function (r) { return r.json(); }),
      fetch(API + '/agents', { headers: getAuthHeaders() }).then(function (r) { return r.json(); })
    ]).then(function (results) {
      var orders = (results[0].data || []);
      var agents = (results[1].data || []);
      if (orders.length === 0) {
        listEl.innerHTML = '<p style="color:var(--log-text-muted);font-size:1.1rem">No orders ready for dispatch.</p>';
        return;
      }
      function agentOptions(selectedId) {
        return '<option value="">Select agent</option>' + agents.map(function (a) {
          var sel = (selectedId && a.id === selectedId) ? ' selected' : '';
          return '<option value="' + a.id + '"' + sel + '>' + (a.name || '').replace(/</g, '&lt;') + ' – ' + (a.mobile || '').replace(/</g, '&lt;') + (a.vehicle_number ? ' (' + (a.vehicle_number || '').replace(/</g, '&lt;') + ')' : '') + '</option>';
        }).join('');
      }
      listEl.innerHTML = orders.map(function (o) {
        var assignHtml = '<div class="logistics-assign-row">' +
          '<select class="agent-select" data-order-id="' + o.id + '">' + agentOptions(o.assigned_agent_id) + '</select>' +
          '<button type="button" class="logistics-btn-primary assign-agent-btn" data-order-id="' + o.id + '">Assign</button>' +
          '</div>';
        var outBtn = o.assigned_agent_id
          ? '<button type="button" class="logistics-btn-primary logistics-btn-out-delivery out-for-delivery-btn" data-order-id="' + o.id + '">Mark as Out for Delivery</button>'
          : '<span style="color:var(--log-text-muted)">Assign an agent first.</span>';
        return '<div class="logistics-order-card status-ready" data-order-id="' + o.id + '">' +
          '<div class="logistics-order-card-header"><span class="logistics-order-id">' + shortId(o.id) + '</span><span class="logistics-order-meta">' + fmtDate(o.created_at) + '</span></div>' +
          '<div class="logistics-order-row"><strong>User:</strong> ' + (o.user_name || '—').replace(/</g, '&lt;') + '</div>' +
          '<div class="logistics-order-row"><strong>Mobile:</strong> ' + (o.user_mobile || '—').replace(/</g, '&lt;') + '</div>' +
          '<div class="logistics-order-row"><strong>Address:</strong> ' + (o.delivery_address || '—').replace(/</g, '&lt;') + '</div>' +
          '<div class="logistics-order-row"><strong>Time slot:</strong> ' + (o.delivery_time_slot || '—').replace(/</g, '&lt;') + '</div>' +
          '<div class="logistics-order-row"><strong>Kitchen:</strong> ' + (o.kitchen_location || '—').replace(/</g, '&lt;') + '</div>' +
          (o.agent_name ? '<div class="logistics-order-row"><strong>Agent:</strong> ' + (o.agent_name || '—').replace(/</g, '&lt;') + '</div>' : '') +
          '<div class="logistics-order-actions">' + assignHtml + ' ' + outBtn + '</div></div>';
      }).join('');
      listEl.querySelectorAll('.assign-agent-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var orderId = btn.getAttribute('data-order-id');
          var sel = listEl.querySelector('.agent-select[data-order-id="' + orderId + '"]');
          var agentId = sel && sel.value ? sel.value.trim() : '';
          if (!agentId) { alert('Select an agent.'); return; }
          btn.disabled = true;
          fetch(API + '/orders/' + orderId + '/assign-agent', {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ agent_id: parseInt(agentId, 10) })
          }).then(function (r) { return r.json(); })
            .then(function (data) {
              if (data.success) { loadReadyOrders(); loadOverview(); } else alert(data.error || 'Failed');
            })
            .catch(function () { alert('Failed.'); })
            .finally(function () { btn.disabled = false; });
        });
      });
      listEl.querySelectorAll('.out-for-delivery-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var orderId = btn.getAttribute('data-order-id');
          if (!orderId || !confirm('Mark this order as Out for Delivery? User and admin will be notified.')) return;
          btn.disabled = true;
          fetch(API + '/orders/' + orderId + '/out-for-delivery', { method: 'PUT', headers: getAuthHeaders() })
            .then(function (r) { return r.json(); })
            .then(function (data) {
              if (data.success) { alert(data.message || 'Done.'); loadReadyOrders(); loadOutOrders(); loadOverview(); } else alert(data.error || 'Failed');
            })
            .catch(function () { alert('Failed.'); })
            .finally(function () { btn.disabled = false; });
        });
      });
    }).catch(function () { listEl.innerHTML = '<p style="color:var(--log-text-muted)">Failed to load.</p>'; });
  }

  function loadOutOrders() {
    var listEl = document.getElementById('outOrdersList');
    listEl.innerHTML = '<div class="logistics-skeleton" style="height:140px"></div>';
    fetch(API + '/orders/out', { headers: getAuthHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var orders = res.data || [];
        if (orders.length === 0) {
          listEl.innerHTML = '<p style="color:var(--log-text-muted);font-size:1.1rem">No orders out for delivery.</p>';
          return;
        }
        listEl.innerHTML = orders.map(function (o) {
          var eta = o.dispatch_time ? 'ETA ~' + (30) + ' min from dispatch' : '—';
          return '<div class="logistics-order-card status-out" data-order-id="' + o.id + '">' +
            '<div class="logistics-order-card-header"><span class="logistics-order-id">' + shortId(o.id) + '</span><span class="logistics-order-meta">' + fmtDate(o.dispatch_time) + '</span></div>' +
            '<div class="logistics-order-row"><strong>User:</strong> ' + (o.user_name || '—').replace(/</g, '&lt;') + '</div>' +
            '<div class="logistics-order-row"><strong>Mobile:</strong> ' + (o.user_mobile || '—').replace(/</g, '&lt;') + '</div>' +
            '<div class="logistics-order-row"><strong>Address:</strong> ' + (o.delivery_address || '—').replace(/</g, '&lt;') + '</div>' +
            '<div class="logistics-order-row"><strong>Agent:</strong> ' + (o.agent_name || '—').replace(/</g, '&lt;') + '</div>' +
            '<div class="logistics-order-row"><strong>Dispatch:</strong> ' + fmtDate(o.dispatch_time) + '</div>' +
            '<div class="logistics-order-row"><strong>Delivery ETA:</strong> ' + eta + '</div>' +
            '<div class="logistics-order-actions"><button type="button" class="logistics-btn-primary logistics-btn-delivered mark-delivered-btn" data-order-id="' + o.id + '">Mark as Delivered</button></div></div>';
        }).join('');
        listEl.querySelectorAll('.mark-delivered-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var orderId = btn.getAttribute('data-order-id');
            if (!orderId || !confirm('Mark this order as Delivered?')) return;
            btn.disabled = true;
            fetch(API + '/orders/' + orderId + '/delivered', { method: 'PUT', headers: getAuthHeaders() })
              .then(function (r) { return r.json(); })
              .then(function (data) {
                if (data.success) { loadOutOrders(); loadDeliveredOrders(); loadOverview(); } else alert(data.error || 'Failed');
              })
              .catch(function () { alert('Failed.'); })
              .finally(function () { btn.disabled = false; });
          });
        });
      })
      .catch(function () { listEl.innerHTML = '<p style="color:var(--log-text-muted)">Failed to load orders.</p>'; });
  }

  var deliveredFilter = '';
  function loadDeliveredOrders() {
    var listEl = document.getElementById('deliveredOrdersList');
    var q = deliveredFilter ? '?filter=' + deliveredFilter : '';
    listEl.innerHTML = '<div class="logistics-skeleton" style="height:100px"></div>';
    fetch(API + '/orders/delivered' + q, { headers: getAuthHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var orders = res.data || [];
        document.querySelectorAll('.logistics-delivered-filters button').forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-filter') === deliveredFilter);
        });
        if (orders.length === 0) {
          listEl.innerHTML = '<p style="color:var(--log-text-muted);font-size:1.1rem">No delivered orders for this filter.</p>';
          return;
        }
        listEl.innerHTML = orders.map(function (o) {
          var dispatch = o.dispatch_time ? new Date(o.dispatch_time).getTime() : 0;
          var delivered = o.delivered_time ? new Date(o.delivered_time).getTime() : 0;
          var duration = (dispatch && delivered && delivered >= dispatch) ? Math.round((delivered - dispatch) / 60000) + ' min' : '—';
          return '<div class="logistics-order-card status-delivered">' +
            '<div class="logistics-order-card-header"><span class="logistics-order-id">' + shortId(o.id) + '</span><span class="logistics-order-meta">' + fmtDate(o.delivered_time) + '</span></div>' +
            '<div class="logistics-order-row"><strong>User:</strong> ' + (o.user_name || '—').replace(/</g, '&lt;') + '</div>' +
            '<div class="logistics-order-row"><strong>Address:</strong> ' + (o.delivery_address || '—').replace(/</g, '&lt;') + '</div>' +
            '<div class="logistics-order-row"><strong>Agent:</strong> ' + (o.agent_name || '—').replace(/</g, '&lt;') + '</div>' +
            '<div class="logistics-order-row"><strong>Dispatch:</strong> ' + fmtDate(o.dispatch_time) + '</div>' +
            '<div class="logistics-order-row"><strong>Delivered:</strong> ' + fmtDate(o.delivered_time) + '</div>' +
            '<div class="logistics-order-row"><strong>Duration:</strong> ' + duration + '</div></div>';
        }).join('');
      })
      .catch(function () { listEl.innerHTML = '<p style="color:var(--log-text-muted)">Failed to load.</p>'; });
  }
  document.querySelectorAll('.logistics-delivered-filters button').forEach(function (b) {
    b.addEventListener('click', function () {
      deliveredFilter = b.getAttribute('data-filter') || '';
      loadDeliveredOrders();
    });
  });

  switchView('overview');
})();
