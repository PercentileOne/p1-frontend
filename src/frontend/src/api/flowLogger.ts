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

  fetch('/api/log-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export { getSessionId };
