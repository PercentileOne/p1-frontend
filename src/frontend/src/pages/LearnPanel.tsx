import { useState, useRef, useEffect } from 'react';

// ── Design tokens ──────────────────────────────────────────────────────────────
const BG2    = '#10131a';
const BG3    = '#14171f';
const BORDER = 'rgba(255,255,255,0.07)';
const BLUE   = '#4F8EF7';
const GREEN  = '#34D399';
const PURPLE = '#A78BFA';
const TEXT1  = '#e2e8f0';
const TEXT2  = '#94a3b8';
const TEXT3  = '#5a6478';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Lecture {
  number: number;
  title: string;
  type: 'lesson' | 'practice' | 'quiz';
  estimatedMinutes: number;
  content: string;
  keyTakeaways: string[];
  interviewQuestions: string[];
}

interface Module {
  number: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  lectures: Lecture[];
}

interface Course {
  id: string;
  title: string;
  subtitle: string;
  level: 'Beginner' | 'Intermediate' | 'Expert';
  category: string;
  description: string;
  totalHours: number;
  createdAt: string;
  modules: Module[];
}

// ── Persisted course store ─────────────────────────────────────────────────────

const STORAGE_KEY = 'im_learn_courses_v1';

function loadCourses(): Course[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}

function saveCourse(course: Course) {
  const existing = loadCourses().filter(c => c.id !== course.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([course, ...existing].slice(0, 20)));
}

// ── AI course generation ───────────────────────────────────────────────────────

async function generateCourse(title: string, level: string): Promise<Course> {
  const systemPrompt = `You are a world-class curriculum designer who creates structured, expert-quality courses for working professionals.
Generate a complete course as a single JSON object. Every field is required.`;

  const userPrompt = `Create a comprehensive course on: "${title}"
Level: ${level}

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "title": "full course title",
  "subtitle": "one compelling subtitle sentence",
  "level": "${level}",
  "category": "one of: Technology, Business, Finance, Healthcare, Engineering, Creative, Legal, Science, Leadership, Marketing, Data, Product",
  "description": "3-4 sentence course description explaining what students will achieve",
  "totalHours": <number 8-20>,
  "modules": [
    {
      "number": 1,
      "title": "module title",
      "description": "what this module covers in 1-2 sentences",
      "estimatedMinutes": <60-120>,
      "lectures": [
        {
          "number": 1,
          "title": "lecture title",
          "type": "lesson",
          "estimatedMinutes": <10-25>,
          "content": "500-600 words of expert, engaging, deeply educational content. Write 3-4 substantive paragraphs. Each paragraph should develop one idea fully. Include concrete real-world examples, specific numbers, named tools or techniques, and practical insights a professional would actually use. No bullet lists — flowing prose only.",
          "keyTakeaways": ["A specific fact or insight the student now knows — e.g. 'Neural networks with more than 3 layers are called deep networks and can learn hierarchical features'", "Another concrete insight stated as a fact, not an instruction", "A third factual takeaway — something memorable and specific"],
          "interviewQuestions": ["A realistic technical interview question a hiring manager would ask about this specific topic?", "A deeper follow-up that tests genuine understanding, not just recall?"]
        }
      ]
    }
  ]
}

Requirements:
- Exactly 10 modules
- Each module has exactly 4 lectures
- Lecture types: use "lesson" for most, "practice" for hands-on exercises (2 per module), "quiz" for knowledge checks (1 per module)
- Content must be genuinely educational and specific to "${title}" at ${level} level
- Interview questions must be realistic interview questions a hiring manager would ask about this topic`;

  const body = JSON.stringify({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 16000,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  // Reads an OpenAI SSE stream and returns the accumulated content string
  async function readStream(res: Response): Promise<string> {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let content = '';
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') return content;
        try {
          const chunk = JSON.parse(data) as { choices: { delta: { content?: string } }[] };
          content += chunk.choices?.[0]?.delta?.content ?? '';
        } catch { /* ignore malformed chunks */ }
      }
    }
    return content;
  }

  async function tryFetch(url: string, headers: Record<string, string>) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body });
    if (!res.ok || !res.body) {
      console.error(`[LearnEngine] ${url} responded ${res.status}`);
      return null;
    }
    let raw = '';
    try {
      raw = await readStream(res);
      if (!raw) { console.error('[LearnEngine] Empty stream content'); return null; }
      const parsed = JSON.parse(raw) as Omit<Course, 'id' | 'createdAt'>;
      if (!parsed.modules?.length) { console.error('[LearnEngine] No modules in parsed course', parsed); return null; }
      return { ...parsed, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    } catch (e) {
      console.error('[LearnEngine] JSON parse failed', e, '\nRaw (first 500):', raw.slice(0, 500));
      return null;
    }
  }

  // 1. Server-side proxy (streams through SWA to avoid 45s timeout)
  const via_proxy = await tryFetch('/api/ai-proxy', {}).catch(e => { console.error('[LearnEngine] Proxy fetch threw', e); return null; });
  if (via_proxy) return via_proxy;

  // 2. Direct OpenAI (dev fallback)
  const apiKey = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_OPENAI_API_KEY;
  if (apiKey) {
    const via_direct = await tryFetch('https://api.openai.com/v1/chat/completions', {
      Authorization: `Bearer ${apiKey}`,
    }).catch(e => { console.error('[LearnEngine] Direct fetch threw', e); return null; });
    if (via_direct) return via_direct;
  }

  throw new Error('Course generation failed');
}

