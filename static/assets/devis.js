// ACHA COMPANY : simulateur de devis (page /devis).
//
// Les prix viennent de content/tarifs.json (modifiable dans l'admin, rubrique « Prix du simulateur ») :
// build.py les place dans la page sous le nom TARIFS. Montants en euros hors taxes ;
// « semaines » sert à estimer le délai, « pour: 'ecom' » réserve une option aux boutiques en ligne,
// « conseille » la coche d'office, « eco » la range dans le bloc éco-responsable, un prix à 0 s'affiche « offert ».
// Repères marché relevés en octobre 2026 (La Fabrique du Net, Codeur.com, Freelance Solution) :
// boutique Shopify sur thème par une agence < 5 000 €, sur-mesure ≈ 15 000 €, médiane TPE ≈ 7 000 € ;
// freelance Shopify ≈ 170 €/jour ; audit e-commerce 2 000 à 4 000 € ; SEO e-commerce 1 500 à 4 000 €/mois.

(function () {
  var root = document.querySelector('[data-devis]');
  if (!root) return;
  var eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  var $ = function (sel) { return root.querySelector(sel); };

  function choice(type, name, item, checked) {
    var id = name + '-' + item.id;
    var price = item.prix ? (type === 'radio' && name === 'mensuel' ? eur.format(item.prix) + ' / mois' : (name === 'catalogue' ? '+ ' : '') + eur.format(item.prix)) : (name === 'catalogue' ? 'inclus' : name === 'option' ? 'offert' : '');
    return '<label class="pick" for="' + id + '"' + (item.pour ? ' data-pour="' + item.pour + '"' : '') + '>' +
      '<input type="' + type + '" name="' + name + '" id="' + id + '" value="' + item.id + '"' + (checked ? ' checked' : '') + '>' +
      '<span class="box"><span class="t">' + item.nom + '</span>' + (item.detail ? '<span class="d">' + item.detail + '</span>' : '') +
      (price ? '<span class="p">' + price + '</span>' : '') + '</span></label>';
  }
  $('[data-list="projets"]').innerHTML = TARIFS.projets.map(function (p, i) { return choice('radio', 'projet', p, i === 1); }).join('');
  $('[data-list="catalogue"]').innerHTML = TARIFS.catalogue.map(function (p, i) { return choice('radio', 'catalogue', p, i === 0); }).join('');
  $('[data-list="options"]').innerHTML = TARIFS.options.filter(function (p) { return !p.eco; }).map(function (p) { return choice('checkbox', 'option', p, p.conseille); }).join('');
  $('[data-list="eco"]').innerHTML = TARIFS.options.filter(function (p) { return p.eco; }).map(function (p) { return choice('checkbox', 'option', p, false); }).join('');
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
    $('[data-step="eco"]').hidden = !site;
    lastEcom = ecom;

    var lines = [], total = 0, weeks = 0;
    function add(item, label, keepFree) { if (!item || (!item.prix && !keepFree)) return; lines.push([label || item.nom, item.prix]); total += item.prix; weeks += item.semaines || 0; }
    add(projet);
    if (ecom) add(find(TARIFS.catalogue, val('catalogue')), 'Catalogue : ' + find(TARIFS.catalogue, val('catalogue')).nom.toLowerCase());
    if (site) vals('option').forEach(function (id) { add(find(TARIFS.options, id), null, true); });
    vals('conseil').forEach(function (id) { var c = find(TARIFS.conseil, id); add(c); weeks = Math.max(weeks, 2); });
    var mens = find(TARIFS.mensuel, val('mensuel'));

    count(total);
    $('[data-ttc]').textContent = eur.format(Math.round(total * (1 + TARIFS.tva))) + ' TTC';
    $('[data-mensuel]').textContent = mens.prix ? eur.format(mens.prix) + ' HT / mois · ' + mens.nom.toLowerCase() : 'Aucun suivi mensuel';
    $('[data-delai]').textContent = weeks ? 'environ ' + weeks + ' semaine' + (weeks > 1 ? 's' : '') : '—';
    $('[data-lines]').innerHTML = lines.length ? lines.map(function (l) { return '<li><span>' + l[0] + '</span><b>' + (l[1] ? eur.format(l[1]) : 'offert') + '</b></li>'; }).join('') : '<li><span>Choisissez au moins une prestation.</span></li>';

    var recap = lines.map(function (l) { return '- ' + l[0] + ' : ' + (l[1] ? eur.format(l[1]) : 'offert'); }).join('\n') +
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
