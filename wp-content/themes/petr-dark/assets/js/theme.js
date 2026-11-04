/**
 * Переключатель темы в шапке: «Системная», «Светлая», «Тёмная».
 *
 * Начальную тему ставит скрипт в <head> (inc/theme-mode.php) ещё до
 * отрисовки. Здесь меню переключателя, сохранение выбора и слежение за
 * системной темой.
 *
 * В localStorage хранится только принудительный выбор (light или dark).
 * «Системная» — это отсутствие записи, и она же по умолчанию: сайт
 * повторяет тему устройства, в том числе автосмену день/ночь.
 *
 * Переключатель один на десктопе и на мобильном (правая часть шапки,
 * видимая на любой ширине), но код не рассчитывает на единственный
 * экземпляр и обслуживает все [data-theme-switch] на странице.
 */
(function () {
  'use strict';

  // Тот же ключ, что в inc/theme-mode.php.
  var STORAGE_KEY = 'petr-theme';
  var root = document.documentElement;
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  var switches = document.querySelectorAll('[data-theme-switch]');

  function systemTheme() {
    return media && media.matches ? 'light' : 'dark';
  }

  function storedChoice() {
    try {
      var value = localStorage.getItem(STORAGE_KEY);
      return value === 'light' || value === 'dark' ? value : 'system';
    } catch (e) {
      return 'system';
    }
  }

  function store(choice) {
    try {
      if (choice === 'system') {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, choice);
      }
    } catch (e) {
      // Хранилище недоступно (приватный режим): выбор действует до
      // перезагрузки страницы, дальше снова системная.
    }
  }

  function apply(choice) {
    root.setAttribute('data-theme-choice', choice);
    root.setAttribute('data-theme', choice === 'system' ? systemTheme() : choice);

    for (var i = 0; i < switches.length; i++) {
      var options = switches[i].querySelectorAll('[data-theme-option]');
      var current = '';
      for (var j = 0; j < options.length; j++) {
        var checked = options[j].getAttribute('data-theme-option') === choice;
        options[j].setAttribute('aria-checked', checked ? 'true' : 'false');
        if (checked) {
          current = options[j].textContent.trim();
        }
      }
      var button = switches[i].querySelector('.theme-switch__button');
      var label = switches[i].getAttribute('data-title') + (current ? ': ' + current : '');
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
    }
  }

  function menuOf(sw) {
    return sw.querySelector('.theme-switch__menu');
  }

  function close(sw, returnFocus) {
    var menu = menuOf(sw);
    if (menu.hidden) {
      return;
    }
    menu.hidden = true;
    var button = sw.querySelector('.theme-switch__button');
    button.setAttribute('aria-expanded', 'false');
    if (returnFocus) {
      button.focus();
    }
  }

  function closeAll(except) {
    for (var i = 0; i < switches.length; i++) {
      if (switches[i] !== except) {
        close(switches[i], false);
      }
    }
  }

  function open(sw) {
    closeAll(sw);
    var menu = menuOf(sw);
    menu.hidden = false;
    sw.querySelector('.theme-switch__button').setAttribute('aria-expanded', 'true');
    var checked = menu.querySelector('[aria-checked="true"]') || menu.querySelector('[data-theme-option]');
    if (checked) {
      checked.focus();
    }
  }

  apply(storedChoice());

  document.addEventListener('click', function (event) {
    var sw = event.target.closest('[data-theme-switch]');
    if (!sw) {
      closeAll(null);
      return;
    }
    var option = event.target.closest('[data-theme-option]');
    if (option) {
      var choice = option.getAttribute('data-theme-option');
      store(choice);
      apply(choice);
      close(sw, true);
      return;
    }
    if (event.target.closest('.theme-switch__button')) {
      if (menuOf(sw).hidden) {
        open(sw);
      } else {
        close(sw, false);
      }
    }
  });

  // Клавиатура внутри меню: стрелки ходят по пунктам по кругу, Home/End —
  // к крайним, Escape и Tab закрывают. Escape вешаем на фазу перехвата,
  // чтобы он закрыл сначала меню темы, а не раскрытое мобильное меню
  // (его Escape закрывает nav.js).
  document.addEventListener('keydown', function (event) {
    var sw = event.target.closest && event.target.closest('[data-theme-switch]');
    if (!sw || menuOf(sw).hidden) {
      return;
    }
    if (event.key === 'Escape') {
      event.stopPropagation();
      close(sw, true);
      return;
    }
    if (event.key === 'Tab') {
      close(sw, false);
      return;
    }
    var options = Array.prototype.slice.call(sw.querySelectorAll('[data-theme-option]'));
    var index = options.indexOf(document.activeElement);
    var next = -1;
    if (event.key === 'ArrowDown') {
      next = (index + 1) % options.length;
    } else if (event.key === 'ArrowUp') {
      next = (index - 1 + options.length) % options.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = options.length - 1;
    }
    if (next >= 0) {
      event.preventDefault();
      options[next].focus();
    }
  }, true);

  // Система сменила тему (автопереключение день/ночь): следуем за ней,
  // если выбрана «Системная».
  if (media) {
    var onSystemChange = function () {
      if (storedChoice() === 'system') {
        apply('system');
      }
    };
    if (media.addEventListener) {
      media.addEventListener('change', onSystemChange);
    } else if (media.addListener) {
      media.addListener(onSystemChange);
    }
  }

  // Переключили в соседней вкладке: подтягиваем, чтобы вкладки не расходились.
  window.addEventListener('storage', function (event) {
    if (event.key === STORAGE_KEY) {
      apply(storedChoice());
    }
  });
})();
