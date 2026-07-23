// Real AI scoring and coaching via GPT-4o.
// Uses the same VITE_OPENAI_API_KEY already configured for Whisper STT.

import type { ScoreResponse, InterviewQuestion } from './explainApi';
import { buildCVContext, type CVContext, type CVExperience, type JobSpecContext } from '../utils/contextBuilder';
import type { CoachingMessage } from '../utils/coachingEngine';

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o';

export const aiScoringConfigured = !!OPENAI_KEY;

async function chatJSON<T>(systemPrompt: string, userPrompt: string, temperature = 0.3): Promise<T> {
  if (!OPENAI_KEY) throw new Error('OpenAI key not configured');

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature,
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
    const raw = await chatJSON<Record<string, unknown>>(systemPrompt, userPrompt, 0);

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
James Okafor is the Technical Lead — direct, curious, focused on systems and problem-solving.
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

  // Job summary: title and company only — no responsibility slice that could truncate mid-word
  const jobSummary = [
    `Role: ${jobCtx.title}`,
    jobCtx.company ? `Company: ${jobCtx.company}` : null,
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
- James goes second (starts with "Thanks Sarah." or similar). Address candidate by first name once. Mention ONE specific fact from their work history (a role title, a company name, or their career span) — NEVER mention any technology, programming language, or tool. Say what he'll focus on in the technical questions.
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
