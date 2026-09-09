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
