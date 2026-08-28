// Real AI scoring and coaching via GPT-4o.
// Uses the same VITE_OPENAI_API_KEY already configured for Whisper STT.

import type { ScoreResponse, InterviewQuestion } from './explainApi';
import { buildCVContext, type CVContext, type CVExperience, type JobSpecContext } from '../utils/contextBuilder';
import type { CoachingMessage } from '../utils/coachingEngine';

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';
const MODEL = 'gpt-4o-mini';

// AI is always available — calls go through the .NET backend's /api/ai-proxy endpoint
// which holds the key securely and avoids browser CORS issues.
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

  // Retry up to 3 times on 429
  for (let attempt = 0; attempt <= 3; attempt++) {
    const res = await fetch(`${API_BASE}/api/ai-proxy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
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
    const res = await fetch(`${API_BASE}/api/ai-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] }),
    });
    if (!res.ok) throw new Error(`AI proxy error ${res.status}`);
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
  goDeeper?: { enabled: boolean; difficulty: string },
  selectedLanguage?: string,
): Promise<ScoreResponse> {
  const goDeeperOn = goDeeper?.enabled === true;
  const aggression = goDeeper?.difficulty === 'Expert'
    ? 'Be genuinely probing — the kind of question that exposes someone who oversold their experience. Ask for a specific tool, number, or exact step they personally performed.'
    : goDeeper?.difficulty === 'Pro'
    ? 'Probe firmly but fairly — ask for one concrete specific the answer glossed over.'
    : 'Probe gently — ask for one clarifying specific, in a friendly way.';

  // Explicit and unconditional (including for English) — this prompt previously had NO
  // language instruction at all, for any output field. feedback[].message, suggestions, and
  // (when Go Deeper fires) followUpQuestion are all free text the model generates fresh each
  // call, with nothing anchoring it to the candidate's actual session language — it just
  // followed whatever language felt contextually natural, which was usually English (matching
  // the question/answer text it was given) but not reliably so. This is what let one Go Deeper
  // follow-up come back in French mid-session despite every other question being English.
  const languageNote = `\nWrite all text output (feedback messages, suggestions, and the follow-up question if any) in the language the candidate selected in the UI — ISO code "${selectedLanguage || 'en'}" — regardless of what language the question or answer text above happens to be in.`;

  const systemPrompt = `You are an expert interview coach scoring candidate answers.${goDeeperOn ? `
You are ALSO deciding, in the same pass, whether this answer needs a genuine spoken follow-up question — the kind a real interviewer asks when an answer sounds high-level, generic, or unverifiable (e.g. someone claims "agile experience at a big bank" but can't say what sprint ceremonies they actually ran). ${aggression} If the answer already contains genuine specifics (named tools, numbers, a clear personal role, a real outcome), do NOT request a follow-up.` : ''}${languageNote}
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
${goDeeperOn ? `
Also decide: does this answer warrant a probing follow-up (see system prompt)? If yes, write ONE natural, spoken follow-up question — one or two sentences, conversational, no bullet points, no em dashes, going straight to the probe (don't repeat the original question or restate what they said).` : ''}

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
  "suggestions": ["one actionable improvement tip"]${goDeeperOn ? `,
  "needsFollowUp": false,
  "followUpQuestion": null` : ''}
}`;

  console.log('[Explain AI] SCORING Q:', question.questionText.slice(0, 60));
  const score = await chatJSON<ScoreResponse>(systemPrompt, userPrompt);
  console.group('[Explain AI] SCORE RECEIVED');
  console.log(`Overall: ${Math.round(score.overallScore * 100)}% | Relevance: ${Math.round((score.relevance ?? 0) * 100)}% | Clarity: ${Math.round((score.clarity ?? 0) * 100)}% | Depth: ${Math.round((score.depth ?? 0) * 100)}% | Confidence: ${Math.round((score.confidence ?? 0) * 100)}%`);
  if (goDeeperOn) console.log(`Go Deeper: needsFollowUp=${score.needsFollowUp} — ${score.followUpQuestion ?? '(none)'}`);
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
James Jacobs is the specialist interviewer — direct, curious, focused on role competencies and how the candidate performs in practice.
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
- Sarah goes first. Address candidate by first name (${firstName}) once. Welcome them warmly, then explain the controls naturally: click Record to start answering, click Stop when finished, and they can use Repeat to hear a question again or Pause if they need a moment. Mention ONE specific fact from their work history above, then say "Let's begin."
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
  selectedLanguage?: string,
): Promise<CoachingMessage> {
  // Same gap as scoreWithAI/sessionPrepareClient — see those for the fuller story. This
  // message is shown directly to the candidate after every answer, so it's exactly the kind
  // of output that must respect their selected session language, not whatever the model
  // infers from the question/answer text.
  const languageNote = `\nWrite this message in the language the candidate selected in the UI — ISO code "${selectedLanguage || 'en'}" — regardless of what language the question or answer text below happens to be in.`;

  const systemPrompt = `You are a warm, encouraging interview coach — like a guardian angel whispering advice.
Be specific, personal, and brief. Reference what the candidate actually said.${languageNote}
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

  // Always explicit, including for English — leaving this blank for the 'en' case let the
  // model fall back to whatever language felt natural given the job spec/CV text, which
  // occasionally meant generating the whole script in a different language even though the
  // candidate picked English in the UI. The candidate's own selection must always win.
  const langNote = `\nIMPORTANT: Write the script entirely in the language the candidate selected in the UI — ISO code "${selectedLanguage || 'en'}", regardless of what language the job spec or CV text happens to be written in.`;

  const cvSnippet = cvText?.trim() ? cvText.slice(0, 800) : '';
  const jobSpecSnippet = jobSpecText?.trim() ? jobSpecText.slice(0, 400) : '';
  const nameInstruction = preferredName?.trim()
    ? `CANDIDATE NAME: "${preferredName.trim()}" — explicitly set. Use this EXACT name. Do NOT use any other name.`
    : cvSnippet
    ? `CANDIDATE NAME: Read the CV below and extract the candidate's first name. Use it in the opening greeting. NEVER say "Hi there" — always use the actual name.`
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

  console.group('[Explain AI] MIKE SCRIPT — INPUT');
  console.log('jobTitle:', jobTitle ?? '(none)');
  console.log('companyName:', companyName ?? '(none)');
  console.log('selectedDifficulty:', selectedDifficulty ?? '(none)');
  console.log('selectedLanguage:', selectedLanguage ?? '(none)');
  console.log('cvText length:', cvText?.length ?? 0, 'chars');
  console.log('cvSnippet sent:', cvSnippet || '(empty — no CV provided)');
  console.groupEnd();

  try {
    const result = await chatJSON<{ mikeScript: string }>(systemPrompt, userPrompt, 0.8);
    console.group('[Explain AI] MIKE SCRIPT — OUTPUT');
    console.log(result.mikeScript);
    console.groupEnd();
    return result.mikeScript ?? '';
  } catch (e) {
    console.error('[Explain AI] MIKE SCRIPT — FAILED:', e);
    return '';
  }
}

