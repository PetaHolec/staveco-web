/* STAVECO Morava – sdílený skript (vanilla, bez závislostí, progresivní vylepšení).
   Moduly:
   1. initNav()        mobilní menu (.nav-toggle + #hlavni-navigace)
   2. initRegister()   rejstřík na úvodu: [data-register] s řádky [data-register-key]
                       a náhledy [data-register-image="<key>"] (bez JS zůstane první)
   3. initForms()      form[data-form]: předvyplnění ?predmet=, validace, fetch POST
                       na data-endpoint, potvrzení jen při response.ok + JSON {"ok":true}
   4. initTables()     .table-scroll: označí, když tabulka přetéká (nápověda posunu)
   5. initInquiryLinks() detail výrobku/služby: <body data-predmet="Název"> → odkazy na
                       /poptavka/ v hlavičce a menu dostanou ?predmet=<Název>
   Kontrakt endpointu formuláře: _podklady/backend-formulare.md
*/
(function () {
  'use strict';

  var doc = document;
  doc.documentElement.classList.add('js');

  var DESKTOP_NAV = window.matchMedia('(min-width: 56.25em)');
  var DEFAULT_EMAIL = 'info@staveco.cz';

  /* ---------- 1. Mobilní menu ---------- */
  function initNav() {
    var toggle = doc.querySelector('.nav-toggle');
    if (!toggle) return;
    var nav = doc.getElementById(toggle.getAttribute('aria-controls'));
    if (!nav) return;

    function setOpen(open, returnFocus) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      nav.classList.toggle('is-open', open);
      if (!open && returnFocus) toggle.focus();
    }
    function isOpen() { return toggle.getAttribute('aria-expanded') === 'true'; }

    toggle.addEventListener('click', function () {
      var open = !isOpen();
      setOpen(open, false);
      if (open) {
        var first = nav.querySelector('a');
        if (first) first.focus();
      }
    });

    doc.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && isOpen()) {
        setOpen(false, true);
      }
    });

    doc.addEventListener('click', function (e) {
      if (isOpen() && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false, false);
    });

    // klávesnicí ven z menu (Tab za poslední odkaz) → zavřít
    nav.addEventListener('focusout', function (e) {
      if (!isOpen() || DESKTOP_NAV.matches) return;
      var next = e.relatedTarget;
      if (next && !nav.contains(next) && next !== toggle) setOpen(false, false);
    });

    var onChange = function () { if (DESKTOP_NAV.matches) setOpen(false, false); };
    if (DESKTOP_NAV.addEventListener) DESKTOP_NAV.addEventListener('change', onChange);
    else if (DESKTOP_NAV.addListener) DESKTOP_NAV.addListener(onChange);
  }

  /* ---------- 2. Rejstřík se společným náhledem ---------- */
  function initRegister() {
    var registers = doc.querySelectorAll('[data-register]');
    Array.prototype.forEach.call(registers, function (reg) {
      var rows = reg.querySelectorAll('[data-register-key]');
      var images = reg.querySelectorAll('[data-register-image]');
      if (!rows.length || !images.length) return;

      var preview = reg.querySelector('.register__preview');
      // Náhled je vidět jen od 56.25em (na mobilu display:none → nic nestahovat).
      // V HTML mají obrázky loading="lazy"; na desktopu aktivní náhled načteme hned,
      // ostatní až po window load, aby přepnutí při najetí nebylo prázdné.
      if (preview && preview.offsetParent !== null) {
        var eager = function (img) { if (img && img.loading === 'lazy') img.loading = 'eager'; };
        eager(reg.querySelector('.register__image.is-active img') || images[0].querySelector('img'));
        var rest = function () {
          Array.prototype.forEach.call(preview.querySelectorAll('img'), eager);
        };
        if (doc.readyState === 'complete') rest();
        else window.addEventListener('load', rest);
      }
      function activate(key) {
        // náhled je jen na širších displejích; na mobilu řádky nezvýrazňujeme
        if (preview && preview.offsetParent === null) return;
        Array.prototype.forEach.call(images, function (img) {
          img.classList.toggle('is-active', img.getAttribute('data-register-image') === key);
        });
        Array.prototype.forEach.call(rows, function (row) {
          row.classList.toggle('is-active', row.getAttribute('data-register-key') === key);
        });
      }

      Array.prototype.forEach.call(rows, function (row) {
        var key = row.getAttribute('data-register-key');
        row.addEventListener('mouseenter', function () { activate(key); });
        row.addEventListener('focusin', function () { activate(key); });
      });
    });
  }

  /* ---------- 3. Formuláře poptávky ---------- */
  var MESSAGES = {
    valueMissing: 'Toto pole je povinné.',
    typeMismatchEmail: 'Zadejte e-mail ve tvaru jmeno@firma.cz.',
    typeMismatch: 'Zkontrolujte formát údaje.',
    tooLong: 'Text je příliš dlouhý.',
    patternMismatch: 'Zkontrolujte formát údaje.',
    fileTooBig: 'Soubor je větší než povolený limit.',
    fileType: 'Tento typ souboru nelze přiložit.'
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function formatBytes(n) {
    return (n / (1024 * 1024)).toFixed(0) + ' MB';
  }

  function errorElFor(field) {
    var id = field.id ? field.id + '-chyba' : null;
    var el = id ? doc.getElementById(id) : null;
    if (!el) {
      el = doc.createElement('p');
      el.className = 'field__error';
      if (id) el.id = id;
      var wrap = field.closest('.field') || field.parentNode;
      wrap.appendChild(el);
    }
    el.setAttribute('aria-live', 'polite');
    if (el.id) {
      var described = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      if (described.indexOf(el.id) === -1) {
        described.push(el.id);
        field.setAttribute('aria-describedby', described.join(' '));
      }
    }
    return el;
  }

  function checkFile(field) {
    if (field.type !== 'file' || !field.files || !field.files.length) return '';
    var max = parseInt(field.getAttribute('data-max-size'), 10);
    var accept = (field.getAttribute('accept') || '').toLowerCase().split(',')
      .map(function (s) { return s.trim(); }).filter(Boolean);
    for (var i = 0; i < field.files.length; i++) {
      var f = field.files[i];
      if (max && f.size > max) return MESSAGES.fileTooBig + ' (max. ' + formatBytes(max) + ')';
      if (accept.length) {
        var name = f.name.toLowerCase();
        var ok = accept.some(function (a) {
          return a.charAt(0) === '.' ? name.slice(-a.length) === a : (f.type && f.type.indexOf(a.replace('*', '')) === 0);
        });
        if (!ok) return MESSAGES.fileType;
      }
    }
    return '';
  }

  function validateField(field) {
    if (!field.willValidate && field.type !== 'file') return true;
    var msg = '';
    if (field.type === 'file') msg = checkFile(field);
    if (!msg && field.validity && !field.validity.valid) {
      var v = field.validity;
      if (v.valueMissing) msg = field.getAttribute('data-msg-required') || MESSAGES.valueMissing;
      else if (v.typeMismatch) msg = field.type === 'email' ? MESSAGES.typeMismatchEmail : MESSAGES.typeMismatch;
      else if (v.tooLong) msg = MESSAGES.tooLong;
      else if (v.patternMismatch) msg = field.getAttribute('data-msg-pattern') || MESSAGES.patternMismatch;
      else msg = field.validationMessage;
    }
    // text jen z mezer bereme jako prázdný
    if (!msg && field.required && typeof field.value === 'string' && field.type !== 'file' && !field.value.trim()) {
      msg = field.getAttribute('data-msg-required') || MESSAGES.valueMissing;
    }
    var errEl = errorElFor(field);
    errEl.textContent = msg;
    if (msg) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
    return !msg;
  }

  function prefill(form) {
    var params;
    try { params = new URLSearchParams(window.location.search); } catch (e) { return; }
    Array.prototype.forEach.call(form.querySelectorAll('[data-prefill]'), function (field) {
      var key = field.getAttribute('data-prefill');
      var value = params.get(key);
      if (value && !field.value) field.value = value.slice(0, 200);
    });
  }

  function initForm(form) {
    var endpoint = form.getAttribute('data-endpoint') || form.getAttribute('action');
    var email = form.getAttribute('data-fallback-email') || DEFAULT_EMAIL;
    var status = form.querySelector('[data-form-status]');
    var success = form.getAttribute('data-success')
      ? doc.getElementById(form.getAttribute('data-success'))
      : form.parentNode.querySelector('[data-form-success]');
    var submit = form.querySelector('[type="submit"]');
    var submitLabel = submit ? submit.textContent : '';
    var attempted = false;

    form.setAttribute('novalidate', '');
    prefill(form);

    if (!status) {
      status = doc.createElement('div');
      status.className = 'form-status';
      status.setAttribute('data-form-status', '');
      status.hidden = true;
      form.insertBefore(status, form.firstChild);
    }
    status.setAttribute('role', 'status');
    status.setAttribute('tabindex', '-1');

    function fields() {
      return Array.prototype.filter.call(form.elements, function (el) {
        return /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && el.type !== 'hidden' && !el.disabled;
      });
    }

    function showStatus(kind, html) {
      status.className = 'form-status form-status--' + kind;
      status.innerHTML = html;
      status.hidden = false;
    }

    form.addEventListener('blur', function (e) {
      if (attempted && e.target.form === form && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) validateField(e.target);
    }, true);
    form.addEventListener('input', function (e) {
      if (e.target.getAttribute('aria-invalid') === 'true') validateField(e.target);
    });
    form.addEventListener('change', function (e) {
      if (e.target.type === 'file') validateField(e.target);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.classList.contains('is-sending')) return;
      attempted = true;

      var invalid = fields().filter(function (f) { return !validateField(f); });
      if (invalid.length) {
        // souhrn chyb s odkazy na pole (WCAG 3.3.1); fokus jde rovnou na první chybné pole
        var items = invalid.map(function (f) {
          var label = f.id ? form.querySelector('label[for="' + f.id + '"]') : null;
          var name = label ? label.cloneNode(true) : null;
          if (name) Array.prototype.forEach.call(name.querySelectorAll('[aria-hidden="true"], .field__optional'), function (n) { n.remove(); });
          var text = name ? name.textContent.trim() : (f.name || 'pole');
          var err = doc.getElementById(f.id + '-chyba');
          return '<li><a href="#' + f.id + '">' + escapeHtml(text) + '</a>' +
            (err && err.textContent ? ' – ' + escapeHtml(err.textContent) : '') + '</li>';
        }).join('');
        showStatus('error', '<strong>Formulář nelze odeslat.</strong> Opravte prosím ' +
          (invalid.length === 1 ? 'označené pole:' : 'označená pole (' + invalid.length + '):') +
          '<ul class="form-status__list">' + items + '</ul>');
        invalid[0].focus();
        return;
      }

      if (!window.fetch || !window.FormData || !endpoint) {
        form.submit();          // nouzově klasický POST
        return;
      }

      form.classList.add('is-sending');
      // aria-busy jen na tlačítku: na formuláři by čtečky potlačily oznámení stavu (je uvnitř formuláře).
      // aria-disabled místo disabled: fokus zůstane na tlačítku, opakované odeslání blokuje .is-sending.
      if (submit) {
        submit.setAttribute('aria-disabled', 'true');
        submit.setAttribute('aria-busy', 'true');
        submit.textContent = submit.getAttribute('data-sending-label') || 'Odesílám…';
      }
      showStatus('info', 'Odesílám poptávku…');

      fetch(endpoint, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' },
        credentials: 'same-origin'
      }).then(function (response) {
        // úspěch = 2xx A JSON s ok === true; 200 s HTML (hosting bez backendu) je chyba
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var type = (response.headers.get('Content-Type') || '').toLowerCase();
        if (type.indexOf('application/json') === -1) throw new Error('Neočekávaná odpověď: ' + type);
        return response.json().then(function (data) {
          if (!data || data.ok !== true) throw new Error((data && data.error) || 'ok !== true');
        });
      }).then(function () {
        status.hidden = true;
        form.reset();
        if (success) {
          form.hidden = true;
          success.hidden = false;
          success.setAttribute('tabindex', '-1');
          success.focus();
        } else {
          showStatus('info', '<strong>Děkujeme, poptávka byla odeslána.</strong> Ozveme se vám co nejdříve.');
          status.focus();
        }
      }).catch(function () {
        var subjectField = form.querySelector('[name="predmet"]');
        var subject = 'Poptávka' + (subjectField && subjectField.value.trim() ? ': ' + subjectField.value.trim() : '');
        var mailto = 'mailto:' + email + '?subject=' + encodeURIComponent(subject);
        showStatus('error', '<strong>Poptávku se nepodařilo odeslat.</strong> Zkuste to prosím znovu, ' +
          'nebo nám zadání pošlete e-mailem na <a href="' + escapeHtml(mailto) + '">' + email + '</a>. ' +
          'Vyplněné údaje zůstaly ve formuláři.');
        status.focus();
      }).then(function () {
        form.classList.remove('is-sending');
        if (submit) {
          submit.removeAttribute('aria-disabled');
          submit.removeAttribute('aria-busy');
          submit.textContent = submitLabel;
        }
      });
    });
  }

  function initForms() {
    Array.prototype.forEach.call(doc.querySelectorAll('form[data-form]'), initForm);
  }

  /* ---------- 4. Široké tabulky ---------- */
  function initTables() {
    var wraps = doc.querySelectorAll('.table-scroll');
    if (!wraps.length) return;
    Array.prototype.forEach.call(wraps, function (wrap) {
      var viewport = wrap.querySelector('.table-scroll__viewport');
      if (!viewport) return;
      if (!wrap.querySelector('.table-scroll__hint')) {
        var hint = doc.createElement('p');
        hint.className = 'table-scroll__hint';
        hint.textContent = 'Tabulka je širší než displej – posuňte ji do strany →';
        wrap.insertBefore(hint, viewport);
      }
      function update() {
        var scrollable = viewport.scrollWidth > viewport.clientWidth + 1;
        wrap.classList.toggle('is-scrollable', scrollable);
        wrap.classList.toggle('is-at-end', viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 2);
        if (scrollable) {
          viewport.setAttribute('tabindex', '0');
          viewport.setAttribute('role', 'region');
          viewport.setAttribute('aria-label', wrap.getAttribute('data-label') || 'Tabulka – posuvná');
        } else {
          viewport.removeAttribute('tabindex');
          viewport.removeAttribute('role');
          viewport.removeAttribute('aria-label');
        }
      }
      viewport.addEventListener('scroll', update, { passive: true });
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(update);
        ro.observe(viewport);
        // i tabulku: šířka obsahu se mění po načtení písem, aniž by se měnil viewport
        if (viewport.firstElementChild) ro.observe(viewport.firstElementChild);
      } else window.addEventListener('resize', update);
      update();
    });
  }

  /* ---------- 5. Poptávka z detailu s předmětem ---------- */
  function initInquiryLinks() {
    var subject = doc.body && doc.body.getAttribute('data-predmet');
    if (!subject) return;
    var href = '/poptavka/?predmet=' + encodeURIComponent(subject);
    Array.prototype.forEach.call(doc.querySelectorAll('.site-header a[href="/poptavka/"]'), function (a) {
      a.setAttribute('href', href);
    });
  }


  /* ---------- Zvětšení obrázku na stránce (galerie, certifikáty, dokumenty) ----------
     Odkazy a.gallery__link nebo a[data-lightbox] vedou na větší JPG (bez JS se otevře přímo).
     S JS se obrázek otevře v <dialog>: křížek, Esc, klik mimo obrázek, šipky ←/→ ve skupině. */
  function initLightbox() {
    var SEL = 'a.gallery__link, a[data-lightbox]';
    if (!doc.querySelector(SEL) || typeof HTMLDialogElement === 'undefined') return;

    var dlg = doc.createElement('dialog');
    dlg.className = 'lightbox';
    dlg.setAttribute('aria-label', 'Zvětšený obrázek');
    dlg.innerHTML =
      '<button type="button" class="lightbox__close" data-lb-close>Zavřít<span class="lightbox__x" aria-hidden="true"></span></button>' +
      '<figure class="lightbox__figure"><img class="lightbox__img" alt=""><figcaption class="lightbox__caption"></figcaption></figure>' +
      '<button type="button" class="lightbox__nav lightbox__nav--prev" data-lb-step="-1" aria-label="Předchozí obrázek"><span aria-hidden="true">←</span></button>' +
      '<button type="button" class="lightbox__nav lightbox__nav--next" data-lb-step="1" aria-label="Další obrázek"><span aria-hidden="true">→</span></button>' +
      '<p class="lightbox__count" aria-live="polite"></p>';
    doc.body.appendChild(dlg);

    var img = dlg.querySelector('.lightbox__img');
    var cap = dlg.querySelector('.lightbox__caption');
    var count = dlg.querySelector('.lightbox__count');
    var group = [], index = 0, opener = null;

    function groupOf(a) {
      var box = a.closest('[data-lightbox-group], .gallery') || doc.body;
      return Array.prototype.slice.call(box.querySelectorAll(SEL));
    }
    function captionOf(a) {
      if (a.getAttribute('data-caption')) return a.getAttribute('data-caption');
      var thumb = a.querySelector('img');
      return thumb ? thumb.getAttribute('alt') || '' : '';
    }
    function show(i) {
      index = (i + group.length) % group.length;
      var a = group[index];
      var text = captionOf(a);
      img.src = a.getAttribute('href');
      img.alt = text;
      cap.textContent = text;
      cap.hidden = !text;
      var multi = group.length > 1;
      dlg.classList.toggle('lightbox--single', !multi);
      count.textContent = multi ? (index + 1) + ' / ' + group.length : '';
    }
    function close() { if (dlg.open) dlg.close(); }

    doc.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest(SEL);
      if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      opener = a;
      group = groupOf(a);
      show(group.indexOf(a));
      dlg.showModal();
      doc.documentElement.classList.add('has-lightbox');
      dlg.querySelector('[data-lb-close]').focus();
    });
    dlg.addEventListener('click', function (e) {
      if (e.target.closest('[data-lb-close]')) { close(); return; }
      var step = e.target.closest('[data-lb-step]');
      if (step) { show(index + Number(step.getAttribute('data-lb-step'))); return; }
      // klik na tmavé pozadí (mimo obrázek a ovládání) zavře
      if (e.target === dlg || e.target.classList.contains('lightbox__figure')) close();
    });
    dlg.addEventListener('keydown', function (e) {
      if (group.length < 2) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
    });
    dlg.addEventListener('close', function () {
      doc.documentElement.classList.remove('has-lightbox');
      img.removeAttribute('src');
      var back = group[index] || opener;
      if (back) back.focus();
    });
  }

  function init() {
    initInquiryLinks();
    initNav();
    initRegister();
    initForms();
    initTables();
    initLightbox();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
