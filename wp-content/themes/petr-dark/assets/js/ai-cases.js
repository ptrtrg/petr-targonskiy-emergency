/**
 * Каталог кейсов ИИ-агентов (sections/ai_cases.php).
 *
 * Прогрессивное улучшение: без скрипта видны все карточки с подробностями.
 * Скрипт ставит на секцию класс is-enhanced (стили каталога включаются
 * только с ним), показывает фильтр и открывает подробности в <dialog>.
 *
 * Фильтр: top — карточки с data-top="1", all — все, остальное — ключ
 * направления (data-category). Выбор не запоминается: при каждом заходе
 * открывается «Самое интересное».
 * Окно листает карточки текущего фильтра стрелками и клавишами ←/→.
 *
 * Топ-10 (с 29.10.2026): фильтр universal показывает карточки с
 * data-universal по их месту в топе. У карточек с роликом (data-ai-video)
 * короткая версия грузится, только когда карточка подходит к экрану,
 * играет при наведении мыши, а на телефоне у карточки в центре экрана.
 * Полная анимация грузится только при открытии окна и играет сразу.
 */
(function () {
  'use strict';

  var section = document.getElementById('ai_cases');
  if (!section) {
    return;
  }
  var filter = section.querySelector('[data-ai-filter]');
  var grid = section.querySelector('[data-ai-grid]');
  var dialog = section.querySelector('[data-ai-dialog]');
  if (!filter || !grid) {
    return;
  }

  var cards = Array.prototype.slice.call(grid.querySelectorAll('[data-ai-card]'));
  var chips = Array.prototype.slice.call(filter.querySelectorAll('[data-filter]'));
  var hint = section.querySelector('[data-ai-hint]');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  section.classList.add('is-enhanced');
  filter.hidden = false;
  if (hint) {
    hint.hidden = false;
  }

  function matches(card, key) {
    if (key === 'all') {
      return true;
    }
    if (key === 'universal') {
      return card.hasAttribute('data-universal');
    }
    if (key === 'top') {
      return card.getAttribute('data-top') === '1';
    }
    return card.getAttribute('data-category') === key;
  }

  var activeFilter = null;

  function rank(card) {
    return parseInt(card.getAttribute('data-universal'), 10) || 0;
  }

  function visibleCards() {
    var list = cards.filter(function (card) {
      return !card.hidden;
    });
    if (activeFilter === 'universal') {
      list.sort(function (a, b) {
        return rank(a) - rank(b);
      });
    }
    return list;
  }

  function applyFilter(key) {
    activeFilter = key;
    chips.forEach(function (chip) {
      chip.setAttribute('aria-pressed', chip.getAttribute('data-filter') === key ? 'true' : 'false');
    });
    var shown = 0;
    cards.forEach(function (card) {
      var on = matches(card, key);
      card.hidden = !on;
      // В топе карточки встают по месту в нём, а не по порядку в разметке.
      card.style.order = key === 'universal' && on ? String(rank(card)) : '';
      card.classList.remove('is-entering');
      if (on && !reduceMotion) {
        // Лёгкое появление по очереди: перезапуск анимации через reflow.
        void card.offsetWidth;
        var place = key === 'universal' ? rank(card) - 1 : shown;
        card.style.setProperty('--ai-enter-delay', Math.min(place, 8) * 40 + 'ms');
        card.classList.add('is-entering');
      }
      if (on) {
        shown++;
      }
    });
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      applyFilter(chip.getAttribute('data-filter'));
    });
  });

  var initial = chips.length ? chips.filter(function (c) {
    return c.getAttribute('aria-pressed') === 'true';
  })[0] || chips[0] : null;
  if (initial) {
    applyFilter(initial.getAttribute('data-filter'));
  }

  // ---------- Ролики топ-10 в карточках ----------
  var videoBoxes = Array.prototype.slice.call(grid.querySelectorAll('[data-ai-video]'));
  var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var playingBox = null;

  function loadPreview(box) {
    if (box.querySelector('video')) {
      return;
    }
    var video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    video.preload = 'auto';
    video.src = box.getAttribute('data-preview');
    box.insertBefore(video, box.querySelector('.ai-card__play'));
  }

  function playBox(box) {
    if (playingBox && playingBox !== box) {
      stopBox(playingBox);
    }
    loadPreview(box);
    var video = box.querySelector('video');
    playingBox = box;
    box.classList.add('is-playing');
    var promise = video.play();
    if (promise && promise.catch) {
      promise.catch(function () {
        box.classList.remove('is-playing');
      });
    }
  }

  function stopBox(box) {
    var video = box.querySelector('video');
    box.classList.remove('is-playing');
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    if (playingBox === box) {
      playingBox = null;
    }
  }

  if (videoBoxes.length && 'IntersectionObserver' in window) {
    // Короткий ролик подгружается заранее, когда карточка в паре экранов от видимой области.
    var nearObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          loadPreview(entry.target);
          nearObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '300px 0px' });
    videoBoxes.forEach(function (box) {
      nearObserver.observe(box);
    });

    if (canHover) {
      videoBoxes.forEach(function (box) {
        var card = box.closest('[data-ai-card]');
        card.addEventListener('mouseenter', function () {
          playBox(box);
        });
        card.addEventListener('mouseleave', function () {
          stopBox(box);
        });
      });
    } else if (!reduceMotion) {
      // Без мыши играет одна карточка: та, что проходит через середину экрана.
      var centerObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            playBox(entry.target);
          } else if (entry.target === playingBox) {
            stopBox(entry.target);
          }
        });
      }, { rootMargin: '-40% 0px -40% 0px' });
      videoBoxes.forEach(function (box) {
        centerObserver.observe(box);
      });
    }
  }

  // ---------- Окно с подробностями ----------
  if (!dialog || typeof dialog.showModal !== 'function') {
    return;
  }
  var mediaEl = dialog.querySelector('[data-ai-dialog-media]');
  var titleEl = dialog.querySelector('[data-ai-dialog-title]');
  var metricEl = dialog.querySelector('[data-ai-dialog-metric]');
  var detailsEl = dialog.querySelector('[data-ai-dialog-details]');
  var counterEl = dialog.querySelector('[data-ai-counter]');
  var current = null;
  var returnFocusTo = null;

  function fill(card) {
    current = card;
    var img = card.querySelector('.ai-card__media img');
    var videoBox = card.querySelector('[data-ai-video]');
    mediaEl.innerHTML = '';
    if (videoBox) {
      // Полная анимация: грузится только сейчас и играет сразу, без кликов.
      if (playingBox) {
        stopBox(playingBox);
      }
      var full = document.createElement('video');
      full.muted = true;
      full.loop = true;
      full.autoplay = !reduceMotion;
      full.controls = reduceMotion;
      full.playsInline = true;
      full.setAttribute('playsinline', '');
      full.preload = 'auto';
      full.poster = img ? img.src : '';
      full.src = videoBox.getAttribute('data-full-video');
      full.width = 1280;
      full.height = 720;
      // Полоса по верхнему краю, как в веб-версии презентации: сколько
      // анимации прошло. Клик по полосе перематывает.
      var player = document.createElement('div');
      player.className = 'ai-dialog__player';
      var bar = document.createElement('div');
      bar.className = 'ai-dialog__bar';
      bar.setAttribute('aria-hidden', 'true');
      bar.innerHTML = '<i></i>';
      bar.addEventListener('click', function (event) {
        var rect = bar.getBoundingClientRect();
        if (full.duration) {
          full.currentTime = full.duration * Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        }
      });
      player.appendChild(full);
      player.appendChild(bar);
      mediaEl.appendChild(player);
      trackProgress(full, bar.firstChild);
    } else if (img) {
      var big = document.createElement('img');
      // В окне всегда полный размер: в карточке из srcset могла прийти маленькая копия.
      big.src = img.getAttribute('data-full') || img.src;
      big.alt = '';
      big.width = 1200;
      big.height = 750;
      mediaEl.appendChild(big);
    }
    mediaEl.hidden = !img;
    mediaEl.classList.toggle('ai-dialog__media--video', !!videoBox);
    titleEl.textContent = card.querySelector('[data-ai-title]').textContent;
    var metric = card.querySelector('[data-ai-metric]');
    metricEl.textContent = metric ? metric.textContent : '';
    metricEl.hidden = !metric;
    detailsEl.innerHTML = card.querySelector('[data-ai-details]').innerHTML;
    var list = visibleCards();
    counterEl.textContent = (list.indexOf(card) + 1) + ' / ' + list.length;
    dialog.scrollTop = 0;
  }

  var progressFrame = 0;

  function trackProgress(video, fillEl) {
    cancelAnimationFrame(progressFrame);
    (function tick() {
      if (!video.isConnected) {
        return;
      }
      if (video.duration) {
        fillEl.style.transform = 'scaleX(' + Math.min(1, video.currentTime / video.duration) + ')';
      }
      progressFrame = requestAnimationFrame(tick);
    })();
  }

  function step(delta) {
    var list = visibleCards();
    if (!current || list.length < 2) {
      return;
    }
    var i = list.indexOf(current);
    fill(list[(i + delta + list.length) % list.length]);
  }

  grid.addEventListener('click', function (event) {
    var card = event.target.closest('[data-ai-card]');
    if (!card) {
      return;
    }
    returnFocusTo = card.querySelector('[data-ai-open]');
    fill(card);
    dialog.showModal();
    document.documentElement.classList.add('is-dialog-open');
  });

  dialog.querySelector('[data-ai-close]').addEventListener('click', function () {
    dialog.close();
  });
  dialog.querySelector('[data-ai-prev]').addEventListener('click', function () {
    step(-1);
  });
  dialog.querySelector('[data-ai-next]').addEventListener('click', function () {
    step(1);
  });
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) {
      dialog.close();
    }
  });
  dialog.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowLeft') {
      step(-1);
    } else if (event.key === 'ArrowRight') {
      step(1);
    }
  });
  dialog.addEventListener('close', function () {
    document.documentElement.classList.remove('is-dialog-open');
    // Ролик в окне останавливаем и выгружаем, чтобы не качался в фоне.
    mediaEl.innerHTML = '';
    cancelAnimationFrame(progressFrame);
    if (returnFocusTo) {
      returnFocusTo.focus();
    }
  });
})();
