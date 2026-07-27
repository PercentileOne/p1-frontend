import type { InterviewQuestion } from './explainApi';
import { buildCVContext, type CVContext, type JobSpecContext } from '../utils/contextBuilder';

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

export async function parseCVWithAI(rawText: string): Promise<CVContext> {
  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, temperature: 0, response_format: { type: 'json_object' }, messages: [
        { role: 'system', content: 'You are a strict CV data extractor. Extract only explicitly written data. Return valid JSON only.' },
        { role: 'user', content: `Extract from this CV: firstName, lastName, roles[], companies[], experience[{role,company,period}], skills[], achievements[], seniority, yearsOfExperience.\n\n${rawText.slice(0, 8000)}` },
      ]}),
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
    const resData = await res.json() as { choices: { message: { content: string } }[] };
    const raw = JSON.parse(resData.choices[0].message.content) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === 'string' ? v : '');
    const arr = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    const firstName = str(raw.firstName);
    const lastName = str(raw.lastName);
    const expRaw = Array.isArray(raw.experience) ? raw.experience : [];
    const experience = expRaw
      .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
      .map(e => ({ role: str(e.role), company: str(e.company), period: str(e.period) }))
      .filter(e => e.role || e.company);
    const skills = arr(raw.skills);
    return {
      rawText,
      firstName, lastName,
      candidateName: firstName && lastName ? `${firstName} ${lastName}` : undefined,
      roles: arr(raw.roles),
      companies: arr(raw.companies),
      dates: [], skills, technologies: skills,
      achievements: arr(raw.achievements),
      certifications: [],
      education: [],
      responsibilities: [],
      leadershipSignals: [],
      seniority: (['Junior','Mid','Senior','Lead','Director','Executive'].includes(str(raw.seniority))
        ? str(raw.seniority) : 'Unknown') as CVContext['seniority'],
      yearsOfExperience: typeof raw.yearsOfExperience === 'number' && raw.yearsOfExperience > 0 ? raw.yearsOfExperience : undefined,
      experience,
      _source: 'ai',
    };
  } catch {
    return { ...buildCVContext(rawText), _source: 'heuristic' as const };
  }
}

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
