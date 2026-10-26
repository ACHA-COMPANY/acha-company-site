// ACHA COMPANY : simulateur de devis (page /devis).
//
// ===== TARIFS : c'est ici qu'on modifie les prix =====
// Montants en euros hors taxes. « semaines » sert à estimer le délai.
// « pour: 'ecom' » réserve une option aux boutiques en ligne ; « conseille: true » la coche d'office.
// Repères marché relevés en octobre 2026 (La Fabrique du Net, Codeur.com, Freelance Solution) :
// boutique Shopify sur thème par une agence < 5 000 €, sur-mesure ≈ 15 000 €, médiane TPE ≈ 7 000 € ;
// freelance Shopify ≈ 170 €/jour ; audit e-commerce 2 000 à 4 000 € ; SEO e-commerce 1 500 à 4 000 €/mois.
var TARIFS = {
  tva: 0.20,
  projets: [
    { id: 'vitrine', nom: 'Site vitrine pour un magasin', detail: "Jusqu'à 6 pages, fiche Google, plan d'accès", prix: 1900, semaines: 2 },
    { id: 'theme', nom: 'Boutique en ligne sur thème', detail: 'Shopify ou WooCommerce, thème adapté à votre marque', prix: 4500, semaines: 5, ecom: true },
    { id: 'mesure', nom: 'Boutique en ligne sur-mesure', detail: 'Design unique, parcours d\'achat pensé pour la vape', prix: 9500, semaines: 8, ecom: true },
    { id: 'refonte', nom: "Refonte d'une boutique existante", detail: 'Nouveau design et mise aux normes du secteur', prix: 3500, semaines: 4, ecom: true },
    { id: 'aucun', nom: 'Pas de site, seulement du conseil', detail: 'Audit, plan de lancement ou accompagnement', prix: 0, semaines: 0 }
  ],
  catalogue: [
    { id: 'c50', nom: "Jusqu'à 50 produits", prix: 0 },
    { id: 'c200', nom: '51 à 200 produits', prix: 600, semaines: 1 },
    { id: 'c500', nom: '201 à 500 produits', prix: 1400, semaines: 1 },
    { id: 'c999', nom: 'Plus de 500 produits', prix: 2500, semaines: 2 }
  ],
  options: [
    { id: 'age', nom: "Vérification d'âge intégrée", prix: 350, pour: 'ecom', conseille: true },
    { id: 'paiement', nom: 'Paiement compatible vape + solution de secours', prix: 450, pour: 'ecom', conseille: true },
    { id: 'fiches', nom: 'Fiches e-liquides conformes et filtres (nicotine, saveur, contenance)', prix: 400, pour: 'ecom', conseille: true },
    { id: 'migration', nom: "Reprise du catalogue d'un ancien site", prix: 900, pour: 'ecom', semaines: 1 },
    { id: 'seo', nom: 'Référencement de départ (structure, balises, pages marques)', prix: 900 },
    { id: 'emails', nom: 'E-mails automatiques (bienvenue, panier abandonné, réassort)', prix: 650, pour: 'ecom' },
    { id: 'fidelite', nom: 'Programme de fidélité et avis clients', prix: 500, pour: 'ecom' },
    { id: 'logo', nom: 'Logo et charte graphique', prix: 1200, semaines: 1 },
    { id: 'formation', nom: 'Formation à la prise en main (2 heures)', prix: 250 }
  ],
  conseil: [
    { id: 'audit', nom: 'Audit de boutique vape', detail: 'Paiement, âge, fiches, référencement, tunnel de vente', prix: 1200 },
    { id: 'lancement', nom: "Plan de lancement d'une marque", detail: 'Offre, prix, fournisseurs, calendrier', prix: 2500 }
  ],
  mensuel: [
    { id: 'm0', nom: 'Pas de suivi', prix: 0 },
    { id: 'maintenance', nom: 'Maintenance et sécurité', detail: 'Mises à jour, sauvegardes, petites corrections', prix: 89 },
    { id: 'croissance', nom: 'Accompagnement croissance', detail: 'Maintenance + référencement et e-mails, une journée par mois', prix: 590 }
  ]
};
// ===== fin des tarifs =====

