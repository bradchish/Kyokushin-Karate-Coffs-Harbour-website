/* Kyokushin Karate Coffs Harbour: small enhancements. The site works fully without this file. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canObserve = 'IntersectionObserver' in window;
  if (canObserve) root.classList.add('js');
  // Visitors whose device is set to "reduce motion" (very common on Windows and Mac) get calm, fade-only
  // animations: no sliding, zooming, parallax or counting. Everyone else gets the full effects.
  if (reduce) root.classList.add('calm');

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  /* ---------- Scroll reveal ---------- */
  var REVEAL =
    '.section-head, .trio article, .day, .ladder-title, .ladder, .ladder-note, .fees-wrap, .extras, ' +
    '.visit > div, .plan, .shop-item, .pay-note, .trial-form, .about-facts, .about-text, .gallery figure, .page-cta, .card, .where, footer .osu';

  function setupReveal() {
    if (!canObserve) return;
    var targets = Array.prototype.slice.call(document.querySelectorAll(REVEAL));

    function settle(el) {
      // Once the entrance is done, hand the element back to its normal styles so hover effects work again.
      el.classList.remove('reveal');
      el.style.transitionDelay = '';
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        io.unobserve(el);
        el.classList.add('in');
        runCounters(el);
        var done = false;
        function finish() { if (!done) { done = true; settle(el); } }
        el.addEventListener('transitionend', function te(ev) {
          if (ev.target === el && ev.propertyName === 'opacity') { el.removeEventListener('transitionend', te); finish(); }
        });
        setTimeout(finish, 1600);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(function (el) {
      // Stagger siblings that are revealed together (the three training cards, the two class days, photos...).
      var siblings = el.parentElement ? Array.prototype.filter.call(el.parentElement.children, function (c) { return targets.indexOf(c) !== -1; }) : [];
      var i = Math.max(0, siblings.indexOf(el));
      el.style.transitionDelay = Math.min(i, 5) * 90 + 'ms';
      // Children that animate in sequence once their parent is revealed (belts, instructor facts).
      Array.prototype.forEach.call(el.querySelectorAll('.ladder > li, .about-facts > div'), function (c, n) {
        c.style.setProperty('--i', n);
      });
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  /* ---------- Section rules draw across as each section arrives ---------- */
  function setupRules() {
    if (!canObserve) return;
    var sections = document.querySelectorAll('main section');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('drawn'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    Array.prototype.forEach.call(sections, function (s) { s.classList.add('rule-draw'); io.observe(s); });
  }

  /* ---------- Prices count up when they scroll into view ---------- */
  function prepCounters() {
    if (!canObserve || reduce) return;
    Array.prototype.forEach.call(document.querySelectorAll('.fees-wrap td, .extras dd, .plan .price, .shop-item .price'), function (cell) {
      var node = cell.firstChild;
      if (!node || node.nodeType !== 3) return;
      var m = /^\s*\$(\d+)/.exec(node.nodeValue);
      if (!m) return;
      var span = document.createElement('span');
      span.className = 'count';
      span.setAttribute('data-to', m[1]);
      span.textContent = '$' + m[1];
      node.nodeValue = node.nodeValue.replace(/^\s*\$\d+/, '');
      cell.insertBefore(span, node);
    });
  }
  function runCounters(scope) {
    var spans = scope.querySelectorAll('.count[data-to]');
    if (!spans.length) return;
    var t0 = null, dur = 900;
    Array.prototype.forEach.call(spans, function (s) { s.textContent = '$0'; });
    function tick(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur);
      var ease = 1 - Math.pow(1 - k, 3);
      Array.prototype.forEach.call(spans, function (s) {
        s.textContent = '$' + Math.round(+s.getAttribute('data-to') * ease);
      });
      if (k < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- Scroll progress bar and hero parallax ---------- */
  function setupScrollFx() {
    var bar = null;
    if (!reduce) {
      bar = document.createElement('div');
      bar.className = 'scroll-progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }

    var hero = document.querySelector('.hero');
    var kanji = hero && hero.querySelector('.kanji');
    var caption = hero && hero.querySelector('.kanji-caption');
    var wide = window.matchMedia ? window.matchMedia('(min-width: 861px)') : { matches: true };
    var ticking = false;

    function update() {
      ticking = false;
      var y = window.pageYOffset || document.documentElement.scrollTop;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      if (bar) {
        bar.style.transform = 'scaleX(' + p + ')';
        bar.style.opacity = max > 0 && y > 4 ? '1' : '0';
      }

      if (kanji && caption) {
        if (wide.matches && !reduce) {
          var h = hero.offsetHeight || 1;
          var shift = Math.min(y, h) * 0.28;
          var fade = 1 - Math.min(1, y / h) * 0.65;
          kanji.style.translate = '0 ' + shift.toFixed(1) + 'px';
          // filter rather than opacity, so it does not fight the hero's load-in animation.
          kanji.style.filter = 'opacity(' + fade.toFixed(3) + ')';
          caption.style.translate = '0 ' + (shift * 0.6).toFixed(1) + 'px';
          caption.style.filter = 'opacity(' + fade.toFixed(3) + ')';
        } else {
          kanji.style.translate = kanji.style.filter = caption.style.translate = caption.style.filter = '';
        }
      }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* ---------- Photo viewer ---------- */
  function setupViewer() {
    var imgs = Array.prototype.slice.call(document.querySelectorAll('.gallery img'));
    if (!imgs.length) return;

    var box = document.createElement('div');
    box.className = 'lb';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Photo viewer');
    box.innerHTML =
      '<button type="button" class="lb-close" aria-label="Close">&times;</button>' +
      '<button type="button" class="lb-prev" aria-label="Previous photo">&#8249;</button>' +
      '<img alt="">' +
      '<p class="lb-cap"></p>' +
      '<button type="button" class="lb-next" aria-label="Next photo">&#8250;</button>';
    document.body.appendChild(box);
    var big = box.querySelector('img');
    var cap = box.querySelector('.lb-cap');
    var current = 0, opener = null;

    function show(i, instant) {
      current = (i + imgs.length) % imgs.length;
      var src = imgs[current];
      var fig = src.closest('figure');
      var text = fig && fig.querySelector('figcaption') ? fig.querySelector('figcaption').textContent : '';
      function apply() {
        big.src = src.currentSrc || src.src;
        big.alt = src.alt;
        cap.textContent = text + '  (' + (current + 1) + ' of ' + imgs.length + ')';
        big.classList.remove('swap');
      }
      if (instant || reduce) apply();
      else { big.classList.add('swap'); setTimeout(apply, 150); }
    }
    function open(i, btn) {
      opener = btn;
      show(i, true);
      box.classList.add('open');
      document.body.style.overflow = 'hidden';
      box.querySelector('.lb-close').focus();
    }
    function close() {
      box.classList.remove('open');
      document.body.style.overflow = '';
      if (opener) opener.focus();
    }

    imgs.forEach(function (img, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'zoom';
      b.setAttribute('aria-label', 'View larger: ' + img.alt);
      img.parentNode.insertBefore(b, img);
      b.appendChild(img);
      b.addEventListener('click', function () { open(i, b); });
    });

    box.querySelector('.lb-close').addEventListener('click', close);
    box.querySelector('.lb-prev').addEventListener('click', function () { show(current - 1); });
    box.querySelector('.lb-next').addEventListener('click', function () { show(current + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(current - 1);
      else if (e.key === 'ArrowRight') show(current + 1);
      else if (e.key === 'Tab') {
        var f = box.querySelectorAll('button');
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    var x0 = null;
    box.addEventListener('touchstart', function (e) { x0 = e.changedTouches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  ready(function () { prepCounters(); setupReveal(); setupRules(); setupScrollFx(); setupViewer(); });
})();
