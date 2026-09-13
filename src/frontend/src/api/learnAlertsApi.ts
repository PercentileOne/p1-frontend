import { useAuthStore } from '../auth/authStore';

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface LearnAlert {
  id: string;
  candidateId: string;
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
  difficulty: 'Standard' | 'Pro' | 'Expert';
  specialFocus: string[];
  intervalHours: number;
  durationMonths: number;
  visibility: 'public' | 'hidden';
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
  nextSendAt: string;
  sentCount: number;
  correctCount: number;
  currentStreak: number;
  longestStreak: number;
}

export interface LearnAlertSummary {
  totalSent: number;
  totalCorrect: number;
  bestCurrentStreak: number;
  bestLongestStreak: number;
}

export interface CreateLearnAlertRequest {
  jobTitle: string;
  difficulty: LearnAlert['difficulty'];
  specialFocus: string[];
  intervalHours: number;
  durationMonths: number;
  visibility: LearnAlert['visibility'];
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function createLearnAlert(req: CreateLearnAlertRequest): Promise<LearnAlert> {
  const res = await fetch(`${API_BASE}/api/learn-alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Failed to create Learn Alert: ${res.status}`);
  return res.json() as Promise<LearnAlert>;
}

export async function listLearnAlerts(): Promise<LearnAlert[]> {
  const res = await fetch(`${API_BASE}/api/learn-alerts`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json() as Promise<LearnAlert[]>;
}

export async function updateLearnAlert(id: string, patch: Partial<CreateLearnAlertRequest & { status: LearnAlert['status'] }>): Promise<LearnAlert> {
  const res = await fetch(`${API_BASE}/api/learn-alerts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Failed to update Learn Alert: ${res.status}`);
  return res.json() as Promise<LearnAlert>;
}

export async function deleteLearnAlert(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/learn-alerts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

export async function fetchLearnAlertsSummary(): Promise<LearnAlertSummary | null> {
  const res = await fetch(`${API_BASE}/api/learn-alerts/summary`, { headers: authHeaders() });
  if (!res.ok) return null;
  return res.json() as Promise<LearnAlertSummary>;
}
