// "In Demand Subjects" — logs the topics a candidate actually kept in the intake screen's
// Special Focus field when they start a real interview (never the raw "What's Hot" AI
// suggestions themselves — only what survives the candidate's own keep/discard curation).
// Fire-and-forget: a logging failure should never block starting the interview.

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export async function logInDemandSubjects(token: string, jobTitle: string, subjects: string[]): Promise<void> {
  if (!subjects.length) return;
  try {
    await fetch(`${API_BASE}/api/in-demand-subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ jobTitle, subjects }),
    });
  } catch { /* best-effort only — never blocks starting the interview */ }
}

export interface InDemandSubject {
  jobTitle: string;
  subject: string;
  keptCount: number;
}

// Dashboard "What Candidates Are Doing" card — real top-kept Special Focus subjects for a
// role, most-kept first. Was logged from day one (see logInDemandSubjects above) but never
// read back into any UI until now.
export async function getInDemandSubjects(jobTitle: string): Promise<InDemandSubject[]> {
  const res = await fetch(`${API_BASE}/api/in-demand-subjects/${encodeURIComponent(jobTitle)}`);
  if (!res.ok) throw new Error(`Failed to load in-demand subjects: ${res.status}`);
  return res.json();
}
