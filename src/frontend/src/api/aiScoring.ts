// Real AI scoring and coaching via GPT-4o.
// All calls go through the server-side /api/ai-proxy function — key never exposed to browser.

import type { ScoreResponse, InterviewQuestion } from './explainApi';
import { buildCVContext, type CVContext, type CVExperience, type JobSpecContext } from '../utils/contextBuilder';
import type { CoachingMessage } from '../utils/coachingEngine';

const MODEL = 'gpt-4o-mini';

export const aiScoringConfigured = true;

async function chatJSON<T>(systemPrompt: string, userPrompt: string, temperature = 0.3): Promise<T> {
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
    const res = await fetch('/api/ai-proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    if (res.status === 429 && attempt < 3) {
      const retryAfter = parseInt(res.headers.get('Retry-After') ?? '10', 10);
      const wait = Math.min((isNaN(retryAfter) ? 10 : retryAfter) * 1000, 30000);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) throw new Error(`AI proxy error ${res.status}`);
    const data = await res.json() as { choices: { message: { content: string } }[] };
    return JSON.parse(data.choices[0].message.content) as T;
  }
  throw new Error('OpenAI rate limited after retries');
}

// ── CV Parsing ────────────────────────────────────────────────────────────────

function verifyTechAgainstRawText(technologies: string[], rawText: string): string[] {
  const rawLower = rawText.toLowerCase();
  return technologies.filter(tech => {
    const techLower = tech.toLowerCase();
    if (techLower === 'java') {
      const matches = [...rawLower.matchAll(/java(script)?/gi)];
      return matches.some(m => !m[1]);
    }
    return rawLower.includes(techLower);
  });
}

export async function parseCVWithAI(rawText: string): Promise<CVContext> {
  const systemPrompt = `You are a strict CV data extractor. Your ONLY job is to extract data that is EXPLICITLY WRITTEN in the CV text.
ZERO HALLUCINATION POLICY: Do not infer, guess, paraphrase, shorten, or invent ANY data.
If a field cannot be found verbatim in the CV text, return an empty string or empty array.
Return ONLY valid JSON — no markdown, no explanation.`;

  const userPrompt = `Extract structured data from this CV. Copy values VERBATIM from the text — never paraphrase.

CV text:
"""
${rawText.slice(0, 10000)}
"""

Return JSON:
{
  "firstName": "candidate's first name",
  "lastName": "candidate's last name",
  "summary": "verbatim personal profile text or empty string",
  "roles": ["most recent job title"],
  "companies": ["actual employer names only"],
  "experience": [{ "role": "exact job title", "company": "exact employer name", "period": "YYYY–present" }],
  "skills": ["exact skill names verbatim from CV"],
  "achievements": ["only entries with measurable outcomes"],
  "certifications": ["exact certification names"],
  "education": ["degree, institution, year"],
  "seniority": "Junior|Mid|Senior|Lead|Director|Executive|Unknown",
  "yearsOfExperience": 0
}`;

  try {
    const res = await fetch('/api/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] }),
    });
    if (!res.ok) throw new Error(`AI proxy error ${res.status}`);
    const resData = await res.json() as { choices: { message: { content: string } }[] };
    const raw = JSON.parse(resData.choices[0].message.content) as Record<string, unknown>;

    const str = (v: unknown) => (typeof v === 'string' ? v : '');
    const arr = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    const num = (v: unknown): number | undefined =>
      typeof v === 'number' && v > 0 ? v : undefined;

    const firstName = str(raw.firstName);
    const lastName = str(raw.lastName);

    const expRaw = Array.isArray(raw.experience) ? raw.experience : [];
    const experience: CVExperience[] = expRaw
      .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
      .map(e => ({ role: str(e.role), company: str(e.company), period: str(e.period) }))
      .filter(e => e.role || e.company);

    const aiSkills = arr(raw.skills);
    const verifiedSkills = verifyTechAgainstRawText(aiSkills, rawText);

    return {
      rawText,
      firstName,
      lastName,
      candidateName: firstName && lastName ? `${firstName} ${lastName}` : undefined,
      roles: arr(raw.roles),
      companies: arr(raw.companies),
      dates: [],
      skills: verifiedSkills,
      technologies: verifiedSkills,
      achievements: arr(raw.achievements),
      certifications: arr(raw.certifications),
      education: arr(raw.education),
      responsibilities: [],
      leadershipSignals: [],
      seniority: (['Junior','Mid','Senior','Lead','Director','Executive'].includes(str(raw.seniority))
        ? str(raw.seniority) : 'Unknown') as CVContext['seniority'],
      yearsOfExperience: num(raw.yearsOfExperience),
      experience,
      summary: str(raw.summary) || undefined,
      _source: 'ai',
    };
  } catch (e) {
    console.warn('[Explain AI] parseCVWithAI failed — using heuristic fallback:', e);
    return { ...buildCVContext(rawText), _source: 'heuristic' as const };
  }
}

