(function () {
  'use strict';

  // Called from pages to enable PWA UX.
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
    var LS_NOTIF = 'fitchef_pwa_notif_clicked_' + scopeKey;
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

    function isSafariOnIOS() {
      var ua = (navigator && navigator.userAgent) ? navigator.userAgent : '';
      // iOS browsers embed Safari but identify as CriOS/FxiOS/EdgiOS for non-Safari.
      if (!isIOS()) return false;
      return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    }

    // ---- Service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    }

    // If user dismissed the banner entirely, hide and stop.
    if (banner && localStorage.getItem(LS_BANNER) === '1') {
      hide(banner);
      banner = null;
    }

    // ---- Install
    var deferredPrompt = null;
    var alreadyClickedInstall = localStorage.getItem(LS_INSTALL) === '1';
    if (alreadyClickedInstall) hide(installBtn);

    window.addEventListener('beforeinstallprompt', function (e) {
      // Chrome/Edge Android; iOS has no event.
      e.preventDefault();
      deferredPrompt = e;
      if (!alreadyClickedInstall) show(installBtn);
    });

    window.addEventListener('appinstalled', function () {
      localStorage.setItem(LS_INSTALL, '1');
      hide(installBtn);
      deferredPrompt = null;
    });

    if (installBtn && banner) {
      installBtn.addEventListener('click', function () {
        localStorage.setItem(LS_INSTALL, '1');
        hide(installBtn);
        // iOS Safari: show 3-step guide (no native prompt API).
        if (isSafariOnIOS() && !isStandalone()) {
          if (bannerSub) {
            bannerSub.innerHTML =
              '<ol class="pwa-ios-steps">' +
              '<li>Tap the <strong>Share</strong> button (square with arrow pointing up) at the bottom of Safari</li>' +
              '<li>Scroll down and tap <strong>Add to Home Screen</strong></li>' +
              '<li>Tap <strong>Add</strong> in the top-right corner</li>' +
              '</ol>';
          }
          return;
        }
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        deferredPrompt.userChoice && deferredPrompt.userChoice.finally(function () { deferredPrompt = null; });
      });
    }

    // iOS Safari: show install button even without beforeinstallprompt.
    if (installBtn && !alreadyClickedInstall && isSafariOnIOS() && !isStandalone() && !localStorage.getItem(LS_BANNER)) {
      show(installBtn);
    }

    // ---- Banner close (manual dismiss)
    if (banner && bannerClose) {
      bannerClose.addEventListener('click', function () {
        localStorage.setItem(LS_BANNER, '1');
        hide(banner);
      });
    }

    // ---- Notifications
    var alreadyClickedNotif = localStorage.getItem(LS_NOTIF) === '1';
    if (alreadyClickedNotif) hide(notifBtn);

    function canAskNotif() {
      return typeof Notification !== 'undefined' && Notification && Notification.requestPermission;
    }

    if (notifBtn) {
      // Only show if browser supports notifications and permission isn't granted yet, and user hasn't clicked.
      if (!canAskNotif() || (typeof Notification !== 'undefined' && Notification.permission === 'granted')) {
        hide(notifBtn);
      } else if (!alreadyClickedNotif) {
        show(notifBtn);
      }

      notifBtn.addEventListener('click', function () {
        localStorage.setItem(LS_NOTIF, '1');
        hide(notifBtn);
        if (!canAskNotif()) return;
        Notification.requestPermission().then(function (perm) {
          if (perm === 'granted') {
            // Show a welcome notification via SW when possible (works in PWA too).
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'SHOW_NOTIFICATION',
                title: 'FitChef',
                options: {
                  body: 'Notifications enabled.',
                  icon: '/images/Fitchef%20logo2.png'
                }
              });
            } else if (navigator.serviceWorker) {
              navigator.serviceWorker.ready.then(function (reg) {
                if (reg && reg.active) {
                  reg.active.postMessage({
                    type: 'SHOW_NOTIFICATION',
                    title: 'FitChef',
                    options: { body: 'Notifications enabled.', icon: '/images/Fitchef%20logo2.png' }
                  });
                }
              }).catch(function () {});
            }
          }
        }).catch(function () {});
      });
    }
  };
})();

