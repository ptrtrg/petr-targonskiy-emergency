/**
 * Отправка формы заявки (задача 2.2, парная к inc/forms.php).
 *
 * Прогрессивное улучшение: сама форма и все поля видны и читаемы без JS
 * (contact.php). Этот файл только перехватывает отправку, чтобы уйти через
 * admin-ajax.php без перезагрузки страницы, и добавляет две вещи, которых
 * в разметке нет и не должно быть — они не про контент, а про защиту:
 *   - момент появления формы (для проверки времени заполнения на сервере);
 *   - метки перехода, источник перехода и адрес страницы (для лида).
 *
 * Работает на форме(ах) с атрибутом [data-petr-contact-form]. Атрибуты
 * data-form-source ("home" | "blog") и data-article-title читаются с самого
 * тега <form> — их проставляет PHP-шаблон секции (contact.php на главной,
 * тот же шаблон с другими параметрами в блоге, задача 2.3).
 */
(function () {
  'use strict';

  if (typeof window.petrDarkForm === 'undefined') {
    // Скрипт подключён без wp_localize_script — не должно случаться в теме,
    // но лучше тихо выйти, чем упасть на попытке читать undefined.
    return;
  }

  var config = window.petrDarkForm;

  function readUtmParams() {
    var params = {};
    var search;
    try {
      search = new URLSearchParams(window.location.search);
    } catch (e) {
      return params;
    }
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (key) {
      var value = search.get(key);
      if (value) {
        params[key] = value;
      }
    });
    return params;
  }

  function fireMetricaGoal(goalName) {
    var goal = goalName || config.metricaGoal;
    if (!goal || typeof window.ym !== 'function' || !config.metricaId) {
      return;
    }
    // Явный вызов цели по требованию: не полагаемся на автоцель Метрики,
    // чтобы событие не потерялось при редизайне или смене вёрстки формы.
    window.ym(config.metricaId, 'reachGoal', goal);
  }

  function setStatus(form, role, text) {
    var successEl = form.querySelector('[data-role="form-success"]');
    var errorEl = form.querySelector('[data-role="form-error"]');

    if (successEl) {
      var isSuccess = role === 'success';
      successEl.hidden = !isSuccess;
      if (isSuccess && text) {
        successEl.textContent = text;
      }
    }
    if (errorEl) {
      var isError = role === 'error';
      errorEl.hidden = !isError;
      if (isError && text) {
        errorEl.textContent = text;
      }
    }
  }

  function initForm(form) {
    var loadedAt = Date.now();
    var submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      if (submitButton) {
        submitButton.disabled = true;
      }

      var formData = new FormData(form);
      formData.set('action', config.action);
      formData.set('nonce', config.nonce);
      formData.set('elapsed_ms', String(Date.now() - loadedAt));
      formData.set('page_url', window.location.href);
      formData.set('referrer', document.referrer || '');
      formData.set('form_source', form.dataset.formSource || 'home');
      if (form.dataset.articleTitle) {
        formData.set('article_title', form.dataset.articleTitle);
      }

      var utmParams = readUtmParams();
      Object.keys(utmParams).forEach(function (key) {
        formData.set(key, utmParams[key]);
      });

      // Emergency static copy (Beget outage, Nov 2026): no backend, hand the
      // lead over to Telegram with the form contents prefilled.
      var lines = ['Заявка с сайта petr-targonskiy.com'];
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.type === 'hidden' || el.type === 'submit' || !el.value) { return; }
        if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) { return; }
        var label = el.getAttribute('placeholder') || el.getAttribute('aria-label') || el.name;
        lines.push(label + ': ' + el.value);
      });
      window.open('https://t.me/PTargonskiy?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
      setStatus(form, 'success', 'Спасибо! Откроется Telegram с текстом заявки, отправьте его, и я отвечу. Если Telegram не открылся, напишите @PTargonskiy.');
      fireMetricaGoal(form.dataset.metricaGoal || form.getAttribute('data-metrica-goal'));
      if (submitButton) { submitButton.disabled = false; }
    });
  }

  var forms = document.querySelectorAll('[data-petr-contact-form]');
  forms.forEach(initForm);
})();
