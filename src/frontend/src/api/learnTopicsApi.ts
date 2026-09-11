// Dashboard "What People Are Studying" card — logs the real course topic a candidate opens in
// Learn (LearnPanel.tsx's handleGenerate), and reads back the real top-studied-topics ranking.
// Fire-and-forget on the log side — a logging failure should never block opening the course.

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface LearnTopicStat {
  topic: string;
  count: number;
}

export async function logLearnTopic(token: string, topic: string): Promise<void> {
  if (!topic.trim()) return;
  try {
    await fetch(`${API_BASE}/api/learn-topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ topic }),
    });
  } catch { /* best-effort only — never blocks opening the course */ }
}

export async function getTopLearnTopics(): Promise<LearnTopicStat[]> {
  const res = await fetch(`${API_BASE}/api/learn-topics`);
  if (!res.ok) throw new Error(`Failed to load learn topics: ${res.status}`);
  return res.json();
}
