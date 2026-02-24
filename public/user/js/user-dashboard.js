(function () {
  'use strict';
  var TOKEN_KEY = 'fitchef_token';
  var USER_KEY = 'fitchef_user';
  var API_BASE = '';
  var API_USER = API_BASE + '/api/user';
  var API_DISHES = API_BASE + '/api/dishes';

  function dishImageSrc(url) {
    if (!url || !String(url).trim()) return '';
    var p = String(url).trim();
    if (p.indexOf('http://') === 0 || p.indexOf('https://') === 0) return p;
    var path = p.indexOf('/') === 0 ? p : '/' + p;
    return (window.location.origin || '') + path;
  }

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function getAuthHeaders() {
    var t = getToken();
    return { 'Content-Type': 'application/json', 'Authorization': t ? 'Bearer ' + t : '' };
  }

  /** Dish card: image + key food data + View Details & Place Order. Used in FitChef Kitchen & overview. */
  function renderDishCard(d, benefitsPreview) {
    var benefits = benefitsPreview || (d.benefits || '').toString().split('\n')[0] || '';
    var price = d.discount_price != null ? d.discount_price : d.base_price;
    var meta = [d.category || '', (d.calories != null ? d.calories + ' kcal' : ''), (d.protein != null ? 'P ' + d.protein + 'g' : ''), (d.carbs != null ? 'C ' + d.carbs + 'g' : ''), (d.fats != null ? 'F ' + d.fats + 'g' : '')].filter(Boolean).join(' · ');
    return '<div class="dish-card">' +
      '<img class="dish-card-image" src="' + dishImageSrc(d.image_url) + '" alt="" onerror="this.style.display=\'none\'">' +
      '<div class="dish-card-body">' +
      '<h3 class="dish-card-title">' + (d.name || '') + '</h3>' +
      '<p class="dish-card-meta">' + meta + '</p>' +
      (benefits ? '<p class="dish-card-benefits">' + benefits + '</p>' : '') +
      '<div class="dish-card-footer dish-card-actions">' +
      '<button type="button" class="btn-outline view-details-btn" data-id="' + d.id + '">View Details</button>' +
      '<button type="button" class="btn-primary place-order-card-btn" data-id="' + d.id + '" data-name="' + (d.name || '').replace(/"/g, '&quot;') + '" data-price="' + price + '">Place Order</button>' +
      '</div></div>';
  }

  var token = getToken();
  if (!token) {
    window.location.href = '/';
    throw new Error('Not logged in');
  }

  var user = JSON.parse(localStorage.getItem(USER_KEY) || '{}');
  document.getElementById('userName').textContent = user.full_name || user.email || 'You';

  var notifToggle = document.getElementById('navNotifToggle');
  var notifBadge = document.getElementById('navNotifBadge');
  var notifDropdown = document.getElementById('navNotifDropdown');
  var notifList = document.getElementById('navNotifList');
  var notifEmpty = document.getElementById('navNotifEmpty');
  function updateNotifBadge() {
    fetch(API_USER + '/notifications', { headers: getAuthHeaders() }).then(function (r) { return r.json(); }).then(function (res) {
      var list = res.data || [];
      var unread = list.filter(function (n) { return !n.read_at; }).length;
      if (notifBadge) { notifBadge.textContent = unread; notifBadge.style.display = unread ? 'flex' : 'none'; }
    }).catch(function () {});
  }
  function renderNotifDropdown() {
    fetch(API_USER + '/notifications', { headers: getAuthHeaders() }).then(function (r) { return r.json(); }).then(function (res) {
      var list = (res.data || []).slice(0, 15);
      if (notifList) notifList.innerHTML = list.map(function (n) {
        var date = n.created_at ? new Date(n.created_at).toLocaleString() : '';
        var read = n.read_at ? ' read' : '';
        return '<div class="nav-notif-item' + read + '" data-id="' + n.id + '"><p>' + (n.message || '').replace(/</g, '&lt;') + '</p><span class="nav-notif-date">' + date + '</span>' + (!n.read_at ? '<button type="button" class="nav-notif-dismiss" data-id="' + n.id + '">Dismiss</button>' : '') + '</div>';
      }).join('');
      if (notifEmpty) notifEmpty.style.display = list.length ? 'none' : 'block';
      notifList.querySelectorAll('.nav-notif-dismiss').forEach(function (btn) {
        btn.addEventListener('click', function (e) { e.stopPropagation(); var id = btn.getAttribute('data-id'); fetch(API_USER + '/notifications/' + id + '/read', { method: 'PATCH', headers: getAuthHeaders() }).then(function () { updateNotifBadge(); renderNotifDropdown(); }); });
      });
    }).catch(function () { if (notifList) notifList.innerHTML = ''; if (notifEmpty) notifEmpty.style.display = 'block'; });
  }
  function openNotifDropdown() { if (notifDropdown) { notifDropdown.classList.add('open'); notifDropdown.setAttribute('aria-hidden', 'false'); if (notifToggle) notifToggle.setAttribute('aria-expanded', 'true'); renderNotifDropdown(); } }
  function closeNotifDropdown() { if (notifDropdown) { notifDropdown.classList.remove('open'); notifDropdown.setAttribute('aria-hidden', 'true'); if (notifToggle) notifToggle.setAttribute('aria-expanded', 'false'); } }
  if (notifToggle) notifToggle.addEventListener('click', function (e) { e.stopPropagation(); if (notifDropdown && notifDropdown.classList.contains('open')) closeNotifDropdown(); else openNotifDropdown(); });
  document.addEventListener('click', function (e) { if (notifDropdown && notifDropdown.classList.contains('open') && !e.target.closest('.nav-notif-wrap')) closeNotifDropdown(); });
  updateNotifBadge();

  var titles = { overview: 'Dashboard Overview', profile: 'My Profile', meals: 'FitChef Kitchen', orders: 'My Orders', feedback: 'Feedback', support: 'Support' };
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('open'); }
  function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('open'); }
  document.getElementById('navbarToggle').addEventListener('click', openSidebar);
  overlay.addEventListener('click', closeSidebar);

  document.querySelectorAll('.nav-link').forEach(function (a) {
    if (a.id === 'logoutLink') return;
    a.addEventListener('click', function (e) { e.preventDefault(); switchView(a.getAttribute('data-view')); closeSidebar(); });
  });
  document.getElementById('logoutLink').addEventListener('click', function (e) { e.preventDefault(); logout(); });
  document.getElementById('logoutBtn').addEventListener('click', logout);
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/';
  }

  function switchView(name) {
    document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
    document.querySelectorAll('.nav-link').forEach(function (n) { n.classList.toggle('active', n.getAttribute('data-view') === name); });
    var el = document.getElementById('view-' + name);
    if (el) el.classList.add('active');
    document.getElementById('viewTitle').textContent = titles[name] || 'Dashboard';
    if (name === 'overview') loadOverview();
    else if (name === 'profile') loadProfile();
    else if (name === 'meals') loadMeals();
    else if (name === 'orders') loadOrders();
    else if (name === 'feedback') loadFeedbackForm();
    else if (name === 'support') { /* form is static */ }
  }

  function loadOverview() {
    var statsEl = document.getElementById('overviewStats');
    var recEl = document.getElementById('recommendedMeals');
    statsEl.innerHTML = '<div class="stat-card skeleton" style="height:80px"></div><div class="stat-card skeleton" style="height:80px"></div><div class="stat-card skeleton" style="height:80px"></div>';
    recEl.innerHTML = '';
    fetch(API_USER + '/orders?limit=100', { headers: getAuthHeaders() }).then(function (r) { return r.json(); }).then(function (res) {
      var orders = res.data || [];
      var active = orders.filter(function (o) { return o.status !== 'Delivered' && o.status !== 'Cancelled'; });
      var totalProtein = 0;
      orders.forEach(function (o) {
        (o.items || []).forEach(function (it) {
          totalProtein += (it.protein || 0) * (it.quantity || 1);
        });
      });
      statsEl.innerHTML =
        '<div class="stat-card"><div class="label">Active Orders</div><div class="value">' + active.length + '</div></div>' +
        '<div class="stat-card"><div class="label">Total Orders</div><div class="value">' + orders.length + '</div></div>' +
        '<div class="stat-card"><div class="label">Protein Consumed (g)</div><div class="value">' + Math.round(totalProtein) + '</div></div>';
    }).catch(function () { statsEl.innerHTML = '<div class="stat-card"><div class="label">Active Orders</div><div class="value">0</div></div>'; });
    function loadRecommended() {
      var recUrl = API_DISHES + '?limit=6';
      fetch(API_USER + '/profile', { headers: getAuthHeaders() }).then(function (r) { return r.json(); }).then(function (p) {
        if (p.fitness_goal) recUrl += '&dietary=' + encodeURIComponent(p.fitness_goal);
      }).catch(function () { }).finally(function () {
        fetch(recUrl, { headers: {} }).then(function (r) { return r.json(); }).then(function (res) {
          var list = (res.data || []).slice(0, 6);
          recEl.innerHTML = list.map(function (d) {
            var benefits = (d.benefits || '').toString().split('\n')[0] || '';
            return renderDishCard(d, benefits);
          }).join('');
          recEl.querySelectorAll('.view-details-btn').forEach(function (btn) { btn.addEventListener('click', function () { openDishModal(btn.getAttribute('data-id')); }); });
        }).catch(function () { recEl.innerHTML = '<p style="color:var(--text-muted)">No recommended meals right now.</p>'; });
      });
    }
    loadRecommended();
  }

  var cart = [];
  function addToCart(dishId, name, price) {
    var existing = cart.find(function (x) { return x.dish_id === dishId; });
    if (existing) existing.quantity += 1;
    else cart.push({ dish_id: dishId, name: name, price: price, quantity: 1 });
    updateCartBadge();
  }
  function updateCartBadge() {
    var badge = document.getElementById('cartBadge');
    if (badge) badge.style.display = 'none';
  }

  function loadProfile() {
    fetch(API_USER + '/profile', { headers: getAuthHeaders() }).then(function (r) { return r.json(); }).then(function (p) {
      document.getElementById('pf_full_name').value = p.full_name || '';
      document.getElementById('pf_email').value = p.email || '';
      document.getElementById('pf_phone').value = p.phone || '';
      document.getElementById('pf_gender').value = p.gender || '';
      document.getElementById('pf_date_of_birth').value = p.date_of_birth ? p.date_of_birth.slice(0, 10) : '';
      document.getElementById('pf_address_line1').value = p.address_line1 || '';
      document.getElementById('pf_address_line2').value = p.address_line2 || '';
      document.getElementById('pf_city').value = p.city || '';
      document.getElementById('pf_state').value = p.state || '';
      document.getElementById('pf_pincode').value = p.pincode || '';
      document.getElementById('pf_delivery_instructions').value = p.delivery_instructions || '';
      document.getElementById('pf_height').value = p.height != null ? p.height : '';
      document.getElementById('pf_weight').value = p.weight != null ? p.weight : '';
      document.getElementById('pf_target_weight').value = p.target_weight != null ? p.target_weight : '';
      document.getElementById('pf_fitness_goal').value = p.fitness_goal || '';
      document.getElementById('pf_dietary_preference').value = p.dietary_preference || '';
      document.getElementById('pf_allergies').value = p.allergies || '';
      document.getElementById('pf_protein_target').value = p.protein_target != null ? p.protein_target : '';
    }).catch(function () {});
    document.getElementById('profileForm').onsubmit = function (e) {
      e.preventDefault();
      var btn = document.getElementById('profileSaveBtn');
      btn.disabled = true;
      var payload = {
        full_name: document.getElementById('pf_full_name').value,
        phone: document.getElementById('pf_phone').value,
        city: document.getElementById('pf_city').value,
        gender: document.getElementById('pf_gender').value || null,
        date_of_birth: document.getElementById('pf_date_of_birth').value || null,
        address_line1: document.getElementById('pf_address_line1').value || null,
        address_line2: document.getElementById('pf_address_line2').value || null,
        state: document.getElementById('pf_state').value || null,
        pincode: document.getElementById('pf_pincode').value || null,
        delivery_instructions: document.getElementById('pf_delivery_instructions').value || null,
        height: document.getElementById('pf_height').value ? parseInt(document.getElementById('pf_height').value, 10) : null,
        weight: document.getElementById('pf_weight').value ? parseFloat(document.getElementById('pf_weight').value) : null,
        target_weight: document.getElementById('pf_target_weight').value ? parseFloat(document.getElementById('pf_target_weight').value) : null,
        fitness_goal: document.getElementById('pf_fitness_goal').value || null,
        dietary_preference: document.getElementById('pf_dietary_preference').value || null,
        allergies: document.getElementById('pf_allergies').value || null,
        protein_target: document.getElementById('pf_protein_target').value ? parseInt(document.getElementById('pf_protein_target').value, 10) : null
      };
      fetch(API_USER + '/profile', { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(payload) }).then(function (r) { return r.json(); }).then(function () { btn.disabled = false; alert('Profile saved.'); }).catch(function () { btn.disabled = false; alert('Failed to save.'); });
    };
  }

  var mealsPage = 1;
  function loadMeals() {
    var q = '?page=' + mealsPage + '&limit=12';
    var search = document.getElementById('mealsSearch').value.trim();
    var cat = document.getElementById('mealsCategory').value;
    var pMin = document.getElementById('mealsProteinMin').value;
    var pMax = document.getElementById('mealsProteinMax').value;
    var diet = document.getElementById('mealsDietary').value;
    if (search) q += '&search=' + encodeURIComponent(search);
    if (cat) q += '&category=' + encodeURIComponent(cat);
    if (pMin) q += '&protein_min=' + encodeURIComponent(pMin);
    if (pMax) q += '&protein_max=' + encodeURIComponent(pMax);
    if (diet) q += '&dietary=' + encodeURIComponent(diet);
    document.getElementById('mealsGrid').innerHTML = '<div class="skeleton" style="height:200px"></div><div class="skeleton" style="height:200px"></div><div class="skeleton" style="height:200px"></div>';
    fetch(API_DISHES + q).then(function (r) { return r.json(); }).then(function (res) {
      var list = res.data || [];
      var total = res.total || 0;
      var limit = 12;
      document.getElementById('mealsGrid').innerHTML = list.length ? list.map(function (d) {
        var benefits = (d.benefits || '').toString().split('\n')[0] || '';
        return renderDishCard(d, benefits);
      }).join('') : '<p style="color:var(--text-muted)">No dishes match your filters.</p>';
      document.getElementById('mealsGrid').querySelectorAll('.view-details-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { openDishModal(btn.getAttribute('data-id')); });
      });
      var pages = Math.ceil(total / limit) || 1;
      document.getElementById('mealsPagination').innerHTML = pages > 1 ? '<button type="button" class="btn-outline" ' + (mealsPage <= 1 ? 'disabled' : '') + ' id="mealsPrev">Prev</button><span>' + mealsPage + ' / ' + pages + '</span><button type="button" class="btn-outline" ' + (mealsPage >= pages ? 'disabled' : '') + ' id="mealsNext">Next</button>' : '';
      document.getElementById('mealsPrev') && document.getElementById('mealsPrev').addEventListener('click', function () { mealsPage--; loadMeals(); });
      document.getElementById('mealsNext') && document.getElementById('mealsNext').addEventListener('click', function () { mealsPage++; loadMeals(); });
    }).catch(function () { document.getElementById('mealsGrid').innerHTML = '<p style="color:var(--text-muted)">Failed to load menu.</p>'; });
  }
  document.getElementById('mealsFilterBtn').addEventListener('click', function () { mealsPage = 1; loadMeals(); });

  function loadOrders() {
    loadNotifications();
    var listEl = document.getElementById('ordersList');
    listEl.innerHTML = '<div class="skeleton" style="height:60px"></div>';
    fetch(API_USER + '/orders', { headers: getAuthHeaders() }).then(function (r) { return r.json(); }).then(function (res) {
      var orders = res.data || [];
      listEl.innerHTML = orders.length ? orders.map(function (o) {
        var statusClass = (o.status || '').toLowerCase().replace(/\s/g, '');
        var items = (o.items || []).map(function (i) { return (i.quantity || 1) + '× ' + (i.dish_name || 'Item'); }).join(', ');
        var deliveryStr = o.requested_delivery_date ? new Date(o.requested_delivery_date).toLocaleDateString() : '—';
        return '<div class="order-card"><div class="order-card-header"><span class="order-card-id">' + (o.id || '').toString().slice(0, 8) + '...</span><span class="order-card-date">' + (o.created_at ? new Date(o.created_at).toLocaleDateString() : '') + '</span><span class="order-card-status ' + statusClass + '">' + (o.status || '') + '</span></div><p class="order-card-delivery">Delivery: ' + deliveryStr + '</p><p class="order-card-items">' + items + '</p><button type="button" class="btn-outline view-invoice-btn" data-order-id="' + o.id + '">View Details</button></div>';
      }).join('') : '<p style="color:var(--text-muted)">No orders yet. Add items from FitChef Kitchen and place an order.</p>';
    }).catch(function () { listEl.innerHTML = '<p style="color:var(--text-muted)">Failed to load orders.</p>'; });
  }

  function loadNotifications() {
    var box = document.getElementById('notificationsBox');
    if (!box) return;
    fetch(API_USER + '/notifications', { headers: getAuthHeaders() }).then(function (r) { return r.json(); }).then(function (res) {
      var list = res.data || [];
      box.innerHTML = list.length ? '<div class="notifications-list">' + list.slice(0, 10).map(function (n) {
        var read = n.read_at ? ' read' : '';
        var date = n.created_at ? new Date(n.created_at).toLocaleString() : '';
        return '<div class="notification-item' + read + '" data-id="' + n.id + '"><p class="notification-message">' + (n.message || '').replace(/</g, '&lt;') + '</p><span class="notification-date">' + date + '</span>' + (!n.read_at ? '<button type="button" class="btn-outline btn-sm mark-read-btn" data-id="' + n.id + '">Dismiss</button>' : '') + '</div>';
      }).join('') + '</div>' : '';
      box.querySelectorAll('.mark-read-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-id');
          fetch(API_USER + '/notifications/' + id + '/read', { method: 'PATCH', headers: getAuthHeaders() }).then(function () { loadNotifications(); });
        });
      });
    }).catch(function () { box.innerHTML = ''; });
  }

  function renderStarRating(containerId, hiddenId, value) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    for (var i = 1; i <= 5; i++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '★';
      btn.classList.toggle('active', i <= value);
      btn.addEventListener('click', function (v) {
        document.getElementById(hiddenId).value = v;
        container.querySelectorAll('button').forEach(function (b, idx) { b.classList.toggle('active', idx + 1 <= v); });
      }.bind(null, i));
      container.appendChild(btn);
    }
  }
  function loadFeedbackForm() {
    fetch(API_USER + '/orders/delivered', { headers: getAuthHeaders() }).then(function (r) { return r.json(); }).then(function (res) {
      var opts = '<option value="">Select a delivered order</option>' + (res.data || []).map(function (o) { return '<option value="' + o.id + '">' + (o.id || '').toString().slice(0, 8) + '... (' + (o.created_at ? new Date(o.created_at).toLocaleDateString() : '') + ')</option>'; }).join('');
      document.getElementById('feedbackOrderId').innerHTML = opts;
    });
    renderStarRating('ratingOverall', 'feedbackOverall', 0);
    renderStarRating('ratingFood', 'feedbackFood', 0);
    renderStarRating('ratingDelivery', 'feedbackDelivery', 0);
    document.getElementById('feedbackForm').onsubmit = function (e) {
      e.preventDefault();
      var orderId = document.getElementById('feedbackOrderId').value;
      var overall = parseInt(document.getElementById('feedbackOverall').value, 10);
      var food = parseInt(document.getElementById('feedbackFood').value, 10);
      var delivery = parseInt(document.getElementById('feedbackDelivery').value, 10);
      if (!orderId || overall < 1 || food < 1 || delivery < 1) { alert('Please select an order and give all ratings (1–5).'); return; }
      fetch(API_USER + '/feedback', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ order_id: orderId, overall_rating: overall, food_rating: food, delivery_rating: delivery, recommend: document.getElementById('feedbackRecommend').value === '1', comments: document.getElementById('feedbackComments').value }) }).then(function (r) { return r.json(); }).then(function (data) { if (data.success) { alert(data.message || 'Thank you!'); document.getElementById('feedbackForm').reset(); renderStarRating('ratingOverall', 'feedbackOverall', 0); renderStarRating('ratingFood', 'feedbackFood', 0); renderStarRating('ratingDelivery', 'feedbackDelivery', 0); } else alert(data.error || 'Failed'); }).catch(function () { alert('Failed to submit.'); });
    };
  }

  document.getElementById('supportForm').onsubmit = function (e) {
    e.preventDefault();
    var subject = document.getElementById('supportSubject').value.trim();
    var message = document.getElementById('supportMessage').value.trim();
    var priority = document.getElementById('supportPriority').value;
    if (!subject || !message) { alert('Subject and message are required.'); return; }
    fetch(API_USER + '/support', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ subject: subject, message: message, priority: priority }) }).then(function (r) { return r.json(); }).then(function (data) { if (data.success) { alert(data.message || 'Ticket submitted.'); document.getElementById('supportForm').reset(); } else alert(data.error || 'Failed'); }).catch(function () { alert('Failed to submit.'); });
  };

  if (document.getElementById('cartBadge')) document.getElementById('cartBadge').addEventListener('click', function () { switchView('meals'); });

  var dishModal = document.getElementById('dishModal');
  var dishModalContent = document.getElementById('dishModalContent');
  function closeDishModal() { if (dishModal) { dishModal.classList.remove('open'); dishModal.setAttribute('aria-hidden', 'true'); } }
  function openDishModal(dishId) {
    if (!dishId) return;
    dishModalContent.innerHTML = '<div class="skeleton" style="height:200px"></div>';
    dishModal.classList.add('open'); dishModal.setAttribute('aria-hidden', 'false');
    fetch(API_DISHES + '/' + dishId).then(function (r) { return r.json(); }).then(function (d) {
      var price = d.discount_price != null ? d.discount_price : d.base_price;
      var macros = [];
      if (d.calories != null) macros.push(d.calories + ' kcal');
      if (d.protein != null) macros.push('P ' + d.protein + 'g');
      if (d.carbs != null) macros.push('C ' + d.carbs + 'g');
      if (d.fats != null) macros.push('F ' + d.fats + 'g');
      if (d.fiber != null) macros.push('Fiber ' + d.fiber + 'g');
      if (d.sugar != null) macros.push('Sugar ' + d.sugar + 'g');
      if (d.sodium != null) macros.push('Sodium ' + d.sodium + 'mg');
      var html = (d.image_url ? '<img class="dish-detail-image" src="' + dishImageSrc(d.image_url) + '" alt="">' : '') +
        '<div class="dish-detail-body"><h3 class="dish-detail-title">' + (d.name || '') + '</h3><p class="dish-detail-meta">' + (d.category || '') + (d.portion_size ? ' · ' + d.portion_size : '') + '</p>' +
        (macros.length ? '<div class="dish-detail-macros">' + macros.map(function (m) { return '<span>' + m + '</span>'; }).join('') + '</div>' : '') +
        (d.description ? '<p class="dish-detail-description">' + (d.description || '').replace(/</g, '&lt;') + '</p>' : '') +
        (d.ingredients ? '<div class="dish-detail-section"><strong>Ingredients</strong>' + (d.ingredients || '').replace(/</g, '&lt;') + '</div>' : '') +
        (d.allergens ? '<div class="dish-detail-section"><strong>Allergens</strong>' + (d.allergens || '').replace(/</g, '&lt;') + '</div>' : '') +
        (d.benefits ? '<div class="dish-detail-section"><strong>Benefits</strong>' + (d.benefits || '').replace(/</g, '&lt;').replace(/\n/g, '<br>') + '</div>' : '') +
        '<div class="dish-detail-footer"><button type="button" class="btn-outline dish-modal-close-btn">Close</button><button type="button" class="btn-primary place-order-btn" data-id="' + d.id + '" data-name="' + (d.name || '').replace(/"/g, '&quot;') + '" data-price="' + price + '">Place Order</button></div></div>';
      dishModalContent.innerHTML = html;
      dishModalContent.querySelector('.dish-modal-close-btn') && dishModalContent.querySelector('.dish-modal-close-btn').addEventListener('click', closeDishModal);
      dishModalContent.querySelector('.place-order-btn') && dishModalContent.querySelector('.place-order-btn').addEventListener('click', function () {
        closeDishModal();
        openPlaceOrderStep({ id: d.id, name: d.name || '', price: price });
      });
    }).catch(function () { dishModalContent.innerHTML = '<p style="color:var(--text-muted);padding:20px">Could not load dish details.</p>'; });
  }

  var placeOrderModal = document.getElementById('placeOrderModal');
  var placeOrderContent = document.getElementById('placeOrderContent');
  function closePlaceOrderModal() { if (placeOrderModal) { placeOrderModal.classList.remove('open'); placeOrderModal.setAttribute('aria-hidden', 'true'); } }
  function getTomorrowDateString() {
    var d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  function openPlaceOrderStep(dish) {
    var qty = 1;
    var total = (dish.price || 0) * qty;
    var minDate = getTomorrowDateString();
    function render() {
      placeOrderContent.innerHTML = '<h3 class="place-order-title">Place Order</h3>' +
        '<p class="place-order-dish">' + (dish.name || '').replace(/</g, '&lt;') + '</p>' +
        '<p class="place-order-unit">Unit price: ₹' + (dish.price != null ? dish.price : 0) + '</p>' +
        '<div class="place-order-qty"><label>Quantity</label><input type="number" id="placeOrderQty" min="1" value="1"></div>' +
        '<div class="place-order-date"><label for="placeOrderDeliveryDate">Delivery date <span class="required">*</span></label><input type="date" id="placeOrderDeliveryDate" min="' + minDate + '" required title="Delivery is from next day onwards (min 24 hours)"></div>' +
        '<p class="place-order-total">Total: ₹<span id="placeOrderTotal">' + total.toFixed(2) + '</span></p>' +
        '<button type="button" class="btn-primary" id="placeOrderContinueBtn">Continue</button>';
      placeOrderModal.classList.add('open'); placeOrderModal.setAttribute('aria-hidden', 'false');
      var dateEl = document.getElementById('placeOrderDeliveryDate');
      if (dateEl && !dateEl.value) dateEl.value = minDate;
      var qtyEl = document.getElementById('placeOrderQty');
      var totalEl = document.getElementById('placeOrderTotal');
      function updateTotal() { qty = Math.max(1, parseInt(qtyEl.value, 10) || 1); total = (dish.price || 0) * qty; totalEl.textContent = total.toFixed(2); }
      qtyEl.addEventListener('input', updateTotal);
      document.getElementById('placeOrderContinueBtn').addEventListener('click', function () {
        qty = Math.max(1, parseInt(document.getElementById('placeOrderQty').value, 10) || 1);
        var deliveryDate = document.getElementById('placeOrderDeliveryDate') && document.getElementById('placeOrderDeliveryDate').value;
        if (!deliveryDate) { alert('Please select a delivery date. Delivery is available from tomorrow onwards.'); return; }
        fetch(API_USER + '/orders', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ items: [{ dish_id: dish.id, quantity: qty }], requested_delivery_date: deliveryDate }) })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.id) { closePlaceOrderModal(); showOrderCreatedPopup(); loadOrders(); } else alert(data.error || 'Order failed'); })
          .catch(function () { alert('Failed to create order.'); });
      });
    }
    render();
  }
  document.getElementById('placeOrderModalClose') && document.getElementById('placeOrderModalClose').addEventListener('click', closePlaceOrderModal);
  if (placeOrderModal) placeOrderModal.addEventListener('click', function (e) { if (e.target === placeOrderModal) closePlaceOrderModal(); });

  var orderCreatedPopup = document.getElementById('orderCreatedPopup');
  function showOrderCreatedPopup() { if (orderCreatedPopup) { orderCreatedPopup.classList.add('open'); orderCreatedPopup.setAttribute('aria-hidden', 'false'); } }
  function closeOrderCreatedPopup() { if (orderCreatedPopup) { orderCreatedPopup.classList.remove('open'); orderCreatedPopup.setAttribute('aria-hidden', 'true'); switchView('orders'); } }
  document.getElementById('orderCreatedOkBtn') && document.getElementById('orderCreatedOkBtn').addEventListener('click', closeOrderCreatedPopup);
  if (orderCreatedPopup) orderCreatedPopup.addEventListener('click', function (e) { if (e.target === orderCreatedPopup) closeOrderCreatedPopup(); });
  document.getElementById('dishModalClose') && document.getElementById('dishModalClose').addEventListener('click', closeDishModal);
  if (dishModal) dishModal.addEventListener('click', function (e) { if (e.target === dishModal) closeDishModal(); });
  document.body.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest('.view-details-btn');
    if (btn && btn.getAttribute('data-id')) openDishModal(btn.getAttribute('data-id'));
    var poBtn = e.target && e.target.closest && e.target.closest('.place-order-card-btn');
    if (poBtn && poBtn.getAttribute('data-id')) {
      openPlaceOrderStep({ id: poBtn.getAttribute('data-id'), name: poBtn.getAttribute('data-name') || '', price: parseFloat(poBtn.getAttribute('data-price')) });
    }
    var invBtn = e.target && e.target.closest && e.target.closest('.view-invoice-btn');
    if (invBtn && invBtn.getAttribute('data-order-id')) openInvoiceModal(invBtn.getAttribute('data-order-id'));
  });

  var invoiceModal = document.getElementById('invoiceModal');
  var invoiceModalContent = document.getElementById('invoiceModalContent');
  function closeInvoiceModal() { if (invoiceModal) { invoiceModal.classList.remove('open'); invoiceModal.setAttribute('aria-hidden', 'true'); } }
  function openInvoiceModal(orderId) {
    if (!orderId) return;
    invoiceModalContent.innerHTML = '<p style="padding:20px">Loading...</p>';
    invoiceModal.classList.add('open'); invoiceModal.setAttribute('aria-hidden', 'false');
    fetch(API_USER + '/orders', { headers: getAuthHeaders() }).then(function (r) { return r.json(); }).then(function (res) {
      var order = (res.data || []).find(function (o) { return o.id === orderId; });
      if (!order) { invoiceModalContent.innerHTML = '<p style="padding:20px">Order not found.</p>'; return; }
      var rows = (order.items || []).map(function (i) { return '<tr><td>' + (i.dish_name || 'Item') + '</td><td>' + (i.quantity || 1) + '</td></tr>'; }).join('');
      var deliveryDateStr = order.requested_delivery_date ? new Date(order.requested_delivery_date).toLocaleDateString() : '—';
      invoiceModalContent.innerHTML = '<div class="invoice-print-body"><h3>FitChef – Order Details</h3><p><strong>Order ID</strong> ' + (order.id || '') + '</p><p><strong>Date</strong> ' + (order.created_at ? new Date(order.created_at).toLocaleString() : '') + '</p><p><strong>Delivery date</strong> ' + deliveryDateStr + '</p><p><strong>Status</strong> ' + (order.status || '') + '</p><table class="invoice-table"><thead><tr><th>Item</th><th>Qty</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }).catch(function () { invoiceModalContent.innerHTML = '<p style="padding:20px">Failed to load order.</p>'; });
  }
  document.getElementById('invoiceModalClose') && document.getElementById('invoiceModalClose').addEventListener('click', closeInvoiceModal);
  document.getElementById('invoicePrintBtn') && document.getElementById('invoicePrintBtn').addEventListener('click', function () { window.print(); });
  if (invoiceModal) invoiceModal.addEventListener('click', function (e) { if (e.target === invoiceModal) closeInvoiceModal(); });

  loadOverview();
  updateCartBadge();
})();