// ── Suggested topics ───────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { title: 'System Design for Engineers', category: 'Technology', emoji: '🏗️' },
  { title: 'Product Management Fundamentals', category: 'Product', emoji: '🎯' },
  { title: 'Financial Modelling & Valuation', category: 'Finance', emoji: '📊' },
  { title: 'Leadership & People Management', category: 'Leadership', emoji: '👥' },
  { title: 'Machine Learning in Practice', category: 'Technology', emoji: '🤖' },
  { title: 'Negotiation & Influence', category: 'Business', emoji: '🤝' },
  { title: 'Data Analysis with Python', category: 'Data', emoji: '🐍' },
  { title: 'Certified Chief Technology Officer', category: 'Technology', emoji: '⚡' },
  { title: 'Digital Marketing Strategy', category: 'Marketing', emoji: '📣' },
  { title: 'Electrical Engineering Fundamentals', category: 'Engineering', emoji: '⚡' },
  { title: 'Healthcare Management', category: 'Healthcare', emoji: '🏥' },
  { title: 'Contract Law Essentials', category: 'Legal', emoji: '⚖️' },
];

const LEVEL_COLOURS: Record<string, string> = {
  Beginner: GREEN,
  Intermediate: BLUE,
  Expert: PURPLE,
};

const LECTURE_ICONS: Record<string, string> = {
  lesson: '📖',
  practice: '🛠️',
  quiz: '❓',
};

// ── Category colours (matching mobile palette) ─────────────────────────────────

