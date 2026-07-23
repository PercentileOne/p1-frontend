// Real AI scoring and coaching via GPT-4o.
// Uses the same VITE_OPENAI_API_KEY already configured for Whisper STT.

import type { ScoreResponse, InterviewQuestion } from './explainApi';
import { buildCVContext, type CVContext, type JobSpecContext } from '../utils/contextBuilder';
import type { CoachingMessage } from '../utils/coachingEngine';

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o';

export const aiScoringConfigured = !!OPENAI_KEY;

async function chatJSON<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  if (!OPENAI_KEY) throw new Error('OpenAI key not configured');

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
  const data = await res.json() as { choices: { message: { content: string } }[] };
  return JSON.parse(data.choices[0].message.content) as T;
}

// ── CV Parsing ────────────────────────────────────────────────────────────────

export async function parseCVWithAI(rawText: string): Promise<CVContext> {
  const systemPrompt = `You are a precise CV parser. Extract structured data from the CV text.
Return ONLY valid JSON — no markdown, no explanation.

CRITICAL RULES for companies[]:
- Only include the names of organisations the candidate was EMPLOYED BY (actual employers).
- NEVER include: software frameworks, programming languages, tools, products (e.g. "React", ".NET", "Azure", "Microsoft Office", "Visual Basic", "Visual Studio", "SQL Server").
- If "Microsoft" appears as an employer they worked at, include it. If it appears as a technology, exclude it.
- Same rule applies to all technology product names regardless of brand.`;

  const userPrompt = `Parse this CV and return a JSON object with these fields:

CV text:
"""
${rawText.slice(0, 6000)}
"""

Return JSON:
{
  "firstName": "candidate first name or empty string",
  "lastName": "candidate last name or empty string",
  "roles": ["most recent job title", "second most recent", ...],
  "companies": ["employer name only — actual companies worked FOR, never tech names"],
  "technologies": ["React", "C#", ".NET", "Azure", ...],
  "achievements": ["only achievements with measurable outcomes, numbers, or named results"],
  "certifications": ["AWS Certified", "PMP", ...],
  "responsibilities": ["key responsibility phrase", ...],
  "seniority": "Junior|Mid|Senior|Lead|Director|Executive|Unknown",
  "yearsOfExperience": 0,
  "education": ["BSc Computer Science, UCL", ...],
  "softSkills": ["leadership", "communication", ...]
}

Rules:
- technologies[]: clean canonical names only ("C#" not "C# programming", "Azure" not "Microsoft Azure cloud")
- achievements[]: trim to under 100 chars each, include only ones with numbers, %, £, $, or named outcomes
- responsibilities[]: short phrases, max 6 items
- yearsOfExperience: integer, estimate from dates if not stated explicitly
- All arrays: empty array [] if nothing found, never null`;

  try {
    const raw = await chatJSON<Record<string, unknown>>(systemPrompt, userPrompt);
    const str = (v: unknown) => (typeof v === 'string' ? v : '');
    const arr = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    const num = (v: unknown): number | undefined =>
      typeof v === 'number' && v > 0 ? v : undefined;

    const firstName = str(raw.firstName);
    const lastName = str(raw.lastName);

    return {
      rawText,
      firstName,
      lastName,
      candidateName: firstName && lastName ? `${firstName} ${lastName}` : undefined,
      roles: arr(raw.roles),
      companies: arr(raw.companies),
      dates: [],
      technologies: arr(raw.technologies),
      skills: [...arr(raw.technologies), ...arr(raw.softSkills)].slice(0, 10),
      achievements: arr(raw.achievements),
      certifications: arr(raw.certifications),
      responsibilities: arr(raw.responsibilities),
      leadershipSignals: [],
      seniority: (['Junior','Mid','Senior','Lead','Director','Executive'].includes(str(raw.seniority))
        ? str(raw.seniority) : 'Unknown') as CVContext['seniority'],
      yearsOfExperience: num(raw.yearsOfExperience),
    };
  } catch {
    return buildCVContext(rawText);
  }
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
    cvCtx?.technologies?.length ? `Candidate tech: ${cvCtx.technologies.slice(0, 5).join(', ')}` : null,
    jobCtx?.title ? `Role applied for: ${jobCtx.title}` : null,
    jobCtx?.requiredSkills?.length ? `Required skills: ${jobCtx.requiredSkills.slice(0, 5).join(', ')}` : null,
  ].filter(Boolean).join('\n');

  const userPrompt = `Score this interview answer across 4 dimensions (0.0–1.0).

Question: ${question.questionText}
Model answer hint: ${question.modelAnswer}
Candidate's answer: ${answerText}
${context ? `\nContext:\n${context}` : ''}

Scoring guide:
- relevance: does it directly address what was asked and match the role requirements?
- clarity: is it well-structured, easy to follow, and articulate?
- depth: are there specific examples, metrics, or outcomes — not just generalities?
- confidence: does the language sound assured, or is it hedged with "maybe", "I think", "kind of"?
- overallScore: weighted average (relevance 35%, clarity 25%, depth 25%, confidence 15%)

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

// ── Interviewer intros ────────────────────────────────────────────────────────

export async function generateIntros(
  cvCtx: CVContext,
  jobCtx: JobSpecContext,
): Promise<{ sarahIntro: string; jamesIntro: string }> {
  const systemPrompt = `You are writing natural, varied spoken dialogue for two AI interviewers.