// ── Question generation ───────────────────────────────────────────────────────

export async function generateQuestionsWithAI(
  cvCtx: CVContext,
  jobCtx: JobSpecContext,
): Promise<InterviewQuestion[]> {
  const role = jobCtx.title;
  const company = jobCtx.company;
  const industry = jobCtx.industry;
  const skills = cvCtx.skills.slice(0, 6).join(', ');
  const experience = cvCtx.experience?.slice(0, 3).map(e => `${e.role} at ${e.company} (${e.period})`).join('; ') ?? cvCtx.roles.slice(0, 2).join(', ');
  const achievement = cvCtx.achievements[0] ?? '';
  const seniority = cvCtx.seniority;
  const responsibilities = jobCtx.responsibilities.slice(0, 3).join('; ');

  const companyLine = company
    ? `Company: ${company}${industry ? ` — operating in: ${industry}` : ''}`
    : 'Company: not specified';

  const systemPrompt = `You are an expert interview question generator for a global hiring platform.
Generate exactly 8 interview questions for a ${seniority} candidate applying for the role below.
CRITICAL RULES:
1. Questions must be tailored to BOTH the role AND the company.
2. Order: 6 role+company-specific competency questions first (source: "Role"), then 2 HR/culture-fit questions last (source: "HR").
3. Do NOT default to "technical" questions for non-technical roles.
4. Return ONLY valid JSON — no markdown, no explanation.`;

  const userPrompt = `═══ ROLE ═══
Title: ${role}
${companyLine}
${responsibilities ? `Key responsibilities: ${responsibilities}` : ''}

═══ CANDIDATE ═══
- Skills: ${skills || 'not specified'}
- Recent experience: ${experience || 'not specified'}
- Notable achievement: ${achievement || 'not specified'}
- Years of experience: ${cvCtx.yearsOfExperience ?? 'unknown'}

Return JSON:
{
  "questions": [
    {
      "questionId": "q1",
      "questionText": "...",
      "modelAnswer": "Brief guide on what a great answer looks like (2-3 sentences).",
      "questionType": "Competency",
      "difficulty": "Medium",
      "source": "Role",
      "competencyTags": ["core skill"]
    }
  ]
}`;

  const raw = await chatJSON<{ questions: InterviewQuestion[] }>(systemPrompt, userPrompt, 0.7);
  if (!Array.isArray(raw.questions) || raw.questions.length === 0) throw new Error('No questions returned');
  return raw.questions;
}

// ── Scoring ───────────────────────────────────────────────────────────────────

