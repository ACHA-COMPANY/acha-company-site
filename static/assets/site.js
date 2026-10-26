// ACHA COMPANY : petites interactions du site (onglets, auto-diagnostic, apparitions, halo du haut de page).
(function () {
  document.documentElement.classList.add('js');
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
      meter.style.background = level === 'risk' ? 'var(--risk)' : level === 'warn' ? 'var(--warn)' : level === 'ok' ? 'var(--ok)' : 'var(--saffron)';
      tips.innerHTML = '';
      var items = todo.length ? todo : [answered === qs.length ? 'Aucune priorité urgente. Un audit peut encore trouver des ventes à récupérer.' : 'Vos priorités s\'afficheront ici.'];
      items.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; tips.appendChild(li); });
    }
    root.addEventListener('change', update);
    update();
  });

  // Apparition des blocs au défilement
  var reveal = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    reveal.forEach(function (el) { el.classList.add('seen'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveal.forEach(function (el) { io.observe(el); });
  }

  // Halo qui suit la souris dans le haut de page
  var spot = document.querySelector('[data-spot]');
  if (spot && !reduce && window.matchMedia('(pointer: fine)').matches) {
    spot.addEventListener('pointermove', function (e) {
      var r = spot.getBoundingClientRect();
      spot.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      spot.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  }
})();
