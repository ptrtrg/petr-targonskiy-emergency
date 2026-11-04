/**
 * Окно «Пригласить спикером» (sections/speaker-dialog.php).
 *
 * Прогрессивное улучшение: без скрипта кнопка в первом экране — обычная
 * ссылка на пресс-кит. Со скриптом клик открывает нативный <dialog>:
 * затемнение, Esc и удержание фокуса внутри браузер даёт сам. Здесь
 * только открыть, закрыть крестиком или кликом по затемнению и вернуть
 * фокус на кнопку.
 */
(function () {
  'use strict';

  var dialog = document.querySelector('[data-speaker-dialog]');
  var openers = document.querySelectorAll('[data-speaker-open]');
  if (!dialog || typeof dialog.showModal !== 'function' || openers.length === 0) {
    return;
  }

  var returnFocusTo = null;

  openers.forEach(function (opener) {
    opener.addEventListener('click', function (event) {
      event.preventDefault();
      returnFocusTo = opener;
      dialog.showModal();
      document.documentElement.classList.add('is-dialog-open');
    });
  });

  dialog.querySelectorAll('[data-speaker-close]').forEach(function (button) {
    button.addEventListener('click', function () {
      dialog.close();
    });
  });

  // Клик по затемнению: у <dialog> это клик по самому элементу, мимо
  // внутреннего блока.
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  // Просмотр слайда поверх окна: второй <dialog>, стрелки и ←/→ листают.
  var viewer = document.querySelector('[data-speaker-viewer]');
  var slides = Array.prototype.slice.call(dialog.querySelectorAll('[data-speaker-slide]'));
  if (viewer && slides.length) {
    var vImg = viewer.querySelector('[data-speaker-viewer-image]');
    var vCap = viewer.querySelector('[data-speaker-viewer-caption]');
    var current = 0;
    var showSlide = function (i) {
      current = (i + slides.length) % slides.length;
      var link = slides[current];
      var thumb = link.querySelector('img');
      vImg.src = link.getAttribute('href');
      vImg.alt = thumb ? thumb.alt : '';
      vCap.textContent = (thumb ? thumb.alt + ' · ' : '') + (current + 1) + ' / ' + slides.length;
    };
    var preloaded = false;
    slides.forEach(function (link, i) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        // Полноразмерные слайды грузим разом при первом просмотре,
        // иначе при листании подпись обгоняет картинку.
        if (!preloaded) {
          preloaded = true;
          slides.forEach(function (s) {
            new Image().src = s.getAttribute('href');
          });
        }
        showSlide(i);
        viewer.showModal();
      });
    });
    viewer.querySelector('[data-speaker-viewer-close]').addEventListener('click', function () {
      viewer.close();
    });
    viewer.querySelector('[data-speaker-viewer-prev]').addEventListener('click', function () {
      showSlide(current - 1);
    });
    viewer.querySelector('[data-speaker-viewer-next]').addEventListener('click', function () {
      showSlide(current + 1);
    });
    viewer.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') {
        showSlide(current - 1);
      } else if (event.key === 'ArrowRight') {
        showSlide(current + 1);
      }
    });
    viewer.addEventListener('click', function (event) {
      if (event.target === viewer) {
        viewer.close();
      }
    });
    // Esc в просмотре закрывает только просмотр, окно спикера остаётся.
    viewer.addEventListener('close', function () {
      slides[current].focus();
    });
  }

  dialog.addEventListener('close', function () {
    document.documentElement.classList.remove('is-dialog-open');
    if (returnFocusTo) {
      returnFocusTo.focus();
    }
  });
})();
