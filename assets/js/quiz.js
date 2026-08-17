/* ==========================================================================
   Б-3. Квіз-підбір верстата — 7 кроків
   --------------------------------------------------------------------------
   Перші шість кроків корисні для клієнта, контакт — останнім, разом із уже
   готовим підбором. Усі відповіді йдуть у заявку (payload.quiz), щоб CRM
   бачила сегмент, а не тільки телефон.

   Відповідь «Збираю інформацію» на кроці 5 позначає ліда холодним:
   payload.lead_temperature = 'cold', payload.do_not_call = true.
   ========================================================================== */
(function () {
  'use strict';

  var STEPS = [
    {
      key: 'task',
      title: 'Яке завдання потрібно вирішити?',
      options: [
        { value: 'cut-sheet',  label: 'Різка листа' },
        { value: 'cut-tube',   label: 'Різка труби і профілю' },
        { value: 'weld',       label: 'Зварювання' },
        { value: 'clean',      label: 'Очищення від іржі й фарби' },
        { value: 'mark',       label: 'Маркування та гравіювання' },
        { value: 'unsure',     label: 'Ще не визначився' }
      ]
    },
    {
      key: 'material',
      title: 'З яким матеріалом працюєте?',
      options: [
        { value: 'steel',  label: 'Чорна сталь' },
        { value: 'inox',   label: 'Нержавійка' },
        { value: 'alu',    label: 'Алюміній' },
        { value: 'copper', label: 'Мідь, латунь' },
        { value: 'mixed',  label: 'Кілька матеріалів' }
      ]
    },
    {
      key: 'thickness',
      title: 'Яка товщина?',
      hint: 'Головний фільтр — від нього залежить потужність і ціна.',
      options: [
        { value: 't3',   label: 'до 3 мм' },
        { value: 't8',   label: '3–8 мм' },
        { value: 't20',  label: '8–20 мм' },
        { value: 't20p', label: 'понад 20 мм' }
      ]
    },
    {
      key: 'volume',
      title: 'Який обсяг роботи?',
      options: [
        { value: 'onetime', label: 'Разові вироби' },
        { value: 'h8',      label: 'до 8 годин на добу' },
        { value: 'h16',     label: 'Змінна робота, 16+ годин' },
        { value: 'serial',  label: 'Серійне виробництво' }
      ]
    },
    {
      key: 'when',
      title: 'Коли плануєте запуск?',
      options: [
        { value: 'now',   label: 'Цього місяця' },
        { value: 'm1_3',  label: 'За 1–3 місяці' },
        { value: 'm3_6',  label: 'За 3–6 місяців' },
        { value: 'info',  label: 'Збираю інформацію' }
      ]
    },
    {
      key: 'payment',
      title: 'Як плануєте оплату?',
      options: [
        { value: 'own',     label: 'Власні кошти' },
        { value: 'grant',   label: 'Грант чи держпрограма' },
        { value: 'leasing', label: 'Лізинг, кредит' },
        { value: 'consult', label: 'Потрібна консультація' }
      ]
    }
  ];

  var TOTAL = STEPS.length + 1; /* +1 — крок контакту */

  var quiz      = document.getElementById('quiz');
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

  /* ------------------------------------------------------------ підбір ---- */
  /* Використовує таблицю з calc.js, якщо вона доступна. */
  function recommend() {
    var thickness = answers.thickness || 't8';
    var material  = answers.material === 'mixed' ? 'inox' : (answers.material || 'steel');

    var base = 3;
    if (window.NL_CALC) {
      var hoursMap = { onetime: 'h4', h8: 'h8', h16: 'h16', serial: 'h16p' };
      var r = window.NL_CALC.compute({
        material: material,
        thickness: thickness,
        hours: hoursMap[answers.volume] || 'h8',
        spend: 0,
        metres: 0
      });
      base = r.power;
    }

    var TASK_FAMILY = {
      'cut-sheet': 'різка листа',
      'cut-tube':  'різка труби і профілю',
      'weld':      'зварювання',
      'clean':     'очищення металу',
      'mark':      'маркування',
      'unsure':    'універсальне рішення'
    };

    var family = TASK_FAMILY[answers.task] || 'різка металу';

    /* Зварювання й очищення — інший модельний ряд, менші потужності */
    if (answers.task === 'weld') {
      return [
        { name: 'Зварювальний апарат 1,5 кВт 4 в 1 Raycus', spec: '1,5 кВт · 220 В', price: '295 403 грн',
          why: 'Базова модель під ' + family + ' до 3 мм. Одразу вміє різати, чистити й зачищати шов.' },
        { name: 'Зварювальний апарат 2 кВт 4 в 1 Maxphotonics', spec: '2 кВт · подвійна подача дроту', price: '416 249 грн',
          why: 'Якщо є товщини до 6 мм або потрібен ширший діапазон дроту.' },
        { name: 'Зварювальний апарат 3 кВт 4 в 1 Maxphotonics', spec: '3 кВт · водяне охолодження', price: '581 853 грн',
          why: 'Для змінної роботи: водяне охолодження тримає режим цілу зміну.' }
      ];
    }

    if (answers.task === 'clean' || answers.task === 'mark') {
      return [
        { name: answers.task === 'mark' ? 'Маркер 30 Вт (Fiber)' : 'Очищувач 200 Вт',
          spec: 'мобільне виконання', price: '[ЦІНА]',
          why: 'Стартова конфігурація під ' + family + '. Точну модель і ціну підтвердить інженер.' },
        { name: answers.task === 'mark' ? 'Маркер 50 Вт (Fiber)' : 'Очищувач 1 кВт',
          spec: 'стаціонарне виконання', price: '[ЦІНА]',
          why: 'Якщо потрібна вища швидкість і робота у дві зміни.' }
      ];
    }

    var next = base >= 6 ? 6 : (base === 4 ? 6 : (base === 3 ? 4 : 3));

    return [
      { name: 'Оптоволоконна різка ' + String(base).replace('.', ',') + ' кВт',
        spec: 'під вашу товщину', price: '[ЦІНА]',
        why: 'Розрахована саме під ' + family + ' і вашу товщину при заявленому завантаженні.' },
      { name: 'Оптоволоконна різка ' + String(next).replace('.', ',') + ' кВт',
        spec: 'із запасом', price: '[ЦІНА]',
        why: 'Варіант із запасом: швидше на ваших товщинах і залишає місце для зростання обсягу.' }
    ];
  }

  function renderResult() {
    var models = recommend();
    var html = '<p class="quiz__result-head">За вашими відповідями підходить:</p><div class="quiz__models">';
    models.forEach(function (m) {
      html += '<div class="quiz__model">' +
                '<b>' + m.name + '</b>' +
                '<span class="quiz__model-spec">' + m.spec + '</span>' +
                '<span class="quiz__model-price">' + m.price.replace('[ЦІНА]', '<span class="todo">[ЦІНА]</span>') + '</span>' +
                '<span class="quiz__model-why">' + m.why + '</span>' +
              '</div>';
    });
    html += '</div><p class="quiz__result-note">Надішлемо повне КП із цінами, строком поставки й розрахунком окупності.</p>';
    result.innerHTML = html;
    result.hidden = false;
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

    var html = step.hint ? '<p class="quiz__hint">' + step.hint + '</p>' : '';
    step.options.forEach(function (opt) {
      var active = answers[step.key] === opt.value ? ' is-active' : '';
      html += '<button class="quiz__option' + active + '" type="button" data-value="' + opt.value + '">' +
                opt.label +
              '</button>';
    });
    options.innerHTML = html;
  }

  options.addEventListener('click', function (e) {
    var btn = e.target.closest('.quiz__option');
    if (!btn) return;
    answers[STEPS[index].key] = btn.getAttribute('data-value');
    index++;
    render();
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
    /* Мітки для CRM: холодний лід не дзвонити, віддати в email-ланцюжок */
    getMeta: function () {
      var cold = answers.when === 'info';
      return {
        quiz: Object.assign({}, answers),
        lead_temperature: cold ? 'cold' : 'warm',
        do_not_call: cold,
        recommended: recommend().map(function (m) { return m.name; }).join(' | ')
      };
    }
  };

  render();
})();
