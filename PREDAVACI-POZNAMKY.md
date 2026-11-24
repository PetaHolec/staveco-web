# Předávací poznámky: nový web STAVECO Morava

Statický web (HTML + jedno CSS + vanilla JS), 25 stránek + 404. Lokálně: `python3 -m http.server 8080` ve složce projektu → http://localhost:8080/

## Před spuštěním NUTNO
1. **Backend formuláře** `/api/poptavka` neexistuje. Kontrakt (pole, limity, odpověď `{"ok":true}`) je v `_podklady/backend-formulare.md`. Dokud nebude, formulář ukáže chybu s e-mailem info@staveco.cz (nikdy falešné potvrzení).
2. **Nenahrávat na server:** `_podklady/`, `_partials/`, `tools/`, tento soubor. Nahrát: `index.html`, `404.html`, `.htaccess`, `assets/`, `dokumenty/`, `produkty/`, `sluzby/`, `profil-firmy/`, `certifikaty/`, `kontakty/`, `poptavka/`.
3. **Přesměrování:** URL produktů a služeb jsou shodné se starým webem. `.htaccess` řeší /en/, /de/ (302), demo portfolio, staré PDF cesty atd.; Nginx varianta v `_podklady/presmerovani.md`.
4. **Certifikát STAVCERT (ISO 9001 + ISO 3834-2) platí do 22. 12. 2026**. Po obnovení vyměnit PDF v `dokumenty/` a datum na `/certifikaty/`.

## K ověření s firmou
- **Transportní sila:** úvod starého webu „1 až 32 m³“ vs. parametry „6 až 32 m³“. Veřejně uvedeny jen typové řady přiřazené systémům (řetězový 6; kapsový 12/18/20/22; hákový 12,5/18/20/22,5/29/32 m³). Které průměry a tlaková provedení patří ke kterému systému?
- **Minisila:** detail 1–4 m³ (použito) vs. úvod 1–3 m³.
- **Normy:** starý text webu neodpovídá certifikátům (3834-2:2006 vs. :2022, EN 1090 verze, AD 2000 + EN 13445-4). Web teď uvádí znění podle dokumentů. Certifikátu TÜV ISO 3834-2 chybí příloha.
- **Telefony:** 546 435 384 je na kontaktech fax, ve staré patičce telefon. 546 421 852 jen ve staré patičce.
- **Zásady OOÚ:** existují dvě verze, web odkazuje na 2024/11. Zásady nezmiňují webový formulář.
- **Tryskání:** „ocelová drť“ (název) vs. „ocelové zrno“ (text). Linde Gas: přesné místo výdeje, vlastní telefon, sortiment?
- Podrobnosti s citacemi: `_podklady/poznamky-vyrobky.md`, `poznamky-sluzby.md`, `poznamky-firma.md`, `obsah/_prehled.md`.

## Fotografie k dofocení
Přesné návrhy (místo, světlo, objektiv) jsou v `_podklady/foto-katalog.md` a poznámkách služeb. Hlavně:
- titulní záběr na šířku s celou stavbou sila a člověkem, focený rovně bez sbíhání svislic,
- transportní silo při stavění na každém systému,
- exteriér nebo letecký snímek závodu,
- vlastní fotky tryskání, lakování a oprav (staré dlaždice vypadají jako fotobanka a nejsou použité),
- výdejní místo Linde Gas,
- detaily svarů a přírub.
- Chybí SVG logo (k dispozici jen PNG).

## Titulní oblast
- **Střídání fotek:** 4 snímky (stacionární sila, minisila, ocelová konstrukce, nádrže) se prolínají po 3,5 s. Nadpis je název firmy, obor je v první větě pod ním. Je tam tlačítko pauzy a při omezeném pohybu se nestřídají. Kvůli čitelnosti bílého textu je přes fotky tmavý závoj 62 %.
- **Obrys:** přes první snímek se jednou obtáhne obrys sil.
- **Telefon:** oblast má poměr 4:5, aby výrobek zůstal celý.
- **Chybí:** transportní silo a technologie (není vhodná fotka).

## Ověřeno
- **Tři úkoly ze zadání prošly** (`_podklady/overeni-ukolu.md`): autogen na telefonu, srovnání systémů na notebooku i jen klávesnicí, předvyplnění poptávky u všech 12 výrobků.
- **Přístupnost:** axe-core 0 porušení na všech stránkách včetně certifikátů, dokumentů a otevřeného lightboxu (`_podklady/audit-pristupnosti.md`, 22. 11. 2026). Lightbox ovladatelný klávesnicí: Enter otevře, šipky listují, Tab zůstává v dialogu, Esc zavře a fokus se vrátí na naposledy zobrazený obrázek. Test skutečnou čtečkou obrazovky (VoiceOver/NVDA) zatím neproběhl.
- **Odkazy a šířka:** 102 interních odkazů a 7 PDF v pořádku, na 360 px žádný vodorovný posun.

## Údržba
Hlavička a patička se upravují jen v `_partials/`. Potom spustit `python3 tools/sync_partials.py`.

Certifikáty a dokumenty: údaje jsou v `tools/make_docs.py`, stránky `/certifikaty/…` a `/dokumenty/…` se z nich generují (`python3 tools/make_docs.py`, pak `sync_partials.py`). Obrázky stran (`assets/img/dokumenty/`) jsou vykreslené z PDF. Po výměně PDF je potřeba je vykreslit znovu, třeba exportem z Náhledu do JPG 1600 px a 480 px na šířku. PDF se otevírá jen z podstránky konkrétního dokumentu.

CSS a JS mají v odkazech `?v=3`. Při změně stylů nebo skriptů číslo zvyšte, aby návštěvníci nedostali starou verzi z mezipaměti. Komponenty CSS jsou popsané v komentáři na začátku `assets/css/styles.css`.

## Náhled na GitHub Pages

- Adresa: https://petaholec.github.io/staveco-web/ (repozitář `PetaHolec/staveco-web`, větev `main`).
- Každý `git push` na `main` spustí `.github/workflows/pages.yml`: kontrola hlavičky a patičky, pak `tools/build_pages.py` sestaví `_site/` a nasadí ho.
- Zdrojové stránky zůstávají s kořenovými odkazy (`/produkty/...`). Prefix `/staveco-web` doplní až `build_pages.py`. Na vlastní doméně stačí v workflow nastavit `--base ""`.
- Do repozitáře nejdou `_podklady/` (741 MB) ani `handoff-staveco.md` (viz `.gitignore`).
- Formulář poptávky na Pages nefunguje (chybí `/api/poptavka`), ukáže chybu s odkazem na info@staveco.cz.
