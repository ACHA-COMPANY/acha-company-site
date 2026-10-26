# Site ACHA COMPANY

Site du groupe ACHA COMPANY : marques (dont VAPOLAB), studio web et conseil e-commerce.
C'est un site statique en HTML et CSS, assemblé par un petit script Python, sans dépendance à installer.

## Structure

- `src/pages/` : une page par fichier. Le bloc `<!-- ... -->` en tête donne le titre, la description et le lien de menu actif.
- `src/partials/layout.html` : l'en-tête, le menu et le pied de page communs à toutes les pages.
- `static/assets/` : la feuille de style et le favicon, copiés tels quels.
- `build.py` : assemble le tout dans `public/`.

## Travailler en local

    python3 build.py
    cd public && python3 -m http.server 8000

Puis ouvrir http://localhost:8000/index.html.

## Mise en ligne (Netlify)

1. Sur netlify.com, choisir « Add new site » puis « Import an existing project », et sélectionner ce dépôt GitHub.
2. Netlify lit `netlify.toml` : commande `python3 build.py`, dossier publié `public`.
3. Dans « Domain management », ajouter le nom de domaine (par exemple acha-company.fr) et suivre les indications DNS.
4. Dans « Forms », activer la détection des formulaires et ajouter une notification e-mail pour le formulaire `contact`.

Chaque modification poussée sur la branche principale met le site à jour automatiquement.

## À compléter avant la mise en ligne

- Mentions légales : ajouter le numéro de TVA intracommunautaire quand il est attribué.
- Adresse e-mail de contact réelle (aujourd'hui `contact@acha-company.fr`).
- Logo définitif, si l'identité provisoire est remplacée.
