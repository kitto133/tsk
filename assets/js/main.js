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
     Адреса вебхука Make.com. Це єдине місце, де вона задається — міняти тут.
     Якщо лишити порожнім, payload пишеться в консоль, а людина все одно
     потрапляє на сторінку подяки, щоб потік можна було протестувати.

     ПІСЛЯ ХОСТИНГУ обовʼязково перевірте, що заявки доходять: відкрийте
     сайт із ?leadtest=1 в адресі — угорі зʼявиться панель самоперевірки.
     Вона надсилає позначену тестову заявку й показує відповідь сервера.
     ------------------------------------------------------------------------ */
  var ENDPOINT   = 'https://hook.eu2.make.com/n6fbfan75izqsayuyg4p73bsvdkwixln';
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
  /* ---------------------------------------------------------- Телефон ----
     Український номер у канонічному вигляді: +380 і ще 9 цифр, перша з яких
     3–9 (0, 1 і 2 після коду країни не використовуються). Це відсікає і
     випадкові набори цифр, і надто довгі номери.

     Приймаємо звичні способи запису — +380671234567, 380671234567,
     0671234567, 671234567 — з будь-якими пробілами, дужками й дефісами,
     а в CRM віддаємо один формат. */
  var PHONE_UA = /^\+380[3-9]\d{8}$/;

  function normalizePhone(raw) {
    var digits = String(raw || '').replace(/\D/g, '');
    var candidate =
      digits.length === 12 && digits.slice(0, 3) === '380' ? '+' + digits :
      digits.length === 11 && digits.slice(0, 2) === '80'  ? '+3' + digits :
      digits.length === 10 && digits.charAt(0) === '0'     ? '+38' + digits :
      digits.length === 9                                  ? '+380' + digits :
      null;
    return candidate && PHONE_UA.test(candidate) ? candidate : null;
  }

  /* ------------------------------------------------------- Маска номера --
     Поле саме тримає формат +380 XX XXX XX XX. Зайві цифри не вводяться:
     після коду країни лишається рівно 9 знаків, решта відкидається — і при
     наборі, і при вставці з буфера.

     На інпутах НЕ МОЖНА ставити maxlength — обмеження живе тільки тут.
     Браузер застосовує maxlength ДО того, як спрацює наш обробник, тому
     автозаповнення й вставка повного номера обрізалися з хвоста: телефон
     підставляв +380671234567, maxlength="12" лишав +38067123456, і поле
     показувало «67 123 45 6» — на цифру коротше, зате виглядало правдоподібно.
     На телефоні це основний спосіб заповнення, тому й ламалося саме там. */

  /* Абонентські цифри без коду країни, максимум 9.
     Нуль відкидається окремо від коду країни, а не замість нього: людина
     часто набирає 067… у полі, де +380 вже підставлено, і без цього кроку
     нуль ставав би абонентською цифрою й зсував увесь номер. Українські
     номери після коду країни починаються з 3–9, тому 0 тут завжди зайвий. */
  function subscriberDigits(raw) {
    var d = String(raw || '').replace(/\D/g, '');
    if (d.indexOf('380') === 0)      d = d.slice(3);
    else if (d.indexOf('80') === 0)  d = d.slice(2);
    if (d.charAt(0) === '0')         d = d.slice(1);
    return d.slice(0, 9);
  }

  /* Абонентська частина у вигляді XX XXX XX XX — код країни живе поруч,
     окремим елементом розмітки, і в значення поля не потрапляє. */
  function formatSubscriber(d) {
    var out = d.slice(0, 2);
    if (d.length > 2) out += ' ' + d.slice(2, 5);
    if (d.length > 5) out += ' ' + d.slice(5, 7);
    if (d.length > 7) out += ' ' + d.slice(7, 9);
    return out;
  }

  /* Що саме людина ввела в поле. Просто набрані 9 цифр беремо як є, а от
     вставку або автозаповнення повного номера (+380…, 0…) чистимо від коду
     країни й трунк-нуля. */
  function fieldSubscriber(value) {
    var d = String(value || '').replace(/\D/g, '');
    var looksFull = String(value).indexOf('+') !== -1 || d.charAt(0) === '0' || d.length > 9;
    return looksFull ? subscriberDigits(value) : d.slice(0, 9);
  }

  function attachPhoneMask(input) {
    function caretAfterNthDigit(value, nth) {
      if (nth <= 0) return 0;
      var seen = 0;
      for (var i = 0; i < value.length; i++) {
        if (/\d/.test(value[i]) && ++seen === nth) return i + 1;
      }
      return value.length;
    }

    /* Форматуємо просто під час набору: коду країни в значенні немає,
       тому неоднозначності, через яку це не працювало раніше, теж немає. */
    input.addEventListener('input', function () {
      var caret = input.selectionStart || 0;
      var digitsBefore = input.value.slice(0, caret).replace(/\D/g, '').length;

      var formatted = formatSubscriber(fieldSubscriber(input.value));
      if (formatted === input.value) return;

      input.value = formatted;
      var pos = caretAfterNthDigit(formatted, digitsBefore);
      try { input.setSelectionRange(pos, pos); } catch (e) { /* не текстове поле */ }
    });

    input.addEventListener('blur', function () {
      input.value = formatSubscriber(fieldSubscriber(input.value));
    });
  }

  $$('input[type="tel"]').forEach(attachPhoneMask);
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
      if (input.type === 'tel' && !normalizePhone(value)) { fail(input); return; }

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

    /* У CRM телефон іде в одному форматі +380XXXXXXXXX, як його не вводили */
    if (payload.phone) {
      var normalized = normalizePhone(payload.phone);
      if (normalized) payload.phone = normalized;
    }

    /* Відповіді квіза й мітки для CRM (Б-3) */
    if (form === (window.NL_QUIZ && window.NL_QUIZ.form) && window.NL_QUIZ) {
      Object.assign(payload, window.NL_QUIZ.getMeta());
    }

    payload.page   = location.pathname;
    payload.sentAt = new Date().toISOString();
    return payload;
  }

  /* Повідомлення про невдале надсилання з прямими контактами — щоб людина
     могла звʼязатися навіть тоді, коли інтеграція лежить. */
  function showFailure(form) {
    var box = $('.form__fail', form);
    if (!box) {
      box = document.createElement('p');
      box.className = 'form__fail';
      box.setAttribute('role', 'alert');
      box.innerHTML =
        'Не вдалося надіслати заявку — можливо, тимчасовий збій. ' +
        'Напишіть або зателефонуйте, ми відповімо одразу:<br>' +
        '<a href="tel:+380739333188">+38 073 933 31 88</a> · ' +
        '<a href="https://t.me/tskassistant_bot" target="_blank" rel="noopener">Telegram</a>';
      var button = $('button[type="submit"]', form);
      button.parentNode.insertBefore(box, button.nextSibling);
    }
    box.hidden = false;
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

      /* Заявку не можна втратити мовчки: якщо надсилання не вдалося, лишаємо
         людину на формі, показуємо прямі контакти й пишемо payload у консоль. */
      var fail = function (reason) {
        console.error('[form] заявку не надіслано:', reason, payload);
        button.disabled = false;
        button.textContent = label;
        showFailure(form);
      };

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
        .then(function (response) {
          /* fetch не кидає помилку на 4xx/5xx — без цієї перевірки заявка
             при вимкненому сценарії Make.com зникала б, а людина бачила б
             сторінку подяки. */
          if (!response.ok) throw new Error('HTTP ' + response.status);
          done();
        })
        .catch(fail);
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


  $('#year').textContent = new Date().getFullYear();

  /* ------------------------------------------------ Самоперевірка ---------
     Головна причина «сайт захостили, а заявки не йдуть» у тому, що зламане
     надсилання ніяк себе не проявляє: форма мовчить, людина йде, ніхто не
     дізнається. Перевіряти це вручну через справжню заявку незручно, тому
     перевірка вбудована в сам сайт.

     Відкрити САЙТ/?leadtest=1 — угорі зʼявиться панель із кнопкою. Вона
     надсилає на той самий вебхук позначену тестову заявку і показує, що саме
     відповів сервер. Видно і адресу, і код відповіді, і текст помилки.

     Кнопка, а не автозапуск: панель не має слати нічого в CRM тільки тому,
     що хтось відкрив посилання.

     Позначка сайту як робочого (data-lead-js) стоїть тут же: якщо main.js не
     завантажився, атрибута не буде — саме на це спирається запобіжник
     у <head> сторінки. */
  document.documentElement.setAttribute('data-lead-js', 'ok');

  if (location.search.indexOf('leadtest') !== -1) {
    var panel = document.createElement('div');
    panel.className = 'leadtest';
    panel.innerHTML =
      '<b>Самоперевірка приймання заявок</b>' +
      '<span class="leadtest__url"></span>' +
      '<button type="button">Надіслати тестову заявку</button>' +
      '<span class="leadtest__out">Натисніть кнопку — у Make має зʼявитися заявка з іменем «ТЕСТ».</span>';
    panel.querySelector('.leadtest__url').textContent = ENDPOINT || '(адресу не вказано)';
    document.body.appendChild(panel);

    var out = panel.querySelector('.leadtest__out');
    var btn = panel.querySelector('button');

    btn.addEventListener('click', function () {
      if (!ENDPOINT) {
        out.textContent = 'Адреса вебхука не вказана — заявкам нікуди йти. ' +
                          'Пропишіть ENDPOINT в assets/js/main.js.';
        out.className = 'leadtest__out is-bad';
        return;
      }

      btn.disabled = true;
      out.className = 'leadtest__out';
      out.textContent = 'Надсилаємо…';

      var started = Date.now();

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'ТЕСТ — перевірка сайту, не передзвонювати',
          phone: '+380000000000',
          form_source: 'leadtest',
          note: 'Автоматична перевірка приймання заявок після хостингу.',
          page: location.href,
          sentAt: new Date().toISOString()
        })
      })
        .then(function (r) {
          var ms = Date.now() - started;
          if (r.ok) {
            out.className = 'leadtest__out is-ok';
            out.textContent = 'Працює. Сервер відповів ' + r.status + ' за ' + ms + ' мс. ' +
                              'Перевірте, що в Make зʼявилася заявка з іменем «ТЕСТ», і видаліть її.';
          } else {
            out.className = 'leadtest__out is-bad';
            out.textContent = 'Не працює: сервер відповів ' + r.status + '. ' +
              (r.status === 410
                ? 'Код 410 означає, що сценарій у Make вимкнений — увімкніть перемикач унизу ліворуч.'
                : 'Перевірте адресу вебхука в assets/js/main.js.');
          }
          btn.disabled = false;
        })
        .catch(function (e) {
          out.className = 'leadtest__out is-bad';
          out.textContent = 'Не працює: запит навіть не дійшов (' + e.message + '). ' +
            'Найчастіше це блокувальник реклами в браузері або немає доступу до мережі. ' +
            'Спробуйте в режимі інкогніто з вимкненими розширеннями.';
          btn.disabled = false;
        });
    });
  }
})();