// ── Client-side session prepare ───────────────────────────────────────────────
// Single AI call — no regex, no English keyword lists.
// Works for any role, industry, language, or country worldwide.

export interface MCQQuestion {
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic?: string; // competency area this MCQ tests — drives the "Study X" link when answered wrong
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
  questionCount?: number,
): Promise<ClientSessionResult> {
  // 4:1 role-to-HR split, same ratio as the original fixed 8+2 — the last HR question is
  // always "what do you know about the company", every other slot is role/competency.
  const totalQuestions = questionCount && [5, 10, 15, 20].includes(questionCount) ? questionCount : 10;
  const hrQuestionCount = Math.max(1, Math.round(totalQuestions / 5));
  const roleQuestionCount = totalQuestions - hrQuestionCount;
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
    ? `\nCandidate Name: "${preferredName.trim()}" — explicitly set by the candidate. Use this name in ALL spoken scripts (Mike, Sarah, James). Do NOT use any other name.`
    : `\nCandidate Name: NOT explicitly set — you MUST extract the candidate's first name from the CV and use it in ALL spoken scripts (Mike, Sarah, James). NEVER say "there" or omit the name when a CV is provided.`;

  // Always explicit, including for English — rule 1 below tells the model to detect language
  // from the job spec, and with no override for the 'en' case that rule ran unconstrained: if
  // the job spec/CV text happened to contain another language, the whole session (questions,
  // scripts, everything) could come back in that language despite the candidate having picked
  // English in the UI. The candidate's own explicit selection must always take priority.
  const languageOverride = `\nIMPORTANT LANGUAGE OVERRIDE: The candidate has explicitly selected "${selectedLanguage || 'en'}" as the interview language in the UI. Generate ALL output in that language (ISO code "${selectedLanguage || 'en'}"), regardless of what language the job spec or CV text is written in — this explicit selection always overrides rule 1's "detect from job spec" instruction below.`;

  const systemPrompt = `You are an AI interview preparation system for a global hiring platform called Explain.
Generate a complete, personalised interview session based on the job specification and (optionally) the candidate's CV.

CRITICAL RULES — READ CAREFULLY:
1. DETECT THE LANGUAGE of the job specification. Generate ALL text output (questions, scripts, intros) in THAT SAME LANGUAGE. A French job spec → French output. A Spanish job spec → Spanish output.${languageOverride}
2. NEVER assume any industry or role type. Read the job spec and base EVERYTHING on what it actually says.
3. NEVER generate IT or software engineering questions unless the job spec explicitly requires them. A barista needs questions about coffee craft and customer service. A nurse needs questions about patient care and clinical judgement. A lorry driver needs questions about road safety and logistics.
4. Questions must be specific to THIS role at THIS company — not generic questions that could fit any employer.
5. All spoken scripts (Mike, Sarah, James) must sound natural when read aloud. No bullet points, no lists, no asterisks.
6. Return ONLY valid JSON — no markdown, no explanation, no code fences.`;

  const sessionSeed = `${Date.now()}-${crypto.randomUUID()}`; // unique per session — never reuse

  const userPrompt = `Generate a complete interview session for the job specification below. Session ID: ${sessionSeed} — this is unique to this session. You MUST generate completely fresh questions every time. Never repeat or reuse questions from any prior generation. Vary question wording, angle, and which competencies you probe.
${cvSection ? 'A candidate CV is also provided — use it to personalise questions and intros.' : 'No CV provided — base questions purely on the role requirements.'}

═══ SESSION CONTEXT ═══${jobTitleLine}${difficultyLine}${preferredNameLine}

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
  "sarahIntro": "Sarah's spoken welcome, 50–75 words. HR Director, warm and professional. Address the candidate by their Preferred Name if set, otherwise extract their first name from the CV, otherwise use no name. Introduces herself by name, briefly mentions James will be joining her, then explains the controls: click Record to start answering, click Stop when finished, use Repeat to hear the question again, and Pause if they need a moment. Sets a positive tone and tells the candidate to speak naturally and take their time.",
  "jamesIntro": "James's spoken intro, 30–45 words. Direct and role-focused. Address the candidate by their Preferred Name (see Session Context above). Introduces himself, then MUST reference the exact Session Difficulty from the Session Context — use the difficulty level name naturally in speech: if Standard say something like 'You've gone with Standard difficulty, so we'll work through this steadily'; if Pro say 'You've chosen Pro level, so expect some probing questions'; if Expert say 'You've opted for Expert level — these questions will really test your depth of knowledge'. If the session language is not English, also mention it e.g. 'and we'll be doing this in French'. Then briefly states what he will be focusing on.",
  "mcqQuestions": [
    {
      "questionText": "First hard multiple-choice question directly relevant to this role",
      "options": ["A. first option", "B. second option", "C. third option", "D. fourth option"],
      "correctIndex": 2,
      "explanation": "One clear sentence explaining why the correct answer is right"
    },
    {
      "questionText": "Second hard multiple-choice question on a different aspect of this role",
      "options": ["A. first option", "B. second option", "C. third option", "D. fourth option"],
      "correctIndex": 1,
      "explanation": "One clear sentence explaining why the correct answer is right"
    }
  ],
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

Generate exactly ${totalQuestions} questions total:
- ${roleQuestionCount} role/competency questions (source: "Role") — based on what this job actually requires day-to-day; vary the difficulty (mix of Easy, Medium, Hard); cover DIFFERENT competencies each time — do NOT reuse the same question themes across sessions. Use the session seed to pick a fresh angle on the role. Avoid generic questions like "tell me about yourself" or "describe a challenge" — make them specific to this exact role and company.
- ${hrQuestionCount} HR/culture question${hrQuestionCount === 1 ? '' : 's'} (source: "HR") — the last one must ask what the candidate knows about the company and why this role appeals to them specifically

CRITICAL: The JSON must contain "mcqQuestions" (plural, an array of exactly 2 objects) — NOT "mcqQuestion" (singular). This is mandatory.

Also generate TWO multiple-choice bonus questions in the "mcqQuestions" array — they must be on DIFFERENT aspects of the role:
- Same subject area as the role, Hard difficulty
- 4 options each (prefix each: "A. ", "B. ", "C. ", "D. ") — only one correct per question
- correctIndex: 0-based index of the correct answer — MUST vary between questions, NEVER always 0. Choose different values (0, 1, 2, or 3) for each question based on where the correct answer actually falls in your options list.
- explanation: one clear sentence explaining why the correct answer is right
IMPORTANT: The two MCQ questions and ALL interview questions MUST be completely different every single session. Never repeat questions from any previous generation. Use the session seed above to vary your selection.`;

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
    mcqQuestions?: Array<{
      questionText: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }>;
    mcqQuestion?: { // fallback: AI sometimes reverts to singular key
      questionText: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    };
  };

  // The prompt asks for "exactly N" but nothing enforces that on a JSON-mode LLM call — it
  // drifts (seen in practice: N-1 or N-2), especially at this call's high temperature (0.9,
  // for session-to-session variety). Make the count exact deterministically instead: ask for
  // precisely the missing questions as a small top-up (below), rather than accepting a short
  // session or padding with generic filler that breaks the "personalised to this role" promise.
  //
  // This used to retry the ENTIRE mega-generation (10 questions + 2 MCQs + 3 intros) up to
  // twice more first, before falling through to the top-up — each retry is another full
  // ~10-20s OpenAI call, which repeatedly blew past Phase 2's fallback window in
  // InterviewRoomPage.tsx under real-world latency (confirmed live 2026-08-28: "8 questions
  // instead of 10 — retrying (attempt 2/3)" immediately preceded Sarah/James falling back to
  // their generic, name-less lines). A full retry also silently replaced the whole `result`
  // object, including the first call's already-good sarahIntro/jamesIntro, even though nothing
  // was wrong with them. Going straight to the top-up is both faster and never touches them.
  //
  // Every target below is `totalQuestions` (the candidate's configured count), not a literal
  // 10 — this whole block was written before the question-count dropdown existed, when 10 was
  // the only option, and never got updated when that became configurable. That's exactly why
  // selecting 5 on the intake screen still produced a 10-question session: the AI was very
  // likely honouring "generate exactly 5" in the main prompt, and this safety net then padded
  // the result straight back up to a hardcoded 10 regardless.
  const result = await chatJSON<RawResult>(systemPrompt, userPrompt, 0.9);
  if (result.questions?.length > totalQuestions) result.questions = result.questions.slice(0, totalQuestions);

  const shortfall = totalQuestions - (result.questions?.length ?? 0);
  if (shortfall > 0) {
    console.warn(`[Explain AI] Session prep returned ${result.questions?.length ?? 0} questions instead of ${totalQuestions} — topping up ${shortfall} more directly.`);
    try {
      const existingTexts = (result.questions ?? []).map(q => `- ${q.questionText}`).join('\n');
      const topUpPrompt = `Generate exactly ${shortfall} more interview question(s) for the same role, continuing this session (do not repeat any theme from the list below).

═══ JOB SPECIFICATION ═══
${jobSpecText.slice(0, 4000)}${cvSection}
${jobTitleLine}${difficultyLine}

═══ QUESTIONS ALREADY IN THIS SESSION — do not repeat these themes ═══
${existingTexts}

Return this exact JSON:
{ "questions": [ { "questionId": "qX", "questionText": "...", "modelAnswer": "what a strong answer covers — specific to this role", "questionType": "Competency", "difficulty": "Medium", "source": "Role", "competencyTags": ["relevant tag"] } ] }`;
      const topUp = await chatJSON<{ questions: InterviewQuestion[] }>(systemPrompt, topUpPrompt, 0.9);
      if (topUp.questions?.length) {
        result.questions = [...(result.questions ?? []), ...topUp.questions].slice(0, totalQuestions);
      }
    } catch (err) {
      console.error('[Explain AI] Question top-up failed — session will run short:', err);
    }
  }

  // Accept both mcqQuestions (correct) and mcqQuestion (AI hallucination of old key)
  const rawMcqs = result.mcqQuestions?.length
    ? result.mcqQuestions
    : result.mcqQuestion ? [result.mcqQuestion] : [];

  const mcqQuestions: MCQQuestion[] = rawMcqs
    .filter(q => q?.questionText && q?.options?.length === 4)
    .map(q => ({ questionText: q.questionText, options: q.options, correctIndex: q.correctIndex ?? 0, explanation: q.explanation ?? '' }));

  return {
    questions: result.questions ?? [],
    sarahIntro: ensureNameSpoken(result.sarahIntro ?? '', preferredName),
    jamesIntro: ensureNameSpoken(result.jamesIntro ?? '', preferredName),
    mikeScript: result.mikeScript ?? null,
    companyFacts: result.companyFacts ?? [],
    specialistTitle: result.specialistTitle ?? 'Hiring Manager',
    mcqQuestions,
  };
}

