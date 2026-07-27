import type { LessonData, LessonProgress, SavedLesson } from '../types/learn';

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

const USER_ID_KEY = 'explain_learn_user_id';

export function getLearnUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(USER_ID_KEY, id); }
  return id;
}

async function chatJSON<T>(system: string, user: string): Promise<T> {
  if (!OPENAI_KEY) throw new Error('OpenAI key not configured — set VITE_OPENAI_API_KEY');
  for (let attempt = 0; attempt <= 3; attempt++) {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, temperature: 0.7, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    });
    if (res.status === 429 && attempt < 3) {
      const wait = parseInt(res.headers.get('Retry-After') ?? '10', 10) * 1000;
      await new Promise(r => setTimeout(r, Math.min(wait, 30000)));
      continue;
    }
    if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
    const data = await res.json() as { choices: { message: { content: string } }[] };
    return JSON.parse(data.choices[0].message.content) as T;
  }
  throw new Error('OpenAI rate limited after retries');
}

export async function generateLesson(subject: string, language = 'English'): Promise<LessonData> {
  const isEnglish = language === 'English';
  const langNote = isEnglish ? '' : ` Write the ENTIRE lesson in ${language} — all fields including titles, bodies, glossary terms, questions, and answers.`;

  const system = `You are an expert educator and curriculum designer. Generate a comprehensive, engaging lesson on any subject for any language worldwide.${langNote}
Always return valid JSON only — no markdown, no code fences.
The JSON must match this exact structure:
{
  "title": "Full descriptive lesson title",
  "subject": "The subject exactly as given",
  "category": "Technology|Mathematics|Business|Science|History|Language & Literature|Sport & Fitness|Social Sciences",
  "emoji": "single relevant emoji",
  "hook": "One compelling sentence that explains what this subject is and why it matters — in plain language",
  "keyConcepts": [
    {
      "icon": "emoji",
      "title": "Concept name",
      "body": "Clear 2-3 sentence explanation",
      "deepDive": "Deeper 2-3 sentence explanation of WHY and HOW",
      "example": "A real-world example that makes this concrete",
      "codeSnippet": null,
      "memoryHook": "A memorable phrase or analogy to remember this",
      "examTrap": "The most common mistake people make about this concept"
    }
  ],
  "misconceptions": [{ "wrong": "Common wrong belief", "right": "The correct reality" }],
  "glossary": [{ "term": "Key term", "def": "Clear definition in plain language" }],
  "examQuestions": ["Question 1?", "Question 2?"],
  "examAnswers": ["Answer 1", "Answer 2"],
  "mcQuestions": [
    { "q": "Question text?", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": 0 }
  ]
}
Generate: 5-6 keyConcepts, 4-5 misconceptions, 8-10 glossary terms, 8 examQuestions with answers, 8 mcQuestions.
Only include codeSnippet if the subject is genuinely technical/programming — otherwise set to null.
Make the content rich, accurate, and engaging. Avoid generic filler.`;

  return chatJSON<LessonData>(system, `Generate a lesson on: ${subject}`);
}

export async function saveLesson(lesson: LessonData, language = 'English'): Promise<{ id: string; createdAt: string }> {
  const userId = getLearnUserId();
  const res = await fetch('/api/save-lesson', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, lesson, language }),
  });
  if (!res.ok) throw new Error(`save-lesson failed: ${res.status}`);
  const data = await res.json() as { ok: boolean; id: string; createdAt: string };
  return { id: data.id, createdAt: data.createdAt };
}

export async function getLessons(): Promise<SavedLesson[]> {
  const userId = getLearnUserId();
  const res = await fetch(`/api/get-lessons?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`get-lessons failed: ${res.status}`);
  const data = await res.json() as { ok: boolean; lessons: SavedLesson[] };
  return data.lessons ?? [];
}

export async function getLesson(id: string): Promise<SavedLesson> {
  const userId = getLearnUserId();
  const res = await fetch(`/api/get-lesson?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`get-lesson failed: ${res.status}`);
  const data = await res.json() as { ok: boolean; lesson: SavedLesson };
  return data.lesson;
}

export async function updateProgress(id: string, progress: Partial<LessonProgress>): Promise<void> {
  const userId = getLearnUserId();
  await fetch('/api/update-lesson-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, userId, progress }),
  }).catch(() => {});
}
