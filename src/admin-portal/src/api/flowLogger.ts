// Fire-and-forget flow event logger.
//
// 2026-09-15: switched from this portal's own working Node.js Azure Functions
// (api/log-event, api/flow-logs → Cosmos ExplainInterviewLogs/FlowLogs) onto the new unified
// .NET backend endpoint (Explain.Api's Features/Events/Endpoint.cs) instead. Per CLAUDE.md's own
// architecture rule, those Node Functions were a pre-existing, undocumented exception to
// "backend is .NET Minimal APIs only" — not something to keep building on. They're left running,
// unused, rather than deleted as part of this change (see the event-logging plan's own scope
// notes) in case anything still depends on them.
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

export function logFlowEvent(
  flowStage: string,
  payload: Record<string, unknown> = {},
): void {
  logEvent(flowStage, { page: window.location.pathname, metadata: payload });
}

export function logEvent(
  eventType: string,
  opts: { page?: string; metadata?: Record<string, unknown> } = {},
): void {
  const body = {
    sessionId: getSessionId(),
    eventType,
    page: opts.page ?? window.location.pathname,
    portal: 'admin',
    metadata: opts.metadata,
  };

  // Must match AuthContext.tsx's own TOKEN_KEY exactly — this portal's token is NOT stored
  // under the generic 'explain_token' key (that's recruiter-portal's own key; every portal
  // uses a different one — see AuthContext.tsx/authStore.ts). Using the wrong key here meant
  // this fetch never found a token and every event silently logged as Anonymous, even for a
  // fully authenticated admin — found live 2026-09-15 when Francis's own admin session showed
  // up as Anonymous in the Activity Log he'd just built.
  const token = localStorage.getItem('explain_admin_token');

  fetch(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  }).catch(() => {
    // Logging must never break whatever the admin was doing — silent fail.
  });
}

export { getSessionId };
