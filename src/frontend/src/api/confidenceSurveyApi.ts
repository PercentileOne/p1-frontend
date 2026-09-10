// Candidate's own self-reported interview confidence — a single optional intake-screen
// question (Francis, 2026-09-10). Seeds TheInterviewChair's own live, growing proprietary
// data, blended into GET /api/platform-stats automatically once there's a real sample size.
// Fire-and-forget: a logging failure should never block starting the interview, same
// reasoning as inDemandSubjectsApi.ts's identical shape.

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export type ConfidenceResponse = 'confident' | 'not-confident';

export async function submitConfidenceSurvey(token: string, response: ConfidenceResponse): Promise<void> {
  try {
    // countryCode intentionally omitted for now — nothing in the intake flow collects it yet;
    // the backend defaults to "unknown" rather than this call guessing at one.
    await fetch(`${API_BASE}/api/confidence-survey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ response }),
    });
  } catch { /* best-effort only — never blocks starting the interview */ }
}
