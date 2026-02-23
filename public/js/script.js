(function () {
  'use strict';

  var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      var cityVal = (form.querySelector('[name="city"]') || {}).value;

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
      if (!cityVal || !cityVal.trim()) {
        setFieldError('city', 'City is required.');
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

  ready(function () {
    window.setTimeout(hideLoader, 600);
    initSmoothScroll();
    initConsultationModal();
    initScrollReveal();
    initHeaderScroll();
    initConsultationForm();
    initFooterYear();
  });
})();
