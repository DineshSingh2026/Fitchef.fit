/** FitChef Admin – API paths are relative so live URL works with just /admin (no port). */
var API_BASE = '';

function getAuthHeaders() {
  var t = localStorage.getItem('adminToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': t ? 'Bearer ' + t : ''
  };
}

function adminLogout() {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  window.location.href = 'index.html';
}
