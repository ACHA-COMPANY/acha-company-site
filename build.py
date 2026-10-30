"""Assemble le site : src/pages/*.html + src/partials/layout.html + content/ -> public/.

Les textes, les partenaires et les prix sont dans content/ (modifiables dans l'admin /admin) :
- content/textes/<page>.json : titre d'onglet, description Google et chaque texte de la page.
  Dans les gabarits, {{t:cle}} est remplacé par le texte « cle ». Mise en forme possible :
  *italique*, **gras**, ==surligné==, retour à la ligne.
- content/partenaires.json : cartes de la page Éco-responsable ({{partenaires}}).
- content/tarifs.json : prix du simulateur de devis ({{tarifs}}).

Chaque page commence par un bloc d'en-tête :
<!--
(titre et description : dans content/textes/<page>.json)
nav: studio            (lien du menu à marquer comme page courante, facultatif)
path: /studio          (adresse publique, facultatif)
robots: noindex        (page à ne pas référencer, facultatif)
-->
Mode « bientôt » (COMING_SOON = True) : l'accueil devient la page src/bientot/index.html
et seules les pages de KEEP sont publiées ; les autres adresses renvoient vers l'accueil
(public/_redirects). Les pages du site complet restent dans src/pages/ : pour les remettre
en ligne, passer COMING_SOON à False.
Lancer : python3 build.py
"""
import datetime
import hashlib
import html
import json
import pathlib
import re
import shutil
import unicodedata

ROOT = pathlib.Path(__file__).parent
SRC, OUT, CONTENT = ROOT / "src", ROOT / "public", ROOT / "content"

COMING_SOON = True
KEEP = {"mentions-legales", "merci", "espace-client", "espace-client-admin"}

NAV = [
    ("groupe", "/#groupe", "Le groupe"),
    ("marques", "/marques", "Nos marques"),
    ("studio", "/studio", "Studio web"),
    ("conseil", "/conseil", "Conseil"),
    ("eco", "/eco-responsable", "Éco-responsable"),
    ("devis", "/devis", "Devis"),
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


def load(name):
    return json.loads((CONTENT / name).read_text(encoding="utf-8"))


def rich(text):
    """Texte saisi dans l'admin -> HTML sûr, avec la petite mise en forme autorisée."""
    s = html.escape(text.strip(), quote=True)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s, flags=re.S)
    s = re.sub(r"\*(.+?)\*", r"<em>\1</em>", s, flags=re.S)
    s = re.sub(r"==(.+?)==", r"<mark>\1</mark>", s, flags=re.S)
    return s.replace("\n", "<br>")


def fill_texts(tpl, texts, where):
    def sub(m):
        key = m.group(1)
        if key not in texts:
            print(f"attention : texte « {key} » introuvable ({where})")
            return ""
        return rich(texts[key])
    return re.sub(r"\{\{t:([^}]+)\}\}", sub, tpl)


ICONS = {
    "héberg": '<rect x="4" y="4" width="16" height="6" rx="1.5"/><rect x="4" y="14" width="16" height="6" rx="1.5"/><path d="M8 7h.01M8 17h.01"/>',
    "emball": '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
    "logist": '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
    "recycl": '<path d="M7 19l-3-5 3-5M17 5l3 5-3 5M9 5h6M9 19h6"/>',
    "collect": '<path d="M7 19l-3-5 3-5M17 5l3 5-3 5M9 5h6M9 19h6"/>',
}
LEAF = '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/>'


