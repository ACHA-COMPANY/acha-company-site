// ACHA COMPANY : petites interactions du site (onglets, auto-diagnostic, checklist animée).
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Onglets accessibles (flèches gauche/droite, Début/Fin)
  document.querySelectorAll('[data-tabs]').forEach(function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') next = tabs[0];
        if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });
  });

  // Auto-diagnostic : score, verdict et priorités en direct
  document.querySelectorAll('[data-diag]').forEach(function (root) {
    var qs = Array.prototype.slice.call(root.querySelectorAll('.q'));
    var scoreEl = root.querySelector('[data-score]');
    var meter = root.querySelector('[data-meter]');
    var verdict = root.querySelector('[data-verdict]');
    var tips = root.querySelector('[data-tips]');
    function update() {
      var answered = 0, score = 0, todo = [];
      qs.forEach(function (q) {
        var c = q.querySelector('input:checked');
        if (!c) return;
        answered++;
        if (c.value === '1') score++; else todo.push(q.getAttribute('data-tip'));
      });
      scoreEl.textContent = score;
      meter.style.width = (score / qs.length * 100) + '%';
      var level = 'none', text = 'Répondez aux questions';
      if (answered === qs.length) {
        if (score === qs.length) { level = 'ok'; text = 'Boutique solide'; }
        else if (score >= qs.length - 2) { level = 'warn'; text = 'À consolider'; }
        else { level = 'risk'; text = 'À risque'; }
      } else if (answered > 0) {
        text = answered + ' / ' + qs.length + ' réponses';
      }
      verdict.setAttribute('data-level', level);
      verdict.textContent = text;
      meter.style.background = level === 'risk' ? 'var(--risk)' : level === 'warn' ? 'var(--warn)' : level === 'ok' ? 'var(--ok)' : 'var(--ink)';
      tips.innerHTML = '';
      var items = todo.length ? todo : [answered === qs.length ? 'Aucune priorité urgente. Un audit peut encore trouver des ventes à récupérer.' : 'Vos priorités s\'afficheront ici.'];
      items.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; tips.appendChild(li); });
    }
    root.addEventListener('change', update);
    update();
  });

  // Checklist du haut de page : se coche une ligne après l'autre au chargement
  var launch = document.querySelector('.launch');
  if (launch && !reduce) {
    var items = launch.querySelectorAll('li');
    var count = launch.querySelector('header span');
    var bar = launch.querySelector('.bar-p i');
    items.forEach(function (li) { li.classList.remove('on'); });
    bar.style.transform = 'scaleX(0)';
    count.textContent = '0 / ' + items.length;
    items.forEach(function (li, i) {
      setTimeout(function () {
        li.classList.add('on');
        count.textContent = (i + 1) + ' / ' + items.length;
        bar.style.transform = 'scaleX(' + ((i + 1) / items.length) + ')';
      }, 500 + i * 550);
    });
  }
})();
