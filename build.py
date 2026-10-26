"""Assemble le site : src/pages/*.html + src/partials/layout.html -> public/.

Chaque page commence par un bloc d'en-tête :
<!--
title: ...
description: ...
nav: studio            (lien du menu à marquer comme page courante, facultatif)
path: /studio          (adresse publique, facultatif)
-->
Lancer : python3 build.py
"""
import datetime
import pathlib
import re
import shutil

ROOT = pathlib.Path(__file__).parent
SRC, OUT = ROOT / "src", ROOT / "public"

NAV = [
    ("groupe", "/#groupe", "Le groupe"),
    ("marques", "/marques", "Nos marques"),
    ("studio", "/studio", "Studio web"),
    ("conseil", "/conseil", "Conseil"),
]


def nav_html(current):
    links = []
    for key, href, label in NAV:
        cur = ' aria-current="page"' if key == current else ""
        links.append(f'      <a href="{href}"{cur}>{label}</a>')
    return "\n".join(links)


def parse(text):
    m = re.match(r"\s*<!--(.*?)-->\s*", text, re.S)
    meta = {}
    if m:
        for line in m.group(1).strip().splitlines():
            k, _, v = line.partition(":")
            meta[k.strip()] = v.strip()
        text = text[m.end():]
    return meta, text


def main():
    layout = (SRC / "partials" / "layout.html").read_text(encoding="utf-8")
    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(ROOT / "static", OUT)
    year = str(datetime.date.today().year)
    for page in sorted((SRC / "pages").glob("*.html")):
        meta, body = parse(page.read_text(encoding="utf-8"))
        html = (layout
                .replace("{{title}}", meta.get("title", "ACHA COMPANY"))
                .replace("{{description}}", meta.get("description", ""))
                .replace("{{nav}}", nav_html(meta.get("nav")))
                .replace("{{year}}", year)
                .replace("{{content}}", body.strip()))
        (OUT / page.name).write_text(html, encoding="utf-8")
        print("ok", page.name)


if __name__ == "__main__":
    main()
