/* ==========================================================================
   Б-2. Калькулятор окупності
   --------------------------------------------------------------------------
   УВАГА. Усі числа в CONFIG нижче — ОРІЄНТОВНІ, поставлені щоб калькулятор
   працював. Перед публікацією їх треба замінити даними технічного відділу:

     POWER          таблиця підбору потужності (матеріал × товщина)
     MACHINE_PRICE  ціни моделей за потужністю
     OPERATING      споживання електроенергії та газу, ресурс і ціна витратників
     OUTSOURCE_RATE середня ціна різки на стороні, грн за метр

   Поки провізорні значення на місці, у результаті показується попередження.
   ========================================================================== */
(function () {
  'use strict';

  var CONFIG = {
    /* Чи є числа ще орієнтовними. Поставте false, коли підставите реальні дані —
       і попередження в результаті зникне. */
    provisional: true,

    /* Рекомендована потужність, кВт: матеріал × товщина */
    POWER: {
      steel:  { t3: 1.5, t8: 3,   t20: 6,   t20p: 6 },
      inox:   { t3: 2,   t8: 4,   t20: 6,   t20p: 6 },
      alu:    { t3: 2,   t8: 3,   t20: 6,   t20p: 6 },
      copper: { t3: 3,   t8: 4,   t20: 6,   t20p: 6 }
    },

    /* Понад 16 год/добу — на одну сходинку потужніше, щоб був запас */
    POWER_BUMP_HOURS: ['h16p'],

    /* Ряд доступних потужностей — для округлення вгору після надбавки */
    POWER_STEPS: [1.5, 2, 3, 4, 6],

    /* Ціна верстата за потужністю, грн */
    MACHINE_PRICE: {
      1.5: 950000,
      2:   1100000,
      3:   1250000,
      4:   1500000,
      6:   1850000
    },

    /* Експлуатація */
    OPERATING: {
      /* Повне споживання ≈ потужність джерела × цей коефіцієнт
         (джерело + чиллер + приводи + витяжка) */
      powerFactor: 2.2,
      tariffKwh: 6.5,        /* грн за кВт·год */
      workDaysPerMonth: 22,
      gasPerHour: 25,        /* грн за годину різки */
      consumablesPerHour: 8, /* лінзи, сопла, кераміка — грн за годину */
      operatorSalary: 25000  /* грн на місяць, один оператор */
    },

    /* Якщо вказано метри різу замість витрат — оцінюємо поточні витрати */
    OUTSOURCE_RATE: 45, /* грн за метр різки на стороні */

    /* Середина інтервалу «годин на добу» для розрахунку */
    HOURS_MID: { h4: 3, h8: 6, h16: 12, h16p: 18 }
  };

  /* Людські підписи — щоб у CRM приходив читабельний текст, а не коди */
  var LABEL = {
    now: {
      outsource: 'замовляє різку на стороні',
      plasma: 'ріже плазмою',
      manual: 'гільйотина + слюсарка',
      new: 'новий напрямок'
    },
    material:  { steel: 'чорна сталь', inox: 'нержавійка', alu: 'алюміній', copper: 'мідь, латунь' },
    thickness: { t3: 'до 3 мм', t8: '3–8 мм', t20: '8–20 мм', t20p: 'понад 20 мм' },
    hours:     { h4: 'до 4 год/добу', h8: '4–8 год/добу', h16: '8–16 год/добу', h16p: 'понад 16 год/добу' }
  };

  var MODEL_LABEL = {
    1.5: 'оптоволоконна різка 1,5 кВт',
    2:   'оптоволоконна різка 2 кВт',
    3:   'оптоволоконна різка 3 кВт',
    4:   'оптоволоконна різка 4 кВт',
    6:   'оптоволоконна різка 6 кВт'
  };

  /* --------------------------------------------------------------- helpers */
  function money(value) {
    return Math.round(value).toLocaleString('uk-UA') + ' грн';
  }

  function stepUp(power) {
    var steps = CONFIG.POWER_STEPS;
    for (var i = 0; i < steps.length; i++) {
      if (steps[i] > power) return steps[i];
    }
    return steps[steps.length - 1];
  }

  /* ------------------------------------------------------------ розрахунок */
  /* Повертає { power, model, price, monthlyOperating, currentSpend,
                savings, payback, warnings[] } */
  function compute(input) {
    var warnings = [];

    var power = (CONFIG.POWER[input.material] || CONFIG.POWER.steel)[input.thickness] || 3;
    if (CONFIG.POWER_BUMP_HOURS.indexOf(input.hours) !== -1) power = stepUp(power);

    var price = CONFIG.MACHINE_PRICE[power] || CONFIG.MACHINE_PRICE[3];
    var hoursPerDay = CONFIG.HOURS_MID[input.hours] || 6;
    var op = CONFIG.OPERATING;
    var hoursPerMonth = hoursPerDay * op.workDaysPerMonth;

    var electricity = power * op.powerFactor * hoursPerMonth * op.tariffKwh;
    var gas         = hoursPerMonth * op.gasPerHour;
    var consumables = hoursPerMonth * op.consumablesPerHour;
    var monthlyOperating = electricity + gas + consumables + op.operatorSalary;

    /* Поточні витрати: пряма сума або оцінка з метрів різу */
    var currentSpend = input.spend;
    if (!currentSpend && input.metres) {
      currentSpend = input.metres * CONFIG.OUTSOURCE_RATE;
      warnings.push('Поточні витрати оцінені з метрів різу за середньою ціною ' +
                    CONFIG.OUTSOURCE_RATE + ' грн/м.');
    }

    var savings = currentSpend - monthlyOperating;
    var payback = savings > 0 ? price / savings : null;

    if (payback === null) {
      warnings.push('За вказаними витратами верстат поки не окупається: своя різка ' +
                    'обійдеться дорожче, ніж ви витрачаєте зараз. Це нормально для ' +
                    'малих обсягів — інженер підбере менш потужну модель або порахує ' +
                    'сценарій з дозавантаженням сторонніми замовленнями.');
    }

    return {
      power: power,
      model: MODEL_LABEL[power] || ('верстат ' + power + ' кВт'),
      price: price,
      monthlyOperating: monthlyOperating,
      currentSpend: currentSpend,
      savings: savings,
      payback: payback,
      warnings: warnings,
      provisional: CONFIG.provisional
    };
  }

  /* ---------------------------------------------------------------- render */
  var form     = document.getElementById('calcForm');
  var empty    = document.getElementById('calcEmpty');
  var out      = document.getElementById('calcOut');
  if (!form) return;

  var lastResult = null;

  function fieldError(input, on) {
    var field = input.closest('.field');
    if (field) field.classList.toggle('has-error', on);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var spendEl  = form.querySelector('[name="spend"]');
    var metresEl = form.querySelector('[name="metres"]');
    var spend  = Number(spendEl.value) || 0;
    var metres = Number(metresEl.value) || 0;

    /* Потрібне хоч одне з двох */
    if (!spend && !metres) {
      fieldError(spendEl, true);
      spendEl.focus();
      return;
    }
    fieldError(spendEl, false);

    var input = {
      now:       form.querySelector('[name="now"]').value,
      spend:     spend,
      metres:    metres,
      material:  form.querySelector('[name="material"]').value,
      thickness: form.querySelector('[name="thickness"]').value,
      hours:     form.querySelector('[name="hours"]').value
    };

    var r = compute(input);
    lastResult = { input: input, result: r };

    document.getElementById('rModel').textContent = r.model;
    document.getElementById('rPower').textContent = String(r.power).replace('.', ',');
    document.getElementById('rPrice').textContent = money(r.price);
    document.getElementById('rSave').textContent  = r.savings > 0 ? money(r.savings) : '—';
    document.getElementById('rPayback').textContent = r.payback
      ? Math.ceil(r.payback)
      : '—';

    /* Попередження та примітки */
    var notes = out.querySelector('.calc__warnings');
    if (!notes) {
      notes = document.createElement('div');
      notes.className = 'calc__warnings';
      out.insertBefore(notes, out.querySelector('.calc__disclaimer'));
    }
    notes.innerHTML = '';

    var messages = r.warnings.slice();
    if (r.provisional) {
      messages.push('Ціни й норми споживання поки орієнтовні — уточнюються технічним відділом.');
    }
    messages.forEach(function (text) {
      var p = document.createElement('p');
      p.className = 'calc__warning';
      p.textContent = text;
      notes.appendChild(p);
    });

    empty.hidden = true;
    out.hidden = false;
    out.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    document.dispatchEvent(new CustomEvent('calc:result', { detail: lastResult }));
  });

  /* Прибирати помилку, як тільько користувач почав виправляти */
  ['spend', 'metres'].forEach(function (name) {
    var el = form.querySelector('[name="' + name + '"]');
    el.addEventListener('input', function () {
      fieldError(form.querySelector('[name="spend"]'), false);
    });
  });

  /* Доступ для main.js — щоб підкласти розрахунок у заявку */
  window.NL_CALC = {
    compute: compute,
    getLast: function () { return lastResult; },
    summary: function () {
      if (!lastResult) return '';
      var r = lastResult.result;
      var i = lastResult.input;
      return [
        'Зараз: ' + (LABEL.now[i.now] || i.now),
        'матеріал: ' + (LABEL.material[i.material] || i.material),
        'товщина: ' + (LABEL.thickness[i.thickness] || i.thickness),
        'завантаження: ' + (LABEL.hours[i.hours] || i.hours),
        'поточні витрати: ' + Math.round(r.currentSpend) + ' грн/міс',
        'рекомендація: ' + r.model,
        'ціна: ' + Math.round(r.price) + ' грн',
        'економія: ' + (r.savings > 0 ? Math.round(r.savings) + ' грн/міс' : 'не рахується'),
        'окупність: ' + (r.payback ? Math.ceil(r.payback) + ' міс.' : 'не рахується')
      ].join('; ');
    }
  };
})();
