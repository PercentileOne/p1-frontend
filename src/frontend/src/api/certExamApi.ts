// Certifications & Exams — client-side question generation + session save/share, mirroring
// aiScoring.ts's call pattern (proxied through the .NET backend's /api/ai-proxy, no client-side
// key). Deliberately its own small chatJSON-equivalent rather than importing aiScoring.ts's
// private one — same "copy, not shared helper" convention this codebase already uses for every
// other AI-proxy call site (SpeakVoiceHandler/AvatarAudioHandler, ReadAloud, etc.).

import type { CertificationBankEntry } from '../data/certificationBank';
import type { MCQQuestion } from './aiScoring';

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';
const MODEL = 'gpt-4o-mini';

async function chatJSON<T>(systemPrompt: string, userPrompt: string, temperature = 0.5): Promise<T> {
  const body = JSON.stringify({
    model: MODEL,
    temperature,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  for (let attempt = 0; attempt <= 3; attempt++) {
    // Absolute URL, never a relative /api/* path — this SWA has its own integrated Functions
    // runtime that would otherwise silently 404 a call meant for the real backend.
    const res = await fetch(`${API_BASE}/api/ai-proxy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    if (res.status === 429 && attempt < 3) {
      const retryAfter = parseInt(res.headers.get('Retry-After') ?? '10', 10);
      await new Promise(r => setTimeout(r, Math.min((isNaN(retryAfter) ? 10 : retryAfter) * 1000, 30000)));
      continue;
    }
    if ([502, 503, 504].includes(res.status) && attempt < 2) {
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`AI proxy error ${res.status}`);
    const data = await res.json() as { choices: { message: { content: string } }[] };
    return JSON.parse(data.choices[0].message.content) as T;
  }
  throw new Error('AI proxy unavailable after retries');
}

export interface ExamQuestion extends MCQQuestion {
  domain: string;
}

// Rotates domain selection proportional to each domain's weightPct, so a 30-question mock roughly
// mirrors the real exam's own published question distribution rather than treating every domain
// as equally likely.
function pickDomain(domains: CertificationBankEntry['domains']): string {
  const total = domains.reduce((s, d) => s + d.weightPct, 0);
  let roll = Math.random() * total;
  for (const d of domains) {
    roll -= d.weightPct;
    if (roll <= 0) return d.name;
  }
  return domains[domains.length - 1]?.name ?? '';
}

// One question per call — same one-question-at-a-time shape as Learn Alerts' own question
// generation, grounded against the cert's real domain list (not free-text) to reduce hallucinated
// exam specifics, with an explicit rule against inventing time-sensitive pricing/portal-UI detail.
export async function generateExamQuestion(cert: CertificationBankEntry): Promise<ExamQuestion | null> {
  const domain = pickDomain(cert.domains);

  const systemPrompt = `You generate realistic multiple-choice practice questions for a "${cert.name}" (${cert.vendor} exam ${cert.examCode}) mock exam.
Each question must test genuine conceptual/architectural knowledge within the given domain — never invent current pricing, exact portal UI labels, or other details that change over time.
Return ONLY valid JSON — no markdown, no explanation outside the JSON.`;

  const userPrompt = `Generate ONE multiple-choice question for the domain: "${domain}".

STRICT RULES:
- 4 options, exactly one correct
- correctIndex: 0-based index of the correct option (0=A, 1=B, 2=C, 3=D) — vary it, don't always use 0
- explanation: one sentence explaining why the correct answer is right
- Test real understanding, not trivia — plausible wrong options, no "all of the above"
- Do not reference exact prices, exact portal menu paths, or version numbers that could be outdated

Return JSON:
{ "questionText": "...", "options": ["...", "...", "...", "..."], "correctIndex": 2, "explanation": "..." }`;

  try {
    const raw = await chatJSON<{ questionText: string; options: string[]; correctIndex: number; explanation: string }>(systemPrompt, userPrompt, 0.7);
    if (!raw?.questionText || raw.options?.length !== 4) return null;
    return { questionText: raw.questionText, options: raw.options, correctIndex: raw.correctIndex ?? 0, explanation: raw.explanation ?? '', domain };
  } catch {
    return null;
  }
}

export async function generateExamQuestions(cert: CertificationBankEntry, count: number): Promise<ExamQuestion[]> {
  const questions = await Promise.all(Array.from({ length: count }, () => generateExamQuestion(cert)));
  return questions.filter((q): q is ExamQuestion => q !== null);
}

// Pure, local, deterministic — MCQ correctness is index-match, no AI grading needed. Scales
// correctCount/total onto the cert's own passScore/maxScore range (e.g. Microsoft's 1-1000, pass
// 700) rather than a flat 0-100%, so the result reads as "the real exam's own scoring shape."
export interface ScaledResult {
  scaledScore: number;
  passed: boolean;
  domainAccuracy: { domain: string; correct: number; total: number }[];
}

export function computeScaledScore(cert: CertificationBankEntry, answers: { question: ExamQuestion; selectedIndex: number }[]): ScaledResult {
  const correctCount = answers.filter(a => a.selectedIndex === a.question.correctIndex).length;
  const total = answers.length || 1;
  const floor = cert.maxScore > 0 ? Math.round(cert.maxScore * 0.1) : 0; // never show a bare 0 for a genuine attempt
  const scaledScore = cert.maxScore > 0
    ? Math.round(floor + (correctCount / total) * (cert.maxScore - floor))
    : Math.round((correctCount / total) * 100);

  const byDomain = new Map<string, { correct: number; total: number }>();
  for (const a of answers) {
    const bucket = byDomain.get(a.question.domain) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (a.selectedIndex === a.question.correctIndex) bucket.correct += 1;
    byDomain.set(a.question.domain, bucket);
  }

  return {
    scaledScore,
    passed: cert.passScore > 0 ? scaledScore >= cert.passScore : correctCount / total >= 0.7,
    domainAccuracy: Array.from(byDomain, ([domain, v]) => ({ domain, ...v })),
  };
}

// ── Session save/share — mirrors Features/Interviews/Endpoint.cs's opaque-envelope pattern ────

export interface CertExamSession {
  id: string;
  certId: string;
  certName: string;
  passed: boolean;
  scaledScore: number;
  maxScore: number;
  createdAt: string;
  shareToken: string | null;
  isShared: boolean;
  sessionData: {
    answers: { question: ExamQuestion; selectedIndex: number }[];
    domainAccuracy: ScaledResult['domainAccuracy'];
    candidateName?: string;
  };
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function saveCertExamSession(token: string, session: Omit<CertExamSession, 'shareToken' | 'isShared'>): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/api/cert-exams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(session),
  });
  if (!res.ok) throw new Error(`Failed to save cert exam session: ${res.status}`);
  return res.json() as Promise<{ id: string }>;
}

export async function getCertExamSession(token: string, candidateId: string, id: string): Promise<CertExamSession> {
  const res = await fetch(`${API_BASE}/api/cert-exams/${encodeURIComponent(candidateId)}/${encodeURIComponent(id)}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Failed to load cert exam session: ${res.status}`);
  return res.json() as Promise<CertExamSession>;
}

export async function shareCertExamSession(token: string, candidateId: string, id: string): Promise<{ shareToken: string; shareUrl: string }> {
  const res = await fetch(`${API_BASE}/api/cert-exams/${encodeURIComponent(candidateId)}/${encodeURIComponent(id)}/share`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Failed to share cert exam session: ${res.status}`);
  return res.json() as Promise<{ shareToken: string; shareUrl: string }>;
}
