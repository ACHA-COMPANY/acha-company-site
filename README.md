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

## Espace client (/espace-client)

Comptes professionnels : inscription avec SIRET (clé de contrôle + registre des entreprises), envoi du Kbis, validation par ACHA, puis suivi de projet, devis, factures, documents et messages. La gestion se fait sur /espace-client-admin (page non référencée).

Données, comptes et fichiers : [Supabase](https://supabase.com), offre gratuite. Mise en route, une seule fois :

1. Créer un compte et un projet Supabase (région Europe).
2. SQL Editor > New query : coller `supabase/schema.sql`, puis Run. Les règles d'accès y sont : un client ne voit que ses propres données, et seulement une fois validé.
3. Authentication > URL Configuration : Site URL `https://www.acha-company.fr`, Redirect URL `https://www.acha-company.fr/espace-client`.
4. Project Settings > API : copier le Project URL et la clé `anon` dans `static/assets/espace-config.js`. Cette clé est publique par conception ; ne jamais y mettre la clé `service_role`.
5. S'inscrire sur /espace-client avec anissa@acha-company.fr : cette adresse figure dans la table `admins` et ouvre /espace-client-admin.

Tant que `espace-config.js` est vide, la page affiche « Bientôt disponible ». Les notifications e-mail passent par les formulaires Netlify `inscription-pro` et `message-client`.
