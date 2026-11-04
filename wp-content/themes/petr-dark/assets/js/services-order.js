/**
 * Переключатель порядка в «Как со мной поработать» (sections/services.php).
 *
 * Прогрессивное улучшение: без скрипта переключатель скрыт, группы стоят
 * как в JSON. Вариант по умолчанию (data-default, «только хардкор») держит
 * исходный порядок, второй вариант переворачивает группы: сначала обучение,
 * команда в конце.
 *
 * Анимация по приёму FLIP: запоминаем, где группы стояли, переставляем их
 * в DOM, сдвигаем transform обратно на старые места и отпускаем. Двигается
 * только transform, раскладка пересчитывается один раз. Выбор не
 * запоминается: при каждом заходе открывается вариант по умолчанию.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-services-order]');
  var wrap = document.querySelector('[data-services-groups]');
  if (!root || !wrap) {
    return;
  }

  var track = root.querySelector('[role="group"]');
  var buttons = Array.prototype.slice.call(root.querySelectorAll('[data-order]'));
  var groups = Array.prototype.slice.call(wrap.querySelectorAll('[data-services-group]'));
  if (!track || buttons.length !== 2 || groups.length < 2) {
    return;
  }

  var defaultKey = root.getAttribute('data-default') || buttons[1].getAttribute('data-order');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cleanupTimer = 0;

  function readStagger() {
    var value = parseFloat(getComputedStyle(root).getPropertyValue('--motion-reorder-stagger'));
    return isNaN(value) ? 0 : value;
  }

  function readDuration() {
    var value = parseFloat(getComputedStyle(root).getPropertyValue('--duration-reorder'));
    return isNaN(value) ? 0 : value * 1000;
  }

  function setActive(key) {
    buttons.forEach(function (button, index) {
      var active = button.getAttribute('data-order') === key;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      if (active) {
        track.setAttribute('data-active', String(index));
      }
    });
    if (key === defaultKey) {
      track.setAttribute('data-hot', '');
    } else {
      track.removeAttribute('data-hot');
    }
  }

  function popIcon(key) {
    if (reduceMotion) {
      return;
    }
    var button = root.querySelector('[data-order="' + key + '"]');
    var icon = button && button.querySelector('.section-services__order-icon');
    if (!icon) {
      return;
    }
    icon.classList.remove('is-popping');
    // Перезапуск анимации: класс снимается и ставится после перерасчёта стиля.
    void icon.getBoundingClientRect();
    icon.classList.add('is-popping');
  }

  function reorder(key, animate) {
    var order = key === defaultKey ? groups.slice() : groups.slice().reverse();
    var before = groups.map(function (group) {
      return group.getBoundingClientRect().top;
    });

    clearTimeout(cleanupTimer);
    groups.forEach(function (group) {
      group.classList.remove('is-moving');
      group.style.transform = '';
      group.style.transitionDelay = '';
    });
    order.forEach(function (group) {
      wrap.appendChild(group);
    });

    if (!animate || reduceMotion) {
      return;
    }

    var stagger = readStagger();
    groups.forEach(function (group, index) {
      var delta = before[index] - group.getBoundingClientRect().top;
      if (delta) {
        group.style.transform = 'translateY(' + delta + 'px)';
      }
    });
    // Один перерасчёт, чтобы браузер зафиксировал стартовые позиции.
    void wrap.offsetHeight;
    order.forEach(function (group, index) {
      group.classList.add('is-moving');
      group.style.transitionDelay = index * stagger + 'ms';
      group.style.transform = '';
    });

    cleanupTimer = setTimeout(function () {
      groups.forEach(function (group) {
        group.classList.remove('is-moving');
        group.style.transitionDelay = '';
      });
    }, readDuration() + stagger * groups.length + 50);
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      if (button.getAttribute('aria-pressed') === 'true') {
        return;
      }
      var key = button.getAttribute('data-order');
      setActive(key);
      popIcon(key);
      reorder(key, true);
    });
  });

  setActive(defaultKey);
  root.hidden = false;
})();
