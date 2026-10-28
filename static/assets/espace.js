// ACHA COMPANY : espace client (page /espace-client).
// Inscription des professionnels (SIRET vérifié + Kbis), puis suivi de projet, documents et messages.
// Données et fichiers chez Supabase : voir supabase/schema.sql pour les règles d'accès.
(function () {
  var root = document.querySelector('[data-ec]');
  var adminRoot = document.querySelector('[data-ec-admin]');
  if (!root && !adminRoot) return;
  var cfg = window.ACHA_SUPABASE || {};
  if (!cfg.url || !cfg.anonKey || !window.supabase) {
    (root || adminRoot).innerHTML = '<div class="ec-card ec-narrow"><p class="label">Espace client</p><h1 class="ec-title">Bientôt disponible</h1>' +
      '<p class="ec-muted">Votre espace client ouvre très prochainement. En attendant, <a href="/contact">écrivez-nous</a>.</p></div>';
    return;
  }
  var sb = window.supabase.createClient(cfg.url, cfg.anonKey);
  // outils partagés avec la page de gestion (espace-admin.js)
  var E = window.AchaEspace = { sb: sb };

  // ---------- petits outils ----------
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    for (var k in attrs || {}) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    [].concat(kids || []).forEach(function (c) { if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c)); });
    return el;
  }
  function show(view) { root.replaceChildren(view); window.scrollTo(0, 0); }
  function field(label, attrs, hint) {
    return h('label', { class: 'f' }, [label, h('input', attrs), hint ? h('span', { class: 'ec-hint', text: hint }) : null]);
  }
  function alertBox(msg, kind) { return h('p', { class: 'ec-alert' + (kind ? ' ' + kind : ''), role: 'alert', text: msg }); }
  function busy(btn, on, label) { btn.disabled = on; if (label) btn.textContent = on ? 'Un instant…' : label; }
  var eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
  function date(d) { return d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''; }
  function dateTime(d) { return new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  function notify(form, data) {
    // prévient ACHA par e-mail via Netlify Forms ; un échec n'empêche rien
    var body = new URLSearchParams(Object.assign({ 'form-name': form }, data)).toString();
    fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body }).catch(function () {});
  }
  function frError(err) {
    var m = (err && err.message) || '';
    if (/Invalid login credentials/i.test(m)) return 'E-mail ou mot de passe incorrect.';
    if (/Email not confirmed/i.test(m)) return 'Confirmez d\'abord votre adresse : cliquez sur le lien reçu par e-mail.';
    if (/already registered|already exists/i.test(m)) return 'Un compte existe déjà avec cet e-mail. Connectez-vous ou réinitialisez votre mot de passe.';
    if (/Password should be/i.test(m)) return 'Le mot de passe doit contenir au moins 8 caractères.';
    if (/rate limit|too many/i.test(m)) return 'Trop de tentatives. Réessayez dans quelques minutes.';
    return 'Une erreur est survenue. Réessayez, ou écrivez-nous à contact@acha-company.fr.';
  }

  // SIRET : 14 chiffres et clé de contrôle (algorithme de Luhn ; La Poste fait exception).
  function siretOk(s) {
    if (!/^\d{14}$/.test(s)) return false;
    if (s.slice(0, 9) === '356000000') return s.split('').reduce(function (a, c) { return a + +c; }, 0) % 5 === 0;
    var sum = 0;
    for (var i = 0; i < 14; i++) { var d = +s[13 - i]; if (i % 2) { d *= 2; if (d > 9) d -= 9; } sum += d; }
    return sum % 10 === 0;
  }
  // Registre officiel des entreprises (API publique et gratuite de l'État).
  function lookupSiret(siret) {
    return fetch('https://recherche-entreprises.api.gouv.fr/search?q=' + siret + '&per_page=1')
      .then(function (r) { if (!r.ok) throw new Error('api'); return r.json(); })
      .then(function (j) {
        var e = j.results && j.results[0];
        if (!e || e.siren !== siret.slice(0, 9)) return { found: false };
        var etab = (e.matching_etablissements || []).find(function (x) { return x.siret === siret; }) || (e.siege && e.siege.siret === siret ? e.siege : null);
        return { found: !!etab, nom: e.nom_complet, actif: e.etat_administratif === 'A' && (!etab || etab.etat_administratif !== 'F'), adresse: etab && etab.adresse };
      });
  }
  E.siretOk = siretOk; E.lookupSiret = lookupSiret; E.h = h; E.alertBox = alertBox; E.busy = busy;
  E.date = date; E.eur = eur; E.frError = frError;

  // ---------- connexion ----------
  function viewLogin(msg) {
    var err = h('div');
    var email = h('input', { type: 'email', name: 'email', autocomplete: 'email', required: true });
    var pass = h('input', { type: 'password', name: 'password', autocomplete: 'current-password', required: true });
    var btn = h('button', { class: 'btn primary', type: 'submit', text: 'Se connecter' });
    var form = h('form', { class: 'ec-form', onsubmit: function (e) {
      e.preventDefault(); err.replaceChildren(); busy(btn, true, 'Se connecter');
      sb.auth.signInWithPassword({ email: email.value.trim(), password: pass.value }).then(function (r) {
        busy(btn, false, 'Se connecter');
        if (r.error) err.append(alertBox(frError(r.error))); else route();
      });
    } }, [h('label', { class: 'f' }, ['E-mail', email]), h('label', { class: 'f' }, ['Mot de passe', pass]), err, btn,
      h('button', { class: 'ec-textbtn', type: 'button', text: 'Mot de passe oublié ?', onclick: function () { show(viewForgot(email.value)); } })]);
    show(h('div', { class: 'ec-split' }, [
      h('div', { class: 'ec-side' }, [h('p', { class: 'label', text: 'Espace client' }), h('h1', { class: 'ec-title', text: 'Votre projet, au même endroit.' }),
        h('p', { class: 'ec-muted', text: 'Suivez l\'avancement de votre site, retrouvez vos devis et factures, et échangez avec l\'équipe. Espace réservé aux professionnels.' }),
        h('ul', { class: 'ec-ticks' }, [h('li', { text: 'Avancement de votre projet, étape par étape' }), h('li', { text: 'Devis, factures et documents à télécharger' }), h('li', { text: 'Messages directs avec l\'équipe' })])]),
      h('div', { class: 'ec-card' }, [h('h2', { class: 'ec-h2', text: 'Connexion' }), msg ? alertBox(msg, 'ok') : null, form,
        h('p', { class: 'ec-switch' }, ['Pas encore de compte ? ', h('button', { class: 'ec-textbtn', type: 'button', text: 'Créer un compte professionnel', onclick: function () { show(viewSignup()); } })])])
    ]));
  }

  function viewForgot(prefill) {
    var err = h('div');
    var email = h('input', { type: 'email', autocomplete: 'email', required: true, value: prefill || '' });
    var btn = h('button', { class: 'btn primary', type: 'submit', text: 'Recevoir le lien' });
    return h('div', { class: 'ec-card ec-narrow' }, [h('h2', { class: 'ec-h2', text: 'Mot de passe oublié' }),
      h('p', { class: 'ec-muted', text: 'Nous vous envoyons un lien pour choisir un nouveau mot de passe.' }),
      h('form', { class: 'ec-form', onsubmit: function (e) {
        e.preventDefault(); busy(btn, true, 'Recevoir le lien');
        sb.auth.resetPasswordForEmail(email.value.trim(), { redirectTo: location.origin + '/espace-client' }).then(function (r) {
          busy(btn, false, 'Recevoir le lien');
          if (r.error) err.replaceChildren(alertBox(frError(r.error))); else viewLogin('Si un compte existe pour cette adresse, un e-mail vient de vous être envoyé.');
        });
      } }, [h('label', { class: 'f' }, ['E-mail', email]), err, btn]),
      h('button', { class: 'ec-textbtn', type: 'button', text: '← Retour à la connexion', onclick: function () { viewLogin(); } })]);
  }

  function viewNewPassword() {
    var err = h('div');
    var pass = h('input', { type: 'password', autocomplete: 'new-password', minlength: 8, required: true });
    var btn = h('button', { class: 'btn primary', type: 'submit', text: 'Enregistrer' });
    show(h('div', { class: 'ec-card ec-narrow' }, [h('h2', { class: 'ec-h2', text: 'Nouveau mot de passe' }),
      h('form', { class: 'ec-form', onsubmit: function (e) {
        e.preventDefault(); busy(btn, true, 'Enregistrer');
        sb.auth.updateUser({ password: pass.value }).then(function (r) {
          busy(btn, false, 'Enregistrer');
          if (r.error) err.replaceChildren(alertBox(frError(r.error))); else route();
        });
      } }, [h('label', { class: 'f' }, ['Mot de passe (8 caractères minimum)', pass]), err, btn])]));
  }

  // ---------- inscription ----------
  function viewSignup() {
    var err = h('div');
    var check = h('p', { class: 'ec-hint', 'aria-live': 'polite' });
    var verified = null;
    var f = {
      prenom: h('input', { name: 'prenom', autocomplete: 'given-name', required: true }),
      nom: h('input', { name: 'nom', autocomplete: 'family-name', required: true }),
      societe: h('input', { name: 'societe', autocomplete: 'organization', required: true }),
      siret: h('input', { name: 'siret', inputmode: 'numeric', autocomplete: 'off', required: true, placeholder: '14 chiffres' }),
      telephone: h('input', { name: 'telephone', type: 'tel', autocomplete: 'tel' }),
      email: h('input', { name: 'email', type: 'email', autocomplete: 'email', required: true }),
      password: h('input', { name: 'password', type: 'password', autocomplete: 'new-password', minlength: 8, required: true })
    };
    var consent = h('input', { type: 'checkbox', required: true });
    function clean() { return f.siret.value.replace(/\D/g, ''); }
    function runCheck() {
      var s = clean(); verified = null; check.className = 'ec-hint';
      if (!s) { check.textContent = ''; return; }
      if (!siretOk(s)) { check.textContent = s.length === 14 ? 'Ce numéro de SIRET n\'est pas valide.' : 'Le SIRET compte 14 chiffres.'; check.className = 'ec-hint bad'; return; }
      check.textContent = 'Vérification dans le registre des entreprises…';
      lookupSiret(s).then(function (r) {
        if (clean() !== s) return;
        if (!r.found) { verified = false; check.textContent = 'SIRET introuvable dans le registre. Vérifiez le numéro.'; check.className = 'ec-hint bad'; return; }
        if (!r.actif) { verified = false; check.textContent = r.nom + ' : établissement fermé selon le registre.'; check.className = 'ec-hint bad'; return; }
        verified = true; check.textContent = '✓ ' + r.nom + (r.adresse ? ' · ' + r.adresse : ''); check.className = 'ec-hint ok';
        if (!f.societe.value) f.societe.value = r.nom;
      }).catch(function () { verified = null; check.textContent = 'Registre indisponible pour le moment : nous vérifierons à la main.'; });
    }
    f.siret.addEventListener('change', runCheck);
    f.siret.addEventListener('blur', runCheck);
    var btn = h('button', { class: 'btn primary', type: 'submit', text: 'Créer mon compte' });
    var form = h('form', { class: 'ec-form', onsubmit: function (e) {
      e.preventDefault(); err.replaceChildren();
      var s = clean();
      if (!siretOk(s)) { err.append(alertBox('Indiquez un numéro de SIRET valide (14 chiffres).')); f.siret.focus(); return; }
      if (verified === false) { err.append(alertBox('Ce SIRET ne correspond pas à un établissement actif. Vérifiez le numéro ou écrivez-nous.')); return; }
      busy(btn, true, 'Créer mon compte');
      var meta = { prenom: f.prenom.value.trim(), nom: f.nom.value.trim(), societe: f.societe.value.trim(), siret: s, telephone: f.telephone.value.trim(), siret_verifie: verified === true };
      sb.auth.signUp({ email: f.email.value.trim(), password: f.password.value, options: { data: meta, emailRedirectTo: location.origin + '/espace-client' } }).then(function (r) {
        busy(btn, false, 'Créer mon compte');
        if (r.error) { err.append(alertBox(frError(r.error))); return; }
        if (r.data && r.data.user && r.data.user.identities && r.data.user.identities.length === 0) { err.append(alertBox(frError({ message: 'already registered' }))); return; }
        notify('inscription-pro', { societe: meta.societe, siret: s, email: f.email.value.trim(), nom: meta.prenom + ' ' + meta.nom, telephone: meta.telephone, 'siret-verifie': meta.siret_verifie ? 'oui' : 'non' });
        if (r.data.session) route();
        else show(viewCheckEmail(f.email.value.trim()));
      });
    } }, [
      h('div', { class: 'ec-row2' }, [h('label', { class: 'f' }, ['Prénom', f.prenom]), h('label', { class: 'f' }, ['Nom', f.nom])]),
      h('label', { class: 'f' }, ['SIRET de l\'entreprise', f.siret, check]),
      h('label', { class: 'f' }, ['Raison sociale', f.societe]),
      h('div', { class: 'ec-row2' }, [h('label', { class: 'f' }, ['E-mail professionnel', f.email]), h('label', { class: 'f' }, ['Téléphone (facultatif)', f.telephone])]),
      h('label', { class: 'f' }, ['Mot de passe (8 caractères minimum)', f.password]),
      h('label', { class: 'ec-consent' }, [consent, h('span', {}, ['Je certifie agir pour le compte de cette entreprise et j\'accepte qu\'ACHA COMPANY utilise ces informations pour gérer mon compte. Voir la ', h('a', { href: '/mentions-legales#confidentialite', text: 'politique de confidentialité' }), '.'])]),
      err, btn
    ]);
    return h('div', { class: 'ec-split' }, [
      h('div', { class: 'ec-side' }, [h('p', { class: 'label', text: 'Compte professionnel' }), h('h1', { class: 'ec-title', text: 'Créer votre espace client' }),
        h('ol', { class: 'ec-steps' }, [
          h('li', {}, [h('b', { text: 'Vos informations' }), ' Le SIRET est vérifié automatiquement dans le registre des entreprises.']),
          h('li', {}, [h('b', { text: 'Votre Kbis' }), ' Un extrait de moins de 3 mois, en PDF ou en photo.']),
          h('li', {}, [h('b', { text: 'Validation' }), ' Nous vérifions votre dossier sous 48 heures ouvrées, puis votre espace s\'ouvre.'])])]),
      h('div', { class: 'ec-card' }, [h('h2', { class: 'ec-h2', text: 'Inscription' }), form,
        h('p', { class: 'ec-switch' }, ['Déjà un compte ? ', h('button', { class: 'ec-textbtn', type: 'button', text: 'Se connecter', onclick: function () { viewLogin(); } })])])
    ]);
  }

  function viewCheckEmail(email) {
    return h('div', { class: 'ec-card ec-narrow' }, [h('p', { class: 'label', text: 'Étape 1 sur 3' }), h('h2', { class: 'ec-h2', text: 'Confirmez votre adresse e-mail' }),
      h('p', { class: 'ec-muted' }, ['Un lien de confirmation vient d\'être envoyé à ', h('b', { text: email }), '. Cliquez dessus pour revenir ici et déposer votre Kbis.']),
      h('button', { class: 'ec-textbtn', type: 'button', text: '← Retour à la connexion', onclick: function () { viewLogin(); } })]);
  }

  // ---------- Kbis et attente ----------
  function viewKbis(p) {
    var err = h('div');
    var file = h('input', { type: 'file', accept: 'application/pdf,image/jpeg,image/png', required: true });
    var btn = h('button', { class: 'btn primary', type: 'submit', text: 'Envoyer mon Kbis' });
    var refus = p.statut === 'refuse';
    return page(p, h('div', { class: 'ec-card ec-narrow' }, [
      h('p', { class: 'label', text: refus ? 'Dossier à corriger' : 'Étape 2 sur 3' }),
      h('h2', { class: 'ec-h2', text: refus ? 'Votre dossier n\'a pas pu être validé' : 'Déposez votre extrait Kbis' }),
      refus && p.motif_refus ? alertBox('Motif : ' + p.motif_refus) : null,
      h('p', { class: 'ec-muted', text: 'Extrait Kbis de ' + (p.societe || 'votre entreprise') + ', de moins de 3 mois. PDF, JPG ou PNG, 5 Mo maximum.' }),
      h('form', { class: 'ec-form', onsubmit: function (e) {
        e.preventDefault(); err.replaceChildren();
        var fl = file.files[0];
        if (!fl) return;
        if (fl.size > 5 * 1024 * 1024) { err.append(alertBox('Le fichier dépasse 5 Mo.')); return; }
        if (!/^(application\/pdf|image\/(jpeg|png))$/.test(fl.type)) { err.append(alertBox('Format accepté : PDF, JPG ou PNG.')); return; }
        busy(btn, true, 'Envoyer mon Kbis');
        var ext = (fl.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
        var path = p.id + '/kbis-' + Date.now() + '.' + ext;
        sb.storage.from('kbis').upload(path, fl, { contentType: fl.type }).then(function (r) {
          if (r.error) throw r.error;
          return sb.rpc('soumettre_kbis', { chemin: path });
        }).then(function (r) {
          if (r && r.error) throw r.error;
          route();
        }).catch(function (e2) { busy(btn, false, 'Envoyer mon Kbis'); err.append(alertBox(frError(e2))); });
      } }, [h('label', { class: 'f' }, ['Votre Kbis', file]), err, btn])]));
  }

  function viewPending(p) {
    return page(p, h('div', { class: 'ec-card ec-narrow' }, [h('p', { class: 'label', text: 'Étape 3 sur 3' }),
      h('h2', { class: 'ec-h2', text: 'Dossier en cours de vérification' }),
      h('p', { class: 'ec-muted', text: 'Merci ! Nous vérifions votre Kbis et votre SIRET sous 48 heures ouvrées. Vous pourrez ensuite accéder à votre espace avec vos identifiants.' }),
      h('button', { class: 'btn ghost', type: 'button', text: 'Remplacer mon Kbis', onclick: function () { show(viewKbis(p)); } })]));
  }

  // ---------- tableau de bord ----------
  var ETAPES = ['Diagnostic', 'Maquette', 'Construction', 'Lancement'];
  var STATUTS = { en_cours: 'En cours', en_pause: 'En pause', termine: 'Terminé' };
  var TYPES = { devis: 'Devis', facture: 'Facture', document: 'Document' };
  E.ETAPES = ETAPES; E.STATUTS = STATUTS; E.TYPES = TYPES;

  function projetCard(pr) {
    return h('article', { class: 'ec-projet' }, [
      h('div', { class: 'ec-projet-top' }, [h('h3', { text: pr.titre }), h('span', { class: 'ec-badge s-' + pr.statut, text: STATUTS[pr.statut] || pr.statut })]),
      pr.description ? h('p', { class: 'ec-muted', text: pr.description }) : null,
      h('ol', { class: 'ec-stepper' }, ETAPES.map(function (n, i) {
        return h('li', { class: i + 1 < pr.etape ? 'done' : i + 1 === pr.etape ? 'now' : '' }, [h('span', { text: '0' + (i + 1) }), n]);
      })),
      h('div', { class: 'ec-bar', role: 'progressbar', 'aria-valuenow': pr.progression, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': 'Avancement' }, [h('i', { style: 'width:' + pr.progression + '%' })]),
      h('p', { class: 'ec-meta', text: pr.progression + ' % · mis à jour le ' + date(pr.updated_at) + (pr.echeance ? ' · mise en ligne prévue le ' + date(pr.echeance) : '') })
    ]);
  }
  E.projetCard = projetCard;

  function docRow(d, extra) {
    var dl = h('button', { class: 'ec-textbtn', type: 'button', text: 'Télécharger', onclick: function () {
      sb.storage.from('documents').createSignedUrl(d.chemin, 120, { download: d.nom }).then(function (r) { if (r.data) location.href = r.data.signedUrl; });
    } });
    return h('li', { class: 'ec-doc' }, [h('span', { class: 'ec-badge t-' + d.type, text: TYPES[d.type] || d.type }),
      h('span', { class: 'ec-doc-name' }, [h('b', { text: d.nom }), h('small', { text: date(d.created_at) + (d.statut ? ' · ' + d.statut : '') })]),
      h('span', { class: 'ec-doc-amount', text: d.montant != null ? eur.format(d.montant) : '' }), h('span', { class: 'ec-doc-act' }, [dl, extra])]);
  }
  E.docRow = docRow;

  function thread(list, mine) {
    var box = h('div', { class: 'ec-thread' }, list.length ? list.map(function (m) {
      return h('div', { class: 'ec-msg ' + (m.auteur === mine ? 'me' : 'them') }, [h('p', { text: m.contenu }), h('small', { text: (m.auteur === 'acha' ? 'ACHA · ' : '') + dateTime(m.created_at) })]);
    }) : [h('p', { class: 'ec-muted', text: 'Aucun message pour le moment.' })]);
    setTimeout(function () { box.scrollTop = box.scrollHeight; }, 0);
    return box;
  }
  E.thread = thread;

  function viewDashboard(p) {
    var wrap = h('div', { class: 'ec-dash' }, [h('p', { class: 'ec-muted', text: 'Chargement…' })]);
    Promise.all([
      sb.from('projets').select('*').order('created_at', { ascending: false }),
      sb.from('documents').select('*').order('created_at', { ascending: false }),
      sb.from('messages').select('*').order('created_at')
    ]).then(function (res) {
      var projets = res[0].data || [], docs = res[1].data || [], msgs = res[2].data || [];
      var text = h('textarea', { rows: 3, required: true, maxlength: 5000, placeholder: 'Votre message à l\'équipe…' });
      var err = h('div');
      var send = h('button', { class: 'btn primary', type: 'submit', text: 'Envoyer' });
      wrap.replaceChildren(
        h('section', { class: 'ec-block ec-span' }, [h('h2', { class: 'ec-h2', text: 'Vos projets' }),
          projets.length ? h('div', { class: 'ec-projets' }, projets.map(projetCard)) : h('p', { class: 'ec-muted', text: 'Votre projet apparaîtra ici dès son lancement.' })]),
        h('section', { class: 'ec-block' }, [h('h2', { class: 'ec-h2', text: 'Devis, factures et documents' }),
          docs.length ? h('ul', { class: 'ec-docs' }, docs.map(function (d) { return docRow(d); })) : h('p', { class: 'ec-muted', text: 'Aucun document pour le moment.' })]),
        h('section', { class: 'ec-block' }, [h('h2', { class: 'ec-h2', text: 'Messages' }), thread(msgs, 'client'),
          h('form', { class: 'ec-form ec-send', onsubmit: function (e) {
            e.preventDefault(); err.replaceChildren();
            var v = text.value.trim(); if (!v) return;
            busy(send, true, 'Envoyer');
            sb.from('messages').insert({ client_id: p.id, auteur: 'client', contenu: v }).then(function (r) {
              busy(send, false, 'Envoyer');
              if (r.error) { err.append(alertBox(frError(r.error))); return; }
              notify('message-client', { societe: p.societe, email: p.email, message: v });
              show(viewDashboard(p));
            });
          } }, [h('label', { class: 'f' }, ['Nouveau message', text]), err, send])])
      );
    });
    return page(p, wrap, true);
  }

  function page(p, body, dash) {
    return h('div', { class: 'ec-page' }, [
      h('header', { class: 'ec-head' }, [h('div', {}, [h('p', { class: 'label', text: 'Espace client' + (p.societe ? ' · ' + p.societe : '') }),
        h('h1', { class: 'ec-title sm', text: dash ? 'Bonjour ' + (p.prenom || '') : 'Votre compte professionnel' })]),
        h('button', { class: 'btn ghost', type: 'button', text: 'Se déconnecter', onclick: function () { sb.auth.signOut().then(function () { viewLogin(); }); } })]),
      body]);
  }

  // ---------- aiguillage ----------
  if (!root) { document.dispatchEvent(new Event('acha-espace-pret')); return; }
  var recovery = /type=recovery/.test(location.hash);
  function route() {
    if (recovery) { recovery = false; return viewNewPassword(); }
    sb.auth.getSession().then(function (s) {
      var session = s.data.session;
      if (!session) return viewLogin();
      sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle().then(function (r) {
        var p = r.data;
        if (!p) return show(h('div', { class: 'ec-card ec-narrow' }, [alertBox('Profil introuvable. Écrivez-nous à contact@acha-company.fr.')]));
        if (p.statut === 'valide') return show(viewDashboard(p));
        if (p.statut === 'en_attente') return show(viewPending(p));
        return show(viewKbis(p));
      });
    });
  }
  sb.auth.onAuthStateChange(function (ev) { if (ev === 'PASSWORD_RECOVERY') { recovery = false; viewNewPassword(); } });
  route();
})();