Sarah Mitchell is the HR Director — warm, professional, observant about people and culture.
James Okafor is the Technical Lead — direct, curious, focused on systems and problem-solving.
Each session should sound slightly different — vary sentence structure, word choice, and what details they pick up on.
Return ONLY valid JSON.`;

  const cvSummary = [
    cvCtx.roles[0] ? `Most recent role: ${cvCtx.roles[0]}` : null,
    cvCtx.companies.length ? `Companies: ${cvCtx.companies.slice(0, 3).join(', ')}` : null,
    cvCtx.technologies.length ? `Technologies: ${cvCtx.technologies.slice(0, 4).join(', ')}` : null,
    cvCtx.achievements[0] ? `Achievement: ${cvCtx.achievements[0].slice(0, 80)}` : null,
    cvCtx.yearsOfExperience ? `Years of experience: ${cvCtx.yearsOfExperience}` : null,
  ].filter(Boolean).join('\n');

  const jobSummary = [
    `Role: ${jobCtx.title}`,
    jobCtx.company ? `Company: ${jobCtx.company}` : null,
    jobCtx.requiredSkills.length ? `Key skills needed: ${jobCtx.requiredSkills.slice(0, 4).join(', ')}` : null,
    jobCtx.responsibilities[0] ? `Main responsibility: ${jobCtx.responsibilities[0].slice(0, 80)}` : null,
  ].filter(Boolean).join('\n');

  const firstName = cvCtx.firstName || 'there';

  const userPrompt = `Write natural spoken intros for Sarah and James for this interview session.

Candidate profile:
${cvSummary}

Role being interviewed for:
${jobSummary}

Rules:
- Sarah goes first. Address the candidate by first name (${firstName}) once. Welcome them, briefly explain the format (click record, speak, click stop, get feedback), mention ONE specific thing noticed in their background, then say "Let's begin."
- James goes second (starts with "Thanks Sarah." or similar). Address candidate by first name once. Mention a specific technology or achievement from their CV, say what he'll focus on.
- Each intro: 3–5 sentences, natural spoken pace, no bullet points, no em dashes.
- Vary the opening — Sarah should NOT always start with "Welcome". Use "Great to have you here", "Thanks for joining us", "Good to meet you", etc.
- Sound like real humans. Different each session.
- Keep each intro under 80 words.

Return JSON:
{
  "sarahIntro": "...",
  "jamesIntro": "..."
}`;

  return chatJSON<{ sarahIntro: string; jamesIntro: string }>(systemPrompt, userPrompt);
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
    cvCtx?.companies?.[0] ? `Candidate has worked at: ${cvCtx.companies[0]}` : null,
    cvCtx?.achievements?.[0] ? `Notable achievement: ${cvCtx.achievements[0].slice(0, 80)}` : null,
    jobCtx?.title ? `Applying for: ${jobCtx.title}` : null,
    jobCtx?.requiredSkills?.[0] ? `Key requirement: ${jobCtx.requiredSkills[0]}` : null,
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
- Reference something SPECIFIC from their actual answer (a word, phrase, or topic they mentioned).
${firstName ? `- You may address the candidate as "${firstName}" (first name only) at most once.` : ''}
${thinkSecs !== null && thinkSecs > 30 ? `- The candidate took ${thinkSecs} seconds before answering. Gently mention that in a real interview, aim to start within 5-10 seconds.` : ''}
- The LAST line must always be exactly: "Okay… back to your interview. You're doing great."
- Total word count: 40–70 words across all lines combined.
- Do NOT start with "Great answer" or generic praise unless overall >= 70%.
- ONLY reference things the candidate actually said in their answer. Never invent company names or facts.

Return JSON:
{
  "lines": ["first coaching line.", "second coaching line.", "Okay… back to your interview. You're doing great."],
  "tone": "${tone}"
}`;

  const result = await chatJSON<{ lines: string[]; tone: string }>(systemPrompt, userPrompt);

  // Ensure the sign-off line is always present
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
