// ACHA COMPANY : gestion des clients (page /espace-client-admin).
// Validation des inscriptions (Kbis, SIRET), projets, documents et messages de chaque client.
// Réservé aux e-mails listés dans la table « admins » (voir supabase/schema.sql).
(function () {
  var root = document.querySelector('[data-ec-admin]');
  if (!root) return;
  function start() {
    var E = window.AchaEspace;
    if (!E) return;
    var sb = E.sb, h = E.h, alertBox = E.alertBox, busy = E.busy, date = E.date;
    var LABELS = { a_completer: 'Kbis manquant', en_attente: 'À valider', valide: 'Validé', refuse: 'Refusé' };
    var current = null;
    function show(v) { root.replaceChildren(v); }

    function login(msg) {
      var err = h('div');
      var email = h('input', { type: 'email', autocomplete: 'email', required: true });
      var pass = h('input', { type: 'password', autocomplete: 'current-password', required: true });
      var btn = h('button', { class: 'btn primary', type: 'submit', text: 'Se connecter' });
      show(h('div', { class: 'ec-card ec-narrow' }, [h('p', { class: 'label', text: 'Gestion des clients' }), h('h1', { class: 'ec-title sm', text: 'Connexion' }),
        msg ? alertBox(msg) : null,
        h('form', { class: 'ec-form', onsubmit: function (e) {
          e.preventDefault(); busy(btn, true, 'Se connecter');
          sb.auth.signInWithPassword({ email: email.value.trim(), password: pass.value }).then(function (r) {
            busy(btn, false, 'Se connecter');
            if (r.error) err.replaceChildren(alertBox(E.frError(r.error))); else boot();
          });
        } }, [h('label', { class: 'f' }, ['E-mail', email]), h('label', { class: 'f' }, ['Mot de passe', pass]), err, btn]),
        h('p', { class: 'ec-hint', text: 'Utilisez le compte créé sur /espace-client avec votre e-mail d\'administratrice.' })]));
    }

    function boot() {
      sb.auth.getSession().then(function (s) {
        if (!s.data.session) return login();
        sb.rpc('is_admin').then(function (r) {
          if (!r.data) return sb.auth.signOut().then(function () { login('Ce compte n\'a pas accès à la gestion des clients.'); });
          list();
        });
      });
    }

    // ---------- liste des clients ----------
    function list() {
      Promise.all([sb.from('profiles').select('*').order('created_at', { ascending: false }), sb.from('admins').select('email')]).then(function (res) {
        var admins = (res[1].data || []).map(function (a) { return a.email.toLowerCase(); });
        var rows = (res[0].data || []).filter(function (p) { return admins.indexOf(p.email.toLowerCase()) < 0; });
        var waiting = rows.filter(function (p) { return p.statut === 'en_attente'; });
        function table(items) {
          if (!items.length) return h('p', { class: 'ec-muted', text: 'Aucun client.' });
          return h('ul', { class: 'ec-clients' }, items.map(function (p) {
            return h('li', {}, [h('button', { type: 'button', class: 'ec-client', onclick: function () { client(p.id); } }, [
              h('span', {}, [h('b', { text: p.societe || '(sans nom)' }), h('small', { text: p.prenom + ' ' + p.nom + ' · ' + p.email })]),
              h('span', { class: 'ec-badge p-' + p.statut, text: LABELS[p.statut] }), h('small', { text: date(p.created_at) })])]);
          }));
        }
        show(h('div', { class: 'ec-page' }, [head('Gestion des clients'),
          h('section', { class: 'ec-block' }, [h('h2', { class: 'ec-h2', text: 'À valider (' + waiting.length + ')' }), table(waiting)]),
          h('section', { class: 'ec-block' }, [h('h2', { class: 'ec-h2', text: 'Tous les clients (' + rows.length + ')' }), table(rows)])]));
      });
    }

    function head(title, back) {
      return h('header', { class: 'ec-head' }, [h('div', {}, [h('p', { class: 'label', text: 'ACHA · Gestion des clients' }), h('h1', { class: 'ec-title sm', text: title })]),
        h('div', { class: 'ec-head-act' }, [back ? h('button', { class: 'btn ghost', type: 'button', text: '← Tous les clients', onclick: list }) : null,
          h('button', { class: 'btn ghost', type: 'button', text: 'Se déconnecter', onclick: function () { sb.auth.signOut().then(function () { login(); }); } })])]);
    }

    // ---------- fiche client ----------
    function client(id) {
      current = id;
      Promise.all([
        sb.from('profiles').select('*').eq('id', id).single(),
        sb.from('projets').select('*').eq('client_id', id).order('created_at', { ascending: false }),
        sb.from('documents').select('*').eq('client_id', id).order('created_at', { ascending: false }),
        sb.from('messages').select('*').eq('client_id', id).order('created_at')
      ]).then(function (res) {
        if (current !== id) return;
        var p = res[0].data;
        if (!p) return list();
        show(h('div', { class: 'ec-page' }, [head(p.societe || 'Client', true),
          h('div', { class: 'ec-dash' }, [dossier(p), projets(p, res[1].data || []), documents(p, res[2].data || []), messages(p, res[3].data || [])])]));
      });
    }

    function dossier(p) {
      var verif = h('p', { class: 'ec-hint', 'aria-live': 'polite' });
      var motif = h('input', { placeholder: 'Motif du refus (affiché au client)' });
      var err = h('div');
      function setStatut(statut) {
        if (statut === 'refuse' && !motif.value.trim()) { err.replaceChildren(alertBox('Indiquez le motif du refus.')); motif.focus(); return; }
        var upd = { statut: statut, motif_refus: statut === 'refuse' ? motif.value.trim() : null, validated_at: statut === 'valide' ? new Date().toISOString() : null };
        sb.from('profiles').update(upd).eq('id', p.id).then(function (r) { if (r.error) err.replaceChildren(alertBox(E.frError(r.error))); else client(p.id); });
      }
      var mail = 'mailto:' + encodeURIComponent(p.email) + '?subject=' + encodeURIComponent(p.statut === 'refuse' ? 'Votre espace client ACHA COMPANY' : 'Votre espace client ACHA COMPANY est ouvert') +
        '&body=' + encodeURIComponent(p.statut === 'refuse'
          ? 'Bonjour ' + p.prenom + ',\n\nNous n\'avons pas pu valider votre dossier : ' + (p.motif_refus || '') + '\nVous pouvez déposer un nouveau Kbis sur https://www.acha-company.fr/espace-client.\n\nL\'équipe ACHA COMPANY'
          : 'Bonjour ' + p.prenom + ',\n\nVotre compte professionnel est validé. Vous pouvez suivre votre projet sur https://www.acha-company.fr/espace-client avec vos identifiants.\n\nÀ très vite,\nL\'équipe ACHA COMPANY');
      return h('section', { class: 'ec-block ec-span' }, [h('h2', { class: 'ec-h2', text: 'Dossier' }),
        h('dl', { class: 'ec-dl' }, [
          h('dt', { text: 'Statut' }), h('dd', {}, [h('span', { class: 'ec-badge p-' + p.statut, text: LABELS[p.statut] }), p.motif_refus ? ' ' + p.motif_refus : '']),
          h('dt', { text: 'Contact' }), h('dd', { text: p.prenom + ' ' + p.nom }),
          h('dt', { text: 'E-mail' }), h('dd', {}, [h('a', { href: 'mailto:' + p.email, text: p.email })]),
          h('dt', { text: 'Téléphone' }), h('dd', { text: p.telephone || '—' }),
          h('dt', { text: 'SIRET' }), h('dd', {}, [p.siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, '$1 $2 $3 $4') + ' ',
            h('button', { class: 'ec-textbtn', type: 'button', text: 'Vérifier dans le registre', onclick: function () {
              verif.textContent = 'Vérification…';
              E.lookupSiret(p.siret).then(function (r) {
                verif.className = 'ec-hint ' + (r.found && r.actif ? 'ok' : 'bad');
                verif.textContent = !r.found ? 'Introuvable dans le registre.' : (r.actif ? '✓ ' : '✗ Fermé : ') + r.nom + (r.adresse ? ' · ' + r.adresse : '');
              }).catch(function () { verif.textContent = 'Registre indisponible, réessayez plus tard.'; });
            } }), verif]),
          h('dt', { text: 'Kbis' }), h('dd', {}, [p.kbis_path ? h('button', { class: 'ec-textbtn', type: 'button', text: 'Ouvrir le Kbis', onclick: function () {
            sb.storage.from('kbis').createSignedUrl(p.kbis_path, 300).then(function (r) { if (r.data) window.open(r.data.signedUrl, '_blank', 'noopener'); });
          } }) : 'pas encore déposé'])
        ]),
        h('div', { class: 'ec-actions' }, [
          p.statut !== 'valide' ? h('button', { class: 'btn primary', type: 'button', text: 'Valider le client', disabled: !p.kbis_path, onclick: function () { setStatut('valide'); } }) : null,
          p.statut !== 'refuse' ? h('div', { class: 'ec-refuse' }, [motif, h('button', { class: 'btn ghost', type: 'button', text: p.statut === 'valide' ? 'Suspendre' : 'Refuser', onclick: function () { setStatut('refuse'); } })]) : null,
          p.statut === 'valide' || p.statut === 'refuse' ? h('a', { class: 'btn ghost', href: mail, text: 'Prévenir le client par e-mail' }) : null
        ]), err]);
    }

    function projets(p, items) {
      var titre = h('input', { required: true, placeholder: 'Ex. : Boutique en ligne sur thème' });
      var desc = h('input', { placeholder: 'Description courte (facultatif)' });
      var ech = h('input', { type: 'date' });
      return h('section', { class: 'ec-block ec-span' }, [h('h2', { class: 'ec-h2', text: 'Projets' }),
        items.length ? h('div', { class: 'ec-projets' }, items.map(function (pr) { return projetEdit(p, pr); })) : h('p', { class: 'ec-muted', text: 'Aucun projet.' }),
        p.statut === 'valide' ? h('form', { class: 'ec-form ec-inline', onsubmit: function (e) {
          e.preventDefault();
          sb.from('projets').insert({ client_id: p.id, titre: titre.value.trim(), description: desc.value.trim(), echeance: ech.value || null }).then(function () { client(p.id); });
        } }, [h('label', { class: 'f' }, ['Nouveau projet', titre]), h('label', { class: 'f' }, ['Description', desc]), h('label', { class: 'f' }, ['Mise en ligne prévue', ech]),
          h('button', { class: 'btn primary', type: 'submit', text: 'Créer le projet' })]) : h('p', { class: 'ec-hint', text: 'Validez le client pour lui créer un projet.' })]);
    }

    function projetEdit(p, pr) {
      var statut = h('select', {}, Object.keys(E.STATUTS).map(function (k) { return h('option', { value: k, selected: k === pr.statut, text: E.STATUTS[k] }); }));
      var etape = h('select', {}, E.ETAPES.map(function (n, i) { return h('option', { value: i + 1, selected: i + 1 === pr.etape, text: '0' + (i + 1) + ' ' + n }); }));
      var prog = h('input', { type: 'range', min: 0, max: 100, step: 5, value: pr.progression });
      var progOut = h('output', { text: pr.progression + ' %' });
      prog.addEventListener('input', function () { progOut.textContent = prog.value + ' %'; });
      var ech = h('input', { type: 'date', value: pr.echeance || '' });
      var saved = h('span', { class: 'ec-hint' });
      return h('div', { class: 'ec-edit' }, [E.projetCard(pr),
        h('form', { class: 'ec-form ec-inline', onsubmit: function (e) {
          e.preventDefault();
          sb.from('projets').update({ statut: statut.value, etape: +etape.value, progression: +prog.value, echeance: ech.value || null, updated_at: new Date().toISOString() }).eq('id', pr.id)
            .then(function (r) { if (r.error) saved.textContent = 'Erreur'; else client(p.id); });
        } }, [h('label', { class: 'f' }, ['Statut', statut]), h('label', { class: 'f' }, ['Étape', etape]), h('label', { class: 'f' }, [h('span', {}, ['Avancement ', progOut]), prog]),
          h('label', { class: 'f' }, ['Mise en ligne prévue', ech]), h('button', { class: 'btn primary', type: 'submit', text: 'Mettre à jour' }), saved,
          h('button', { class: 'ec-textbtn danger', type: 'button', text: 'Supprimer le projet', onclick: function () {
            if (confirm('Supprimer le projet « ' + pr.titre + ' » ?')) sb.from('projets').delete().eq('id', pr.id).then(function () { client(p.id); });
          } })])]);
    }

    function documents(p, items) {
      var type = h('select', {}, Object.keys(E.TYPES).map(function (k) { return h('option', { value: k, text: E.TYPES[k] }); }));
      var nom = h('input', { required: true, placeholder: 'Ex. : Devis boutique en ligne' });
      var montant = h('input', { type: 'number', step: '0.01', min: 0, placeholder: 'Montant TTC (facultatif)' });
      var statut = h('input', { placeholder: 'Ex. : à signer, payée (facultatif)' });
      var file = h('input', { type: 'file', required: true });
      var err = h('div');
      var btn = h('button', { class: 'btn primary', type: 'submit', text: 'Ajouter le document' });
      return h('section', { class: 'ec-block' }, [h('h2', { class: 'ec-h2', text: 'Documents' }),
        items.length ? h('ul', { class: 'ec-docs' }, items.map(function (d) {
          return E.docRow(d, h('button', { class: 'ec-textbtn danger', type: 'button', text: 'Supprimer', onclick: function () {
            if (!confirm('Supprimer « ' + d.nom + ' » ?')) return;
            sb.storage.from('documents').remove([d.chemin]).then(function () { return sb.from('documents').delete().eq('id', d.id); }).then(function () { client(p.id); });
          } }));
        })) : h('p', { class: 'ec-muted', text: 'Aucun document.' }),
        p.statut === 'valide' ? h('form', { class: 'ec-form', onsubmit: function (e) {
          e.preventDefault(); err.replaceChildren();
          var fl = file.files[0]; if (!fl) return;
          if (fl.size > 20 * 1024 * 1024) { err.append(alertBox('20 Mo maximum.')); return; }
          busy(btn, true, 'Ajouter le document');
          var safe = fl.name.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').slice(-80);
          var path = p.id + '/' + Date.now() + '-' + safe;
          sb.storage.from('documents').upload(path, fl, { contentType: fl.type || 'application/octet-stream' }).then(function (r) {
            if (r.error) throw r.error;
            return sb.from('documents').insert({ client_id: p.id, type: type.value, nom: nom.value.trim(), chemin: path, montant: montant.value ? +montant.value : null, statut: statut.value.trim() });
          }).then(function (r) { if (r.error) throw r.error; client(p.id); })
            .catch(function (e2) { busy(btn, false, 'Ajouter le document'); err.append(alertBox(E.frError(e2))); });
        } }, [h('div', { class: 'ec-row2' }, [h('label', { class: 'f' }, ['Type', type]), h('label', { class: 'f' }, ['Nom affiché', nom])]),
          h('div', { class: 'ec-row2' }, [h('label', { class: 'f' }, ['Montant', montant]), h('label', { class: 'f' }, ['État', statut])]),
          h('label', { class: 'f' }, ['Fichier', file]), err, btn]) : null]);
    }

    function messages(p, items) {
      var text = h('textarea', { rows: 3, required: true, maxlength: 5000, placeholder: 'Votre réponse…' });
      return h('section', { class: 'ec-block' }, [h('h2', { class: 'ec-h2', text: 'Messages' }), E.thread(items, 'acha'),
        h('form', { class: 'ec-form ec-send', onsubmit: function (e) {
          e.preventDefault();
          var v = text.value.trim(); if (!v) return;
          sb.from('messages').insert({ client_id: p.id, auteur: 'acha', contenu: v }).then(function () { client(p.id); });
        } }, [h('label', { class: 'f' }, ['Répondre', text]), h('button', { class: 'btn primary', type: 'submit', text: 'Envoyer' })])]);
    }

    boot();
  }
  if (window.AchaEspace) start(); else document.addEventListener('acha-espace-pret', start);
})();
