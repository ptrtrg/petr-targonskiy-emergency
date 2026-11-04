/**
 * Закрытие мобильного меню после перехода по ссылке.
 *
 * Меню сделано на чистом CSS: скрытый чекбокс `#site-nav-toggle` и подпись
 * с бургером. Это сознательное решение, меню открывается и закрывается без
 * JavaScript. Но у приёма есть дыра: клик по пункту меню меняет адрес, а
 * чекбокс остаётся отмеченным, и раскрытое меню продолжает закрывать собой
 * страницу, к которой посетитель только что перешёл. На якорных ссылках
 * (переходы к секциям главной) это особенно заметно: страница даже не
 * перезагружается, и посетитель просто упирается в непрозрачную панель.
 * Найдено проверкой на ширине 375 пикселей 19.08.2026.
 *
 * Файл подключается как прогрессивное улучшение (см. inc/enqueue.php): без
 * него меню по-прежнему работает, просто закрывать его нужно бургером.
 */
(function () {
  'use strict';

  var toggle = document.getElementById('site-nav-toggle');
  if (!toggle) {
    return;
  }

  var header = toggle.closest('.site-header') || document;

  header.addEventListener('click', function (event) {
    var link = event.target.closest('a');
    if (!link || !header.contains(link)) {
      return;
    }
    // Снимаем отметку только когда меню реально раскрыто: на широких экранах
    // чекбокс не участвует в показе меню, и трогать его незачем.
    if (toggle.checked) {
      toggle.checked = false;
      if (typeof window.petrNavFit === 'function') {
        window.petrNavFit();
      }
    }
  });

  // Клавиша Escape закрывает меню: привычное поведение любого оверлея,
  // без неё с клавиатуры выйти из раскрытого меню нечем.
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && toggle.checked) {
      toggle.checked = false;
      if (typeof window.petrNavFit === 'function') {
        window.petrNavFit();
      }
    }
  });

  // Полное меню или бургер: пересчитываем при смене ширины и когда
  // догрузились шрифты (от шрифта зависит ширина пунктов меню).
  if (typeof window.petrNavFit === 'function') {
    var scheduled = false;
    window.addEventListener('resize', function () {
      if (scheduled) {
        return;
      }
      scheduled = true;
      window.requestAnimationFrame(function () {
        scheduled = false;
        window.petrNavFit();
      });
    });
    // Пока меню раскрыто, petrNavFit ничего не пересчитывает (на телефоне
    // resize прилетает при прокрутке, меню закрывалось бы само). Пересчёт
    // после закрытия: ширина могла поменяться, пока панель была открыта.
    toggle.addEventListener('change', function () {
      if (!toggle.checked) {
        window.petrNavFit();
      }
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(window.petrNavFit);
    }
    window.petrNavFit();
  }
})();
