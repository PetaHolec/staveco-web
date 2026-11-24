#!/usr/bin/env python3
"""Vygeneruje stránky certifikátů a dokumentů z jednoho seznamu.

  /certifikaty/                 náhledy certifikátů (zvětšení na stránce) + podmínky a zásady
  /certifikaty/<slug>/          detail certifikátu: velký obrázek, údaje, odkaz na PDF
  /dokumenty/                   přehled podmínek a zásad
  /dokumenty/<slug>/            všechny strany dokumentu jako obrázky + odkaz na PDF

Obrázky stran: assets/img/dokumenty/<pdf>-<strana>-{480,1600}.jpg (vykresleno z PDF).
Po spuštění vždy pusť python3 tools/sync_partials.py (doplní hlavičku a patičku).
"""
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parent.parent
IMG = "/assets/img/dokumenty"

CERTS = [
    dict(slug="iso-9001", pdf="certifikat-CSN-EN-ISO-9001-CZ", size="2,2&nbsp;MB",
         title="ISO 9001 a ISO 3834-2",
         sub="Systém managementu kvality ve spojení se svařováním",
         short_norm='<span class="u-nowrap">ČSN EN ISO 9001:2016</span> ve spojení s <span class="u-nowrap">ČSN EN ISO 3834-2:2022</span>',
         validity_short='platí do <time datetime="2026-12-22">22.&nbsp;12.&nbsp;2026</time>',
         meta=[("Norma", '<span class="u-nowrap">ČSN EN ISO 9001:2016</span> ve spojení s <span class="u-nowrap">ČSN EN ISO 3834-2:2022</span>'),
               ("Rozsah", "výroba a montáž ocelových konstrukcí, zásobníků a sil"),
               ("Vydal", "STAVCERT Praha, spol. s&nbsp;r.&nbsp;o., certifikační orgán č.&nbsp;3024"),
               ("Číslo", "QWS-083/2023"),
               ("Platnost", 'od <time datetime="2023-12-23">23.&nbsp;12.&nbsp;2023</time> do <time datetime="2026-12-22">22.&nbsp;12.&nbsp;2026</time>')]),
    dict(slug="en-1090", pdf="osvedceni-CSN-EN-1090-1-EXC2-CZ", size="2,0&nbsp;MB",
         title="EN 1090, EXC 2",
         sub="Osvědčení o shodě řízení výroby ocelových konstrukcí",
         short_norm='<span class="u-nowrap">ČSN EN 1090-1+A1:2012</span>, třída provedení EXC&nbsp;2',
         validity_short='vydáno <time datetime="2019-12-20">20.&nbsp;12.&nbsp;2019</time>, bez data konce platnosti',
         meta=[("Norma", '<span class="u-nowrap">ČSN EN 1090-1+A1:2012</span>, systém 2+; konstrukční dílce podle <span class="u-nowrap">ČSN EN 1090-2:2019</span>, třída provedení EXC&nbsp;2'),
               ("Rozsah", "konstrukční dílce pro ocelové konstrukce"),
               ("Vydal", "STAVCERT, oznámený subjekt 1517"),
               ("Číslo", "1517 – CPR – 518 2019"),
               ("Platnost", 'vydáno <time datetime="2019-12-20">20.&nbsp;12.&nbsp;2019</time>; dokument neuvádí datum konce platnosti, osvědčení platí, dokud se nezmění podmínky v něm uvedené')]),
    dict(slug="iso-3834-2", pdf="certifikat-CSN-EN-ISO-3834-2-CZ", size="549&nbsp;kB",
         title="ISO 3834-2",
         sub="Certifikát procesu svařování",
         short_norm='<span class="u-nowrap">ČSN EN ISO 3834-2:2022</span>',
         validity_short='platí do <time datetime="2029-05-29">29.&nbsp;5.&nbsp;2029</time>',
         meta=[("Norma", '<span class="u-nowrap">ČSN EN ISO 3834-2:2022</span>'),
               ("Rozsah", "výroba a montáž ocelových sil, zásobníků a konstrukcí; výroba potrubí a zámečnických výrobků"),
               ("Vydal", "TÜV SÜD Czech s.r.o., certifikační orgán výrobků č.&nbsp;3084"),
               ("Číslo", "15.963.521"),
               ("Platnost", 'od <time datetime="2024-05-30">30.&nbsp;5.&nbsp;2024</time> do <time datetime="2029-05-29">29.&nbsp;5.&nbsp;2029</time>')]),
    dict(slug="ad-2000", pdf="certifikat-AD-2000-Merkblatt-HP-0-EN-13445-4", size="535&nbsp;kB, anglicky",
         title="AD 2000-Merkblatt HP 0 a EN 13445-4",
         sub="Svářečská způsobilost pro výrobu tlakových zařízení",
         short_norm='<span class="u-nowrap">AD 2000-Merkblatt HP 0</span>, <span class="u-nowrap">EN 13445-4</span>',
         validity_short='platí do <time datetime="2027-02-28">28.&nbsp;2.&nbsp;2027</time>',
         meta=[("Norma", '<span class="u-nowrap">AD 2000-Merkblatt HP 0</span>, <span class="u-nowrap">EN 13445-4</span>'),
               ("Rozsah", "výroba tlakových zařízení; v dokumentu s odkazem na směrnici pro tlaková zařízení 2014/68/EU"),
               ("Vydal", "TÜV SÜD Industrie Service GmbH, Mnichov"),
               ("Číslo", "TÜV SÜD-MUC-DG-3106924.2018.005"),
               ("Platnost", 'do <time datetime="2027-02-28">28.&nbsp;2.&nbsp;2027</time>'),
               ("Jazyk", "anglicky")]),
]

