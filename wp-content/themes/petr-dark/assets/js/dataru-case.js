/**
 * Кейс ДатаРу: лента листов отчёта (sections/dataru_case.php).
 *
 * Без скрипта лента просто прокручивается, клик по листу открывает полный
 * лист в новой вкладке. Скрипт добавляет:
 * - стрелки и счётчик «N / 15» над лентой (стрелки гаснут на краях);
 * - чипы глав: прыжок к первому листу главы, активная глава подсвечивается
 *   сама при прокрутке;
 * - окно просмотра листа (<dialog>): стрелки, ←/→, Esc, свайп на телефоне,
 *   предзагрузка следующего листа.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-dataru-report]');
  if (!root) {
    return;
  }
  var track = root.querySelector('[data-dataru-track]');
  var sheets = Array.prototype.slice.call(root.querySelectorAll('[data-dataru-sheet]'));
  var controls = root.querySelector('[data-dataru-controls]');
  var counter = root.querySelector('[data-dataru-counter]');
  var prev = root.querySelector('[data-dataru-prev]');
  var next = root.querySelector('[data-dataru-next]');
  var chaptersBox = root.querySelector('[data-dataru-chapters]');
  var chapters = chaptersBox ? Array.prototype.slice.call(chaptersBox.querySelectorAll('[data-chapter]')) : [];
  if (!track || sheets.length === 0) {
    return;
  }

  if (controls) {
    controls.hidden = false;
  }
  if (chaptersBox) {
    chaptersBox.hidden = false;
  }

  var total = sheets.length;
  var smooth = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

  function trackPadding() {
    return parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0;
  }

  function currentIndex() {
    var left = track.scrollLeft + trackPadding();
    var best = 0;
    sheets.forEach(function (sheet, i) {
      if (Math.abs(sheet.offsetLeft - left) < Math.abs(sheets[best].offsetLeft - left)) {
        best = i;
      }
    });
    return best;
  }

  function goTo(i) {
    i = Math.max(0, Math.min(total - 1, i));
    track.scrollTo({ left: sheets[i].offsetLeft - trackPadding(), behavior: smooth });
  }

  function update() {
    var i = currentIndex();
    if (counter) {
      counter.textContent = (i + 1) + ' / ' + total;
    }
    if (prev) {
      prev.disabled = track.scrollLeft <= 2;
    }
    if (next) {
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    }
    var chapter = sheets[i].getAttribute('data-chapter');
    chapters.forEach(function (chip) {
      chip.setAttribute('aria-pressed', chip.getAttribute('data-chapter') === chapter ? 'true' : 'false');
    });
  }

  var ticking = false;
  track.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(function () {
        update();
        ticking = false;
      });
    }
  }, { passive: true });
  window.addEventListener('resize', update);

  if (prev) {
    prev.addEventListener('click', function () {
      goTo(currentIndex() - 1);
    });
  }
  if (next) {
    next.addEventListener('click', function () {
      goTo(currentIndex() + 1);
    });
  }
  chapters.forEach(function (chip) {
    chip.addEventListener('click', function () {
      goTo(parseInt(chip.getAttribute('data-goto'), 10) || 0);
    });
  });
  update();

  // ---------- Окно просмотра листа ----------
  var box = root.querySelector('[data-dataru-lightbox]');
  if (!box || typeof box.showModal !== 'function') {
    return;
  }
  var img = box.querySelector('[data-dataru-lb-image]');
  var caption = box.querySelector('[data-dataru-lb-caption]');
  var lbCounter = box.querySelector('[data-dataru-lb-counter]');
  var scroller = box.querySelector('[data-dataru-lb-scroll]');
  var open = 0;
  var returnFocusTo = null;

  function link(i) {
    return sheets[i].querySelector('[data-full]');
  }

  function show(i) {
    open = (i + total) % total;
    var a = link(open);
    img.src = a.getAttribute('data-full');
    img.alt = a.querySelector('img').alt;
    caption.textContent = a.querySelector('img').alt;
    lbCounter.textContent = (open + 1) + ' / ' + total;
    scroller.scrollTop = 0;
    var pre = new Image();
    pre.src = link((open + 1) % total).getAttribute('data-full');
  }

  sheets.forEach(function (sheet, i) {
    link(i).addEventListener('click', function (event) {
      event.preventDefault();
      returnFocusTo = link(i);
      show(i);
      box.showModal();
      document.documentElement.classList.add('is-dialog-open');
    });
  });

  box.querySelector('[data-dataru-close]').addEventListener('click', function () {
    box.close();
  });
  box.querySelector('[data-dataru-lb-prev]').addEventListener('click', function () {
    show(open - 1);
  });
  box.querySelector('[data-dataru-lb-next]').addEventListener('click', function () {
    show(open + 1);
  });
  box.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowLeft') {
      show(open - 1);
    } else if (event.key === 'ArrowRight') {
      show(open + 1);
    }
  });
  // Клик по тёмному полю вокруг листа закрывает окно.
  box.addEventListener('click', function (event) {
    if (event.target === box || event.target.classList.contains('dataru-lightbox__stage') || event.target === scroller) {
      box.close();
    }
  });

  // Свайп влево/вправо на телефоне листает листы.
  var startX = null;
  var startY = null;
  scroller.addEventListener('touchstart', function (event) {
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  }, { passive: true });
  scroller.addEventListener('touchend', function (event) {
    if (startX === null) {
      return;
    }
    var dx = event.changedTouches[0].clientX - startX;
    var dy = event.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      show(open + (dx < 0 ? 1 : -1));
    }
    startX = null;
  }, { passive: true });

  box.addEventListener('close', function () {
    document.documentElement.classList.remove('is-dialog-open');
    // Лента встаёт на тот лист, который смотрели последним.
    goTo(open);
    if (returnFocusTo) {
      returnFocusTo.focus();
    }
  });
})();
