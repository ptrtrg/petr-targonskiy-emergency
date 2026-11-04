/**
 * Явные цели Яндекс.Метрики: клики по телеграму и почте (Задача 2.6) и любые
 * элементы с data-goal (с 28.09.2026: окно «Пригласить спикером»).
 *
 * Сейчас таких целей нет вообще: срабатывает только автоцель на отправку
 * формы, а клики по ссылкам на телеграм и почту не видны совсем. Работает
 * поверх уже видимых ссылок (прогрессивное улучшение) — без этого файла
 * ссылки остаются полностью рабочими, просто без трекинга клика.
 */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  // Тот же идентификатор счётчика, что в inc/seo.php (PETR_DARK_METRIKA_ID) —
  // публичный, не секрет, дублируется тут только потому, что JS не читает PHP-константы.
  var METRIKA_ID = 55185025;

  function bindGoal(selector, goal) {
    var links = document.querySelectorAll(selector);
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function () {
        if (typeof window.ym === 'function') {
          window.ym(METRIKA_ID, 'reachGoal', goal);
        }
      });
    }
  }

  ready(function () {
    // Общий механизм (28.09.2026): любой элемент с data-goal="имя" отправляет
    // цель по клику. Новую цель на кнопку вешаем одной строкой разметки,
    // а в Метрике заводим цель типа «JavaScript-событие» с тем же именем.
    document.addEventListener('click', function (event) {
      var el = event.target.closest('[data-goal]');
      if (el && typeof window.ym === 'function') {
        window.ym(METRIKA_ID, 'reachGoal', el.getAttribute('data-goal'));
      }
    }, true);

    bindGoal('a[href^="mailto:"]', 'click_email');
    bindGoal('a[href*="t.me/"], a[href^="tg:"]', 'click_telegram');
  });
})();
