// Fire-and-forget flow event logger.
//
// 2026-09-15: fixed to post to an ABSOLUTE backend URL instead of a relative `/api/log-event`.
// The relative path was the exact documented gotcha in CLAUDE.md §3 — this portal's Static Web
// App has its own integrated Functions runtime with no `log-event` function of its own, so every
// call silently 404'd, forever, since this was first written. It has never actually logged
// anything. Now posts to the real unified backend endpoint (see Features/Events/Endpoint.cs) —
// same one every other portal is moving onto — instead of the old relative path or the
// recruiter-portal-only Node.js Functions this file's sibling copy happened to work against.
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

const SESSION_KEY = 'explain_session_id';

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// Retained as the historical name existing call sites already use (29 of them across this
// portal) — internally now just a thin wrapper over the shared logEvent below.
export function logFlowEvent(
  flowStage: string,
  payload: Record<string, unknown> = {},
): void {
  logEvent(flowStage, { page: window.location.pathname, metadata: payload });
}

// New, more general entry point — same transport, explicit page/portal fields (queryable on
// the admin Activity Log) rather than burying them inside an opaque payload blob.
export function logEvent(
  eventType: string,
  opts: { page?: string; metadata?: Record<string, unknown> } = {},
): void {
  // Local development servers talk to the REAL API, so their page views would land in the production
  // Activity Log looking like real visitors (found 2026-09-20). Never log from localhost.
  if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) return;
  const body = {
    sessionId: getSessionId(),
    eventType,
    page: opts.page ?? window.location.pathname,
    portal: 'candidate',
    metadata: opts.metadata,
  };

  // Unlike the old version, this deliberately does NOT skip logging when there's no auth
  // token — anonymous events (marketing/pre-login) matter too now; the backend attaches
  // userId/email only when a valid token is actually present.
  // Must match auth/authStore.ts's own TOKEN_KEY exactly — this portal's token is NOT stored
  // under the generic 'explain_token' key (that's recruiter-portal's own key; every portal
  // uses a different one). Using the wrong key here meant this fetch never found a token and
  // every event silently logged as Anonymous, even for a fully authenticated candidate —
  // found live 2026-09-15 alongside the identical bug in admin-portal's own copy of this file.
  const token = localStorage.getItem('explain_auth_token');

  fetch(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  }).catch(() => {
    // Logging must never break the interview — silent fail, same contract as before.
  });
}

export { getSessionId };
