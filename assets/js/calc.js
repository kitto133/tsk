/* ==========================================================================
   Б-2. Калькулятор окупності
   --------------------------------------------------------------------------
   Числа в CONFIG — реальні, надані замовником (бриф, розділи 4.1 і 4.2,
   станом на серпень 2026):

     POWER / PRICE / SPEED  таблиця матеріал × товщина від технічного відділу
     OPERATING              тариф 11 грн/кВт·год, газ 70 грн/год,
                            витратники 25 грн/год, оператор 35 000 грн/міс
     OUTSOURCE_RATE         75 грн за метр різки на стороні

   Що лишається орієнтовним: зарплата оператора взята як середина наданого
   діапазону 30 000–40 000 грн, а для комбінацій матеріал × товщина, яких
   немає в таблиці, ціна підставляється за найближчою відомою (у результаті
   показується попередження).
   ========================================================================== */
(function () {
  'use strict';

  var CONFIG = {
    /* Дані підтверджені замовником. true поверне попередження в результаті. */
    provisional: false,

    /* Рекомендована потужність, кВт: матеріал × товщина (бриф 4.1) */
    POWER: {
      steel:  { t3: 1.5, t8: 3, t20: 6, t20p: 6 },
      inox:   { t3: 2,   t8: 4, t20: 6, t20p: 6 },
      alu:    { t3: 3,   t8: 3, t20: 6, t20p: 6 },
      copper: { t3: 3,   t8: 4, t20: 6, t20p: 6 }
    },

    /* Ціна верстата, грн: матеріал × товщина (бриф 4.1).
       null — комбінації, яких у таблиці немає; підставляється найближча. */
    PRICE: {
      steel:  { t3: 1284008, t8: 1449977, t20: 2801309, t20p: null },
      inox:   { t3: 1458586, t8: 1449977, t20: null,    t20p: null },
      alu:    { t3: 1713556, t8: null,    t20: null,    t20p: null },
      copper: { t3: 1767665, t8: null,    t20: null,    t20p: null }
    },

    /* Швидкість різки, м/хв — для показу в результаті */
    SPEED: {
      steel:  { t3: '3,0–4,5', t8: '1,8–2,3', t20: '0,6–1,2', t20p: null },
      inox:   { t3: '4,5–6,5', t8: '1,0–3,0', t20: null,      t20p: null },
      alu:    { t3: '2,0–6,5', t8: null,      t20: null,      t20p: null },
      copper: { t3: '5,0–15,0', t8: null,     t20: null,      t20p: null }
    },

    /* Експлуатація (бриф 4.2) */
    OPERATING: {
      /* Повне споживання = потужність джерела × коефіцієнт
         (джерело + чиллер + приводи + витяжка) */
      powerFactor: 2.2,
      tariffKwh: 11,          /* грн за кВт·год, тариф для підприємств 2026 */
      workDaysPerMonth: 22,
      gasPerHour: 70,         /* середнє по повітрю / кисню / азоту */
      consumablesPerHour: 25, /* лінзи, сопла, кераміка; ресурс ≈ 800 год */
      operatorSalary: 35000   /* середина діапазону 30 000–40 000 грн */
    },

    /* Якщо вказано метри різу замість витрат — оцінюємо поточні витрати */
    OUTSOURCE_RATE: 75, /* грн за метр різки на стороні */

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


  /* ------------------------------------------------------------ розрахунок */
  /* Повертає { power, model, price, monthlyOperating, currentSpend,
                savings, payback, warnings[] } */
  /* Ціна для пари матеріал × товщина. Якщо саме такої комбінації в таблиці
     немає — беремо найближчу відому товщину того ж матеріалу, далі чорну
     сталь, і повідомляємо користувача, що ціна орієнтовна. */
  function lookupPrice(material, thickness, warnings) {
    var order = ['t3', 't8', 't20', 't20p'];
    var row = CONFIG.PRICE[material] || CONFIG.PRICE.steel;

    if (row[thickness]) return row[thickness];

    var idx = order.indexOf(thickness);
    for (var d = 1; d < order.length; d++) {
      var lower = order[idx - d], higher = order[idx + d];
      if (higher && row[higher]) {
        warnings.push('Для цієї товщини ціни в таблиці немає — показана за найближчою ' +
                      'конфігурацією. Точну назве інженер.');
        return row[higher];
      }
      if (lower && row[lower]) {
        warnings.push('Для цієї товщини ціни в таблиці немає — показана за найближчою ' +
                      'конфігурацією. Точну назве інженер.');
        return row[lower];
      }
    }

    var steel = CONFIG.PRICE.steel;
    warnings.push('Для цього поєднання матеріалу й товщини ціни в таблиці немає — ' +
                  'показана за чорною сталлю. Точну назве інженер.');
    return steel[thickness] || steel.t20 || steel.t8;
  }

  function compute(input) {
    var warnings = [];

    var powerRow = CONFIG.POWER[input.material] || CONFIG.POWER.steel;
    var power = powerRow[input.thickness] || 3;
    var price = lookupPrice(input.material, input.thickness, warnings);

    var speedRow = CONFIG.SPEED[input.material] || {};
    var speed = speedRow[input.thickness] || null;

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
      warnings.push('Поточні витрати оцінені з метрів різу за ціною ' +
                    CONFIG.OUTSOURCE_RATE + ' грн/м.');
    }

    var savings = currentSpend - monthlyOperating;
    var payback = savings > 0 ? price / savings : null;

    if (payback === null) {
      warnings.push('За вказаними витратами верстат поки не окупається: власна різка ' +
                    'обійдеться дорожче, ніж ви витрачаєте зараз. Для таких обсягів ' +
                    'інженер порахує сценарій з дозавантаженням сторонніми замовленнями ' +
                    'або запропонує менш потужну конфігурацію.');
    }

    return {
      power: power,
      speed: speed,
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