export async function scoreWithAI(
  question: InterviewQuestion,
  answerText: string,
  cvCtx?: CVContext,
  jobCtx?: JobSpecContext,
): Promise<ScoreResponse> {
  const systemPrompt = `You are an expert interview coach scoring candidate answers.
Return ONLY a valid JSON object — no markdown, no explanation.`;

  const context = [
    cvCtx?.roles?.[0] ? `Candidate role: ${cvCtx.roles[0]}` : null,
    cvCtx?.skills?.length ? `Candidate skills: ${cvCtx.skills.slice(0, 5).join(', ')}` : null,
    jobCtx?.title ? `Role applied for: ${jobCtx.title}` : null,
    jobCtx?.requiredSkills?.length ? `Required skills: ${jobCtx.requiredSkills.slice(0, 5).join(', ')}` : null,
  ].filter(Boolean).join('\n');

  const userPrompt = `Score this interview answer across 4 dimensions (0.0–1.0).

Question: ${question.questionText}
Model answer hint: ${question.modelAnswer}
Candidate's answer: ${answerText}
${context ? `\nContext:\n${context}` : ''}

Return JSON:
{
  "relevance": 0.0,
  "clarity": 0.0,
  "depth": 0.0,
  "confidence": 0.0,
  "overallScore": 0.0,
  "feedback": [
    { "dimension": "relevance|clarity|depth|confidence", "message": "one specific observation", "severity": "high|medium|low" }
  ],
  "suggestions": ["one actionable improvement tip"]
}`;

  return chatJSON<ScoreResponse>(systemPrompt, userPrompt);
}

// ── Coaching ──────────────────────────────────────────────────────────────────

export async function coachWithAI(
  question: InterviewQuestion,
  answerText: string,
  score: ScoreResponse,
  cvCtx?: CVContext,
  jobCtx?: JobSpecContext,
  thinkTimeMs?: number,
): Promise<CoachingMessage> {
  const systemPrompt = `You are a warm, encouraging interview coach — like a guardian angel whispering advice.
Be specific, personal, and brief. Reference what the candidate actually said.
Return ONLY a valid JSON object — no markdown, no explanation.`;

  const dims: ('relevance' | 'clarity' | 'depth' | 'confidence')[] = ['relevance', 'clarity', 'depth', 'confidence'];
  const weakest = [...dims].sort((a, b) => (score[a] ?? 0) - (score[b] ?? 0))[0];

  const tone: CoachingMessage['tone'] =
    score.overallScore >= 0.70 ? 'strong'
    : (score.confidence ?? 0.55) < 0.45 ? 'delivery'
    : (score.relevance ?? 0.55) < 0.45 ? 'relevance'
    : 'encourage';

  const firstName = cvCtx?.firstName || '';
  const thinkSecs = thinkTimeMs ? Math.round(thinkTimeMs / 1000) : null;

  const context = [
    cvCtx?.experience?.[0] ? `Most recent role: ${cvCtx.experience[0].role} at ${cvCtx.experience[0].company}` : null,
    jobCtx?.title ? `Applying for: ${jobCtx.title}` : null,
  ].filter(Boolean).join('\n');

  const userPrompt = `Give brief personalised coaching after this interview answer.

Question: ${question.questionText}
Candidate's answer: ${answerText}
${thinkSecs !== null ? `Think time before answering: ${thinkSecs} seconds` : ''}

Score breakdown:
- Relevance: ${Math.round((score.relevance ?? 0) * 100)}%
- Clarity: ${Math.round((score.clarity ?? 0) * 100)}%
- Depth: ${Math.round((score.depth ?? 0) * 100)}%
- Confidence: ${Math.round((score.confidence ?? 0) * 100)}%
- Overall: ${Math.round(score.overallScore * 100)}%
- Weakest dimension: ${weakest}
${context ? `\nContext:\n${context}` : ''}

Rules:
- Tone: ${tone === 'strong' ? 'celebratory and encouraging' : tone === 'delivery' ? 'supportive, focus on delivery not content' : tone === 'relevance' ? 'redirect gently to what the role needs' : 'encouraging, push for more depth'}
- Write 2–3 short lines. Each line is a separate sentence, spoken aloud.
- Reference something SPECIFIC from their actual answer.
${firstName ? `- You may address the candidate as "${firstName}" at most once.` : ''}
- The LAST line must always be exactly: "Okay… back to your interview. You're doing great."
- Total word count: 40–70 words across all lines combined.

Return JSON:
{
  "lines": ["first coaching line.", "second coaching line.", "Okay… back to your interview. You're doing great."],
  "tone": "${tone}"
}`;

  const result = await chatJSON<{ lines: string[]; tone: string }>(systemPrompt, userPrompt);

  const lines = result.lines ?? [];
  if (!lines.at(-1)?.includes("back to your interview")) {
    lines.push("Okay… back to your interview. You're doing great.");
  }

  return {
    lines,
    fullText: lines.join(' '),
    tone: (result.tone as CoachingMessage['tone']) ?? tone,
  };
}