(function () {
  var root = document.querySelector('[data-devis]');
  if (!root) return;
  var eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  var $ = function (sel) { return root.querySelector(sel); };

  function choice(type, name, item, checked) {
    var id = name + '-' + item.id;
    var price = item.prix ? (type === 'radio' && name === 'mensuel' ? eur.format(item.prix) + ' / mois' : (name === 'catalogue' ? '+ ' : '') + eur.format(item.prix)) : (name === 'catalogue' ? 'inclus' : '');
    return '<label class="pick" for="' + id + '"' + (item.pour ? ' data-pour="' + item.pour + '"' : '') + '>' +
      '<input type="' + type + '" name="' + name + '" id="' + id + '" value="' + item.id + '"' + (checked ? ' checked' : '') + '>' +
      '<span class="box"><span class="t">' + item.nom + '</span>' + (item.detail ? '<span class="d">' + item.detail + '</span>' : '') +
      (price ? '<span class="p">' + price + '</span>' : '') + '</span></label>';
  }
  $('[data-list="projets"]').innerHTML = TARIFS.projets.map(function (p, i) { return choice('radio', 'projet', p, i === 1); }).join('');
  $('[data-list="catalogue"]').innerHTML = TARIFS.catalogue.map(function (p, i) { return choice('radio', 'catalogue', p, i === 0); }).join('');
  $('[data-list="options"]').innerHTML = TARIFS.options.map(function (p) { return choice('checkbox', 'option', p, p.conseille); }).join('');
  $('[data-list="conseil"]').innerHTML = TARIFS.conseil.map(function (p) { return choice('checkbox', 'conseil', p, false); }).join('');
  $('[data-list="mensuel"]').innerHTML = TARIFS.mensuel.map(function (p, i) { return choice('radio', 'mensuel', p, i === 1); }).join('');

  function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; }
  function val(name) { var c = root.querySelector('input[name="' + name + '"]:checked'); return c && c.value; }
  function vals(name) { return Array.prototype.map.call(root.querySelectorAll('input[name="' + name + '"]:checked'), function (c) { return c.value; }); }

  var lastEcom = true, shown = 0, anim;
  function count(to) {
    cancelAnimationFrame(anim);
    var from = shown, t0 = performance.now();
    (function step(t) {
      var k = Math.min(1, (t - t0) / 450), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      $('[data-total]').textContent = $('[data-mini]').textContent = eur.format(v); shown = v;
      if (k < 1) anim = requestAnimationFrame(step);
    })(t0);
  }

  function update() {
    var projet = find(TARIFS.projets, val('projet'));
    var ecom = !!projet.ecom, site = projet.prix > 0;
    // les options de boutique ne s'appliquent qu'aux boutiques en ligne
    root.querySelectorAll('[data-pour="ecom"] input').forEach(function (inp) {
      if (ecom && !lastEcom) { var o = find(TARIFS.options, inp.value); inp.checked = !!o.conseille; }
      inp.disabled = !ecom; if (!ecom) inp.checked = false;
    });
    $('[data-step="catalogue"]').hidden = !ecom;
    $('[data-step="options"]').hidden = !site;
    lastEcom = ecom;

    var lines = [], total = 0, weeks = 0;
    function add(item, label) { if (!item || !item.prix) return; lines.push([label || item.nom, item.prix]); total += item.prix; weeks += item.semaines || 0; }
    add(projet);
    if (ecom) add(find(TARIFS.catalogue, val('catalogue')), 'Catalogue : ' + find(TARIFS.catalogue, val('catalogue')).nom.toLowerCase());
    if (site) vals('option').forEach(function (id) { add(find(TARIFS.options, id)); });
    vals('conseil').forEach(function (id) { var c = find(TARIFS.conseil, id); add(c); weeks = Math.max(weeks, 2); });
    var mens = find(TARIFS.mensuel, val('mensuel'));

    count(total);
    $('[data-ttc]').textContent = eur.format(Math.round(total * (1 + TARIFS.tva))) + ' TTC';
    $('[data-mensuel]').textContent = mens.prix ? eur.format(mens.prix) + ' HT / mois · ' + mens.nom.toLowerCase() : 'Aucun suivi mensuel';
    $('[data-delai]').textContent = weeks ? 'environ ' + weeks + ' semaine' + (weeks > 1 ? 's' : '') : '—';
    $('[data-lines]').innerHTML = lines.length ? lines.map(function (l) { return '<li><span>' + l[0] + '</span><b>' + eur.format(l[1]) + '</b></li>'; }).join('') : '<li><span>Choisissez au moins une prestation.</span></li>';

    var recap = lines.map(function (l) { return '- ' + l[0] + ' : ' + eur.format(l[1]); }).join('\n') +
      '\nTotal : ' + eur.format(total) + ' HT (' + eur.format(Math.round(total * (1 + TARIFS.tva))) + ' TTC)' +
      '\nSuivi : ' + (mens.prix ? mens.nom + ', ' + eur.format(mens.prix) + ' HT / mois' : 'aucun') +
      '\nDélai estimé : ' + (weeks ? weeks + ' semaines' : '—');
    root.querySelector('[name="recap"]').value = recap;
    root.querySelector('[name="total"]').value = eur.format(total) + ' HT';
  }
  root.addEventListener('change', update);
  root.hidden = false;
  update();

  var print = root.querySelector('[data-print]');
  if (print) print.addEventListener('click', function () { window.print(); });
})();
