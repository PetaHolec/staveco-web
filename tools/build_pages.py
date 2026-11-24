#!/usr/bin/env python3
"""Sestaví web pro GitHub Pages do složky _site/.

Zdrojové stránky používají kořenově relativní odkazy (/produkty/minisila/).
Na projektové stránce GitHub Pages web běží v podsložce (/staveco-web/),
proto skript při sestavení doplní před každou kořenovou cestu prefix.
Zdrojové soubory se nemění.

Použití:
    python3 tools/build_pages.py --base /staveco-web
    python3 tools/build_pages.py --base ""      # web v kořeni domény
"""
import argparse
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "_site"

# Co se do webu nekopíruje
EXCLUDE = {
    "_site", "_podklady", "_partials", "tools", ".git", ".github", ".claude",
    "handoff-staveco.md", "PREDAVACI-POZNAMKY.md", ".htaccess", ".gitignore",
    ".DS_Store", "README.md",
}

# Atributy s jednou cestou: href="/…", src="/…", action="/…", data-*="/…"
ATTR_RE = re.compile(r'\b(href|src|action|poster|data-[a-z-]+)="/(?!/)')
# Atributy se seznamem cest: srcset="/a 500w, /b 800w"
SRCSET_RE = re.compile(r'\b((?:data-)?srcset)="([^"]*)"')
# CSS url(/…)
CSS_URL_RE = re.compile(r"url\((['\"]?)/(?!/)")
# Řetězce v JS začínající /poptavka/
JS_RE = re.compile(r"(['\"])/(poptavka/)")


def fix_html(text: str, base: str) -> str:
    text = ATTR_RE.sub(lambda m: f'{m.group(1)}="{base}/', text)

    def srcset(m):
        parts = []
        for item in m.group(2).split(","):
            lead = item[: len(item) - len(item.lstrip())]
            body = item.lstrip()
            if body.startswith("/") and not body.startswith("//"):
                body = base + body
            parts.append(lead + body)
        return f'{m.group(1)}="{",".join(parts)}"'

    text = SRCSET_RE.sub(srcset, text)
    text = CSS_URL_RE.sub(lambda m: f"url({m.group(1)}{base}/", text)
    return text


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="/staveco-web",
                    help="prefix cest, např. /staveco-web; prázdný pro kořen domény")
    base = ap.parse_args().base.rstrip("/")

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()

    for item in ROOT.iterdir():
        if item.name in EXCLUDE:
            continue
        dest = OUT / item.name
        if item.is_dir():
            shutil.copytree(item, dest, ignore=shutil.ignore_patterns(".DS_Store"))
        else:
            shutil.copy2(item, dest)

    counts = {"html": 0, "css": 0, "js": 0}
    if base:
        for f in OUT.rglob("*.html"):
            f.write_text(fix_html(f.read_text("utf-8"), base), "utf-8")
            counts["html"] += 1
        for f in OUT.rglob("*.css"):
            t = f.read_text("utf-8")
            f.write_text(CSS_URL_RE.sub(lambda m: f"url({m.group(1)}{base}/", t), "utf-8")
            counts["css"] += 1
        for f in OUT.rglob("*.js"):
            t = f.read_text("utf-8")
            f.write_text(JS_RE.sub(lambda m: f"{m.group(1)}{base}/{m.group(2)}", t), "utf-8")
            counts["js"] += 1

    (OUT / ".nojekyll").write_text("")
    print(f"Sestaveno do {OUT} (prefix '{base}'): "
          f"{counts['html']} HTML, {counts['css']} CSS, {counts['js']} JS")


if __name__ == "__main__":
    main()