// ── Phase 1: Mike's script only — fast call, unblocks Mike immediately ───────

export async function generateMikeScriptOnly(params: {
  jobTitle?: string;
  companyName?: string;
  jobSpecText?: string;
  cvText?: string;
  selectedDifficulty?: string;
  selectedLanguage?: string;
  preferredName?: string;
}): Promise<string> {
  const { jobTitle, companyName, jobSpecText, cvText, selectedDifficulty, selectedLanguage, preferredName } = params;

  const difficultyFrame =
    selectedDifficulty === 'Expert'
      ? "This is an Expert-level session — tell them the panel will treat them as the leading authority in their field, and to be ready to go deep."
      : selectedDifficulty === 'Pro'
      ? "This is a Pro-level session — tell them to expect sharper, more probing questions that go beyond the basics."
      : "This is a Standard session — tell them you've put together a solid set of questions to help them perform at their best.";

  const langNote = selectedLanguage && selectedLanguage !== 'en'
    ? `\nIMPORTANT: Write the script entirely in the language with ISO code "${selectedLanguage}".`
    : '';

  const cvSnippet = cvText?.trim() ? cvText.slice(0, 800) : '';
  const jobSpecSnippet = jobSpecText?.trim() ? jobSpecText.slice(0, 400) : '';
  const nameInstruction = preferredName?.trim()
    ? `CANDIDATE NAME: "${preferredName.trim()}" — explicitly set. Use this EXACT name.`
    : cvSnippet
    ? `CANDIDATE NAME: Read the CV below and extract the candidate's first name. NEVER say "Hi there" — always use the actual name.`
    : `CANDIDATE NAME: Unknown — use "there" only as a last resort.`;

  const systemPrompt = `You are Mike, a warm and encouraging recruitment consultant at Explain.
Write a short spoken briefing for a candidate about to start their interview.
Sound natural and personal — like you genuinely know them.
No bullet points, no lists. Spoken prose only.
Return ONLY valid JSON.`;

  const userPrompt = `Write Mike's spoken briefing (70–100 words) for this candidate.${langNote}

${nameInstruction}
${cvSnippet ? `\nCANDIDATE CV (extract first name from here):\n${cvSnippet}\n` : ''}
CONTEXT:
- Job title: ${jobTitle || 'not specified'}
- Company: ${companyName || '(extract from job title or job spec if possible, otherwise omit)'}
- Difficulty level: ${difficultyFrame}
${jobSpecSnippet ? `- Job spec excerpt: ${jobSpecSnippet}` : ''}

STRUCTURE (spoken naturally as one flowing paragraph — no lists):
1. "Hi [candidate name] — I'm Mike, and I've set up today's interview for you."
2. "You're here for the [job title] position at [company name]."
3. One warm sentence about the company or role.
4. Difficulty framing (use the exact framing given above, naturally worded).
5. "You'll be meeting Sarah from HR and James, who'll be leading the role-specific questions."
6. One specific tip for this role.
7. Warm close: "You've got this. Good luck."

Return JSON: { "mikeScript": "..." }`;

  try {
    const result = await chatJSON<{ mikeScript: string }>(systemPrompt, userPrompt, 0.8);
    return result.mikeScript ?? '';
  } catch (e) {
    console.error('[Explain AI] MIKE SCRIPT — FAILED:', e);
    return '';
  }
}

// ── Client-side session prepare ───────────────────────────────────────────────