// Sarah/James's intros are two fields among many in one large JSON generation (10
// questions + 2 MCQs + 3 intros), and the model doesn't reliably follow the "use this
// name" instruction there even though it's stated explicitly — unlike Mike's script,
// which is a separate, focused call and does comply reliably. Same shape of problem as
// the earlier question-count drift: prompting harder wasn't reliable, so guarantee it
// deterministically in code instead of trusting the model.
function ensureNameSpoken(text: string, name?: string): string {
  if (!text.trim() || !name?.trim()) return text;
  const n = name.trim();
  const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`\\b${escaped}\\b`, 'i').test(text)) return text;
  return `${n}, ${text}`;
}

// ── Dedicated MCQ generation ───────────────────────────────────────────────────
// Separate call so MCQs get full attention and are never anchored to whatever
// dominated the main question generation. Forces topic rotation every session.

const MCQ_COMPETENCY_POOLS: Record<string, string[]> = {
  default: [
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
  ],
};

function pickTwoDistinct(pool: string[]): [string, string] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

export async function generateMCQs(
  jobSpecText: string,
  jobTitle?: string,
  cvText?: string,
): Promise<MCQQuestion[]> {
  const [focus1, focus2] = pickTwoDistinct(MCQ_COMPETENCY_POOLS.default);
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
- correctIndex: 0-based index of the correct answer — this MUST match which option is actually correct (0=A, 1=B, 2=C, 3=D). Vary it — do NOT always use 0.
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
      // Question 1 was prompted to test focus1, question 2 focus2 — known before the call,
      // no need to ask the AI to echo it back.
      .map((q, i) => ({ questionText: q.questionText, options: q.options, correctIndex: q.correctIndex ?? 0, explanation: q.explanation ?? '', topic: i === 0 ? focus1 : focus2 }));
  } catch {
    return [];
  }
}
