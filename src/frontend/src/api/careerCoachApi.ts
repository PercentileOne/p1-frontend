// "My Career Coach" API client — GET/POST against the backend's own /api/career-coach
// endpoints (Features/CareerCoach/Endpoint.cs). Deliberately NOT calling /api/ai-proxy
// directly the way most AI features in this app do — that endpoint is anonymous and
// un-metered, and this is the one feature where every message is a fresh, uncached AI call,
// so the daily cap has to be enforced authoritatively server-side.

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  at: string;
}

export interface ThreadSummary {
  id: string;
  title: string;
  lastMessageAt: string;
  messageCount: number;
}

export interface Thread {
  id: string;
  candidateId: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
  messages: ChatMessage[];
}

export interface CappedResponse {
  capped: true;
  count: number;
  message: string;
}

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function listThreads(token: string): Promise<ThreadSummary[]> {
  const res = await fetch(`${API_BASE}/api/career-coach/threads`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Failed to load threads: ${res.status}`);
  return res.json();
}

export async function getThread(token: string, id: string): Promise<Thread> {
  const res = await fetch(`${API_BASE}/api/career-coach/threads/${id}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Failed to load thread: ${res.status}`);
  return res.json();
}

// Both startThread and sendMessage return either a Thread or a CappedResponse (HTTP 429) —
// callers check `'capped' in result` to tell them apart.
export async function startThread(token: string, text: string): Promise<Thread | CappedResponse> {
  const res = await fetch(`${API_BASE}/api/career-coach/threads`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ text }),
  });
  if (res.status === 429) return res.json();
  if (!res.ok) throw new Error(`Failed to start conversation: ${res.status}`);
  return res.json();
}

export async function sendMessage(token: string, threadId: string, text: string): Promise<Thread | CappedResponse> {
  const res = await fetch(`${API_BASE}/api/career-coach/threads/${threadId}/messages`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ text }),
  });
  if (res.status === 429) return res.json();
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`);
  return res.json();
}

export async function deleteThread(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/career-coach/threads/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok && res.status !== 404) throw new Error(`Failed to delete thread: ${res.status}`);
}
