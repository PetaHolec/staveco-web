#!/usr/bin/env python3
"""Vloží sdílenou hlavičku a patičku do všech stránek webu.

Použití (z kořene projektu nebo odkudkoli):
    python3 tools/sync_partials.py           # zapíše změny
    python3 tools/sync_partials.py --check   # jen ohlásí, které stránky nejsou aktuální (exit 1)

Co dělá:
- najde všechny **/index.html v projektu (kromě _podklady, _partials, tools a skrytých složek),
- obsah mezi <!-- @header --> … <!-- /@header --> nahradí souborem _partials/header.html,
  obsah mezi <!-- @footer --> … <!-- /@footer --> souborem _partials/footer.html,
- v hlavičce nastaví aria-current="page" u odkazů, jejichž data-section odpovídá
  <body data-section="…"> (vyrobky | sluzby | o-firme | certifikaty | kontakt | poptavka).
Skript je idempotentní: opakované spuštění bez změny partialů nic nezmění.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PARTIALS = ROOT / "_partials"
EXCLUDED_DIRS = {"_podklady", "_partials", "tools", "node_modules", "_site"}

BLOCKS = {
    "header": PARTIALS / "header.html",
    "footer": PARTIALS / "footer.html",
}

BODY_SECTION_RE = re.compile(r"<body\b[^>]*\bdata-section=\"([^\"]*)\"", re.IGNORECASE)
ARIA_CURRENT_RE = re.compile(r"\s+aria-current=\"[^\"]*\"")
A_TAG_RE = re.compile(r"<a\b[^>]*>", re.IGNORECASE)


def block_re(name: str) -> re.Pattern[str]:
    return re.compile(
        r"(<!--\s*@" + name + r"\s*-->)(.*?)(<!--\s*/@" + name + r"\s*-->)",
        re.DOTALL,
    )


def mark_current(html: str, section: str | None) -> str:
    """Odstraní staré aria-current a přidá aria-current="page" odkazům dané sekce."""

    def fix(match: re.Match[str]) -> str:
        tag = ARIA_CURRENT_RE.sub("", match.group(0))
        if section and f'data-section="{section}"' in tag:
            tag = tag[:-1].rstrip() + ' aria-current="page">'
        return tag

    return A_TAG_RE.sub(fix, html)


def iter_pages() -> list[Path]:
    pages = []
    for path in sorted(ROOT.rglob("index.html")):
        rel_parts = path.relative_to(ROOT).parts[:-1]
        if any(p in EXCLUDED_DIRS or p.startswith(".") for p in rel_parts):
            continue
        pages.append(path)
    extra = ROOT / "404.html"
    if extra.exists():
        pages.append(extra)
    return pages


def main() -> int:
    check_only = "--check" in sys.argv[1:]
    partials = {}
    for name, path in BLOCKS.items():
        if not path.exists():
            print(f"CHYBA: chybí {path.relative_to(ROOT)}", file=sys.stderr)
            return 2
        partials[name] = path.read_text(encoding="utf-8").strip("\n")

    changed, unchanged, warnings = [], [], []
    for page in iter_pages():
        rel = page.relative_to(ROOT)
        original = page.read_text(encoding="utf-8")
        html = original

        m = BODY_SECTION_RE.search(html)
        section = m.group(1).strip() if m else None
        if not m:
            warnings.append(f"{rel}: <body> nemá data-section")

        for name, content in partials.items():
            rx = block_re(name)
            if not rx.search(html):
                warnings.append(f"{rel}: chybí značky <!-- @{name} --> … <!-- /@{name} -->")
                continue
            block = mark_current(content, section) if name == "header" else content
            html = rx.sub(lambda mm, b=block: f"{mm.group(1)}\n{b}\n{mm.group(3)}", html, count=1)

        if html != original:
            changed.append(str(rel))
            if not check_only:
                page.write_text(html, encoding="utf-8")
        else:
            unchanged.append(str(rel))

    verb = "Neaktuální" if check_only else "Aktualizováno"
    print(f"{verb}: {len(changed)}  |  beze změny: {len(unchanged)}")
    for rel in changed:
        print(f"  * {rel}")
    for w in warnings:
        print(f"  ! {w}", file=sys.stderr)
    if check_only and changed:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