DOCS = [
    dict(slug="vseobecne-dodaci-podminky", pdf="vseobecne-dodaci-podminky", pages=4, size="329&nbsp;kB",
         title="Všeobecné dodací podmínky", note="Účinné od 25.&nbsp;5.&nbsp;2018."),
    dict(slug="zasady-ochrany-osobnich-udaju", pdf="zasady-ochrany-osobnich-udaju", pages=5, size="482&nbsp;kB",
         title="Zásady ochrany osobních údajů", note=""),
    dict(slug="zasady-cookies", pdf="zasady-cookies", pages=5, size="325&nbsp;kB",
         title="Zásady cookies", note=""),
]

HEAD = """<!doctype html>
<html lang="cs">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} – STAVECO Morava</title>
  <meta name="description" content="{desc}">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@600&family=Source+Sans+3:ital,wght@0,400;0,600;1,400&display=swap&subset=latin-ext" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/styles.css?v=3">
  <link rel="icon" type="image/png" href="/assets/img/logo-znak.png">
  <script src="/assets/js/main.js?v=3" defer></script>
</head>
<body data-section="{section}">
<a class="skip-link" href="#obsah">Přeskočit na obsah</a>
<!-- @header --><!-- /@header -->
<main id="obsah" tabindex="-1">
  <div class="container">
"""
FOOT = """  </div>
</main>
<!-- @footer --><!-- /@footer -->
</body>
</html>
"""


def pages_word(n):
    return f"{n} strany" if 2 <= n <= 4 else f"{n} stran"


def crumbs(items):
    li = []
    for label, href in items[:-1]:
        li.append(f'          <li><a href="{href}">{label}</a></li>')
    li.append(f'          <li aria-current="page">{items[-1][0]}</li>')
    return ('    <header class="page-head">\n'
            '      <nav class="breadcrumbs" aria-label="Drobečková navigace">\n        <ol>\n'
            + "\n".join(li) + "\n        </ol>\n      </nav>\n")


def page_img(pdf, n, alt, cls="doc-page", eager=False, group_caption=None):
    cap = escape(group_caption or alt, quote=True)
    lazy = "" if eager else ' loading="lazy"'
    return (f'<a class="{cls}" href="{IMG}/{pdf}-{n}-1600.jpg" data-lightbox data-caption="{cap}">'
            f'<img src="{IMG}/{pdf}-{n}-480.jpg" srcset="{IMG}/{pdf}-{n}-480.jpg 480w, {IMG}/{pdf}-{n}-1600.jpg 1600w" '
            f'sizes="(min-width: 64em) 22rem, (min-width: 40em) 40vw, 90vw" width="480" height="678" alt="{escape(alt, quote=True)}"{lazy}>'
            f'<span class="doc-page__zoom" aria-hidden="true">Zvětšit</span></a>')


def dl(meta):
    rows = "\n".join(f'          <div><dt>{k}</dt><dd{" class=\"doc-meta__norm\"" if k == "Norma" else ""}>{v}</dd></div>' for k, v in meta)
    return f'        <dl class="doc-meta">\n{rows}\n        </dl>\n'


def write(path, html):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html, encoding="utf-8")
    print("zapsáno", path.relative_to(ROOT))


def docs_list_html(heading_id, heading):
    items = []
    for d in DOCS:
        items.append(
            f'        <li class="doc-grid__item">\n'
            f'          {page_img(d["pdf"], 1, "První strana dokumentu " + d["title"], cls="doc-page doc-page--small")}\n'
            f'          <div class="doc-grid__body">\n'
            f'            <h3 class="doc-grid__title"><a href="/dokumenty/{d["slug"]}/">{d["title"]}</a></h3>\n'
            f'            <p class="doc-grid__meta">{pages_word(d["pages"])}{(" · " + d["note"]) if d["note"] else ""}</p>\n'
            f'          </div>\n        </li>')
    return (f'    <section class="section" aria-labelledby="{heading_id}">\n'
            f'      <div class="section__head"><h2 id="{heading_id}">{heading}</h2></div>\n'
            f'      <ul class="doc-grid doc-grid--docs" role="list" data-lightbox-group>\n' + "\n".join(items) + "\n      </ul>\n    </section>\n")


