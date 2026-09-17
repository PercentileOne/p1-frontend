// A candidate's deliberately-saved question+model-answer library — see backend
// Features/QuestionBank/Endpoint.cs for why this is a separate store from qaLog (explicit
// opt-in only, not an automatic trail of every question asked).

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface QuestionBankEntry {
  id: string;
  questionText: string;
  answerText: string;
  questionType: string | null;
  difficulty: string | null;
  competencyTags: string[] | null;
  jobTitle: string | null;
  company: string | null;
  interviewId: string | null;
  savedAt: string;
}

export interface SaveQuestionBankEntryParams {
  questionText: string;
  answerText: string;
  questionType?: string | null;
  difficulty?: string | null;
  competencyTags?: string[] | null;
  jobTitle?: string | null;
  company?: string | null;
  interviewId?: string | null;
}

// Fire-and-forget from the interview room — "Save & Continue" must never block or interrupt
// the live session over a save that failed. Swallows every error itself; returns nothing.
export async function saveQuestionBankEntry(token: string, params: SaveQuestionBankEntryParams): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/question-bank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(params),
    });
  } catch {
    // Best-effort only — see comment above.
  }
}

export async function listQuestionBank(token: string): Promise<QuestionBankEntry[]> {
  const res = await fetch(`${API_BASE}/api/question-bank`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Failed to load question bank (${res.status})`);
  return res.json() as Promise<QuestionBankEntry[]>;
}

export async function deleteQuestionBankEntry(token: string, id: string): Promise<void> {
  await fetch(`${API_BASE}/api/question-bank/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
