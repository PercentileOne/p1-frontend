// Real AI scoring and coaching via GPT-4o.
// Uses the same VITE_OPENAI_API_KEY already configured for Whisper STT.

import type { ScoreResponse, InterviewQuestion } from './explainApi';
import { buildCVContext, type CVContext, type CVExperience, type JobSpecContext } from '../utils/contextBuilder';
import type { CoachingMessage } from '../utils/coachingEngine';

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

export const aiScoringConfigured = !!OPENAI_KEY;

async function chatJSON<T>(systemPrompt: string, userPrompt: string, temperature = 0.3): Promise<T> {
  if (!OPENAI_KEY) throw new Error('OpenAI key not configured');

  const body = JSON.stringify({
    model: MODEL,
    temperature,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });
  const headers = { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' };

  // Retry up to 3 times on 429, honouring the Retry-After header
  for (let attempt = 0; attempt <= 3; attempt++) {
    const res = await fetch(OPENAI_URL, { method: 'POST', headers, body });
    if (res.status === 429 && attempt < 3) {
      const retryAfter = parseInt(res.headers.get('Retry-After') ?? '10', 10);
      const wait = Math.min((isNaN(retryAfter) ? 10 : retryAfter) * 1000, 30000);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
    const data = await res.json() as { choices: { message: { content: string } }[] };
    return JSON.parse(data.choices[0].message.content) as T;
  }
  throw new Error('OpenAI rate limited after retries');
}

// ── CV Parsing ────────────────────────────────────────────────────────────────

// Hybrid verification: remove any extracted tech that doesn't literally appear in the raw text.
// This eliminates hallucinated languages (Java, Go) that never appear in the CV.
function verifyTechAgainstRawText(technologies: string[], rawText: string): string[] {
  const rawLower = rawText.toLowerCase();
  return technologies.filter(tech => {
    const techLower = tech.toLowerCase();
    // Special case: "Java" is a substring of "JavaScript".
    // Only keep "Java" if it appears standalone (not only as part of "javascript").
    if (techLower === 'java') {
      const matches = [...rawLower.matchAll(/java(script)?/gi)];
      return matches.some(m => !m[1]); // true if any match has no "script" suffix
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

═══ EXTRACTION RULES ═══

NAME:
- firstName = the candidate's FIRST given name, found on the FIRST non-blank line (often after "Mr.", "Mrs.", etc. — strip the title)
- "Personal Profile", "Personal Statement", "Professional Summary", "Career Objective" = SECTION HEADINGS. NEVER extract these as names.

SUMMARY:
- summary = the full text of the candidate's personal profile / personal statement section, copied verbatim. Empty string if not found.

EXPERIENCE:
- One object per job role, most recent first, max 8 entries.
- period format: "YYYY–present" or "YYYY–YYYY". Read dates from the CV — do not invent.

SKILLS (structured, safe for display):
- Include ONLY skills explicitly listed in the CV under a skills or technology section.
- Copy exact names: "C#" not "C Sharp", "ASP.NET MVC" not "ASP.NET", "JavaScript" not "JS" or "Java".
- FORBIDDEN: Do NOT include section headings as skills. "Tools & techniques used include:" is a HEADING, not a skill.
- FORBIDDEN: Do NOT include hardware. "Pagers", "Mobile phones", "Laptops", "Credit card terminals" are NOT skills.
- FORBIDDEN: Do NOT include "Java" unless the CV literally contains the word "Java" NOT as part of "JavaScript".
- FORBIDDEN: Do NOT include "Go" unless the CV literally contains "Go" as a programming language (not "going", "good", "Agora").

ACHIEVEMENTS (strict criteria):
- MUST satisfy BOTH: (1) candidate personally did something, AND (2) measurable or named outcome.
- NOT achievements: KPIs the candidate was tracking ("Acknowledging queries on time"), app descriptions ("This app manages bank assets such as Pagers..."), task descriptions ("Bring improved usability using jQuery").
- ONLY bullets with: a number, %, £/$, a named system delivered, or an explicit business outcome.

COMPANIES:
- Only actual employer organisation names. Never technology names.

Return JSON:
{
  "firstName": "Francis",
  "lastName": "Cobbinah",
  "summary": "verbatim text of personal profile section, or empty string",
  "roles": ["most recent job title"],
  "companies": ["actual employer names only"],
  "experience": [
    { "role": "exact job title", "company": "exact employer name", "period": "YYYY–present" }
  ],
  "skills": ["C#", "ASP.NET MVC", "JavaScript", "React", "SQL Server", "Azure"],
  "achievements": ["only entries satisfying strict criteria above"],
  "certifications": ["exact certification names"],
  "education": ["BSc Computer Science, University of X, 2001"],
  "seniority": "Junior|Mid|Senior|Lead|Director|Executive|Unknown",
  "yearsOfExperience": 24
}

- skills[]: max 15, exact names only, verbatim from the CV.
- achievements[]: max 5, under 120 chars each.
- yearsOfExperience: read from CV text first ("24 years commercial experience"). Estimate from dates only as last resort.
- All arrays: [] if nothing found. Never null.`;

  console.group('[Explain AI] CV PARSE — FULL PROMPT');
  console.log('System:', systemPrompt);
  console.log('User prompt length:', userPrompt.length, 'chars');
  console.log('Raw text preview:', rawText.slice(0, 300));
  console.groupEnd();

  try {
    // Single attempt only — if rate limited, fall through to heuristic immediately
    // rather than retrying and burning budget needed for questions + intros.
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] }),
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
    const resData = await res.json() as { choices: { message: { content: string } }[] };
    const raw = JSON.parse(resData.choices[0].message.content) as Record<string, unknown>;

    console.group('[Explain AI] CV PARSE — RAW GPT RESPONSE');
    console.log(JSON.stringify(raw, null, 2));
    console.groupEnd();

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

    // Hybrid verification: filter AI-extracted skills against the raw text.
    // This eliminates any hallucinated technology that the AI made up.
    const aiSkills = arr(raw.skills);
    const verifiedSkills = verifyTechAgainstRawText(aiSkills, rawText);

    const removedSkills = aiSkills.filter(t => !verifiedSkills.includes(t));
    if (removedSkills.length > 0) {
      console.warn('[Explain AI] VERIFICATION REMOVED hallucinated skills:', removedSkills);
    }

    const ctx: CVContext = {
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

    console.group('[Explain AI] CV PARSED — VERIFIED FIELDS');
    console.log('Name:', `${ctx.firstName} ${ctx.lastName}`);
    console.log('Seniority:', ctx.seniority, '|', ctx.yearsOfExperience, 'yrs');
    console.log('Experience:', ctx.experience);
    console.log('Skills (verified):', ctx.skills);
    console.log('Achievements:', ctx.achievements);
    console.log('Certifications:', ctx.certifications);
    console.log('Summary:', ctx.summary?.slice(0, 100));
    console.groupEnd();

    return ctx;
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
1. Questions must be tailored to BOTH the role AND the company — a Barista at Starbucks is different from a Barista at Costa; a Software Engineer at NASA is different from one at a startup.
2. Order: 6 role+company-specific competency questions first (source: "Role"), then 2 HR/culture-fit questions last (source: "HR").
3. Do NOT default to "technical" questions for non-technical roles. Match the question type to what the job actually requires — speed and customer service for hospitality, safety and precision for aerospace, craft and creativity for design roles, etc.
4. Where a company has known values, culture, or ways of working (e.g. Amazon Leadership Principles, NHS patient-centred care, McDonald's QSR standards), weave those into the questions naturally.
5. Return ONLY valid JSON — no markdown, no explanation.`;

  const userPrompt = `═══ ROLE ═══
Title: ${role}
${companyLine}
${responsibilities ? `Key responsibilities: ${responsibilities}` : ''}

═══ CANDIDATE ═══
- Skills: ${skills || 'not specified'}
- Recent experience: ${experience || 'not specified'}
- Notable achievement: ${achievement || 'not specified'}
- Years of experience: ${cvCtx.yearsOfExperience ?? 'unknown'}

${company ? `Generate questions that would genuinely differentiate a strong candidate for ${role} at ${company} specifically — not generic questions that could apply to any ${role} anywhere.` : `Generate questions that would differentiate a strong ${role} candidate.`}

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

  console.log('[Explain AI] SCORING Q:', question.questionText.slice(0, 60));
  const score = await chatJSON<ScoreResponse>(systemPrompt, userPrompt);
  console.group('[Explain AI] SCORE RECEIVED');
  console.log(`Overall: ${Math.round(score.overallScore * 100)}% | Relevance: ${Math.round((score.relevance ?? 0) * 100)}% | Clarity: ${Math.round((score.clarity ?? 0) * 100)}% | Depth: ${Math.round((score.depth ?? 0) * 100)}% | Confidence: ${Math.round((score.confidence ?? 0) * 100)}%`);
  console.groupEnd();
  return score;
}

// ── Interviewer intros ────────────────────────────────────────────────────────

export async function generateIntros(
  cvCtx: CVContext,
  jobCtx: JobSpecContext,
): Promise<{ sarahIntro: string; jamesIntro: string }> {
  const systemPrompt = `You are writing natural, varied spoken dialogue for two AI interviewers.
Sarah Mitchell is the HR Director — warm, professional, observant about people and culture.
James Okafor is the specialist interviewer — direct, curious, focused on role competencies and how the candidate performs in practice.
Each session should sound slightly different — vary sentence structure, word choice, and what details they pick up on.

STRICT MODE — ZERO HALLUCINATION POLICY:
- Reference ONLY facts explicitly listed in the candidate profile below.
- Do NOT mention any programming language, technology, tool, framework, or hardware — not even ones implied by job titles.
- Do NOT infer, paraphrase, or invent any company name, achievement, or technology.
- If a field is not listed below, skip it silently.

Return ONLY valid JSON.`;

  // SAFE DATA ONLY: role/company/period cannot contain section headings or hardware lists.
  // achievements[] and technologies[] are excluded — heuristic parser contaminates them.
  const expLines = (cvCtx.experience ?? []).slice(0, 4)
    .map(e => `  ${e.role} at ${e.company} (${e.period})`).join('\n');

  const cvSummary = [
    cvCtx.firstName ? `Candidate first name: ${cvCtx.firstName}` : null,
    cvCtx.roles[0] ? `Most recent title: ${cvCtx.roles[0]}` : null,
    cvCtx.yearsOfExperience ? `Total experience: ${cvCtx.yearsOfExperience} years` : null,
    expLines ? `Work history:\n${expLines}` : null,
  ].filter(Boolean).join('\n');

  // Job summary: title, company, and industry sector for context
  const jobSummary = [
    `Role: ${jobCtx.title}`,
    jobCtx.company ? `Company: ${jobCtx.company}` : null,
    jobCtx.industry ? `Industry/sector: ${jobCtx.industry}` : null,
  ].filter(Boolean).join('\n');

  const firstName = cvCtx.firstName || 'there';

  const styles = ['warm and encouraging', 'direct and professional', 'curious and engaged', 'brisk and businesslike'];
  const chosenStyle = styles[Math.floor(Math.random() * styles.length)];

  const userPrompt = `Write natural spoken intros for Sarah and James for this interview session. Session style this time: ${chosenStyle}.

═══ CANDIDATE PROFILE (use ONLY these facts) ═══
${cvSummary}

═══ ROLE BEING INTERVIEWED FOR ═══
${jobSummary}

═══ RULES ═══
- Sarah goes first. Address candidate by first name (${firstName}) once. Welcome them, briefly explain the format (click record, speak, click stop, get feedback), mention ONE specific fact from their work history above, then say "Let's begin."
- James goes second (starts with "Thanks Sarah." or similar). Address candidate by first name once. Mention ONE specific fact from their work history (a role title, a company name, or their career span) — NEVER mention any technology, programming language, or tool. Say what he'll focus on — frame it around the role competencies, not "technical questions" specifically.
- Each intro: 3–5 sentences, natural spoken pace, no bullet points, no em dashes.
- Vary the opening — Sarah should NOT always start with "Welcome". Use "Great to have you here", "Thanks for joining us", "Good to meet you", etc.
- Sound like real humans. Different each session.
- Keep each intro under 80 words.
- CRITICAL: Do NOT reference any technology, tool, language, or framework — not in Sarah's intro, not in James's intro.

Return JSON:
{
  "sarahIntro": "...",
  "jamesIntro": "..."
}`;

  console.group('[Explain AI] INTRO GENERATION — FULL PROMPT');
  console.log('CV summary sent to GPT:\n', cvSummary);
  console.log('Job summary sent to GPT:\n', jobSummary);
  console.log('Style this session:', chosenStyle);
  console.log('Full user prompt:\n', userPrompt);
  console.groupEnd();

  const result = await chatJSON<{ sarahIntro: string; jamesIntro: string }>(systemPrompt, userPrompt, 0.9);

  console.group('[Explain AI] INTROS GENERATED');
  console.log('Sarah:', result.sarahIntro);
  console.log('James:', result.jamesIntro);
  console.groupEnd();

  return result;
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

  const recentCompany = cvCtx?.experience?.[0]?.company ?? cvCtx?.companies?.[0];
  const context = [
    recentCompany ? `Candidate has worked at: ${recentCompany}` : null,
    cvCtx?.experience?.[0] ? `Most recent role: ${cvCtx.experience[0].role} at ${cvCtx.experience[0].company}` : null,
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

  const coaching: CoachingMessage = {
    lines,
    fullText: lines.join(' '),
    tone: (result.tone as CoachingMessage['tone']) ?? tone,
  };

  console.group('[Explain AI] COACHING GENERATED');
  console.log('Tone:', coaching.tone);
  console.log('Lines:', coaching.lines);
  console.groupEnd();

  return coaching;
}

// ── Client feedback generation ────────────────────────────────────────────────

import type { FeedbackOutcome } from '../utils/clientSession';

export async function generateFeedbackWithAI(params: {
  candidateName: string;
  role: string;
  company?: string;
  industry?: string;
  cvCtx: CVContext;
  outcome: FeedbackOutcome;
  improvementAreas: string[];
  clientNotes: string;
}): Promise<string> {
  const { candidateName, role, company, industry, cvCtx, outcome, improvementAreas, clientNotes } = params;

  const outcomeLabel =
    outcome === 'pass' ? 'successful — the candidate is being progressed'
    : outcome === 'door-open' ? 'on hold — the candidate is not being progressed at this time but may be reconsidered'
    : 'unsuccessful — the candidate will not be progressed';

  const experience = cvCtx.experience?.slice(0, 2).map(e => `${e.role} at ${e.company}`).join(', ')
    ?? cvCtx.roles.slice(0, 2).join(', ');

  const systemPrompt = `You are a professional recruitment consultant writing candidate interview feedback on behalf of a client.
Your feedback must be:
- Kind, professional, and constructive — never harsh or personal
- Specific to the role, company, and the candidate's background
- Actionable — give the candidate something useful to work on
- Written as if being sent directly to the candidate from the recruiter
- 3 paragraphs: (1) opening with outcome, (2) strengths observed, (3) areas to develop
- 150–220 words total
- Never mention scores, percentages, or internal ratings
- Use warm but professional language — this is a real person reading this`;

  const userPrompt = `Write interview feedback for the following:

Candidate: ${candidateName}
Background: ${experience || 'not specified'}
Role interviewed for: ${role}${company ? ` at ${company}` : ''}${industry ? ` (${industry})` : ''}
Outcome: ${outcomeLabel}
Areas to develop: ${improvementAreas.length > 0 ? improvementAreas.join(', ') : 'none specified'}
${clientNotes ? `Additional notes from the interviewer: ${clientNotes}` : ''}

Write the feedback as three clear paragraphs. Open the first paragraph with a warm acknowledgement of the interview and state the outcome clearly but kindly. The second paragraph should highlight genuine strengths (infer from their background and the role). The third paragraph should give specific, constructive development suggestions based on the areas listed${outcome === 'pass' ? ' — even successful candidates benefit from knowing what to keep developing' : ''}.`;

  const raw = await chatJSON<{ feedback: string }>(
    systemPrompt,
    `Return JSON: { "feedback": "..." }\n\n${userPrompt}`,
    0.7,
  );

  return raw.feedback ?? '';
}

// ── Agent Briefing (Mike) ─────────────────────────────────────────────────────

export interface AgentBriefingResult {
  mikeScript: string;          // What Mike says out loud
  companyFacts: string[];      // 3-4 key facts Mike mentions (used to score company knowledge answers)
  companyQuestions: InterviewQuestion[]; // 2 questions that test what Mike told them
}

export async function generateAgentBriefing(
  cvCtx: CVContext,
  jobCtx: JobSpecContext,
): Promise<AgentBriefingResult> {
  const systemPrompt = `You are Mike, a friendly and professional interview preparation consultant at Explain.
You brief candidates before their interview — giving them a personalised overview of the company and role so they walk in prepared.
Your tone is warm, encouraging, and concise. You speak naturally — no bullet points, no lists out loud.
You always mention 3-4 specific company facts (culture, size, mission, recent news, or values) that the interviewers are likely to probe on.
After the briefing, you generate 2 interview questions that test whether the candidate absorbed those facts.`;

  const jobSummary = [
    `Role: ${jobCtx.title}`,
    jobCtx.company ? `Company: ${jobCtx.company}` : null,
    jobCtx.industry ? `Industry: ${jobCtx.industry}` : null,
    jobCtx.rawText ? `Job description excerpt: ${jobCtx.rawText.slice(0, 400)}` : null,
  ].filter(Boolean).join('\n');

  const firstName = cvCtx.firstName || 'there';

  const userPrompt = `Generate Mike's pre-interview briefing for ${firstName}, who is interviewing for: ${jobCtx.title}${jobCtx.company ? ` at ${jobCtx.company}` : ''}.

Job context:
${jobSummary}

Mike's briefing should:
- Open with: "Hi ${firstName}, I'm Mike — I've set up today's interview for you."
- Mention the company name, what they do, their size/culture, and 1-2 things they're known for or proud of
- Briefly explain the interview format (two interviewers, Sarah and James)
- Give 1-2 quick tips based on the role
- Close warmly and wish them luck
- Be 60-90 words total — spoken naturally, no lists

Then generate exactly 2 company knowledge questions the interviewers might ask, with model answers that reference the specific facts you mentioned.

Return JSON:
{
  "mikeScript": "...",
  "companyFacts": ["fact1", "fact2", "fact3"],
  "companyQuestions": [
    {
      "questionId": "cq1",
      "questionText": "...",
      "modelAnswer": "...",
      "questionType": "Company Knowledge",
      "difficulty": "Easy",
      "source": "HR",
      "competencyTags": ["research", "motivation"]
    },
    {
      "questionId": "cq2",
      "questionText": "...",
      "modelAnswer": "...",
      "questionType": "Company Knowledge",
      "difficulty": "Easy",
      "source": "HR",
      "competencyTags": ["research", "motivation"]
    }
  ]
}`;

  return chatJSON<AgentBriefingResult>(systemPrompt, userPrompt, 0.8);
}

// ── Client-side session prepare ───────────────────────────────────────────────
// Single AI call — no regex, no English keyword lists.
// Works for any role, industry, language, or country worldwide.

export interface ClientSessionResult {
  questions: InterviewQuestion[];
  sarahIntro: string;
  jamesIntro: string;
  mikeScript: string | null;
  companyFacts: string[];
  specialistTitle: string;
}

export async function sessionPrepareClient(
  jobSpecText: string,
  cvText?: string,
  selectedLanguage?: string,
): Promise<ClientSessionResult> {
  const cvSection = cvText?.trim()
    ? `\n\n═══ CANDIDATE CV ═══\n${cvText.slice(0, 3000)}`
    : '';

  const languageOverride = selectedLanguage && selectedLanguage !== 'en'
    ? `\nIMPORTANT LANGUAGE OVERRIDE: The user has explicitly selected "${selectedLanguage}" as the interview language. Generate ALL output in that language regardless of the job spec language.`
    : '';

  const systemPrompt = `You are an AI interview preparation system for a global hiring platform called Explain.
Generate a complete, personalised interview session based on the job specification and (optionally) the candidate's CV.

CRITICAL RULES — READ CAREFULLY:
1. DETECT THE LANGUAGE of the job specification. Generate ALL text output (questions, scripts, intros) in THAT SAME LANGUAGE. A French job spec → French output. A Spanish job spec → Spanish output.${languageOverride}
2. NEVER assume any industry or role type. Read the job spec and base EVERYTHING on what it actually says.
3. NEVER generate IT or software engineering questions unless the job spec explicitly requires them. A barista needs questions about coffee craft and customer service. A nurse needs questions about patient care and clinical judgement. A lorry driver needs questions about road safety and logistics.
4. Questions must be specific to THIS role at THIS company — not generic questions that could fit any employer.
5. All spoken scripts (Mike, Sarah, James) must sound natural when read aloud. No bullet points, no lists, no asterisks.
6. Return ONLY valid JSON — no markdown, no explanation, no code fences.`;

  const userPrompt = `Generate a complete interview session for the job specification below.
${cvSection ? 'A candidate CV is also provided — use it to personalise questions and intros.' : 'No CV provided — base questions purely on the role requirements.'}

═══ JOB SPECIFICATION ═══
${jobSpecText.slice(0, 4000)}${cvSection}

Return this exact JSON:
{
  "language": "ISO 639-1 code (e.g. en, fr, de, es, pt, nl, pl, ar, zh)",
  "jobTitle": "job title from the spec",
  "company": "company name, or null if not mentioned",
  "country": "country or region this role is based in",
  "industry": "industry sector (e.g. Fast Food, Healthcare, Construction, Finance, Education)",
  "specialistTitle": "James's interviewer title — role-appropriate, e.g. 'Restaurant Manager' for hospitality, 'Ward Sister' for nursing, 'Site Foreman' for construction, 'Finance Director' for accounting. NEVER use 'Technical Lead' unless the role is genuinely technical.",
  "companyFacts": ["3 specific facts about this company or role the candidate should know before walking in"],
  "mikeScript": "Mike's spoken briefing, 60–90 words. Warm, encouraging recruitment consultant. Opens with: Hi [first name if CV provided, else 'there'] — I'm Mike, and I've set up today's interview for you. Covers: company name and what they do, something specific about their culture or values, the interview format (two interviewers, Sarah and James), one practical tip for this specific role, warm close wishing them luck.",
  "sarahIntro": "Sarah's spoken welcome, 40–60 words. HR Director, warm and professional. Introduces herself by name, briefly mentions James will be joining her, sets a positive tone, tells the candidate to take their time.",
  "jamesIntro": "James's spoken intro, 20–30 words. Direct and role-focused. Introduces himself and what he'll be focusing on in the interview.",
  "questions": [
    {
      "questionId": "q1",
      "questionText": "...",
      "modelAnswer": "what a strong answer covers — specific to this role",
      "questionType": "Competency",
      "difficulty": "Medium",
      "source": "Role",
      "competencyTags": ["relevant tag"]
    }
  ]
}

Generate exactly 7 questions total:
- 5 role/competency questions (source: "Role") — based on what this job actually requires day-to-day
- 2 HR/culture questions (source: "HR") — the last one must ask what the candidate knows about the company and why this role appeals to them specifically`;

  type RawResult = {
    language: string;
    jobTitle: string;
    company: string | null;
    country: string;
    industry: string;
    specialistTitle: string;
    companyFacts: string[];
    mikeScript: string;
    sarahIntro: string;
    jamesIntro: string;
    questions: InterviewQuestion[];
  };

  const result = await chatJSON<RawResult>(systemPrompt, userPrompt, 0.7);

  return {
    questions: result.questions ?? [],
    sarahIntro: result.sarahIntro ?? '',
    jamesIntro: result.jamesIntro ?? '',
    mikeScript: result.mikeScript ?? null,
    companyFacts: result.companyFacts ?? [],
    specialistTitle: result.specialistTitle ?? 'Hiring Manager',
  };
}
