/**
 * Модалка галереи кейсов (секция cases_gallery).
 *
 * Прогрессивное улучшение: без этого файла каждая карточка кейса уже
 * полностью читаема — <details open> в разметке показывает фото, компанию,
 * отрасль, масштаб и блоки «проблема / решение / результат» со ссылкой
 * в Telegram без единой строчки JS.
 *
 * Если скрипт выполнился, он:
 * 1. схлопывает все <details data-case-trigger> (снимает open) —
 *    карточка становится компактной;
 * 2. перехватывает клик по <summary>: вместо раскрытия <details> на месте
 *    открывает модалку с полной галереей (4 фото, стрелки, миниатюры,
 *    счётчик) и теми же текстовыми блоками;
 * 3. Escape закрывает модалку, фокус запирается внутри, пока она открыта,
 *    и возвращается на карточку (её <summary>), которая модалку открыла.
 *
 * Никакого jQuery, чистый DOM API.
 */
(function () {
  'use strict';

  var modal = document.querySelector('[data-case-modal]');
  var triggers = document.querySelectorAll('[data-case-trigger]');

  if (!modal || triggers.length === 0) {
    return;
  }

  var dialog = modal.querySelector('.case-modal__dialog');
  var imageEl = modal.querySelector('[data-case-image]');
  var counterEl = modal.querySelector('[data-case-counter]');
  var thumbsEl = modal.querySelector('[data-case-thumbs]');
  var prevBtn = modal.querySelector('[data-case-prev]');
  var nextBtn = modal.querySelector('[data-case-next]');
  var companyEl = modal.querySelector('[data-case-company]');
  var industryEl = modal.querySelector('[data-case-industry]');
  var scaleEl = modal.querySelector('[data-case-scale]');
  var problemEl = modal.querySelector('[data-case-problem]');
  var solutionEl = modal.querySelector('[data-case-solution]');
  var resultEl = modal.querySelector('[data-case-result]');
  var tgLinkEl = modal.querySelector('[data-case-tg-link]');
  var closeButtons = modal.querySelectorAll('[data-case-close]');

  var currentImages = [];
  var currentIndex = 0;
  var returnFocusTo = null;

  // Шаг 1: схлопываем все карточки — контент уже прочитан браузером/AT
  // в открытом виде на первой отрисовке, дальше модалка берёт на себя
  // подробное раскрытие по клику.
  triggers.forEach(function (details) {
    details.open = false;
  });

  function setImage(index) {
    if (currentImages.length === 0) {
      return;
    }
    currentIndex = (index + currentImages.length) % currentImages.length;
    var src = currentImages[currentIndex];
    imageEl.src = src;

    if (counterEl) {
      var of = (thumbsEl && thumbsEl.getAttribute('data-label-of')) || 'из';
      counterEl.textContent = (currentIndex + 1) + ' / ' + currentImages.length;
      counterEl.hidden = currentImages.length < 2;
    }

    var hasMultiple = currentImages.length > 1;
    if (prevBtn) {
      prevBtn.hidden = !hasMultiple;
    }
    if (nextBtn) {
      nextBtn.hidden = !hasMultiple;
    }

    if (thumbsEl) {
      var thumbButtons = thumbsEl.querySelectorAll('.case-modal__thumb');
      thumbButtons.forEach(function (btn, i) {
        btn.setAttribute('aria-current', i === currentIndex ? 'true' : 'false');
      });
    }
  }

  function buildThumbs(images, company) {
    if (!thumbsEl) {
      return;
    }
    thumbsEl.innerHTML = '';
    if (images.length < 2) {
      return;
    }
    var labelPrefix = thumbsEl.getAttribute('data-label-prefix') || '';
    images.forEach(function (src, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'case-modal__thumb';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-current', i === 0 ? 'true' : 'false');
      btn.setAttribute('aria-label', labelPrefix + ' ' + (i + 1) + '/' + images.length + ' — ' + company);

      var img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.loading = 'lazy';
      btn.appendChild(img);

      btn.addEventListener('click', function () {
        setImage(i);
      });

      thumbsEl.appendChild(btn);
    });
  }

  function fillList(listEl, items) {
    if (!listEl) {
      return;
    }
    listEl.innerHTML = '';
    items.forEach(function (line) {
      var li = document.createElement('li');
      li.textContent = line;
      listEl.appendChild(li);
    });
  }

  function getFocusable() {
    return Array.prototype.slice.call(
      dialog.querySelectorAll(
        'a[href], button:not([hidden]):not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(function (el) {
      return el.offsetParent !== null;
    });
  }

  function openModal(details) {
    var raw = details.getAttribute('data-case');
    var data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      return;
    }

    returnFocusTo = details.querySelector('.case-card__summary');

    if (companyEl) {
      companyEl.textContent = data.company || '';
    }
    if (industryEl) {
      industryEl.textContent = data.industry || '';
    }
    if (scaleEl) {
      scaleEl.textContent = data.scale || '';
    }
    if (problemEl) {
      problemEl.textContent = data.problem || '';
    }
    if (solutionEl) {
      solutionEl.textContent = data.solution || '';
    }
    fillList(resultEl, Array.isArray(data.result) ? data.result : []);

    if (tgLinkEl) {
      if (data.tgLink) {
        tgLinkEl.href = data.tgLink;
        tgLinkEl.hidden = false;
      } else {
        tgLinkEl.hidden = true;
      }
    }

    currentImages = Array.isArray(data.images) ? data.images : [];
    if (imageEl) {
      imageEl.alt = data.company || '';
    }
    buildThumbs(currentImages, data.company || '');
    setImage(0);

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    dialog.focus();

    document.addEventListener('keydown', onKeydown, true);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeydown, true);

    if (returnFocusTo) {
      returnFocusTo.focus();
      returnFocusTo = null;
    }
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key === 'ArrowLeft') {
      setImage(currentIndex - 1);
      return;
    }

    if (event.key === 'ArrowRight') {
      setImage(currentIndex + 1);
      return;
    }

    if (event.key === 'Tab') {
      var focusable = getFocusable();
      if (focusable.length === 0) {
        return;
      }
      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  triggers.forEach(function (details) {
    var summary = details.querySelector('summary');
    if (!summary) {
      return;
    }
    summary.addEventListener('click', function (event) {
      event.preventDefault();
      openModal(details);
    });
  });

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      setImage(currentIndex - 1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      setImage(currentIndex + 1);
    });
  }

  closeButtons.forEach(function (btn) {
    btn.addEventListener('click', closeModal);
  });
})();