const CAT_COLOURS: Record<string, { accent: string; bg: string }> = {
  Technology:  { accent: '#4F8EF7', bg: 'rgba(79,142,247,0.12)' },
  Business:    { accent: '#06B6D4', bg: 'rgba(6,182,212,0.12)' },
  Finance:     { accent: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  Healthcare:  { accent: '#F87171', bg: 'rgba(248,113,113,0.12)' },
  Engineering: { accent: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  Creative:    { accent: '#EC4899', bg: 'rgba(236,72,153,0.12)' },
  Legal:       { accent: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  Science:     { accent: '#6EE7B7', bg: 'rgba(110,231,183,0.12)' },
  Leadership:  { accent: '#FCD34D', bg: 'rgba(252,211,77,0.12)' },
  Marketing:   { accent: '#FB923C', bg: 'rgba(251,146,60,0.12)' },
  Data:        { accent: '#38BDF8', bg: 'rgba(56,189,248,0.12)' },
  Product:     { accent: '#818CF8', bg: 'rgba(129,140,248,0.12)' },
};

function catStyle(cat: string) {
  return CAT_COLOURS[cat] ?? { accent: PURPLE, bg: 'rgba(167,139,250,0.12)' };
}

// ── Total course minutes ───────────────────────────────────────────────────────

function totalMinutes(course: Course) {
  return course.modules.reduce((acc, m) => acc + m.lectures.reduce((a, l) => a + l.estimatedMinutes, 0), 0);
}

function fmtHours(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Generation steps ───────────────────────────────────────────────────────────

const GEN_STEPS = [
  'Mapping course structure…',
  'Writing module content…',
  'Adding interview questions…',
  'Finalising your course…',
];

// ── My Courses shelf card ──────────────────────────────────────────────────────

function CourseCard({ course, onClick }: { course: Course; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const { accent, bg } = catStyle(course.category);
  const mins = totalMinutes(course);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? bg : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hov ? accent + '50' : BORDER}`,
        borderRadius: 14, padding: '18px 20px',
        cursor: 'pointer', transition: 'all 0.18s',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: TEXT1, lineHeight: 1.3 }}>{course.title}</div>
        <span style={{
          fontSize: 10, fontWeight: 700, color: LEVEL_COLOURS[course.level] ?? PURPLE,
          background: (LEVEL_COLOURS[course.level] ?? PURPLE) + '15',
          borderRadius: 20, padding: '3px 8px', flexShrink: 0,
        }}>{course.level}</span>
      </div>
      <div style={{ fontSize: 12, color: TEXT3, lineHeight: 1.5 }}>{course.subtitle}</div>
      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: TEXT3 }}>
        <span>{course.modules.length} modules</span>
        <span>·</span>
        <span>{fmtHours(mins)}</span>
        <span>·</span>
        <span style={{ color: accent }}>{course.category}</span>
      </div>
    </div>
  );
}

// ── Lecture content renderer ───────────────────────────────────────────────────

function LectureView({ lecture, courseTitle, onPractice }: { lecture: Lecture; courseTitle: string; onPractice: (q: string) => void }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px 60px' }}>
      {/* Lecture header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 18 }}>{LECTURE_ICONS[lecture.type]}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: lecture.type === 'practice' ? GREEN : lecture.type === 'quiz' ? PURPLE : BLUE,
          }}>{lecture.type}</span>
          <span style={{ fontSize: 11, color: TEXT3, marginLeft: 4 }}>· {lecture.estimatedMinutes} min</span>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: TEXT1, margin: 0, letterSpacing: '-0.02em' }}>
          {lecture.title}
        </h2>
      </div>

      {/* Main content */}
      <div style={{
        fontSize: 15, color: '#c0cce0', lineHeight: 1.85,
        marginBottom: 32,
        borderLeft: '3px solid rgba(79,142,247,0.3)',
        paddingLeft: 20,
      }}>
        {lecture.content.split('\n').filter(p => p.trim()).map((para, i) => (
          <p key={i} style={{ margin: '0 0 16px' }}>{para}</p>
        ))}
      </div>

      {/* Key takeaways */}
      {lecture.keyTakeaways?.length > 0 && (
        <div style={{
          background: 'rgba(52,211,153,0.06)',
          border: '1px solid rgba(52,211,153,0.18)',
          borderRadius: 12, padding: '20px 24px',
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: GREEN, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
            ✦ Key Takeaways
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lecture.keyTakeaways.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, color: GREEN, flexShrink: 0, marginTop: 1,
                }}>{i + 1}</div>
                <div style={{ fontSize: 13, color: '#9ff0d0', lineHeight: 1.5 }}>{t}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interview questions */}
      {lecture.interviewQuestions?.length > 0 && (
        <div style={{
          background: 'rgba(167,139,250,0.06)',
          border: '1px solid rgba(167,139,250,0.2)',
          borderRadius: 12, padding: '20px 24px',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: PURPLE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
            🎤 Interview Questions on This Topic
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lecture.interviewQuestions.map((q, i) => (
              <div
                key={i}
                onClick={() => onPractice(q)}
                style={{
                  background: 'rgba(167,139,250,0.08)',
                  border: '1px solid rgba(167,139,250,0.18)',
                  borderRadius: 10, padding: '12px 16px',
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(167,139,250,0.15)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(167,139,250,0.08)'; }}
              >
                <div style={{ fontSize: 13, color: '#d4c5ff', lineHeight: 1.5 }}>{q}</div>
                <div style={{
                  background: 'linear-gradient(135deg, #7b5cf5, #5b8ff7)',
                  color: '#fff', border: 'none',
                  borderRadius: 8, padding: '6px 12px',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  Practice →
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 12, color: TEXT3, marginBottom: 8 }}>
              Ready to be interviewed on <strong style={{ color: TEXT2 }}>{courseTitle}</strong>? Practice with James or Sarah — they'll use questions from this course.
            </div>
            <button
              onClick={() => onPractice('')}
              style={{
                background: 'linear-gradient(135deg, #7b5cf5, #5b8ff7)',
                color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', width: '100%',
              }}>
              Start Full Interview Practice →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Course view (module tree + lecture) ────────────────────────────────────────

function CourseView({ course, onBack }: { course: Course; onBack: () => void }) {
  const [expandedModule, setExpandedModule] = useState<number>(1);
  const [activeLecture, setActiveLecture] = useState<{ module: Module; lecture: Lecture } | null>(() => ({
    module: course.modules[0],
    lecture: course.modules[0].lectures[0],
  }));
  const { accent, bg } = catStyle(course.category);
  const mins = totalMinutes(course);

  function handlePractice(question: string) {
    const url = question
      ? `/interview-room/prep?topic=${encodeURIComponent(question)}`
      : `/interview-room/prep?course=${encodeURIComponent(course.title)}`;
    window.open(url, '_blank');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* Course header bar */}
      <div style={{
        background: BG2, borderBottom: `1px solid ${BORDER}`,
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT2, cursor: 'pointer', padding: '6px 12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.title}</div>
          <div style={{ fontSize: 11, color: TEXT3 }}>{course.modules.length} modules · {fmtHours(mins)} · {course.level}</div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: LEVEL_COLOURS[course.level] ?? PURPLE,
          background: bg, borderRadius: 20, padding: '4px 12px',
        }}>{course.level}</span>
      </div>

      {/* Two-column layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Module sidebar */}
        <div style={{
          width: 280, flexShrink: 0,
          background: BG2, borderRight: `1px solid ${BORDER}`,
          overflowY: 'auto',
        }}>
          <div style={{ padding: '16px 16px 8px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: TEXT3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Course Content
            </div>
          </div>

          {course.modules.map(mod => {
            const isExpanded = expandedModule === mod.number;
            const modMins = mod.lectures.reduce((a, l) => a + l.estimatedMinutes, 0);

            return (
              <div key={mod.number}>
                {/* Module header */}
                <div
                  onClick={() => setExpandedModule(isExpanded ? 0 : mod.number)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: `1px solid ${BORDER}`,
                    background: isExpanded ? 'rgba(79,142,247,0.06)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isExpanded ? BLUE : TEXT2 }}>
                      Module {mod.number}
                    </div>
                    <div style={{ fontSize: 10, color: TEXT3 }}>{fmtHours(modMins)}</div>
                  </div>
                  <div style={{ fontSize: 12, color: isExpanded ? TEXT1 : TEXT2, lineHeight: 1.4, fontWeight: isExpanded ? 600 : 400 }}>
                    {mod.title}
                  </div>
                </div>

                {/* Lectures */}
                {isExpanded && mod.lectures.map(lec => {
                  const isActive = activeLecture?.lecture.number === lec.number && activeLecture.module.number === mod.number;
                  return (
                    <div
                      key={lec.number}
                      onClick={() => setActiveLecture({ module: mod, lecture: lec })}
                      style={{
                        padding: '10px 16px 10px 28px',
                        cursor: 'pointer',
                        background: isActive ? `${accent}18` : 'transparent',
                        borderLeft: isActive ? `3px solid ${accent}` : '3px solid transparent',
                        borderBottom: `1px solid ${BORDER}`,
                        transition: 'all 0.15s',
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                    >
                      <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{LECTURE_ICONS[lec.type]}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: isActive ? TEXT1 : TEXT2, fontWeight: isActive ? 600 : 400, lineHeight: 1.4 }}>{lec.title}</div>
                        <div style={{ fontSize: 10, color: TEXT3, marginTop: 2 }}>{lec.estimatedMinutes} min</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Lecture content */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#0c0e14' }}>
          {activeLecture ? (
            <LectureView
              lecture={activeLecture.lecture}
              courseTitle={course.title}
              onPractice={handlePractice}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: TEXT3 }}>
              Select a lecture to begin
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main LearnPanel ────────────────────────────────────────────────────────────

export default function LearnPanel() {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Expert'>('Intermediate');
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [error, setError] = useState('');
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [savedCourses, setSavedCourses] = useState<Course[]>(() => loadCourses());
  const inputRef = useRef<HTMLInputElement>(null);
  const genTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (generating) {
      let step = 0;
      genTimer.current = setInterval(() => {
        step = Math.min(step + 1, GEN_STEPS.length - 1);
        setGenStep(step);
      }, 5000);
    } else {
      if (genTimer.current) clearInterval(genTimer.current);
      setGenStep(0);
    }
    return () => { if (genTimer.current) clearInterval(genTimer.current); };
  }, [generating]);

  async function handleGenerate(title?: string) {
    const t = (title ?? query).trim();
    if (!t || t.length < 3) {
      setError('Please enter a course topic (at least 3 characters).');
      inputRef.current?.focus();
      return;
    }
    setError('');
    setGenerating(true);
    try {
      const course = await generateCourse(t, level);
      saveCourse(course);
      setSavedCourses(loadCourses());
      setActiveCourse(course);
    } catch (e) {
      setError('Course generation failed — please try again. Check your OpenAI balance if the error persists.');
    } finally {
      setGenerating(false);
    }
  }

  // ── Course view ──
  if (activeCourse) {
    return <CourseView course={activeCourse} onBack={() => setActiveCourse(null)} />;
  }

  // ── Generating state ──
  if (generating) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '70vh', flexDirection: 'column', gap: 24, padding: '40px 24px',
      }}>
        {/* Animated ring */}
        <div style={{ position: 'relative', width: 80, height: 80 }}>
          <svg width="80" height="80" viewBox="0 0 80 80" style={{ animation: 'spin 1.4s linear infinite' }}>
            <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(120,80,255,0.15)" strokeWidth="5" />
            <circle cx="40" cy="40" r="34" fill="none" stroke="url(#grad)" strokeWidth="5"
              strokeDasharray="60 154" strokeLinecap="round" />
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7b5cf5" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📚</div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: TEXT1, marginBottom: 8 }}>Building your course…</div>
          <div style={{ fontSize: 14, color: PURPLE, fontWeight: 600, marginBottom: 16 }}>
            {query}
            <span style={{
              marginLeft: 8, fontSize: 11, fontWeight: 700,
              color: LEVEL_COLOURS[level] ?? PURPLE,
              background: (LEVEL_COLOURS[level] ?? PURPLE) + '20',
              borderRadius: 20, padding: '2px 8px',
            }}>{level}</span>
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            {GEN_STEPS.map((step, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 13,
                color: i < genStep ? GREEN : i === genStep ? TEXT1 : TEXT3,
                fontWeight: i === genStep ? 600 : 400,
                transition: 'color 0.4s',
              }}>
                <span style={{ fontSize: 14 }}>
                  {i < genStep ? '✓' : i === genStep ? '⟳' : '○'}
                </span>
                {step}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, fontSize: 12, color: TEXT3 }}>
            GPT-4o is writing 10 modules with full lecture content — this takes about 20 seconds.
          </div>
        </div>
      </div>
    );
  }

  // ── Home / search state ──
  return (
    <div style={{ padding: '32px 28px 60px' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: PURPLE, letterSpacing: '0.06em', marginBottom: 8 }}>✦ LEARN ENGINE</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: TEXT1, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          What do you want to learn?
        </h1>
        <p style={{ fontSize: 14, color: TEXT3, margin: 0, lineHeight: 1.6 }}>
          Type any topic and get a complete course — 10 modules, 40 lectures, interview questions and practice built in.
        </p>
      </div>

      {/* Search + level */}
      <div style={{ maxWidth: 680, marginBottom: 32 }}>
        {/* Title input */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(255,255,255,0.05)',
          border: `1.5px solid ${error ? '#f87171' : 'rgba(167,139,250,0.4)'}`,
          borderRadius: '12px 12px 0 0', padding: '0 18px',
          boxShadow: '0 0 0 4px rgba(167,139,250,0.06)',
        }}>
          <span style={{ fontSize: 20, marginRight: 4 }}>📚</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') handleGenerate(); }}
            placeholder="e.g. Certified Chief Technology Officer, Plumbing Fundamentals, Data Science..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: TEXT1, fontSize: 15, padding: '18px 12px',
              fontFamily: 'inherit',
            }}
          />
          {query && (
            <button onClick={() => { setQuery(''); setError(''); inputRef.current?.focus(); }}
              style={{ background: 'none', border: 'none', color: TEXT3, cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>✕</button>
          )}
        </div>

        {/* Level + generate */}
        <div style={{
          display: 'flex', alignItems: 'stretch',
          background: BG3,
          border: `1.5px solid rgba(167,139,250,0.25)`,
          borderTop: 'none',
          borderRadius: '0 0 12px 12px',
        }}>
          {(['Beginner', 'Intermediate', 'Expert'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              style={{
                flex: 1, padding: '12px 8px',
                background: level === l ? (LEVEL_COLOURS[l] + '18') : 'transparent',
                border: 'none',
                borderRight: l !== 'Expert' ? `1px solid ${BORDER}` : 'none',
                color: level === l ? LEVEL_COLOURS[l] : TEXT3,
                fontSize: 12, fontWeight: level === l ? 700 : 500,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
              {l}
            </button>
          ))}
          <button
            onClick={() => handleGenerate()}
            style={{
              flex: 2, padding: '12px 20px',
              background: 'linear-gradient(135deg, #7b5cf5, #5b8ff7)',
              border: 'none', borderLeft: `1px solid ${BORDER}`,
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer',
              borderRadius: '0 0 10px 0',
            }}>
            Generate Course →
          </button>
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>{error}</div>
        )}
      </div>

      {/* Suggested topics */}
      <div style={{ marginBottom: savedCourses.length > 0 ? 40 : 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
          Popular Topics
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SUGGESTIONS.map(s => {
            const { accent, bg } = catStyle(s.category);
            return (
              <button
                key={s.title}
                onClick={() => { setQuery(s.title); handleGenerate(s.title); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: bg, border: `1px solid ${accent}30`,
                  borderRadius: 24, padding: '7px 14px',
                  color: accent, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = accent + '60'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = accent + '30'}
              >
                <span>{s.emoji}</span>
                {s.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* My Courses */}
      {savedCourses.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              My Courses
            </div>
            <button
              onClick={() => { localStorage.removeItem(STORAGE_KEY); setSavedCourses([]); }}
              style={{ background: 'none', border: 'none', color: TEXT3, fontSize: 11, cursor: 'pointer' }}>
              Clear all
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {savedCourses.map(course => (
              <CourseCard key={course.id} course={course} onClick={() => setActiveCourse(course)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
