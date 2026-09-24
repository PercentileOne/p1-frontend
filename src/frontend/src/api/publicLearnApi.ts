// Public, no-login Learn (Francis, 2026-09-24: "accessible to everyone from the marketing page")
// — talks to Explain.Api's POST /api/learn/public/generate, which reuses the exact same
// GenerateLessonCommand/Cosmos-shared cache an authenticated candidate's Learn module uses. Same
// absolute-URL rule as every other backend call from this app.
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface PublicLessonKeyConcept {
  icon: string; title: string; body: string; deepDive: string; example: string;
  codeSnippet: string | null; memoryHook: string; examTrap: string;
}
export interface PublicLessonMisconception { wrong: string; right: string }
export interface PublicLessonGlossaryItem { term: string; def: string }
export interface PublicLesson {
  title: string; subject: string; category: string; emoji: string; hook: string;
  keyConcepts: PublicLessonKeyConcept[];
  misconceptions: PublicLessonMisconception[];
  glossary: PublicLessonGlossaryItem[];
  examQuestions: string[];
  mcQuestions: { q: string; options: string[] }[];
}

export type PublicLearnResult = { ok: true; data: PublicLesson } | { ok: false; capped: boolean; message: string };

export async function generatePublicLesson(subject: string): Promise<PublicLearnResult> {
  try {
    const res = await fetch(`${API_BASE}/api/learn/public/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject }),
    });
    const json = await res.json().catch(() => ({})) as Partial<PublicLesson> & { error?: string; message?: string; capped?: boolean };
    if (res.ok) return { ok: true, data: json as PublicLesson };
    return { ok: false, capped: !!json.capped, message: json.message ?? json.error ?? "Something went wrong — please try again." };
  } catch {
    return { ok: false, capped: false, message: "We couldn't reach the server — please check your connection and try again." };
  }
}
