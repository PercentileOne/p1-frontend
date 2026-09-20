// Real-time page-view logging for the marketing site (Francis, 2026-09-15) — same unified
// backend endpoint every portal's flowLogger.ts now posts to (Features/Events/Endpoint.cs),
// just a plain-JS version since this is static HTML with no build step. Always anonymous
// (this site has no login), fire-and-forget: a failed or blocked request must never affect
// the page itself.
(function () {
  var API_BASE = 'https://api.explain.global';
  var SESSION_KEY = 'explain_session_id';

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

  // Local previews talk to the real API; never log them (see the same guard in each portal's flowLogger.ts).
  if (/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) return;

  try {
    fetch(API_BASE + '/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId(),
        eventType: 'page_view',
        page: window.location.pathname,
        portal: 'marketing',
      }),
    }).catch(function () {});
  } catch (e) {}
})();