export interface MCQQuestion {
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ClientSessionResult {
  questions: InterviewQuestion[];
  sarahIntro: string;
  jamesIntro: string;
  mikeScript: string | null;
  companyFacts: string[];
  specialistTitle: string;
  mcqQuestions: MCQQuestion[];
}

export async function sessionPrepareClient(
  jobSpecText: string,
  cvText?: string,
  selectedLanguage?: string,
  jobTitle?: string,
  selectedDifficulty?: string,
  preferredName?: string,
): Promise<ClientSessionResult> {
  const cvSection = cvText?.trim()
    ? `\n\n═══ CANDIDATE CV ═══\n${cvText.slice(0, 3000)}`
    : '';

  const difficultyLabel = selectedDifficulty === 'Expert' ? 'Expert-level — we treat the candidate as the leading authority in their field'
    : selectedDifficulty === 'Pro' ? 'Pro-level — challenging questions that probe beyond the basics'
    : 'Standard — well-rounded questions to build confidence and preparation';

  const jobTitleLine = jobTitle ? `\nJob Title (explicitly confirmed by candidate): ${jobTitle}` : '';
  const difficultyLevel = selectedDifficulty || 'Standard';
  const difficultyLine = `\nSession Difficulty: ${difficultyLevel} (${difficultyLabel})`;
  const preferredNameLine = preferredName?.trim()
    ? `\nCandidate Name: "${preferredName.trim()}" — explicitly set by the candidate. Use this name in ALL spoken scripts.`
    : `\nCandidate Name: NOT explicitly set — extract the candidate's first name from the CV and use it in ALL spoken scripts.`;

  const languageOverride = selectedLanguage && selectedLanguage !== 'en'
    ? `\nIMPORTANT LANGUAGE OVERRIDE: The user has explicitly selected "${selectedLanguage}" as the interview language. Generate ALL output in that language.`
    : '';

  const systemPrompt = `You are an AI interview preparation system for a global hiring platform called Explain.
Generate a complete, personalised interview session based on the job specification and (optionally) the candidate's CV.

CRITICAL RULES:
1. DETECT THE LANGUAGE of the job specification. Generate ALL text output in THAT SAME LANGUAGE.${languageOverride}
2. NEVER assume any industry or role type. Read the job spec and base EVERYTHING on what it actually says.
3. NEVER generate IT or software engineering questions unless the job spec explicitly requires them.
4. Questions must be specific to THIS role at THIS company.
5. All spoken scripts must sound natural when read aloud. No bullet points, no lists, no asterisks.
6. Return ONLY valid JSON — no markdown, no explanation, no code fences.`;

  const sessionSeed = `${Date.now()}-${crypto.randomUUID()}`;

  const userPrompt = `Generate a complete interview session for the job specification below. Session ID: ${sessionSeed} — generate completely fresh questions every time. Never repeat or reuse questions.
${cvSection ? 'A candidate CV is also provided — use it to personalise questions and intros.' : 'No CV provided — base questions purely on the role requirements.'}

═══ SESSION CONTEXT ═══${jobTitleLine}${difficultyLine}${preferredNameLine}

═══ JOB SPECIFICATION ═══
${jobSpecText.slice(0, 4000)}${cvSection}

Return this exact JSON:
{
  "specialistTitle": "James's interviewer title — role-appropriate",
  "companyFacts": ["3 specific facts about this company or role"],
  "sarahIntro": "Sarah's spoken welcome, 50–75 words. HR Director, warm and professional. Explains the controls: Record to start, Stop when finished, Repeat to hear again, Pause if needed.",
  "jamesIntro": "James's spoken intro, 30–45 words. Direct and role-focused. Mentions the session difficulty level naturally.",
  "mcqQuestions": [
    {
      "questionText": "Hard multiple-choice question relevant to this role",
      "options": ["A. first option", "B. second option", "C. third option", "D. fourth option"],
      "correctIndex": 2,
      "explanation": "One sentence explaining why the correct answer is right"
    },
    {
      "questionText": "Second hard multiple-choice question on a different aspect",
      "options": ["A. first option", "B. second option", "C. third option", "D. fourth option"],
      "correctIndex": 1,
      "explanation": "One sentence explaining why the correct answer is right"
    }
  ],
  "questions": [
    {
      "questionId": "q1",
      "questionText": "...",
      "modelAnswer": "what a strong answer covers",
      "questionType": "Competency",
      "difficulty": "Medium",
      "source": "Role",
      "competencyTags": ["relevant tag"]
    }
  ]
}

Generate exactly 10 questions: 8 role/competency questions (source: "Role"), 2 HR/culture questions (source: "HR").
CRITICAL: The JSON must contain "mcqQuestions" (plural, an array of exactly 2 objects).`;

  type RawResult = {
    specialistTitle: string;
    companyFacts: string[];
    mikeScript: string;
    sarahIntro: string;
    jamesIntro: string;
    questions: InterviewQuestion[];
    mcqQuestions?: Array<{ questionText: string; options: string[]; correctIndex: number; explanation: string }>;
    mcqQuestion?: { questionText: string; options: string[]; correctIndex: number; explanation: string };
  };

  const result = await chatJSON<RawResult>(systemPrompt, userPrompt, 0.9);

  const rawMcqs = result.mcqQuestions?.length
    ? result.mcqQuestions
    : result.mcqQuestion ? [result.mcqQuestion] : [];

  const mcqQuestions: MCQQuestion[] = rawMcqs
    .filter(q => q?.questionText && q?.options?.length === 4)
    .map(q => ({ questionText: q.questionText, options: q.options, correctIndex: q.correctIndex ?? 0, explanation: q.explanation ?? '' }));

  return {
    questions: result.questions ?? [],
    sarahIntro: result.sarahIntro ?? '',
    jamesIntro: result.jamesIntro ?? '',
    mikeScript: result.mikeScript ?? null,
    companyFacts: result.companyFacts ?? [],
    specialistTitle: result.specialistTitle ?? 'Hiring Manager',
    mcqQuestions,
  };
}

// ── Dedicated MCQ generation ──────────────────────────────────────────────────

const MCQ_COMPETENCY_POOLS: string[] = [
  'regulatory compliance and legal obligations',
  'risk management and mitigation strategies',
  'team leadership and stakeholder communication',
  'operational efficiency and process improvement',
  'customer experience and service delivery',
  'data security and privacy requirements',
  'strategic planning and business outcomes',
  'problem-solving under pressure',
  'budget management and cost control',
  'change management and adoption',
  'quality assurance and standards',
  'cross-functional collaboration',
];

function pickTwoDistinct(pool: string[]): [string, string] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

export async function generateMCQs(
  jobSpecText: string,
  jobTitle?: string,
  cvText?: string,
): Promise<MCQQuestion[]> {
  const [focus1, focus2] = pickTwoDistinct(MCQ_COMPETENCY_POOLS);
  const callId = `${Date.now()}-${crypto.randomUUID()}`;

  const systemPrompt = `You generate hard, role-specific multiple-choice bonus questions for a live interview platform.
Each question tests genuine knowledge relevant to the role — not generic definitions.
Return ONLY valid JSON — no markdown, no explanation.`;

  const cvLine = cvText?.trim() ? `\nCandidate CV excerpt: ${cvText.slice(0, 800)}` : '';

  const userPrompt = `Generate exactly 2 multiple-choice questions for this role. Call ID: ${callId}

Role: ${jobTitle ?? 'unknown'}
Job specification (excerpt): ${jobSpecText.slice(0, 2000)}${cvLine}

STRICT RULES:
- Question 1 MUST test competency area: "${focus1}"
- Question 2 MUST test competency area: "${focus2}"
- Both questions must be hard — not obvious to someone who has never done this job
- 4 options each (prefix: "A. ", "B. ", "C. ", "D. ") — exactly one correct answer
- correctIndex: 0-based index of the correct answer — MUST vary between questions
- explanation: one sentence explaining why the correct answer is right
- Never write trick questions or "all of the above" options
- The two questions must be on completely different topics

Return JSON:
{
  "mcqQuestions": [
    { "questionText": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctIndex": 2, "explanation": "..." },
    { "questionText": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctIndex": 0, "explanation": "..." }
  ]
}`;

  try {
    const result = await chatJSON<{ mcqQuestions: Array<{ questionText: string; options: string[]; correctIndex: number; explanation: string }> }>(
      systemPrompt, userPrompt, 1.0,
    );
    return (result.mcqQuestions ?? [])
      .filter(q => q?.questionText && q?.options?.length === 4)
      .map(q => ({ questionText: q.questionText, options: q.options, correctIndex: q.correctIndex ?? 0, explanation: q.explanation ?? '' }));
  } catch {
    return [];
  }
}
