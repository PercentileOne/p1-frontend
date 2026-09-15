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
    portal: 'employer',
    metadata: opts.metadata,
  };

  const token = localStorage.getItem('explain_token');

  fetch(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  }).catch(() => {
    // Logging must never break whatever the employer-portal user was doing — silent fail.
  });
}

export { getSessionId };
