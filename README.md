# Site ACHA COMPANY

Site du groupe ACHA COMPANY : marques (dont Vapolab.fr), studio web et conseil e-commerce.
C'est un site statique en HTML et CSS, assemblé par un petit script Python, sans dépendance à installer.

## Espace admin

www.acha-company.fr/admin (Decap CMS) permet de modifier sans code :

- **Textes du site** : chaque texte de chaque page, plus le titre d'onglet et la description Google ;
- **Partenaires** : les cartes de la page Éco-responsable (nom, description, logo, lien) ;
- **Prix du simulateur** : tous les prix et durées de /devis.

Connexion avec un compte GitHub qui a accès à ce dépôt. « Publier » enregistre la modification sur `main` et
Netlify remet le site à jour en 1 à 2 minutes. Réglages : `static/admin/config.yml`.

Mise en place (une seule fois) :

1. GitHub, Settings > Developer settings > OAuth Apps > New OAuth App : page d'accueil `https://www.acha-company.fr`,
   « Authorization callback URL » `https://api.netlify.com/auth/done`. Noter le Client ID et générer un Client secret.
2. Netlify, Project configuration > Security > OAuth > Install provider : GitHub, coller le Client ID et le secret.

## Structure

- `content/` : les textes (`textes/<page>.json`), les partenaires et les prix, modifiés par l'admin.
  Dans les pages, `{{t:cle}}` est remplacé par le texte correspondant.
- `src/pages/` : une page par fichier (la mise en page). Le bloc `<!-- ... -->` en tête donne le lien de menu actif.
- `src/partials/layout.html` : l'en-tête, le menu et le pied de page communs à toutes les pages.
- `static/assets/` : la feuille de style, les scripts et le favicon, copiés tels quels. `static/admin/` : l'admin. `static/uploads/` : les images ajoutées depuis l'admin.
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

- Adresse e-mail de contact réelle (aujourd'hui `contact@acha-company.fr`).
- Logo définitif, si l'identité provisoire est remplacée.
