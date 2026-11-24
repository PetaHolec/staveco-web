/* Obrys sil přes první snímek titulní oblasti — jeden krátký pohyb při prvním načtení.
   - Vloží inline SVG (široký / na výšku podle stejného media query jako <picture>) do .hero__outline.
   - Během animace nastaví .hero__outline[data-obrys="running"]; hero.js mezitím snímky nestřídá.
     Po doběhnutí (nebo když animace neproběhne) data-obrys="done".
   - Animuje jen když je hero při načtení vidět a uživatel nechce omezený pohyb.
   - Nic neblokuje: nadpis i navigace fungují hned, na nic se nečeká.
   - Při chybě (fetch, parse, obrázek) zůstane jen fotografie. */
(function () {
  'use strict';

  var host = document.querySelector('.hero__outline');
  if (!host || !window.fetch || !window.matchMedia || !window.DOMParser) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) return; // koncový stav = jen fotka

  var media = host.parentNode;
  var img = media.querySelector('.hero__img');
  // musí odpovídat media u <source> výřezů na výšku v index.html a @media v styles.css (.hero)
  var mqMobile = window.matchMedia('(max-aspect-ratio: 4/5)');
  var MAX_START = 2500; // ms od začátku načítání; později už animaci nespouštět
  var query = window.location.search;
  var debugHold = /[?&]obrys=hold\b/.test(query);
  if (/[?&]obrys=slow\b/.test(query)) host.style.setProperty('--obrys-speed', '6');

  function inView() {
    var r = media.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    return r.width > 0 && r.bottom > 0 && r.top < vh;
  }
  if (document.visibilityState === 'hidden' || !inView()) return;

  var cache = {};
  function load(url) {
    if (!cache[url]) {
      cache[url] = fetch(url, { credentials: 'same-origin' })
        .then(function (res) {
          if (!res.ok) throw new Error('obrys: ' + res.status);
          return res.text();
        })
        .then(function (text) {
          var doc = new DOMParser().parseFromString(text, 'image/svg+xml');
          var svg = doc.documentElement;
          if (!svg || svg.nodeName.toLowerCase() !== 'svg' ||
              doc.getElementsByTagName('parsererror').length) {
            throw new Error('obrys: neplatné SVG');
          }
          return svg;
        });
    }
    return cache[url];
  }

  function currentUrl() {
    return mqMobile.matches ? host.getAttribute('data-outline-mobile')
                            : host.getAttribute('data-outline-desktop');
  }

  var STROKE_PX = 2;
  function fitStroke() {
    var svg = host.querySelector('svg');
    if (!svg) return;
    var vb = svg.viewBox && svg.viewBox.baseVal;
    var w = host.clientWidth, h = host.clientHeight;
    if (!vb || !vb.width || !w || !h) return;
    var scale = Math.max(w / vb.width, h / vb.height); // = "slice" / object-fit: cover
    svg.style.setProperty('--obrys-sw', (STROKE_PX / scale).toFixed(2));
  }
  if (window.ResizeObserver) new ResizeObserver(fitStroke).observe(host);
  else window.addEventListener('resize', fitStroke);

  var token = 0;
  function insert(svg, animate) {
    var node = document.importNode(svg, true);
    node.removeAttribute('width');
    node.removeAttribute('height');
    node.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    node.setAttribute('aria-hidden', 'true');
    node.setAttribute('focusable', 'false');
    node.setAttribute('class', 'obrys' + (animate ? ' obrys--draw' : '') + (debugHold ? ' obrys--hold' : ''));
    if (animate) {
      host.setAttribute('data-obrys', 'running');
      node.addEventListener('animationend', function (e) {
        // konec splynutí: odebrat animaci, výchozí stav je neviditelný obrys
        if (e.target === node) {
          node.classList.remove('obrys--draw');
          host.setAttribute('data-obrys', 'done');
        }
      });
    }
    while (host.firstChild) host.removeChild(host.firstChild);
    host.appendChild(node);
    fitStroke();
  }

  function show(animate) {
    var my = ++token;
    var url = currentUrl();
    if (!url) return;
    load(url).then(function (svg) {
      if (my === token) insert(svg, animate);
    }, function () { /* při chybě nic — zůstane fotka */ });
  }

  function imageReady() {
    if (!img || (img.complete && img.naturalWidth)) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', reject, { once: true });
    });
  }

  var firstUrl = currentUrl();
  if (!firstUrl) return;

  Promise.all([load(firstUrl), imageReady()]).then(function () {
    var late = window.performance && performance.now() > MAX_START;
    var ok = !late && !reduce.matches && document.visibilityState !== 'hidden' && inView();
    if (ok || debugHold) show(ok);
    if (!ok) host.setAttribute('data-obrys', 'done');
  }, function () { host.setAttribute('data-obrys', 'done'); /* fetch nebo obrázek selhal — jen fotka */ });

  function onBreakpoint() {
    if (host.firstChild) show(false); // výměna bez animace
  }
  function onReduce() {
    if (reduce.matches) {
      var svg = host.querySelector('.obrys--draw');
      if (svg) svg.classList.remove('obrys--draw');
      host.setAttribute('data-obrys', 'done');
    }
  }
  if (mqMobile.addEventListener) {
    mqMobile.addEventListener('change', onBreakpoint);
    reduce.addEventListener('change', onReduce);
  } else if (mqMobile.addListener) {
    mqMobile.addListener(onBreakpoint);
    reduce.addListener(onReduce);
  }
})();
