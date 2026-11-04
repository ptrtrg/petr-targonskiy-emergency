/**
 * Отзывы на книгу (секция book): окно с полным текстом отзыва.
 *
 * Механика один в один как на systemmatica.com/book (17.09.2026):
 * 1. текст карточки обрезается, у обрезанных появляется «Читать полностью»;
 * 2. клик по карточке (или Enter/Пробел на ней) открывает окно с полным
 *    отзывом, стрелки «Предыдущий/Следующий» ходят по всем отзывам по кругу,
 *    счётчик «N из M», закрытие по крестику, клику мимо окна и Esc,
 *    стрелки клавиатуры влево/вправо листают;
 * 3. отзывы сверх первых data-visible прячутся под «Показать ещё N отзывов».
 *
 * Прогрессивное улучшение: без скрипта все отзывы видны целиком, обрезка
 * и скрытие в CSS включаются только классом .is-enhanced. Чистый DOM API.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-book-reviews]');
  if (!root || root.dataset.reviewsInit) {
    return;
  }
  root.dataset.reviewsInit = '1';

  var cards = [].slice.call(root.querySelectorAll('.section-book__review'));
  if (cards.length === 0) {
    return;
  }

  var label = function (name, fallback) {
    return root.getAttribute('data-label-' + name) || fallback;
  };

  var reviews = cards.map(function (card) {
    var head = card.querySelector('[data-review-head]');
    var text = card.querySelector('[data-review-text]');
    return {
      head: head ? head.innerHTML : '',
      text: text ? text.innerHTML : ''
    };
  });

  root.classList.add('is-enhanced');

  // Окно создаётся скриптом и кладётся прямо в body: предок с transform
  // иначе сделал бы position: fixed относительным к себе, а не к экрану.
  var modal = document.createElement('div');
  modal.className = 'review-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML =
    '<div class="review-modal__backdrop" data-review-close></div>' +
    '<div class="review-modal__panel" tabindex="-1">' +
    '<button type="button" class="review-modal__close" data-review-close></button>' +
    '<div class="review-modal__head section-book__review-person"></div>' +
    '<div class="review-modal__body"></div>' +
    '<div class="review-modal__nav">' +
    '<button type="button" class="button button--ghost review-modal__arrow" data-review-step="-1">&larr;<span class="review-modal__arrow-txt"></span></button>' +
    '<span class="review-modal__counter" aria-live="polite"></span>' +
    '<button type="button" class="button button--ghost review-modal__arrow" data-review-step="1"><span class="review-modal__arrow-txt"></span>&rarr;</button>' +
    '</div></div>';
  document.body.appendChild(modal);

  var panel = modal.querySelector('.review-modal__panel');
  var head = modal.querySelector('.review-modal__head');
  var body = modal.querySelector('.review-modal__body');
  var counter = modal.querySelector('.review-modal__counter');
  var closeBtn = modal.querySelector('.review-modal__close');
  var prevBtn = modal.querySelector('[data-review-step="-1"]');
  var nextBtn = modal.querySelector('[data-review-step="1"]');

  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', label('close', 'Закрыть'));
  prevBtn.setAttribute('aria-label', label('prev-aria', 'Предыдущий отзыв'));
  nextBtn.setAttribute('aria-label', label('next-aria', 'Следующий отзыв'));
  prevBtn.querySelector('.review-modal__arrow-txt').textContent = ' ' + label('prev', 'Предыдущий');
  nextBtn.querySelector('.review-modal__arrow-txt').textContent = label('next', 'Следующий') + ' ';

  var current = 0;
  var lastFocus = null;

  function render(i) {
    current = (i + reviews.length) % reviews.length;
    head.innerHTML = reviews[current].head;
    body.innerHTML = reviews[current].text;
    body.scrollTop = 0;
    counter.textContent = (current + 1) + ' ' + label('of', 'из') + ' ' + reviews.length;
  }

  function open(i) {
    lastFocus = document.activeElement;
    render(i);
    modal.classList.add('is-open');
    document.body.classList.add('review-modal-open');
    panel.focus();
  }

  function close() {
    modal.classList.remove('is-open');
    document.body.classList.remove('review-modal-open');
    if (lastFocus && lastFocus.focus) {
      lastFocus.focus();
    }
  }

  modal.addEventListener('click', function (e) {
    if (e.target.closest('[data-review-close]')) {
      close();
      return;
    }
    var arrow = e.target.closest('[data-review-step]');
    if (arrow) {
      render(current + parseInt(arrow.getAttribute('data-review-step'), 10));
    }
  });

  document.addEventListener('keydown', function (e) {
    if (!modal.classList.contains('is-open')) {
      return;
    }
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowLeft') {
      render(current - 1);
    } else if (e.key === 'ArrowRight') {
      render(current + 1);
    } else if (e.key === 'Tab') {
      // Фокус не уходит из окна, пока оно открыто.
      var focusable = [].slice.call(modal.querySelectorAll('button'));
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  cards.forEach(function (card, i) {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.addEventListener('click', function () {
      open(i);
    });
    card.addEventListener('keydown', function (e) {
      if (e.target !== card) {
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(i);
      }
    });
  });

  function measure(card) {
    var text = card.querySelector('[data-review-text]');
    if (!text) {
      return;
    }
    card.classList.remove('has-toggle');
    if (text.scrollHeight > text.clientHeight + 4) {
      card.classList.add('has-toggle');
    }
  }

  function isVisible(card) {
    return !card.classList.contains('is-extra') || card.classList.contains('is-shown');
  }

  function measureVisible() {
    cards.forEach(function (card) {
      if (isVisible(card)) {
        measure(card);
      }
    });
  }

  var visibleCount = parseInt(root.getAttribute('data-visible'), 10) || 3;
  var more = root.querySelector('[data-reviews-more]');
  if (more && cards.length > visibleCount) {
    more.hidden = false;
    more.addEventListener('click', function (e) {
      e.stopPropagation();
      cards.forEach(function (card) {
        if (card.classList.contains('is-extra')) {
          card.classList.add('is-shown');
          measure(card);
        }
      });
      more.hidden = true;
    });
  }

  measureVisible();
  window.addEventListener('resize', measureVisible);
  // Шрифты подгружаются позже разметки: пересчитать обрезку, когда готовы.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measureVisible);
  }
})();
