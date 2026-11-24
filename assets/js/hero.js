/* Titulní oblast úvodu — střídání fotek výrobků (jen index.html).
   Vzor: WAI-ARIA APG Carousel (automaticky střídaný, s tlačítkem pro zastavení a výběrem snímku).
   - Bez JS: vidět je jen 1. snímek a text (ostatní snímky mají visibility:hidden a obrázky nenačtené).
   - Obrázky snímků 2+ se načtou až po události load (data-srcset / data-src), první obrazovka na ně nečeká.
   - Střídání po INTERVAL ms, prolnutí 0,9 s (CSS). Zastaví se při najetí myší, při fokusu uvnitř oblasti,
     na skryté záložce a tlačítkem Pozastavit (WCAG 2.2.2). Během obrysové animace (obrys.js,
     .hero__outline[data-obrys="running"]) se nestřídá.
   - prefers-reduced-motion: žádné automatické střídání ani prolínání, tlačítko Pozastavit skryté,
     ruční výběr snímku funguje bez animace.
   - aria-live="off" během automatického střídání (žádná hlášení), "polite" když stojí. */
(function () {
  'use strict';

  var root = document.querySelector('[data-hero]');
  if (!root) return;
  var slides = Array.prototype.slice.call(root.querySelectorAll('[data-hero-slide]'));
  if (slides.length < 2) return;

  var INTERVAL = 3500;   // ms mezi snímky
  var FADE = 900;        // ms, musí odpovídat transition v styles.css (.hero__slide)

  var live = root.querySelector('.hero__slides');
  var toggle = root.querySelector('[data-hero-toggle]');
  var toggleLabel = toggle && toggle.querySelector('.hero__toggle-label');
  var dots = Array.prototype.slice.call(root.querySelectorAll('[data-hero-dot]'));
  var outline = root.querySelector('.hero__outline');
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  var current = 0;
  var stopped = false;     // uživatel stiskl Pozastavit
  var hover = false;
  var focusIn = false;
  var timer = null;
  var prevTimer = null;
  var loaded = false;
  var started = false;     // až po události load
  var obrysWaits = 0;

  /* --- načtení obrázků snímků 2+ --- */
  function loadSlide(slide) {
    if (slide.getAttribute('data-loaded')) return;
    slide.setAttribute('data-loaded', '1');
    Array.prototype.forEach.call(slide.querySelectorAll('source[data-srcset]'), function (s) {
      s.srcset = s.getAttribute('data-srcset');
      s.removeAttribute('data-srcset');
    });
    var img = slide.querySelector('img[data-src]');
    if (img) {
      if (img.hasAttribute('data-srcset')) {
        img.srcset = img.getAttribute('data-srcset');
        img.removeAttribute('data-srcset');
      }
      img.src = img.getAttribute('data-src');
      img.removeAttribute('data-src');
    }
  }
  function loadAll() {
    if (loaded) return;
    loaded = true;
    slides.forEach(loadSlide);
  }
  function imageReady(slide) {
    var img = slide.querySelector('.hero__img');
    return !img || img.hasAttribute('data-src') ? false : (img.complete && img.naturalWidth > 1);
  }

  /* --- zobrazení snímku --- */
  function setHidden(slide, hidden) {
    // inert = odkaz v popisku skrytého snímku není dostupný klávesnicí ani čtečce (i během prolnutí)
    if (hidden) slide.setAttribute('inert', ''); else slide.removeAttribute('inert');
  }

  function show(index, animate) {
    index = (index + slides.length) % slides.length;
    if (index === current) return;
    var prev = slides[current];
    var next = slides[index];
    loadSlide(next);

    clearTimeout(prevTimer);
    slides.forEach(function (s) { s.classList.remove('is-prev', 'is-instant'); });

    if (animate) {
      prev.classList.add('is-prev');
      prevTimer = setTimeout(function () { prev.classList.remove('is-prev'); }, FADE + 50);
    } else {
      prev.classList.add('is-instant');
      next.classList.add('is-instant');
    }
    prev.classList.remove('is-active');
    setHidden(prev, true);
    next.classList.add('is-active');
    setHidden(next, false);
    current = index;

    dots.forEach(function (d, i) {
      if (i === index) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
  }

  /* --- automatické střídání --- */
  function wantsRotation() {
    return !stopped && !hover && !focusIn && !reduce.matches && document.visibilityState !== 'hidden';
  }
  function canRotate() { return started && wantsRotation(); }
  function schedule(delay) {
    clearTimeout(timer);
    timer = null;
    if (!canRotate()) return;
    timer = setTimeout(tick, delay == null ? INTERVAL : delay);
  }
  function tick() {
    timer = null;
    if (!canRotate()) return;
    if (outline && outline.getAttribute('data-obrys') === 'running' && obrysWaits < 5) {
      obrysWaits++;            // pojistka: na doběhnutí obrysu čekat nejvýš ~5 s
      schedule(1000);
      return;
    }
    var nextIndex = (current + 1) % slides.length;
    var next = slides[nextIndex];
    loadSlide(next);
    if (!imageReady(next)) {
      // obrázek ještě není stažený — počkat, ať se neprolíná do prázdna
      var img = next.querySelector('.hero__img');
      var retry = function () { schedule(300); };
      img.addEventListener('load', retry, { once: true });
      img.addEventListener('error', function () { show(nextIndex, false); schedule(); }, { once: true });
      return;
    }
    show(nextIndex, true);
    schedule();
  }

  function updateLive() {
    // během automatického střídání bez hlášení; když stojí, ohlásí ručně vybraný snímek
    live.setAttribute('aria-live', wantsRotation() ? 'off' : 'polite');
  }
  function refresh() {
    updateLive();
    if (canRotate()) { if (!timer) schedule(); }
    else { clearTimeout(timer); timer = null; }
  }

  function setStopped(value) {
    stopped = value;
    if (toggle) {
      toggle.setAttribute('data-state', stopped ? 'stopped' : 'playing');
      if (toggleLabel) toggleLabel.textContent = stopped ? 'Spustit' : 'Pozastavit';
    }
    refresh();
  }

  function applyMotionPreference() {
    if (toggle) toggle.hidden = reduce.matches;
    if (reduce.matches) {
      // bez pohybu: zpět na první snímek jen při načtení, jinak ponechat, co si uživatel vybral
      clearTimeout(timer); timer = null;
    }
    refresh();
  }

  /* --- inicializace --- */
  slides.forEach(function (s, i) {
    if (i === 0) s.classList.add('is-active'); else s.classList.remove('is-active');
    setHidden(s, i !== 0);
  });

  if (toggle) {
    toggle.addEventListener('click', function () { setStopped(!stopped); });
    toggle.setAttribute('data-state', 'playing');
  }
  dots.forEach(function (d) {
    d.addEventListener('click', function () {
      var i = parseInt(d.getAttribute('data-hero-dot'), 10) || 0;
      show(i, !reduce.matches);
      // fokus je uvnitř oblasti → střídání stojí; po odchodu fokusu se rozběhne s plným intervalem
      schedule();
    });
  });

  root.addEventListener('mouseenter', function () { hover = true; refresh(); });
  root.addEventListener('mouseleave', function () { hover = false; refresh(); });
  root.addEventListener('focusin', function () { focusIn = true; refresh(); });
  root.addEventListener('focusout', function (e) {
    if (!root.contains(e.relatedTarget)) { focusIn = false; refresh(); }
  });
  document.addEventListener('visibilitychange', refresh);
  if (reduce.addEventListener) reduce.addEventListener('change', applyMotionPreference);
  else if (reduce.addListener) reduce.addListener(applyMotionPreference);

  applyMotionPreference();

  function start() {
    started = true;
    loadAll();
    schedule();   // první prolnutí až INTERVAL po load (obrys mezitím doběhne)
  }
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
})();
