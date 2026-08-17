/* ==========================================================================
   Логіка сторінки: шапка, меню, розкриття блоків, FAQ, модальні вікна,
   квіз, валідація та надсилання форм.
   Без залежностей.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ------------------------------------------------------------------------
     НАЛАШТУВАННЯ ПРИЙОМУ ЗАЯВОК
     Вкажіть адресу обробника — і форми почнуть надсилати JSON методом POST.
     Поки порожньо, payload пишеться в консоль, а користувач усе одно
     потрапляє на сторінку подяки, щоб потік можна було протестувати.
     ------------------------------------------------------------------------ */
  var ENDPOINT   = '';
  var THANK_YOU  = 'thank-you.html';

  /* ------------------------------------------------------------ Шапка ----- */
  var header = $('#header');
  var toTop  = $('#toTop');

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    header.classList.toggle('is-stuck', y > 20);
    toTop.classList.toggle('is-visible', y > 600);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------------------------------------------------------- Мобільне ---- */
  var burger = $('#burger');
  var drawer = $('#drawer');

  function closeDrawer() {
    burger.classList.remove('is-active');
    burger.setAttribute('aria-expanded', 'false');
    drawer.classList.remove('is-open');
    unlockBody();
  }

  function lockBody()   { document.body.classList.add('is-locked'); }
  function unlockBody() {
    if (drawer.classList.contains('is-open')) return;
    if ($('.modal.is-open')) return;
    document.body.classList.remove('is-locked');
  }

  burger.addEventListener('click', function () {
    var open = drawer.classList.toggle('is-open');
    burger.classList.toggle('is-active', open);
    burger.setAttribute('aria-expanded', String(open));
    if (open) { lockBody(); } else { unlockBody(); }
  });

  $$('#drawer a').forEach(function (link) { link.addEventListener('click', closeDrawer); });

  /* --------------------------------------------------- Розкриття блоків --- */
  var revealables = $$('.reveal');

  function revealAll() {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealables.forEach(function (el, i) {
      el.style.transitionDelay = (i % 3) * 70 + 'ms';
      io.observe(el);
    });

    /* Запобіжник: якщо спостерігач не спрацював — показати все, а не лишити
       порожню сторінку. */
    setTimeout(function () {
      if ($('.reveal.is-in')) return;
      revealAll();
    }, 2500);
  } else {
    revealAll();
  }

  /* ----------------------------------------------------------------- FAQ -- */
  $$('.faq__item').forEach(function (item) {
    var button = $('.faq__q', item);
    button.setAttribute('aria-expanded', 'false');

    button.addEventListener('click', function () {
      var willOpen = !item.classList.contains('is-open');

      $$('.faq__item').forEach(function (other) {
        other.classList.remove('is-open');
        $('.faq__q', other).setAttribute('aria-expanded', 'false');
      });

      item.classList.toggle('is-open', willOpen);
      button.setAttribute('aria-expanded', String(willOpen));
    });
  });

  /* ------------------------------------------------- Модальні вікна ------- */
  var modal       = $('#modal');
  var modalForm   = $('#modalForm');
  var modalTitle  = $('#modalTitle');
  var modalSource = $('#modalSource');
  var modalSubject= $('#modalSubject');
  var modalCalc   = $('#modalCalc');
  var quizModal   = $('#quiz');
  var lastFocus   = null;

  function openModalEl(el) {
    lastFocus = document.activeElement;
    el.classList.add('is-open');
    lockBody();
    var first = $('input:not([type=hidden]), button.quiz__option', el);
    if (first) setTimeout(function () { first.focus(); }, 140);
  }

  function closeModalEl(el) {
    el.classList.remove('is-open');
    unlockBody();
    if (lastFocus) lastFocus.focus();
  }

  /* В-2. Заголовок спливного вікна відповідає кнопці, з якої воно відкрите */
  $$('[data-modal-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      closeDrawer();
      if (quizModal.classList.contains('is-open')) closeModalEl(quizModal);

      var title = btn.getAttribute('data-modal-title');
      if (title) modalTitle.textContent = title;

      modalSource.value  = btn.getAttribute('data-modal-source') || 'modal';
      modalSubject.value = btn.getAttribute('data-modal-subject') || '';

      /* Заявка з калькулятора несе розрахунок із собою */
      modalCalc.value = btn.hasAttribute('data-modal-attach-calc') && window.NL_CALC
        ? window.NL_CALC.summary()
        : '';

      openModalEl(modal);
    });
  });

  $('#modalClose').addEventListener('click', function () { closeModalEl(modal); });

  /* Квіз */
  $$('[data-quiz-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      closeDrawer();
      if (window.NL_QUIZ) window.NL_QUIZ.reset();
      openModalEl(quizModal);
    });
  });

  $$('[data-quiz-close]').forEach(function (btn) {
    btn.addEventListener('click', function () { closeModalEl(quizModal); });
  });

  $$('.modal').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (e.target === el) closeModalEl(el);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = $('.modal.is-open');
    if (open) { closeModalEl(open); return; }
    if (drawer.classList.contains('is-open')) closeDrawer();
  });

  /* --------------------------------------------------------- Валідація ---- */
  var PHONE_RE = /^[+]?[\d\s().-]{9,20}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
  var MAX_FILE = 15 * 1024 * 1024;
  var FILE_OK  = ['dxf', 'dwg', 'pdf', 'jpg', 'jpeg', 'png'];

  function setError(input, on) {
    var field = input.closest('.field');
    if (field) field.classList.toggle('has-error', on);
  }

  function consentErrorEl(consent) {
    var wrap = consent.closest('.consent');
    var next = wrap && wrap.nextElementSibling;
    return next && next.classList.contains('field__error') ? next : null;
  }

  function validate(form) {
    var ok = true;
    var firstBad = null;

    function fail(input) {
      setError(input, true);
      ok = false;
      if (!firstBad) firstBad = input;
    }

    /* Обов’язкові текстові поля та списки */
    $$('input[required], select[required], textarea[required]', form).forEach(function (input) {
      if (input.type === 'checkbox' || input.type === 'file') return;

      var value = input.value.trim();
      if (!value) { fail(input); return; }

      if (input.name === 'name' && value.length < 2) { fail(input); return; }
      if (input.type === 'tel' && !PHONE_RE.test(value)) { fail(input); return; }

      setError(input, false);
    });

    /* Email — необов’язковий, але формат перевіряємо */
    var email = $('input[type="email"]', form);
    if (email) {
      var emailBad = email.value.trim() !== '' && !EMAIL_RE.test(email.value.trim());
      setError(email, emailBad);
      if (emailBad) { ok = false; if (!firstBad) firstBad = email; }
    }

    /* Файл креслення (Б-5) */
    var file = $('input[type="file"]', form);
    if (file && file.files && file.files.length) {
      var f = file.files[0];
      var ext = (f.name.split('.').pop() || '').toLowerCase();
      var fileBad = FILE_OK.indexOf(ext) === -1 || f.size > MAX_FILE;
      setError(file, fileBad);
      if (fileBad) { ok = false; if (!firstBad) firstBad = file; }
    }

    /* Згода на обробку даних */
    var consent = $('input[name="consent"]', form);
    if (consent) {
      var err = consentErrorEl(consent);
      if (err) err.style.display = consent.checked ? 'none' : 'block';
      if (!consent.checked) { ok = false; if (!firstBad) firstBad = consent; }
    }

    if (firstBad) firstBad.focus();
    return ok;
  }

  /* ------------------------------------------------- Надсилання заявок ---- */
  function collect(form) {
    var payload = {};
    new FormData(form).forEach(function (value, key) {
      if (value instanceof File) {
        if (value.name) payload[key] = { name: value.name, size: value.size };
        return;
      }
      payload[key] = value;
    });

    /* Відповіді квіза й мітки для CRM (Б-3) */
    if (form === (window.NL_QUIZ && window.NL_QUIZ.form) && window.NL_QUIZ) {
      Object.assign(payload, window.NL_QUIZ.getMeta());
    }

    payload.page   = location.pathname;
    payload.sentAt = new Date().toISOString();
    return payload;
  }

  function handle(form) {
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate(form)) return;

      var payload = collect(form);
      var button  = $('button[type="submit"]', form);
      var label   = button.textContent;

      button.disabled = true;
      button.textContent = 'Надсилаємо…';

      /* В-5. Переадресація на сторінку подяки зберігається — на ній стоїть
         конверсія. Персональні дані в URL не передаються. */
      var done = function () { location.href = THANK_YOU; };

      if (!ENDPOINT) {
        console.info('[form] заявка готова до надсилання:', payload);
        setTimeout(done, 400);
        return;
      }

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(done)
        .catch(function (err) {
          console.error('[form] не вдалося надіслати:', err);
          button.disabled = false;
          button.textContent = label;
          alert('Не вдалося надіслати заявку. Зателефонуйте нам або напишіть у Telegram.');
        });
    });

    /* Знімати помилку, як тільки користувач почав виправляти поле */
    $$('input, select, textarea', form).forEach(function (input) {
      var event = (input.tagName === 'SELECT' || input.type === 'checkbox' || input.type === 'file')
        ? 'change'
        : 'input';

      input.addEventListener(event, function () {
        setError(input, false);
        if (input.name === 'consent' && input.checked) {
          var err = consentErrorEl(input);
          if (err) err.style.display = 'none';
        }
      });
    });
  }

  handle($('#mainForm'));
  handle(modalForm);
  handle($('#sampleForm'));
  handle($('#quizForm'));

  /* --------------------------------------------------- Плавні переходи ---- */
  $$('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (id === '#' || id.length < 2) return;

      var target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - (header.offsetHeight + 12);
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });

  /* Посилання, які ще нікуди не ведуть (каталог моделей) */
  $$('[data-todo-link]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      console.warn('[todo] Не задано адресу каталогу моделей для:', link.textContent.trim());
    });
  });

  $('#year').textContent = new Date().getFullYear();
})();
