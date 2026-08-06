// Fire-and-forget flow event logger.
// Posts to /api/log-event → Azure Function → Cosmos DB (ExplainInterviewLogs/FlowLogs).
// Never throws, never blocks the interview.

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
  const body = {
    sessionId: getSessionId(),
    timestamp: new Date().toISOString(),
    flowStage,
    payload,
  };

  const token = localStorage.getItem('explain_token');
  if (!token) return; // unauthenticated (demo flow) — skip logging

  fetch('/api/log-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body),
  }).catch(() => {
    // Logging must never break the interview — silent fail
  });
}

export { getSessionId };
