/* ==========================================================================
   Б-3. Квіз-підбір обладнання — 2 питання + контакт
   --------------------------------------------------------------------------
   Скорочений сценарій: мета використання й бюджет. Підбір робиться за
   бюджетною вилкою (ціни — з каталогу, розділ 1.1 брифу), а мета використання
   уточнює формулювання й пріоритет у КП.

   Контакт запитується останнім, коли вже є що показати.
   Усі відповіді йдуть у заявку разом із контактом.
   ========================================================================== */
(function () {
  'use strict';

  var STEPS = [
    {
      key: 'purpose',
      type: 'options',
      title: 'Для яких цілей вам потрібне обладнання?',
      options: [
        { value: 'home',       label: 'Для домашнього використання' },
        { value: 'production', label: 'Для виробництва' },
        { value: 'business',   label: 'Для бізнесу' }
      ]
    },
    {
      key: 'budget',
      type: 'slider',
      title: 'Підкажіть ваш бюджет',
      hint: 'Пересуньте повзунок — покажемо, що входить у цю вилку.',
      options: [
        { value: 'b1', label: 'Менше 300 000 грн',                 short: 'до 300 тис.' },
        { value: 'b2', label: 'Від 300 000 грн до 1 000 000 грн',  short: '300 тис. – 1 млн' },
        { value: 'b3', label: 'Від 1 000 000 грн',                 short: 'від 1 млн' }
      ]
    }
  ];

  var TOTAL = STEPS.length + 1; /* +1 — крок контакту */

  /* Підбір за бюджетом. Ціни — з каталогу сайту. */
  var BUDGET_PICKS = {
    b1: [
      { name: 'Лазерний маркер і гравер', spec: '20–50 Вт, настільне виконання', price: 'від 109 000 грн' },
      { name: 'Зварювальний апарат 4 в 1, 1,5 кВт', spec: 'Raycus · 1,5 кВт · 220 В', price: '295 403 грн' }
    ],
    b2: [
      { name: 'Зварювальний апарат 4 в 1, 2 кВт', spec: 'Maxphotonics · подвійна подача дроту', price: '416 249 грн' },
      { name: 'Зварювальний апарат 4 в 1, 3 кВт', spec: 'Maxphotonics · водяне охолодження', price: '581 853 грн' },
      { name: 'Апарат лазерного очищення', spec: '200 Вт – 3 кВт · мобільне виконання', price: 'від 415 000 грн' }
    ],
    b3: [
      { name: 'TSK Laser H1530, 1,5 кВт', spec: 'поле 1500 × 3000 мм · чорна сталь до 3 мм', price: 'від 1 284 008 грн' },
      { name: 'TSK Laser H1530, 3 кВт',   spec: 'поле 1500 × 3000 мм · чорна сталь 3–8 мм',  price: 'від 1 449 977 грн' },
      { name: 'TSK Laser H1530, 6 кВт',   spec: 'поле 1500 × 3000 мм · чорна сталь 8–20 мм', price: 'від 2 801 309 грн' }
    ]
  };

  var PURPOSE_NOTE = {
    home:       'Для домашньої майстерні дивимось на компактні моделі з живленням 220 В.',
    production: 'Для виробництва враховуємо ресурс і роботу в зміну — охолодження та запас потужності.',
    business:   'Під бізнес-задачі рахуємо окупність: собівартість деталі й строк повернення інвестиції.'
  };

  var quiz = document.getElementById('quiz');
  if (!quiz) return;

  var stepLabel = document.getElementById('quizStep');
  var bar       = document.getElementById('quizBar');
  var title     = document.getElementById('quizTitle');
  var options   = document.getElementById('quizOptions');
  var contact   = document.getElementById('quizForm');
  var result    = document.getElementById('quizResult');
  var backBtn   = document.getElementById('quizBack');

  var answers = {};
  var index   = 0;

  function labelOf(step, value) {
    for (var i = 0; i < step.options.length; i++) {
      if (step.options[i].value === value) return step.options[i].label;
    }
    return value;
  }

  /* ------------------------------------------------------------ підбір ---- */
  function recommend() {
    return BUDGET_PICKS[answers.budget] || BUDGET_PICKS.b2;
  }

  function renderResult() {
    var models = recommend();
    var note = PURPOSE_NOTE[answers.purpose] || '';

    var html = '<p class="quiz__result-head">За вашою вилкою бюджету підходить:</p>' +
               '<div class="quiz__models">';
    models.forEach(function (m) {
      html += '<div class="quiz__model">' +
                '<b>' + m.name + '</b>' +
                '<span class="quiz__model-spec">' + m.spec + '</span>' +
                '<span class="quiz__model-price">' + m.price + '</span>' +
              '</div>';
    });
    html += '</div>';
    if (note) html += '<p class="quiz__result-note">' + note + '</p>';
    html += '<p class="quiz__result-note">Надішлемо КП з характеристиками, строком поставки ' +
            'й розрахунком окупності під ваші обсяги.</p>';

    result.innerHTML = html;
    result.hidden = false;
  }

  /* ------------------------------------------------------- крок-повзунок -- */
  function renderSlider(step) {
    var picked = answers[step.key] || step.options[1].value;
    var idx = 0;
    step.options.forEach(function (o, i) { if (o.value === picked) idx = i; });

    var ticks = step.options.map(function (o) {
      return '<span>' + o.short + '</span>';
    }).join('');

    options.innerHTML =
      (step.hint ? '<p class="quiz__hint">' + step.hint + '</p>' : '') +
      '<div class="quiz__slider">' +
        '<output class="quiz__slider-value" id="quizBudgetValue">' + step.options[idx].label + '</output>' +
        '<input class="quiz__range" id="quizRange" type="range" min="0" max="' +
          (step.options.length - 1) + '" step="1" value="' + idx + '" ' +
          'aria-label="' + step.title + '">' +
        '<div class="quiz__slider-ticks">' + ticks + '</div>' +
      '</div>' +
      '<button class="btn btn--amber btn--block quiz__next" type="button" data-quiz-next>Далі →</button>';

    var range = document.getElementById('quizRange');
    var value = document.getElementById('quizBudgetValue');

    /* фіксуємо початкове значення, щоб «Далі» працювало без руху повзунка */
    answers[step.key] = step.options[idx].value;

    range.addEventListener('input', function () {
      var i = Number(range.value);
      value.textContent = step.options[i].label;
      answers[step.key] = step.options[i].value;
    });
  }

  /* ------------------------------------------------------------- рендер --- */
  function render() {
    var isContact = index >= STEPS.length;

    stepLabel.textContent = 'Крок ' + (index + 1) + ' з ' + TOTAL;
    bar.style.width = ((index + 1) / TOTAL * 100) + '%';
    backBtn.hidden = index === 0;

    if (isContact) {
      title.textContent = 'Куди надіслати підбір і розрахунок?';
      options.hidden = true;
      options.innerHTML = '';
      renderResult();
      contact.hidden = false;
      return;
    }

    var step = STEPS[index];
    title.textContent = step.title;
    contact.hidden = true;
    result.hidden = true;
    options.hidden = false;

    if (step.type === 'slider') { renderSlider(step); return; }

    var html = step.hint ? '<p class="quiz__hint">' + step.hint + '</p>' : '';
    step.options.forEach(function (opt) {
      var active = answers[step.key] === opt.value ? ' is-active' : '';
      html += '<button class="quiz__option' + active + '" type="button" data-value="' +
              opt.value + '">' + opt.label + '</button>';
    });
    options.innerHTML = html;
  }

  options.addEventListener('click', function (e) {
    var btn = e.target.closest('.quiz__option');
    if (btn) {
      answers[STEPS[index].key] = btn.getAttribute('data-value');
      index++;
      render();
      return;
    }
    if (e.target.closest('[data-quiz-next]')) {
      index++;
      render();
    }
  });

  backBtn.addEventListener('click', function () {
    if (index > 0) { index--; render(); }
  });

  /* ---------------------------------------------------------------- API --- */
  function reset() {
    answers = {};
    index = 0;
    contact.reset();
    contact.querySelectorAll('.field.has-error').forEach(function (f) {
      f.classList.remove('has-error');
    });
    render();
  }

  window.NL_QUIZ = {
    element: quiz,
    form: contact,
    reset: reset,
    getAnswers: function () { return Object.assign({}, answers); },
    /* Читабельні відповіді для CRM + що саме показали клієнту */
    getMeta: function () {
      return {
        quiz: {
          purpose: labelOf(STEPS[0], answers.purpose),
          budget:  labelOf(STEPS[1], answers.budget)
        },
        recommended: recommend().map(function (m) { return m.name; }).join(' | ')
      };
    }
  };

  render();
})();
