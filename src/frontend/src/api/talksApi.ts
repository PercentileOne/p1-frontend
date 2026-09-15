import { useAuthStore } from '../auth/authStore';

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface DimensionScore {
  score: number;
  description: string;
}

export interface TalkScoreResult {
  subject: string;
  overall: number;
  grade: string;
  clarity: DimensionScore;
  structure: DimensionScore;
  depth: DimensionScore;
  accuracy: DimensionScore;
  confidence: DimensionScore;
  engagement: DimensionScore;
  // Split out from `structure`, 2026-09-14 — the primacy/recency effect (listeners remember the
  // opening and closing far better than the middle) scored on its own rather than as one clause
  // inside structure's description. Optional for talks saved before this field existed.
  openingClosingStrength?: DimensionScore;
  timeManagement: DimensionScore;
  overallFeedback: string;
  wordCount: number;
  // The distinct, concrete points a listener would actually walk away with — a count as much as
  // a list. Genuinely can be an empty array (an unfocused talk landed nothing memorable, not a
  // missing value) — but optional/undefined for talks saved before this field existed.
  takeaways?: string[];
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function scoreTalk(
  subject: string,
  transcript: string,
  durationSeconds: number,
  targetDurationSeconds: number,
  isPersonalStory: boolean,
): Promise<TalkScoreResult> {
  const res = await fetch(`${API_BASE}/talks/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ subject, transcript, durationSeconds, targetDurationSeconds, isPersonalStory }),
  });
  if (!res.ok) throw new Error(`Talk scoring failed: ${res.status}`);
  return res.json() as Promise<TalkScoreResult>;
}

export async function fetchWayneTips(subject: string, isPersonalStory: boolean): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/talks/wayne-tips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ subject, isPersonalStory }),
    });
    if (!res.ok) return [];
    const data = await res.json() as { tips?: string[] };
    return data.tips ?? [];
  } catch {
    return []; // fail-soft — same convention as generateHotTopics; a talk still runs fine with no tips
  }
}

export interface PublicTalkSummary {
  id: string;
  authorFirstName: string;
  createdAt: string;
  subject: string | null;
  overallScore: number;
  hasVideo: boolean;
  shareToken: string | null;
}

export async function fetchPublicTalks(q?: string): Promise<PublicTalkSummary[]> {
  const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
  const res = await fetch(`${API_BASE}/api/talks/public${qs}`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json() as Promise<PublicTalkSummary[]>;
}

export interface UploadTalkResult {
  id: string;
  videoSaved: boolean;
}

export async function uploadTalk(metadata: object, video: Blob | null): Promise<UploadTalkResult> {
  const form = new FormData();
  form.append('metadata', JSON.stringify(metadata));
  if (video) form.append('video', video, 'talk.webm');

  const res = await fetch(`${API_BASE}/api/talks/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error(`Talk upload failed: ${res.status}`);
  return res.json() as Promise<UploadTalkResult>;
}
