// Visitor-behaviour logging for the marketing site — same unified backend endpoint every portal's
// flowLogger.ts posts to (Features/Events/Endpoint.cs); plain JS because this is static HTML with
// no build step. Always anonymous (this site has no login) and fire-and-forget: a failed or blocked
// request must never affect the page itself.
//
// v1 (2026-09-15): one `page_view` per page load.
// v2 (2026-09-26, Francis: "many, many people (or bots) connecting, however not a single one has
// converted — I want to know what people do when they visit"): adds, per visit —
//   page_view     (always)  + where they came from (utm/referrer), phone vs desktop
//   interaction   first genuine human signal (real click/tap/key/scroll/mouse movement)
//   scroll_depth  25 / 50 / 75 / 100 %
//   section_view  each homepage section the first time it is properly on screen (#pricing etc.)
//   menu_click    nav bar, phone menu and footer links      cta_click  buttons / pills / chips
//   link_click    any other link                            try_submit the "Try it live" box (role typed)
//   faq_open, modal_open (via window.ticTrack), page_leave (seconds on page + deepest scroll)
//
// BOT FILTERING: everything except page_view is held back until the visitor does something a human
// does (trusted click/tap/key, real scrolling, mouse movement). A crawler that just loads the page
// therefore costs ONE event, while real visits get the full story. "Real visitors" in the admin
// funnel = sessions that fired `interaction`. Found 2026-09-26: most US traffic is data-centre
// crawlers (Boardman/Ashburn/Council Bluffs) hitting every portal within the same second.
(function () {
  var API_BASE = 'https://api.explain.global';
  var SESSION_KEY = 'explain_session_id';
  var FIRST_KEY = 'tic_first_touch';

  // Local previews talk to the real API; never log them (see the same guard in each portal's
  // flowLogger.ts). Add ?trackdebug to a localhost URL to print the events to the console instead.
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  var debug = isLocal && /[?&]trackdebug\b/.test(window.location.search);
  if (isLocal && !debug) return;

  // Owner/tester opt-out so our own visits don't pollute the numbers: open any page once with ?notrack=1 and this browser is never
  // logged again; ?notrack=0 turns logging back on. (Remembered per browser, per site address.)
  try {
    var nt = /[?&]notrack=(\d)/.exec(window.location.search);
    if (nt) { if (nt[1] === '1') localStorage.setItem('tic_ignore', '1'); else localStorage.removeItem('tic_ignore'); }
    if (localStorage.getItem('tic_ignore') === '1') return;
  } catch (e) {}

  function sessionId() {
    try {
      var id = sessionStorage.getItem(SESSION_KEY);
      if (!id) {
        id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(36).slice(2));
        sessionStorage.setItem(SESSION_KEY, id);
      }
      return id;
    } catch (e) {
      return 'no-session-storage';
    }
  }

  // Where this visit came from, remembered for the whole tab session so later pages keep the original source.
  function firstTouch() {
    try {
      var saved = sessionStorage.getItem(FIRST_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    var q = new URLSearchParams(window.location.search);
    var ref = '';
    try { ref = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : ''; } catch (e) {}
    if (ref === window.location.hostname.replace(/^www\./, '')) ref = '';
    var ft = {
      src: (q.get('utm_source') || q.get('ref') || ref || 'direct').slice(0, 40),
      med: (q.get('utm_medium') || '').slice(0, 30),
      camp: (q.get('utm_campaign') || '').slice(0, 40),
    };
    try { sessionStorage.setItem(FIRST_KEY, JSON.stringify(ft)); } catch (e) {}
    return ft;
  }

  // Same phone test as /try's own desktop-only gate (TryItLivePage.tsx), so the two agree.
  var device = ((window.matchMedia && window.matchMedia('(pointer: coarse) and (hover: none)').matches) ||
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')) ? 'mobile' : 'desktop';
  var touch = firstTouch();

  function decorate(meta) {
    var m = { src: touch.src, dev: device };
    if (meta) for (var k in meta) if (Object.prototype.hasOwnProperty.call(meta, k)) m[k] = meta[k];
    return m;
  }

  function send(eventType, metadata, keepalive) {
    if (debug) { try { console.log('[track]', eventType, metadata || {}); } catch (e) {} return; }
    try {
      fetch(API_BASE + '/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: !!keepalive, // lets the last events of a visit (page_leave, a click that navigates away) still get out
        body: JSON.stringify({
          sessionId: sessionId(),
          eventType: eventType,
          page: window.location.pathname,
          portal: 'marketing',
          metadata: metadata,
        }),
      }).catch(function () {});
    } catch (e) {}
  }

  // ── page view (always, human or not) ──────────────────────────────────────────────────────────
  var pv = decorate({ w: window.innerWidth });
  if (touch.med) pv.med = touch.med;
  if (touch.camp) pv.camp = touch.camp;
  if (document.referrer) { try { pv.ref = new URL(document.referrer).hostname.replace(/^www\./, ''); } catch (e) {} }
  send('page_view', pv);

  // ── human gate ────────────────────────────────────────────────────────────────────────────────
  var human = false;
  var queue = [];
  var QUEUE_MAX = 60;

  function emit(type, meta, keepalive) {
    var m = decorate(meta);
    if (human) send(type, m, keepalive);
    else if (queue.length < QUEUE_MAX) queue.push([type, m, keepalive]);
  }

  function markHuman(kind) {
    if (human) return;
    human = true;
    send('interaction', decorate({ kind: kind }));
    for (var i = 0; i < queue.length; i++) send(queue[i][0], queue[i][1], queue[i][2]);
    queue = [];
  }

  var trusted = function (e) { return !e || e.isTrusted !== false; }; // scripted (untrusted) events don't count as a person
  ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(function (ev) {
    window.addEventListener(ev, function (e) { if (trusted(e)) markHuman(ev); }, { passive: true, capture: true });
  });
  var moves = 0;
  window.addEventListener('mousemove', function (e) { if (trusted(e) && ++moves >= 5) markHuman('mouse'); }, { passive: true });

  // ── scroll depth + deepest scroll ─────────────────────────────────────────────────────────────
  var lastY = window.pageYOffset || 0;
  var maxPct = 0;
  var marks = { 25: false, 50: false, 75: false, 100: false };
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.pageYOffset || 0;
    if (Math.abs(y - lastY) > 40) markHuman('scroll');
    var doc = document.documentElement;
    var total = Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0);
    if (total <= 0) return;
    var pct = Math.min(100, Math.round(((y + window.innerHeight) / total) * 100));
    if (pct > maxPct) maxPct = pct;
    [25, 50, 75, 100].forEach(function (m) {
      if (!marks[m] && (m === 100 ? pct >= 98 : pct >= m)) { marks[m] = true; emit('scroll_depth', { pct: m }); }
    });
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  // ── clicks ────────────────────────────────────────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    if (!trusted(e)) return;
    markHuman('click');
    var el = e.target && e.target.closest ? e.target.closest('a,button,summary,[data-track]') : null;
    if (!el) return;

    var area = 'page';
    if (el.closest('.drawer')) area = 'menu';
    else if (el.closest('nav')) area = 'nav';
    else if (el.closest('footer')) area = 'footer';
    else { var sec = el.closest('section[id],header[id]'); if (sec) area = sec.id; }

    var label = (el.getAttribute('data-track') || el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    var href = '';
    var outbound = 0;
    if (el.tagName === 'A') {
      try {
        var u = new URL(el.href, window.location.href);
        outbound = u.origin === window.location.origin ? 0 : 1;
        href = outbound ? (u.hostname + u.pathname) : (u.pathname + u.hash);
      } catch (err) {}
    }
    var type = (area === 'nav' || area === 'menu' || area === 'footer') ? 'menu_click'
      : (el.matches('.btn,.pill,.chip,button[type="submit"],[data-track]') ? 'cta_click' : 'link_click');
    var meta = { label: label, area: area };
    if (href) meta.href = href;
    if (outbound) meta.out = 1;
    emit(type, meta, true);
  }, true);

  // ── sections seen, FAQ opened, "Try it live" submitted ───────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    if ('IntersectionObserver' in window) {
      // A section only counts as "seen" once it has stayed on screen for ~0.7s — otherwise clicking a menu
      // link that smooth-scrolls past four sections would log all four as viewed.
      var seen = {};
      var timers = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var id = en.target.id;
          if (!id || seen[id]) return;
          if (en.isIntersecting) {
            if (!timers[id]) timers[id] = setTimeout(function () { seen[id] = true; emit('section_view', { section: id }); }, 700);
          } else if (timers[id]) {
            clearTimeout(timers[id]); timers[id] = null;
          }
        });
      }, { threshold: 0.35 });
      var secs = document.querySelectorAll('section[id],header[id]');
      for (var i = 0; i < secs.length; i++) io.observe(secs[i]);
    }

    var form = document.getElementById('tryForm');
    if (form) {
      form.addEventListener('submit', function () {
        var input = document.getElementById('topic');
        var v = input && input.value ? input.value.trim() : '';
        emit('try_submit', { topic: v.slice(0, 60), len: v.length }, true);
      }, true);
    }
  });

  document.addEventListener('toggle', function (e) {
    var d = e.target;
    if (d && d.tagName === 'DETAILS' && d.open) {
      var s = d.querySelector('summary');
      emit('faq_open', { q: ((s && s.textContent) || '').replace(/\s+/g, ' ').trim().slice(0, 80) });
    }
  }, true);

  // Anything on a page (e.g. the how-we-score modal) can record its own event.
  window.ticTrack = function (type, meta) { try { emit(String(type).slice(0, 40), meta || {}); } catch (e) {} };

  // ── leaving: how long, how far ────────────────────────────────────────────────────────────────
  var visibleMs = 0;
  var shownAt = document.visibilityState === 'hidden' ? 0 : Date.now();
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      if (shownAt) { visibleMs += Date.now() - shownAt; shownAt = 0; }
      if (human) send('page_leave', decorate({ sec: Math.round(visibleMs / 1000), max: maxPct }), true);
    } else {
      shownAt = Date.now();
    }
  });
})();
