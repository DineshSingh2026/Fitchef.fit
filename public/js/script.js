(function () {
  'use strict';

  var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PHONE_REGEX = /^[0-9]{10,15}$/;

  function ready(fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  function hideLoader() {
    var loader = document.getElementById('loader');
    if (loader) {
      loader.classList.add('hidden');
    }
  }

  function initSmoothScroll() {
    var ctaSecondary = document.getElementById('hero-cta-secondary');
    if (ctaSecondary) {
      ctaSecondary.addEventListener('click', function (e) {
        var target = document.getElementById('about');
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  }

  function initConsultationModal() {
    var modal = document.getElementById('consultation-modal');
    var openBtn = document.getElementById('hero-cta');
    var closeBtn = modal ? modal.querySelector('.consultation-modal-close') : null;
    var overlay = modal ? modal.querySelector('.consultation-modal-overlay') : null;

    function openModal() {
      if (!modal) return;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      if (!modal) return;
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    if (openBtn) {
      openBtn.addEventListener('click', function (e) {
        e.preventDefault();
        openModal();
      });
    }
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', closeModal);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) {
        closeModal();
      }
    });
  }

  function initScrollReveal() {
    var reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    function checkReveal() {
      var windowHeight = window.innerHeight;
      var revealPoint = 120;

      reveals.forEach(function (el) {
        var top = el.getBoundingClientRect().top;
        if (top < windowHeight - revealPoint) {
          el.classList.add('visible');
        }
      });
    }

    window.addEventListener('scroll', checkReveal);
    window.addEventListener('resize', checkReveal);
    checkReveal();
  }

  function initHeaderScroll() {
    var header = document.querySelector('.header');
    if (!header) return;

    function updateHeader() {
      if (window.scrollY > 60) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }

    window.addEventListener('scroll', updateHeader);
    updateHeader();
  }

  function validateEmail(value) {
    if (!value || typeof value !== 'string') return false;
    var trimmed = value.trim();
    return trimmed.length > 0 && EMAIL_REGEX.test(trimmed);
  }

  function getApiBase() {
    return window.location.origin;
  }

  function initEarlyAccessForm() {
    var form = document.getElementById('early-access-form');
    var emailInput = document.getElementById('email');
    var messageEl = document.getElementById('form-message');
    var submitBtn = form ? form.querySelector('.btn-submit') : null;

    if (!form || !emailInput || !messageEl) return;

    function setMessage(text, isError) {
      messageEl.textContent = text;
      messageEl.className = 'form-message ' + (isError ? 'error' : 'success');
    }

    function setSubmitting(submitting) {
      if (submitBtn) {
        submitBtn.disabled = submitting;
        submitBtn.textContent = submitting ? 'Submitting…' : 'Submit';
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var email = emailInput.value.trim();
      messageEl.textContent = '';

      if (!email) {
        setMessage('Please enter your email address.', true);
        emailInput.focus();
        return;
      }

      if (!validateEmail(email)) {
        setMessage('Please enter a valid email address.', true);
        emailInput.focus();
        return;
      }

      setSubmitting(true);
      setMessage('');

      var url = getApiBase() + '/api/early-access';
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, status: res.status, data: data };
          });
        })
        .then(function (_ref) {
          var ok = _ref.ok;
          var data = _ref.data;

          if (ok && data.success) {
            setMessage("You're on the list. Welcome to refined wellness.", false);
            emailInput.value = '';
          } else if (data.message) {
            setMessage(data.message, !data.success);
          } else {
            setMessage('Something went wrong. Please try again later.', true);
          }
        })
        .catch(function () {
          setMessage('Something went wrong. Please try again later.', true);
        })
        .finally(function () {
          setSubmitting(false);
        });
    });
  }

  function initFooterYear() {
    var yearEl = document.getElementById('year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
  }

  function initConsultationForm() {
    var form = document.getElementById('consultation-form');
    var submitBtn = document.getElementById('consultation-submit');
    var messageEl = document.getElementById('consultation-form-message');
    if (!form || !submitBtn || !messageEl) return;

    function setMessage(text, isError) {
      messageEl.textContent = text;
      messageEl.className = 'consultation-message ' + (isError ? 'error' : 'success');
    }

    function clearErrors() {
      var errs = form.querySelectorAll('.field-error');
      errs.forEach(function (el) { el.textContent = ''; });
      form.querySelectorAll('.error').forEach(function (el) { el.classList.remove('error'); });
    }

    function setFieldError(name, text) {
      var errEl = document.getElementById('err-' + name);
      var input = form.querySelector('[name="' + name + '"]');
      if (errEl) errEl.textContent = text;
      if (input) input.classList.add('error');
    }

    function getGoals() {
      var nodes = form.querySelectorAll('input[name="goals"]:checked');
      var arr = [];
      nodes.forEach(function (n) { arr.push(n.value); });
      return arr;
    }

    function buildPayload() {
      var fd = new FormData(form);
      var payload = {};
      fd.forEach(function (value, key) {
        if (key === 'goals') {
          if (!payload.goals) payload.goals = [];
          payload.goals.push(value);
        } else {
          payload[key] = value;
        }
      });
      if (!payload.goals) payload.goals = [];
      return payload;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();
      setMessage('');

      var fullName = (form.querySelector('[name="full_name"]') || {}).value;
      var emailVal = (form.querySelector('[name="email"]') || {}).value;
      var phoneVal = (form.querySelector('[name="phone"]') || {}).value;
      var cityVal = (form.querySelector('[name="city"]') || {}).value;
      var deliveryFreq = (form.querySelector('[name="delivery_frequency"]') || {}).value;
      var ageVal = (form.querySelector('[name="age"]') || {}).value;
      var genderVal = (form.querySelector('[name="gender"]') || {}).value;
      var heightVal = (form.querySelector('[name="height"]') || {}).value;
      var weightVal = (form.querySelector('[name="weight"]') || {}).value;
      var activityVal = (form.querySelector('[name="activity_level"]') || {}).value;
      var dietVal = (form.querySelector('[name="diet_type"]') || {}).value;
      var spiceVal = (form.querySelector('[name="spice_preference"]') || {}).value;
      var timelineVal = (form.querySelector('[name="start_timeline"]') || {}).value;
      var goalsChecked = form.querySelectorAll('input[name="goals"]:checked').length;

      var valid = true;
      if (!fullName || !fullName.trim()) {
        setFieldError('full_name', 'Full name is required.');
        valid = false;
      }
      if (!emailVal || !emailVal.trim()) {
        setFieldError('email', 'Email is required.');
        valid = false;
      } else if (!EMAIL_REGEX.test(emailVal.trim())) {
        setFieldError('email', 'Please enter a valid email address.');
        valid = false;
      }
      var phoneDigits = (phoneVal || '').replace(/\D/g, '');
      if (!phoneDigits || phoneDigits.length < 10) {
        setFieldError('phone', 'A valid mobile number (10–15 digits) is required.');
        valid = false;
      } else if (!PHONE_REGEX.test(phoneDigits)) {
        setFieldError('phone', 'Please enter a valid mobile number (10–15 digits).');
        valid = false;
      }
      if (!cityVal || !cityVal.trim()) {
        setFieldError('city', 'City is required.');
        valid = false;
      }
      if (!deliveryFreq || !deliveryFreq.trim()) {
        setFieldError('delivery_frequency', 'Please select delivery frequency.');
        valid = false;
      }
      if (goalsChecked === 0) {
        setFieldError('goals', 'Please select at least one goal.');
        valid = false;
      }
      if (!ageVal || ageVal.trim() === '') {
        setFieldError('age', 'Age is required.');
        valid = false;
      } else if (isNaN(parseInt(ageVal, 10)) || parseInt(ageVal, 10) < 1 || parseInt(ageVal, 10) > 120) {
        setFieldError('age', 'Please enter a valid age (1–120).');
        valid = false;
      }
      if (!genderVal || !genderVal.trim()) {
        setFieldError('gender', 'Please select gender.');
        valid = false;
      }
      if (!heightVal || heightVal.trim() === '') {
        setFieldError('height', 'Height is required.');
        valid = false;
      } else if (isNaN(parseInt(heightVal, 10)) || parseInt(heightVal, 10) < 50 || parseInt(heightVal, 10) > 250) {
        setFieldError('height', 'Please enter a valid height (50–250 cm).');
        valid = false;
      }
      if (!weightVal || weightVal.trim() === '') {
        setFieldError('weight', 'Weight is required.');
        valid = false;
      } else if (isNaN(parseFloat(weightVal)) || parseFloat(weightVal) < 20 || parseFloat(weightVal) > 300) {
        setFieldError('weight', 'Please enter a valid weight (20–300 kg).');
        valid = false;
      }
      if (!activityVal || !activityVal.trim()) {
        setFieldError('activity_level', 'Please select activity level.');
        valid = false;
      }
      if (!dietVal || !dietVal.trim()) {
        setFieldError('diet_type', 'Please select diet type.');
        valid = false;
      }
      if (!spiceVal || !spiceVal.trim()) {
        setFieldError('spice_preference', 'Please select spice preference.');
        valid = false;
      }
      if (!timelineVal || !timelineVal.trim()) {
        setFieldError('start_timeline', 'Please select start timeline.');
        valid = false;
      }

      if (!valid) {
        setMessage('Please fix the errors below.', true);
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';

      var url = getApiBase() + '/api/consultation';
      var payload = buildPayload();

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, status: res.status, data: data };
          });
        })
        .then(function (_ref) {
          var ok = _ref.ok;
          var data = _ref.data;
          if (ok && data.success) {
            setMessage('Thank you. Your culinary consultation has been received.', false);
            form.reset();
            var modal = document.getElementById('consultation-modal');
            if (modal) {
              modal.classList.remove('is-open');
              modal.setAttribute('aria-hidden', 'true');
              document.body.style.overflow = '';
            }
          } else {
            setMessage(data.message || 'Something went wrong. Please try again.', true);
          }
        })
        .catch(function () {
          setMessage('Something went wrong. Please try again later.', true);
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create My Personalized Plan';
        });
    });
  }

  function initAuth() {
    var signInLink = document.getElementById('signInLink');
    var signOutLink = document.getElementById('signOutLink');
    var headerUser = document.getElementById('headerUser');
    var mobileUser = document.getElementById('mobileUser');
    var signInLinkMobile = document.getElementById('signInLinkMobile');
    var signOutLinkMobile = document.getElementById('signOutLinkMobile');
    var hamburgerBtn = document.getElementById('hamburgerBtn');
    var mobileMenu = document.getElementById('mobileMenu');
    var mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    var mobileMenuClose = document.getElementById('mobileMenuClose');
    var signinModal = document.getElementById('signin-modal');
    var signupModal = document.getElementById('signup-modal');
    var AUTH_STORAGE_KEY = 'fitchef_user';
    var TOKEN_KEY = 'fitchef_token';

    function closeMobileMenu() {
      if (mobileMenu) {
        mobileMenu.classList.remove('is-open');
        mobileMenu.setAttribute('aria-hidden', 'true');
      }
      if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
    function openMobileMenu() {
      if (mobileMenu) {
        mobileMenu.classList.add('is-open');
        mobileMenu.setAttribute('aria-hidden', 'false');
      }
      if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    if (hamburgerBtn && mobileMenu) {
      hamburgerBtn.addEventListener('click', function () {
        if (mobileMenu.classList.contains('is-open')) closeMobileMenu();
        else openMobileMenu();
      });
    }
    if (mobileMenuOverlay) mobileMenuOverlay.addEventListener('click', closeMobileMenu);
    if (mobileMenuClose) mobileMenuClose.addEventListener('click', closeMobileMenu);

    function getStoredUser() {
      try {
        var raw = localStorage.getItem(AUTH_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    }

    function updateHeader() {
      var user = getStoredUser();
      if (user && user.full_name) {
        if (headerUser) {
          headerUser.textContent = 'Hi, ' + user.full_name;
          headerUser.style.display = 'inline';
        }
        if (mobileUser) {
          mobileUser.textContent = 'Hi, ' + user.full_name;
          mobileUser.style.display = 'block';
        }
        if (signInLink) signInLink.style.display = 'none';
        if (signOutLink) signOutLink.style.display = 'inline';
        var dashboardLink = document.getElementById('dashboardLink');
        var dashboardLinkMobile = document.getElementById('dashboardLinkMobile');
        if (dashboardLink) dashboardLink.style.display = 'inline';
        if (dashboardLinkMobile) dashboardLinkMobile.style.display = 'inline';
        if (signInLinkMobile) signInLinkMobile.style.display = 'none';
        if (signOutLinkMobile) signOutLinkMobile.style.display = 'inline';
      } else {
        if (headerUser) headerUser.style.display = 'none';
        if (mobileUser) mobileUser.style.display = 'none';
        if (signInLink) signInLink.style.display = 'inline';
        if (signOutLink) signOutLink.style.display = 'none';
        var dashboardLink = document.getElementById('dashboardLink');
        var dashboardLinkMobile = document.getElementById('dashboardLinkMobile');
        if (dashboardLink) dashboardLink.style.display = 'none';
        if (dashboardLinkMobile) dashboardLinkMobile.style.display = 'none';
        if (signInLinkMobile) signInLinkMobile.style.display = 'inline';
        if (signOutLinkMobile) signOutLinkMobile.style.display = 'none';
      }
    }

    function openAuthModal(modal) {
      if (!modal) return;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeAuthModal(modal) {
      if (!modal) return;
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    if (signInLink) {
      signInLink.addEventListener('click', function (e) {
        e.preventDefault();
        openAuthModal(signinModal);
      });
    }
    if (signInLinkMobile) {
      signInLinkMobile.addEventListener('click', function (e) {
        e.preventDefault();
        closeMobileMenu();
        openAuthModal(signinModal);
      });
    }
    if (signOutLinkMobile) {
      signOutLinkMobile.addEventListener('click', function (e) {
        e.preventDefault();
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(TOKEN_KEY);
        updateHeader();
        closeMobileMenu();
      });
    }
    var signinToSignupLink = document.getElementById('signinToSignupLink');
    if (signinToSignupLink) {
      signinToSignupLink.addEventListener('click', function (e) {
        e.preventDefault();
        closeAuthModal(signinModal);
        openAuthModal(signupModal);
      });
    }
    var signupToSigninLink = document.getElementById('signupToSigninLink');
    if (signupToSigninLink) {
      signupToSigninLink.addEventListener('click', function (e) {
        e.preventDefault();
        closeAuthModal(signupModal);
        openAuthModal(signinModal);
      });
    }
    if (signOutLink) {
      signOutLink.addEventListener('click', function (e) {
        e.preventDefault();
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(TOKEN_KEY);
        updateHeader();
        closeMobileMenu();
      });
    }

    [signinModal, signupModal].forEach(function (modal) {
      if (!modal) return;
      var closeBtn = modal.querySelector('.auth-modal-close');
      var overlay = modal.querySelector('.auth-modal-overlay');
      if (closeBtn) closeBtn.addEventListener('click', function () { closeAuthModal(modal); });
      if (overlay) overlay.addEventListener('click', function () { closeAuthModal(modal); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (mobileMenu && mobileMenu.classList.contains('is-open')) closeMobileMenu();
      else if (signinModal && signinModal.classList.contains('is-open')) closeAuthModal(signinModal);
      else if (signupModal && signupModal.classList.contains('is-open')) closeAuthModal(signupModal);
    });

    var signinForm = document.getElementById('signin-form');
    if (signinForm) {
      signinForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var emailEl = document.getElementById('signin-email');
        var passwordEl = document.getElementById('signin-password');
        var msgEl = document.getElementById('signin-message');
        var btn = signinForm.querySelector('.btn-auth');
        var email = emailEl && emailEl.value ? emailEl.value.trim() : '';
        var password = passwordEl ? passwordEl.value : '';
        signinForm.querySelectorAll('.field-error').forEach(function (el) { el.textContent = ''; });
        if (msgEl) msgEl.textContent = '';
        if (!email || !password) {
          if (msgEl) msgEl.textContent = 'Email and password are required.';
          if (msgEl) msgEl.className = 'auth-message error';
          return;
        }
        if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }
        fetch(getApiBase() + '/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: password }),
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.success && data.token && data.user) {
              localStorage.setItem(TOKEN_KEY, data.token);
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
              updateHeader();
              closeAuthModal(signinModal);
              signinForm.reset();
            } else {
              if (msgEl) msgEl.textContent = data.message || 'Sign in failed.';
              if (msgEl) msgEl.className = 'auth-message error';
            }
          })
          .catch(function () {
            if (msgEl) msgEl.textContent = 'Something went wrong. Please try again.';
            if (msgEl) msgEl.className = 'auth-message error';
          })
          .finally(function () {
            if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
          });
      });
    }

    var signupForm = document.getElementById('signup-form');
    if (signupForm) {
      signupForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var fullNameEl = document.getElementById('signup-full_name');
        var emailEl = document.getElementById('signup-email');
        var phoneEl = document.getElementById('signup-phone');
        var cityEl = document.getElementById('signup-city');
        var passwordEl = document.getElementById('signup-password');
        var confirmEl = document.getElementById('signup-confirm_password');
        var msgEl = document.getElementById('signup-message');
        var btn = signupForm.querySelector('.btn-auth');
        var full_name = fullNameEl && fullNameEl.value ? fullNameEl.value.trim() : '';
        var email = emailEl && emailEl.value ? emailEl.value.trim() : '';
        var phone = phoneEl && phoneEl.value ? phoneEl.value.trim() : '';
        var city = cityEl && cityEl.value ? cityEl.value.trim() : '';
        var password = passwordEl ? passwordEl.value : '';
        var confirm_password = confirmEl ? confirmEl.value : '';
        signupForm.querySelectorAll('.field-error').forEach(function (el) { el.textContent = ''; });
        if (msgEl) msgEl.textContent = '';
        if (!full_name || full_name.length < 2) {
          if (msgEl) msgEl.textContent = 'Please enter your full name.';
          if (msgEl) msgEl.className = 'auth-message error';
          return;
        }
        if (!email || !password) {
          if (msgEl) msgEl.textContent = 'Email and password are required.';
          if (msgEl) msgEl.className = 'auth-message error';
          return;
        }
        var phoneDigits = (phone || '').replace(/\D/g, '');
        if (!phoneDigits || phoneDigits.length < 10) {
          if (msgEl) msgEl.textContent = 'A valid mobile number (10–15 digits) is required.';
          if (msgEl) msgEl.className = 'auth-message error';
          return;
        }
        if (phoneDigits.length > 15) {
          if (msgEl) msgEl.textContent = 'Please enter a valid mobile number (10–15 digits).';
          if (msgEl) msgEl.className = 'auth-message error';
          return;
        }
        if (password !== confirm_password) {
          if (msgEl) msgEl.textContent = 'Password and confirm password do not match.';
          if (msgEl) msgEl.className = 'auth-message error';
          return;
        }
        if (password.length < 6) {
          if (msgEl) msgEl.textContent = 'Password must be at least 6 characters.';
          if (msgEl) msgEl.className = 'auth-message error';
          return;
        }
        if (btn) { btn.disabled = true; btn.textContent = 'Creating account…'; }
        fetch(getApiBase() + '/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: password, confirm_password: confirm_password, full_name: full_name, phone: phone, city: city || undefined }),
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.success) {
              if (msgEl) msgEl.textContent = data.message || 'Signup successful. Your account is waiting for admin approval.';
              if (msgEl) msgEl.className = 'auth-message success';
              signupForm.reset();
              setTimeout(function() {
                closeAuthModal(signupModal);
              }, 1500);
            } else {
              if (msgEl) msgEl.textContent = data.message || 'Sign up failed.';
              if (msgEl) msgEl.className = 'auth-message error';
            }
          })
          .catch(function () {
            if (msgEl) msgEl.textContent = 'Something went wrong. Please try again.';
            if (msgEl) msgEl.className = 'auth-message error';
          })
          .finally(function () {
            if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
          });
      });
    }

    updateHeader();
  }

  ready(function () {
    window.setTimeout(hideLoader, 600);
    initSmoothScroll();
    initConsultationModal();
    initAuth();
    initScrollReveal();
    initHeaderScroll();
    initConsultationForm();
    initFooterYear();
  });
})();
