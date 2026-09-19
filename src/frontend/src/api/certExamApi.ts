// Certifications & Exams — client-side question generation + session save/share, mirroring
// aiScoring.ts's call pattern (proxied through the .NET backend's /api/ai-proxy, no client-side
// key). Deliberately its own small chatJSON-equivalent rather than importing aiScoring.ts's
// private one — same "copy, not shared helper" convention this codebase already uses for every
// other AI-proxy call site (SpeakVoiceHandler/AvatarAudioHandler, ReadAloud, etc.).

import type { ExamCatalogEntry } from './examCatalogApi';
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
function pickDomain(domains: ExamCatalogEntry['domains']): string {
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
// Who the questions are pitched at, and which spelling/curriculum to use — the same generator now
// serves everything from AZ-104 to GCSE Maths to AP US History, so it can't assume a cloud-cert
// audience any more (2026-09-19).
function audienceLine(cert: ExamCatalogEntry): string {
  const spelling = cert.region === 'us' ? 'American spelling and US conventions' : cert.region === 'uk' ? 'British spelling and UK conventions' : 'clear international English';
  switch (cert.category) {
    case 'gcse': return `Pitch them at UK GCSE students (age 14-16) following the ${cert.board ? `${cert.board} ` : ''}GCSE ${cert.subject || cert.name} content — ${spelling}.`;
    case 'a-level': return `Pitch them at UK A-Level students (age 16-18) following the ${cert.board ? `${cert.board} ` : ''}A-Level ${cert.subject || cert.name} content — ${spelling}.`;
    case 'ap': return `Pitch them at US high-school students taking the College Board AP course — ${spelling}.`;
    case 'admissions': return `Pitch them at test-takers preparing for this admissions test — ${spelling}.`;
    default: return `Pitch them at a candidate preparing for the real exam — ${spelling}.`;
  }
}

export async function generateExamQuestion(cert: ExamCatalogEntry): Promise<ExamQuestion | null> {
  const domain = pickDomain(cert.domains);
  const ident = [cert.vendor, cert.examCode ? `exam ${cert.examCode}` : ''].filter(Boolean).join(' ');

  const systemPrompt = `You generate realistic multiple-choice practice questions for a "${cert.name}"${ident ? ` (${ident})` : ''} mock exam.
${audienceLine(cert)}
Each question must test genuine understanding within the given domain — never invent current pricing, exact portal UI labels, or other details that change over time. If a question involves a calculation, work it out carefully and make sure the marked correct option is genuinely correct.
These are ORIGINAL practice questions — never reproduce real past-paper or exam-dump questions.
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

export async function generateExamQuestions(cert: ExamCatalogEntry, count: number): Promise<ExamQuestion[]> {
  const questions = await Promise.all(Array.from({ length: count }, () => generateExamQuestion(cert)));
  return questions.filter((q): q is ExamQuestion => q !== null);
}

// Pure, local, deterministic — MCQ correctness is index-match, no AI grading needed. Scales
// correctCount/total onto the cert's own passScore/maxScore range (e.g. Microsoft's 1-1000, pass
// 700) rather than a flat 0-100%, so the result reads as "the real exam's own scoring shape."
export interface ScaledResult {
  scaledScore: number;
  // The scale scaledScore is out of. Comes from the RESULT (not cert.maxScore) because grade-based
  // exams (GCSE/A-level) have no maxScore of their own — they report a percentage out of 100.
  maxScore: number;
  passed: boolean;
  // e.g. "Grade 6" / "B" — only for grade-based exams. Always INDICATIVE: real boundaries change
  // every year, per paper and per tier, and this is an MCQ mock, not the real paper.
  gradeLabel?: string;
  domainAccuracy: { domain: string; correct: number; total: number }[];
}

// Indicative percent → grade tables for the grade-based exam types (minimum % for each grade).
const GCSE_GRADES: [number, number][] = [[88, 9], [80, 8], [70, 7], [60, 6], [50, 5], [40, 4], [30, 3], [20, 2], [10, 1]];
const ALEVEL_GRADES: [number, string][] = [[85, 'A*'], [75, 'A'], [65, 'B'], [55, 'C'], [45, 'D'], [35, 'E']];
const AP_SCORES: [number, number][] = [[80, 5], [65, 4], [50, 3], [35, 2]];

export function computeScaledScore(cert: ExamCatalogEntry, answers: { question: ExamQuestion; selectedIndex: number }[]): ScaledResult {
  const correctCount = answers.filter(a => a.selectedIndex === a.question.correctIndex).length;
  const total = answers.length || 1;
  const ratio = correctCount / total;
  const pct = Math.round(ratio * 100);

  const byDomain = new Map<string, { correct: number; total: number }>();
  for (const a of answers) {
    const bucket = byDomain.get(a.question.domain) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (a.selectedIndex === a.question.correctIndex) bucket.correct += 1;
    byDomain.set(a.question.domain, bucket);
  }

  const domainAccuracy = Array.from(byDomain, ([domain, v]) => ({ domain, ...v }));

  // Grade-based exams: report the percentage plus an INDICATIVE grade.
  if (cert.scoringModel === 'grade-9-1') {
    const grade = GCSE_GRADES.find(([min]) => pct >= min)?.[1];
    return { scaledScore: pct, maxScore: 100, passed: (grade ?? 0) >= 4, gradeLabel: grade ? `Grade ${grade}` : 'Ungraded (U)', domainAccuracy };
  }
  if (cert.scoringModel === 'grade-a-star-e') {
    const grade = ALEVEL_GRADES.find(([min]) => pct >= min)?.[1];
    return { scaledScore: pct, maxScore: 100, passed: !!grade, gradeLabel: grade ? `Grade ${grade}` : 'Ungraded (U)', domainAccuracy };
  }
  if (cert.scoringModel === 'ap-1-5') {
    const score = AP_SCORES.find(([min]) => pct >= min)?.[1] ?? 1;
    return { scaledScore: score, maxScore: 5, passed: score >= 3, gradeLabel: `AP score ${score}`, domainAccuracy };
  }

  // Scaled exams (the original behaviour): map onto the exam's own published score range.
  const min = cert.minScore ?? 0;
  const max = cert.maxScore;
  if (max > 0) {
    // Small raw-score exams (driving theory 43/50, Life in the UK 18/24) score out of the number of
    // questions, so map straight onto the scale. Big scaled ranges (Microsoft 1-1000) keep the
    // "never show a bare 0 for a genuine attempt" floor.
    const rawScale = min === 0 && max <= 100;
    const floor = rawScale ? 0 : (min > 0 ? min : Math.round(max * 0.1));
    const scaledScore = Math.round(floor + ratio * (max - floor));
    return {
      scaledScore, maxScore: max,
      passed: cert.passScore > 0 ? scaledScore >= cert.passScore : ratio >= 0.7,
      domainAccuracy,
    };
  }
  return { scaledScore: pct, maxScore: 100, passed: ratio >= 0.7, domainAccuracy };
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
  decided: boolean;
  sessionData: {
    answers: { question: ExamQuestion; selectedIndex: number }[];
    domainAccuracy: ScaledResult['domainAccuracy'];
    candidateName?: string;
    // Indicative grade for grade-based exams (GCSE / A-level / AP) — see ScaledResult.gradeLabel.
    gradeLabel?: string;
    // 'ai-draft' when the exam's blueprint was AI-generated and not yet reviewed — carried through
    // so the summary can repeat the "may differ from the official specification" note.
    blueprintStatus?: string;
  };
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export interface CertExamSummaryRow {
  id: string;
  createdAt: string;
  certId: string;
  certName: string;
  passed: boolean;
  scaledScore: number;
  maxScore: number;
  isShared: boolean;
  decided: boolean;
}

export async function listCertExams(token: string): Promise<CertExamSummaryRow[]> {
  const res = await fetch(`${API_BASE}/api/cert-exams`, { headers: authHeaders(token) });
  if (!res.ok) return [];
  return res.json() as Promise<CertExamSummaryRow[]>;
}

export async function saveCertExamSession(token: string, session: Omit<CertExamSession, 'shareToken' | 'isShared' | 'decided'>): Promise<{ id: string }> {
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

export async function unshareCertExamSession(token: string, candidateId: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/cert-exams/${encodeURIComponent(candidateId)}/${encodeURIComponent(id)}/unshare`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Failed to unshare cert exam session: ${res.status}`);
}

export async function deleteCertExamSession(token: string, candidateId: string, id: string): Promise<void> {
  await fetch(`${API_BASE}/api/cert-exams/${encodeURIComponent(candidateId)}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}