def build():
    # --- přehled certifikátů ---
    cards = []
    for c in CERTS:
        cards.append(
            f'      <li class="doc-grid__item">\n'
            f'        {page_img(c["pdf"], 1, "Certifikát " + c["title"] + " – " + c["sub"])}\n'
            f'        <div class="doc-grid__body">\n'
            f'          <h2 class="doc-grid__title" id="{c["slug"]}"><a href="/certifikaty/{c["slug"]}/">{c["title"]}</a></h2>\n'
            f'          <p class="doc-grid__sub">{c["sub"]}</p>\n'
            f'          <p class="doc-grid__meta">{c["validity_short"]}</p>\n'
            f'        </div>\n      </li>')
    html = HEAD.format(title="Certifikáty", section="certifikaty",
                       desc="Certifikáty a osvědčení STAVECO Morava: ČSN EN ISO 9001:2016 ve spojení s ČSN EN ISO 3834-2:2022, ČSN EN 1090-1+A1:2012 EXC 2, AD 2000-Merkblatt HP 0 a EN 13445-4.")
    html += crumbs([("Úvod", "/"), ("Certifikáty", "")])
    html += ('      <h1 class="page-head__title">Certifikáty</h1>\n'
             '      <p class="page-head__lede">Klepnutím na náhled certifikát zvětšíte. Podrobné údaje a originál v PDF najdete po kliknutí na název.</p>\n'
             '    </header>\n\n'
             '    <ul class="doc-grid" role="list" data-lightbox-group>\n' + "\n".join(cards) + "\n    </ul>\n\n")
    html += docs_list_html("obchodni-dokumenty", "Podmínky a zásady")
    html += FOOT
    write(ROOT / "certifikaty/index.html", html)

    # --- detail certifikátu ---
    for c in CERTS:
        html = HEAD.format(title=f'{c["title"]} – certifikát', section="certifikaty",
                           desc=f'{c["title"]}: {c["sub"].lower()}. Certifikát STAVECO Morava s údaji a originálem v PDF.')
        html += crumbs([("Úvod", "/"), ("Certifikáty", "/certifikaty/"), (c["title"], "")])
        html += (f'      <h1 class="page-head__title">{c["title"]}</h1>\n'
                 f'      <p class="page-head__lede">{c["sub"]}</p>\n    </header>\n\n'
                 f'    <div class="doc-detail">\n'
                 f'      <div class="doc-detail__media">\n        {page_img(c["pdf"], 1, "Certifikát " + c["title"], eager=True)}\n      </div>\n'
                 f'      <div class="doc-detail__body">\n' + dl(c["meta"]) +
                 f'        <p class="doc-detail__actions"><a class="btn" href="/dokumenty/{c["pdf"]}.pdf" type="application/pdf">Otevřít originál v PDF</a>'
                 f' <span class="doc-detail__size">({c["size"]})</span></p>\n'
                 f'        <p><a class="back-link" href="/certifikaty/">← Všechny certifikáty</a></p>\n'
                 f'      </div>\n    </div>\n')
        html += FOOT
        write(ROOT / f'certifikaty/{c["slug"]}/index.html', html)

    # --- přehled dokumentů ---
    html = HEAD.format(title="Dokumenty", section="dokumenty",
                       desc="Všeobecné dodací podmínky, zásady ochrany osobních údajů a zásady cookies STAVECO Morava.")
    html += crumbs([("Úvod", "/"), ("Dokumenty", "")])
    html += ('      <h1 class="page-head__title">Dokumenty</h1>\n'
             '      <p class="page-head__lede">Obchodní podmínky a zásady. Certifikáty najdete na stránce <a href="/certifikaty/">Certifikáty</a>.</p>\n'
             '    </header>\n\n')
    html += docs_list_html("seznam-dokumentu", "Podmínky a zásady")
    html += FOOT
    write(ROOT / "dokumenty/index.html", html)

    # --- detail dokumentu ---
    for d in DOCS:
        pages = "\n".join(
            f'        <li>{page_img(d["pdf"], n, f"{d["title"]}, strana {n} z {d["pages"]}", eager=(n == 1))}'
            f'<span class="doc-pages__num">Strana {n}</span></li>'
            for n in range(1, d["pages"] + 1))
        html = HEAD.format(title=d["title"], section="dokumenty",
                           desc=f'{d["title"]} STAVECO Morava, spol. s r.o.')
        html += crumbs([("Úvod", "/"), ("Dokumenty", "/dokumenty/"), (d["title"], "")])
        html += (f'      <h1 class="page-head__title">{d["title"]}</h1>\n'
                 f'      <p class="page-head__lede">{(d["note"] + " ") if d["note"] else ""}Strany zvětšíte klepnutím. Text ke čtení, tisku nebo uložení je v PDF.</p>\n'
                 f'    </header>\n\n'
                 f'    <p class="doc-detail__actions"><a class="btn" href="/dokumenty/{d["pdf"]}.pdf" type="application/pdf">Otevřít v PDF</a>'
                 f' <span class="doc-detail__size">({pages_word(d["pages"])}, {d["size"]})</span></p>\n\n'
                 f'    <ol class="doc-pages" role="list" data-lightbox-group aria-label="Strany dokumentu">\n{pages}\n    </ol>\n'
                 f'    <p><a class="back-link" href="/dokumenty/">← Všechny dokumenty</a></p>\n')
        html += FOOT
        write(ROOT / f'dokumenty/{d["slug"]}/index.html', html)


if __name__ == "__main__":
    build()