def partners_html():
    cards = []
    for p in load("partenaires.json").get("partenaires", []):
        cat = (p.get("categorie") or "").strip()
        nom = (p.get("nom") or "").strip()
        lien = (p.get("lien") or "").strip()
        logo = (p.get("logo") or "").strip()
        icon = next((v for k, v in ICONS.items() if k in cat.lower()), LEAF)
        visual = (f'<img class="logo-p" src="{html.escape(logo)}" alt="{html.escape(nom)}" loading="lazy">' if logo
                  else f'<span class="eco-ico" aria-hidden="true"><svg viewBox="0 0 24 24">{icon}</svg></span>')
        title = html.escape(nom) if nom else "Partenaire à venir"
        if nom and lien:
            title = f'<a href="{html.escape(lien)}" target="_blank" rel="noopener">{title} ↗</a>'
        cards.append(f'      <article class="partner{"" if nom else " soon"}">\n        {visual}\n'
                     f'        <p class="who">{html.escape(cat)}</p>\n        <h3>{title}</h3>\n'
                     f'        <p>{rich(p.get("description") or "")}</p>\n      </article>')
    return "\n".join(cards)


def tarifs_js():
    t = load("tarifs.json")
    t["tva"] = (t.get("tva") or 0) / 100
    for group in ("projets", "catalogue", "options", "conseil", "mensuel"):
        used = set()
        for i, item in enumerate(t.get(group, [])):
            # une ligne ajoutée dans l'admin n'a pas encore d'identifiant : on en crée un
            base = item.get("id") or re.sub(r"[^a-z0-9]+", "-", unicodedata.normalize("NFKD", (item.get("nom") or group).lower()).encode("ascii", "ignore").decode()).strip("-") or f"{group}{i}"
            key, n = base, 2
            while key in used:
                key, n = f"{base}-{n}", n + 1
            item["id"] = key
            used.add(key)
    return json.dumps(t, ensure_ascii=False).replace("</", "<\\/")


def main():
    common = load("textes/commun.json")
    layout = fill_texts((SRC / "partials" / "layout.html").read_text(encoding="utf-8"),
                        {x["id"]: x["texte"] for x in common["textes"]}, "commun")
    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(ROOT / "static", OUT)
    year = str(datetime.date.today().year)
    # Les fichiers de /assets/ sont gardés 7 jours en cache : on ajoute une empreinte
    # de leur contenu à l'adresse pour que chaque nouvelle version soit rechargée.
    assets = b"".join((ROOT / "static" / "assets" / f).read_bytes() for f in ("style.css", "site.js", "devis.js", "espace.js", "espace-admin.js", "espace-config.js"))
    version = hashlib.sha1(assets).hexdigest()[:10]
    for page in sorted((SRC / "pages").glob("*.html")):
        if COMING_SOON and page.stem not in KEEP:
            continue
        meta, body = parse(page.read_text(encoding="utf-8"))
        data = load(f"textes/{page.stem}.json") if (CONTENT / "textes" / f"{page.stem}.json").exists() else {}
        body = fill_texts(body, {x["id"]: x["texte"] for x in data.get("textes", [])}, page.stem)
        if "{{partenaires}}" in body:
            body = body.replace("{{partenaires}}", partners_html())
        if "{{tarifs}}" in body:
            body = body.replace("{{tarifs}}", tarifs_js())
        title = html.escape(data.get("titre_onglet") or meta.get("title", "ACHA COMPANY"))
        description = html.escape(data.get("description") or meta.get("description", ""))
        out = (layout
                .replace("{{content}}", body.strip())
                .replace("{{title}}", title)
                .replace("{{description}}", description)
                .replace("{{robots}}", f'<meta name="robots" content="{html.escape(meta["robots"])}">\n' if meta.get("robots") else "")
                .replace("{{nav}}", nav_html(meta.get("nav")))
                .replace("{{year}}", year)
                .replace("{{v}}", version))
        (OUT / page.name).write_text(out, encoding="utf-8")
        print("ok", page.name)
    if COMING_SOON:
        soon = (SRC / "bientot" / "index.html").read_text(encoding="utf-8")
        (OUT / "index.html").write_text(soon.replace("{{year}}", year), encoding="utf-8")
        # toute adresse sans fichier (anciennes pages, liens partagés) renvoie vers l'accueil
        (OUT / "_redirects").write_text("/*  /  302\n", encoding="utf-8")
        print("ok index.html (bientôt)")


if __name__ == "__main__":
    main()
