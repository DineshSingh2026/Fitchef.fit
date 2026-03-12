(function () {
  'use strict';

  // Single "Add to Home Screen" button: iOS = show guide, Android = install directly
  // window.initFitChefPwa({ scopeKey: 'admin' | 'user' | 'chef' | 'logistics' })
  window.initFitChefPwa = function initFitChefPwa(opts) {
    opts = opts || {};
    var scopeKey = (opts.scopeKey || 'app').toString();

    var installBtn = document.querySelector('[data-pwa-install-btn]');
    var notifBtn = document.querySelector('[data-pwa-notif-btn]');
    var banner = installBtn ? installBtn.closest('.pwa-banner') : (notifBtn ? notifBtn.closest('.pwa-banner') : null);
    var bannerSub = banner ? banner.querySelector('.pwa-banner-sub') : null;
    var bannerClose = banner ? banner.querySelector('[data-pwa-close]') : null;

    var LS_INSTALL = 'fitchef_pwa_install_clicked_' + scopeKey;
    var LS_BANNER = 'fitchef_pwa_banner_dismissed_' + scopeKey;

    function hide(el) { if (el) el.style.display = 'none'; }
    function show(el) { if (el) el.style.display = ''; }

    function isStandalone() {
      return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        (window.navigator && window.navigator.standalone === true);
    }

    function isIOS() {
      var ua = (navigator && navigator.userAgent) ? navigator.userAgent : '';
      return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    }

    if (isStandalone()) {
      if (banner) hide(banner);
      return;
    }

    if (banner && localStorage.getItem(LS_BANNER) === '1') {
      hide(banner);
      return;
    }

    var deferredPrompt = null;
    var alreadyClicked = localStorage.getItem(LS_INSTALL) === '1';

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
    });

    window.addEventListener('appinstalled', function () {
      localStorage.setItem(LS_INSTALL, '1');
      hide(installBtn);
      if (bannerSub) bannerSub.textContent = 'App installed.';
      deferredPrompt = null;
    });

    if (installBtn && banner) {
      if (alreadyClicked) hide(installBtn);
      else show(installBtn);

      installBtn.addEventListener('click', function () {
        if (isIOS()) {
          localStorage.setItem(LS_INSTALL, '1');
          hide(installBtn);
          if (bannerSub) {
            bannerSub.innerHTML =
              '<ol class="pwa-ios-steps">' +
              '<li>Tap the <strong>Share</strong> button (square with arrow) at the bottom of Safari</li>' +
              '<li>Scroll down and tap <strong>Add to Home Screen</strong></li>' +
              '<li>Tap <strong>Add</strong> in the top-right corner</li>' +
              '</ol>';
          }
          return;
        }
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice && deferredPrompt.userChoice.finally(function () { deferredPrompt = null; });
          return;
        }
        if (bannerSub) bannerSub.textContent = 'Use your browser menu to add this app to your home screen.';
      });
    }

    if (bannerClose) {
      bannerClose.addEventListener('click', function () {
        localStorage.setItem(LS_BANNER, '1');
        hide(banner);
      });
    }

    // Enable notifications: show button if permission not granted, subscribe to push
    var getToken = opts.getToken || function () { return null; };
    if (notifBtn && banner && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        hide(notifBtn);
        try { subscribeToPush(getToken); } catch (e) {}
      } else {
        show(notifBtn);
      }
      notifBtn.addEventListener('click', function () {
        Notification.requestPermission().then(function (perm) {
          if (perm === 'granted') {
            hide(notifBtn);
            if (bannerSub) bannerSub.textContent = 'Notifications enabled. You\'ll receive order updates.';
            try { subscribeToPush(getToken); } catch (e) {}
          } else if (bannerSub && perm === 'denied') {
            bannerSub.textContent = 'Notifications blocked. You can enable them in your browser settings.';
          }
        });
      });
    }
    function subscribeToPush(getTok) {
      if (!('PushManager' in window) || !('serviceWorker' in navigator)) return;
      fetch('/api/push/vapid-public').then(function (r) { return r.json(); }).then(function (d) {
        var key = d.vapidPublicKey;
        if (!key) return;
        var token = getTok ? getTok() : null;
        if (!token) return;
        navigator.serviceWorker.ready.then(function (reg) {
          return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
        }).then(function (sub) {
          return fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(sub.toJSON())
          });
        }).catch(function () {});
      }).catch(function () {});
    }
    function urlBase64ToUint8Array(base64) {
      var padding = '='.repeat((4 - base64.length % 4) % 4);
      var b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
      var raw = atob(b64);
      var out = new Uint8Array(raw.length);
      for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
      return out;
    }
  };
})();

