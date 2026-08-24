import { useState, useRef, useEffect, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { Highlight, themes } from 'prism-react-renderer';
import mermaid from 'mermaid';
import type { RoomState } from './InterviewRoomPage';
import type { InterviewQuestion } from '../api/explainApi';
import { createReadAloudPlayer, extractReadableText, type ReadAloudState, type ReadAloudGender } from '../api/readAloud';
import MiniPracticeSession from '../components/MiniPracticeSession';

mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict' });

const API_BASE = import.meta.env.VITE_EXPLAIN_API_URL ?? 'https://api.explain.global';

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

interface CodeSample {
  language: string;
  code: string;
  caption?: string;
}

interface Diagram {
  mermaid: string;
  caption?: string;
}

interface Lecture {
  number: number;
  title: string;
  type: 'lesson' | 'practice' | 'quiz';
  estimatedMinutes: number;
  content: string;
  keyTakeaways: string[];
  deepDive: string;
  realWorldExample: string;
  memoryHook: string;
  commonMisconceptions: { myth: string; reality: string }[];
  interviewQuestions: string[];
  codeSamples?: CodeSample[];
  diagrams?: Diagram[];
  solutionCode?: CodeSample;
}

interface Module {
  number: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  lectures: Lecture[];
  loading?: boolean; // true while content is being generated
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
const CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 2 days

const normaliseTitle = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const courseKey = (title: string, level: string) => `${normaliseTitle(title)}|${level}`;

// De-dupes by (title, level) — the real identity of a course on the shelf — not by the
// internal `id`, which the platform-cache path in handleGenerate mints fresh every time
// (so a course whose local 48h cache expired but whose shared Cosmos cache is still warm
// used to come back as a second entry under a new id). Runs on every load so it also
// self-heals any duplicates already sitting in localStorage from before this fix.
function dedupeCourses(courses: Course[]): Course[] {
  const byKey = new Map<string, Course>();
  for (const c of courses) {
    const key = courseKey(c.title, c.level);
    const existing = byKey.get(key);
    if (!existing || new Date(c.createdAt) > new Date(existing.createdAt)) byKey.set(key, c);
  }
  return Array.from(byKey.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function loadCourses(): Course[] {
  let courses: Course[];
  try { courses = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
  const deduped = dedupeCourses(courses);
  if (deduped.length !== courses.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(deduped));
  return deduped;
}

function saveCourse(course: Course) {
  const existing = loadCourses().filter(c => courseKey(c.title, c.level) !== courseKey(course.title, course.level));
  localStorage.setItem(STORAGE_KEY, JSON.stringify([course, ...existing].slice(0, 20)));
}

function deleteCourse(id: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loadCourses().filter(c => c.id !== id)));
}

function findCached(title: string, level: string): Course | null {
  const now = Date.now();
  return loadCourses().find(c =>
    normaliseTitle(c.title) === normaliseTitle(title) &&
    c.level === level &&
    now - new Date(c.createdAt).getTime() < CACHE_TTL_MS
  ) ?? null;
}

// ── AI course generation ───────────────────────────────────────────────────────

// ── Shared SSE stream reader ───────────────────────────────────────────────────

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

async function callAI(messages: { role: string; content: string }[], maxTokens = 4000): Promise<string> {
  const body = JSON.stringify({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: maxTokens,
    stream: true,
    messages,
  });

  const res = await fetch(`${API_BASE}/api/ai-proxy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  if (!res.ok || !res.body) throw new Error('AI call failed');
  return readStream(res);
}

// ── Phase 1: course outline (fast ~3s) ────────────────────────────────────────

interface CourseOutline {
  title: string;
  subtitle: string;
  level: 'Beginner' | 'Intermediate' | 'Expert';
  category: string;
  description: string;
  totalHours: number;
  modules: { number: number; title: string; description: string; estimatedMinutes: number }[];
}

async function generateOutline(title: string, level: string): Promise<CourseOutline> {
  const raw = await callAI([
    {
      role: 'system',
      content: 'You are a world-class curriculum designer. Return ONLY valid JSON — no markdown, no explanation.',
    },
    {
      role: 'user',
      content: `Create a course outline for: "${title}" at ${level} level.

Return JSON:
{
  "title": "full course title",
  "subtitle": "one compelling subtitle sentence",
  "level": "${level}",
  "category": "one of: Technology, Business, Finance, Healthcare, Engineering, Creative, Legal, Science, Leadership, Marketing, Data, Product",
  "description": "3-4 sentence course description",
  "totalHours": <number 8-20>,
  "modules": [
    { "number": 1, "title": "module title", "description": "1-2 sentence description", "estimatedMinutes": <60-120> }
  ]
}

Requirements: exactly 10 modules. No lecture content — titles and descriptions only.`,
    },
  ], 1500);

  const parsed = JSON.parse(raw) as CourseOutline;
  if (!parsed.modules?.length) throw new Error('No modules in outline');
  return parsed;
}

// ── Phase 2: one module's lectures (called 10× in background) ─────────────────

async function generateModuleLectures(
  courseTitle: string,
  mod: { number: number; title: string; description: string },
  level: string,
): Promise<Lecture[]> {
  const raw = await callAI([
    {
      role: 'system',
      content: 'You are a world-class curriculum designer. Return ONLY valid JSON — no markdown, no explanation.',
    },
    {
      role: 'user',
      content: `Generate the lectures for Module ${mod.number}: "${mod.title}" of the course "${courseTitle}" (${level} level).
Module description: ${mod.description}

Return a JSON array of exactly 4 lectures:
[
  {
    "number": 1,
    "title": "lecture title",
    "type": "lesson",
    "estimatedMinutes": <10-25>,
    "content": "400-500 words of expert, engaging prose. 3-4 substantive paragraphs. Include specific numbers, named tools, practical insights. No bullet lists. Whenever a code sample, worked example, framework, or diagram would genuinely clarify the concept — for ANY subject, not just technical ones — place a marker on its own line — {{CODE_1}}, {{CODE_2}}, {{DIAGRAM_1}} etc — at the exact point in the prose where that example belongs, matching the index of an entry in codeSamples/diagrams below. Omit markers only when the topic is genuinely narrative/opinion-based and nothing structured would add real value.",
    "keyTakeaways": ["specific factual insight", "another concrete takeaway", "a third memorable fact"],
    "deepDive": "2-3 sentences on the mechanism or theory behind this topic.",
    "realWorldExample": "One vivid real-world scenario naming actual companies, tools, or situations. 2-3 sentences.",
    "memoryHook": "A memorable analogy or mental model to recall this concept in an interview.",
    "commonMisconceptions": [
      { "myth": "common wrong belief", "reality": "accurate correction" },
      { "myth": "another misconception", "reality": "correct understanding" }
    ],
    "interviewQuestions": ["realistic hiring manager question?", "deeper follow-up question?"],
    "codeSamples": [
      { "language": "typescript", "code": "for a CODING topic: real, correct, runnable code, 5-20 lines, realistic names, comments where they earn their place. For a MATHS topic: a worked numerical example or step-by-step derivation instead — set language to 'text'. For ELECTRONICS/hardware: pseudocode, a register/pin table, or a component listing — set language to 'text' if it isn't real code. For a PROCESS/FRAMEWORK/SOFT-SKILL topic (e.g. problem-solving, negotiation, leadership, interviewing, conflict resolution): a structured template, checklist, sample script/dialogue, or step-by-step framework — set language to 'text'. For a business/legal/clinical topic: a worked scenario, sample clause, or structured checklist — set language to 'text'.", "caption": "one-line caption" }
    ],
    "diagrams": [
      { "mermaid": "valid Mermaid.js syntax. For CODING: flowchart, sequence, or state diagram of the logic/architecture. For MATHS: represent the relationship structurally with a flowchart or graph TD (e.g. a number line, a decision tree, steps of a proof) — Mermaid can't plot continuous functions, so describe the concept's structure instead. For ELECTRONICS: a block/flow diagram of signal or data flow. For ANY process, framework, or decision-based topic (problem-solving, negotiation, hiring, clinical triage, legal process, etc.): a flowchart of the steps/stages, or a decision tree of the choice points — Mermaid represents processes and hierarchies just as well as code architecture.", "caption": "one-line caption" }
    ],
    "solutionCode": { "language": "typescript", "code": "ONLY for type=\"practice\": a complete, correct reference solution to the exercise described in content — the whole thing, not a fragment, so the learner can compare it against what they built. For a coding/electronics/maths-heavy topic this is real code or a full worked solution; for a process/soft-skill/business topic this is a complete worked example (e.g. a filled-out framework, a full sample script) — set language to 'text'. Omit this field entirely for non-practice lectures.", "caption": "Reference solution" }
  }
]

codeSamples and diagrams: 0-3 codeSamples and 0-2 diagrams per lecture — use judgment, not a subject allowlist. Include them for ANY subject (coding, maths, electronics, business, healthcare, leadership, law, soft skills, etc.) whenever a structured example, framework, checklist, or diagram would genuinely clarify the concept. Return empty arrays [] and use no markers only when the topic is genuinely narrative/opinion-based and nothing structured would add real value.

Lecture types: "lesson" for most, "practice" for one hands-on exercise, "quiz" for one knowledge check.`,
    },
  ], 7000);

  const parsed = JSON.parse(raw) as Lecture[];
  if (!Array.isArray(parsed) || !parsed.length) throw new Error('No lectures parsed');
  return parsed;
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
      <div style={{ fontSize: 10, color: TEXT3 }}>
        {(() => {
          const ageMs = Date.now() - new Date(course.createdAt).getTime();
          const ageH = Math.floor(ageMs / 3600000);
          const ageD = Math.floor(ageMs / 86400000);
          if (ageH < 1) return 'Generated just now';
          if (ageH < 24) return `Generated ${ageH}h ago`;
          return `Generated ${ageD}d ago`;
        })()}
      </div>
    </div>
  );
}

// ── Code block (syntax-highlighted, book-style) ────────────────────────────────

// Languages Prism actually ships grammars for — anything else (e.g. the AI writing
// "text" for a maths derivation or a pin/register table) renders as plain monospace
// instead of risking Prism.tokenize() throwing on an unknown grammar.
const KNOWN_LANGUAGES = new Set([
  'markup', 'html', 'xml', 'svg', 'css', 'clike', 'javascript', 'js', 'jsx', 'tsx',
  'typescript', 'ts', 'python', 'py', 'csharp', 'cs', 'c', 'cpp', 'c++', 'java', 'go',
  'rust', 'rs', 'php', 'ruby', 'rb', 'swift', 'kotlin', 'kt', 'sql', 'bash', 'shell',
  'sh', 'yaml', 'yml', 'json', 'markdown', 'md', 'graphql', 'diff', 'git', 'makefile',
  'objectivec', 'scss', 'sass', 'less', 'wasm', 'docker', 'powershell', 'ps1',
]);

function CodeBlock({ sample }: { sample: CodeSample }) {
  const [copied, setCopied] = useState(false);
  const lang = sample.language?.toLowerCase().trim() ?? '';
  const highlightable = KNOWN_LANGUAGES.has(lang);
  return (
    <div style={{
      margin: '20px 0', borderRadius: 12, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.08)', background: '#0a0c12',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {sample.language}
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(sample.code).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          style={{
            background: 'none', border: 'none', color: copied ? GREEN : TEXT3,
            fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '2px 6px',
          }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      {highlightable ? (
        <Highlight theme={themes.vsDark} code={sample.code.trim()} language={lang as never}>
          {({ style, tokens, getLineProps, getTokenProps }) => (
            <pre style={{ ...style, margin: 0, padding: '16px 20px', fontSize: 13, lineHeight: 1.65, overflowX: 'auto', background: 'transparent' }}>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      ) : (
        <pre style={{ margin: 0, padding: '16px 20px', fontSize: 13, lineHeight: 1.65, overflowX: 'auto', color: '#c0cce0', fontFamily: 'ui-monospace, monospace' }}>
          {sample.code.trim()}
        </pre>
      )}
      {sample.caption && (
        <div style={{ padding: '8px 16px 12px', fontSize: 12, color: TEXT3, fontStyle: 'italic' }}>
          {sample.caption}
        </div>
      )}
    </div>
  );
}

// ── Mermaid diagram (flowcharts, sequence/state diagrams) ─────────────────────

function DiagramBlock({ diagram }: { diagram: Diagram }) {
  const id = useId().replace(/:/g, '');
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setFailed(false);
    mermaid.render(`mmd-${id}`, diagram.mermaid.trim())
      .then(({ svg }) => { if (!cancelled) setSvg(svg); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [diagram.mermaid, id]);

  if (failed) return null; // malformed AI-generated diagram — fail silently rather than break the lesson

  return (
    <div style={{
      margin: '20px 0', borderRadius: 12, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.08)', background: '#0a0c12',
      padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    }}>
      {svg ? (
        <div style={{ maxWidth: '100%', overflowX: 'auto' }} dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div style={{ fontSize: 12, color: TEXT3, padding: '20px 0' }}>Rendering diagram…</div>
      )}
      {diagram.caption && svg && (
        <div style={{ fontSize: 12, color: TEXT3, fontStyle: 'italic', textAlign: 'center' }}>{diagram.caption}</div>
      )}
    </div>
  );
}

// ── Reference solution reveal (practice exercises) ─────────────────────────────

function SolutionReveal({ sample }: { sample: CodeSample }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div style={{
      margin: '0 0 24px', borderRadius: 12, overflow: 'hidden',
      border: '1px solid rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.04)',
    }}>
      <button
        onClick={() => setRevealed(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
        }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: GREEN, display: 'flex', alignItems: 'center', gap: 8 }}>
          ✅ {revealed ? 'Hide Reference Solution' : 'Compare to Reference Solution'}
        </span>
        <span style={{ fontSize: 12, color: GREEN, transform: revealed ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
      </button>
      {revealed && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ fontSize: 12, color: TEXT3, marginBottom: 10 }}>
            Built it a different way? That's fine — this is one correct approach, not the only one.
          </div>
          <CodeBlock sample={sample} />
        </div>
      )}
    </div>
  );
}

// ── Read-aloud button ────────────────────────────────────────────────────────────

const READ_RATES = [1, 1.25, 1.5, 2];

function ReadAloudButton({ text }: { text: string }) {
  const [state, setState] = useState<ReadAloudState>('idle');
  const [rate, setRateValue] = useState(1);
  const [gender, setGenderValue] = useState<ReadAloudGender>('female');
  const playerRef = useRef<ReturnType<typeof createReadAloudPlayer> | null>(null);

  useEffect(() => {
    playerRef.current = createReadAloudPlayer(text, setState, gender);
    return () => playerRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speaking = state === 'playing' || state === 'paused';
  const loading = state === 'loading';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, userSelect: 'none' }}>
      <button
        onClick={() => {
          if (loading) return;
          if (state === 'playing') playerRef.current?.pause();
          else if (state === 'paused') playerRef.current?.resume();
          else playerRef.current?.play();
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: speaking ? 'rgba(79,142,247,0.14)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${speaking ? 'rgba(79,142,247,0.4)' : BORDER}`,
          borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 700,
          color: speaking ? BLUE : TEXT2, cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.6 : 1, transition: 'all 0.15s',
        }}
      >
        {loading ? '⏳ Loading…' : state === 'playing' ? '⏸ Pause' : state === 'paused' ? '▶ Resume' : '🔊 Read Aloud'}
      </button>
      {speaking && (
        <>
          <select
            value={rate}
            onChange={e => {
              const r = Number(e.target.value);
              setRateValue(r);
              playerRef.current?.setRate(r);
            }}
            style={{
              fontSize: 11, fontWeight: 600, padding: '5px 8px', borderRadius: 7,
              background: BG3, border: `1px solid ${BORDER}`, color: TEXT2, cursor: 'pointer', outline: 'none',
            }}
          >
            {READ_RATES.map(r => <option key={r} value={r}>{r}×</option>)}
          </select>
          <button
            onClick={() => {
              const next: ReadAloudGender = gender === 'female' ? 'male' : 'female';
              setGenderValue(next);
              playerRef.current?.setGender(next);
            }}
            title={`Switch to ${gender === 'female' ? 'male' : 'female'} voice`}
            style={{
              fontSize: 13, padding: '5px 9px', borderRadius: 7,
              background: BG3, border: `1px solid ${BORDER}`, color: TEXT2, cursor: 'pointer',
            }}
          >
            {gender === 'female' ? '♀' : '♂'}
          </button>
        </>
      )}
    </div>
  );
}

// ── Lecture content renderer ───────────────────────────────────────────────────

function LectureView({ lecture, courseTitle, onPractice, onMiniPractice }: {
  lecture: Lecture; courseTitle: string;
  onPractice: (q: string, lecture?: Lecture) => void;
  onMiniPractice: (q: string, lecture: Lecture) => void;
}) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px 60px' }}>
      {/* Lecture header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{LECTURE_ICONS[lecture.type]}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: lecture.type === 'practice' ? GREEN : lecture.type === 'quiz' ? PURPLE : BLUE,
            }}>{lecture.type}</span>
            <span style={{ fontSize: 11, color: TEXT3, marginLeft: 4 }}>· {lecture.estimatedMinutes} min</span>
          </div>
          <ReadAloudButton key={`${courseTitle}-${lecture.number}-${lecture.title}`} text={extractReadableText(lecture.content)} />
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
        {(() => {
          const lines = lecture.content.split('\n').filter(p => p.trim());
          const usedCode = new Set<number>();
          const usedDiagram = new Set<number>();
          lines.forEach(p => {
            const t = p.trim();
            const cm = t.match(/^\{\{CODE_(\d+)\}\}$/);
            const dm = t.match(/^\{\{DIAGRAM_(\d+)\}\}$/);
            if (cm) usedCode.add(Number(cm[1]) - 1);
            if (dm) usedDiagram.add(Number(dm[1]) - 1);
          });
          // Anything the AI generated but forgot to (or never tried to) place inline
          // still gets shown — appended after the prose — rather than silently dropped.
          const leftoverCode = (lecture.codeSamples ?? []).filter((_, i) => !usedCode.has(i));
          const leftoverDiagrams = (lecture.diagrams ?? []).filter((_, i) => !usedDiagram.has(i));

          return (
            <>
              {lines.map((para, i) => {
                const t = para.trim();
                const cm = t.match(/^\{\{CODE_(\d+)\}\}$/);
                const dm = t.match(/^\{\{DIAGRAM_(\d+)\}\}$/);
                if (cm) {
                  const sample = lecture.codeSamples?.[Number(cm[1]) - 1];
                  return sample ? <CodeBlock key={i} sample={sample} /> : null;
                }
                if (dm) {
                  const diagram = lecture.diagrams?.[Number(dm[1]) - 1];
                  return diagram ? <DiagramBlock key={i} diagram={diagram} /> : null;
                }
                return <p key={i} style={{ margin: '0 0 16px' }}>{para}</p>;
              })}
              {leftoverCode.map((s, i) => <CodeBlock key={`lc-${i}`} sample={s} />)}
              {leftoverDiagrams.map((d, i) => <DiagramBlock key={`ld-${i}`} diagram={d} />)}
            </>
          );
        })()}
      </div>

      {/* Reference solution — hidden by default so it doesn't spoil the exercise */}
      {lecture.type === 'practice' && lecture.solutionCode && (
        <SolutionReveal sample={lecture.solutionCode} />
      )}

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

      {/* Deep Dive */}
      {lecture.deepDive && (
        <div style={{
          background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.18)',
          borderRadius: 12, padding: '20px 24px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: BLUE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
            📖 Deep Dive
          </div>
          <p style={{ fontSize: 14, color: '#b8cef7', lineHeight: 1.75, margin: 0 }}>{lecture.deepDive}</p>
        </div>
      )}

      {/* Real-World Example */}
      {lecture.realWorldExample && (
        <div style={{
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 12, padding: '20px 24px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
            💡 Real-World Example
          </div>
          <p style={{ fontSize: 14, color: '#fde68a', lineHeight: 1.75, margin: 0 }}>{lecture.realWorldExample}</p>
        </div>
      )}

      {/* Memory Hook */}
      {lecture.memoryHook && (
        <div style={{
          background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.2)',
          borderRadius: 12, padding: '20px 24px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: GREEN, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
            🧠 Memory Hook
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#6EE7B7', lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>{lecture.memoryHook}</p>
        </div>
      )}

      {/* Common Misconceptions */}
      {lecture.commonMisconceptions?.length > 0 && (
        <div style={{
          background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.18)',
          borderRadius: 12, padding: '20px 24px', marginBottom: 24,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#F87171', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
            ⚠️ Common Misconceptions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {lecture.commonMisconceptions.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 700 }}>✗ Myth: </span>{m.myth}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingLeft: 12, borderLeft: '2px solid rgba(52,211,153,0.4)' }}>
                  <span style={{ fontSize: 13, color: '#9ff0d0', lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 700 }}>✓ Reality: </span>{m.reality}
                  </span>
                </div>
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
                style={{
                  background: 'rgba(167,139,250,0.08)',
                  border: '1px solid rgba(167,139,250,0.18)',
                  borderRadius: 10, padding: '12px 16px',
                }}
              >
                <div style={{ fontSize: 13, color: '#d4c5ff', lineHeight: 1.5 }}>{q}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => onMiniPractice(lecture.interviewQuestions[0] ?? lecture.title, lecture)}
              style={{
                background: 'linear-gradient(135deg, #7b5cf5, #5b8ff7)',
                color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', width: '100%',
              }}>
              🎯 Take Short Multiple Choice Test →
            </button>
          </div>

          <div style={{ marginTop: 12, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: `1px solid ${BORDER}` }}>
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

function buildQuestionsFromCourse(course: Course, focusLecture?: Lecture): InterviewQuestion[] {
  // For a focused practice (single lecture), use that lecture's questions + neighbours
  // For full course practice, pull top 2 questions from each module (up to 10 total)
  if (focusLecture) {
    const focusQs: InterviewQuestion[] = focusLecture.interviewQuestions.map((q, i) => ({
      questionId: `lq-${focusLecture.number}-${i}`,
      questionText: q,
      modelAnswer: `Draw on your understanding of ${focusLecture.title}. Be specific and use real examples.`,
      questionType: 'Technical',
      difficulty: 'Medium',
      source: 'Learn Engine',
      competencyTags: [focusLecture.title.toLowerCase()],
    }));
    // Pad to 5 with questions from the rest of the course
    const allOthers = course.modules.flatMap(m => m.lectures)
      .filter(l => l.number !== focusLecture.number)
      .flatMap((l, li) => l.interviewQuestions.map((q, i) => ({
        questionId: `xq-${li}-${i}`,
        questionText: q,
        modelAnswer: `Draw on your understanding of ${l.title}.`,
        questionType: 'Technical' as const,
        difficulty: 'Medium' as const,
        source: 'Learn Engine',
        competencyTags: [l.title.toLowerCase()],
      })));
    return [...focusQs, ...allOthers].slice(0, 5);
  }
  // Full course: 1 question per module (first lecture's first question), up to 10
  return course.modules.slice(0, 10).map((m, mi) => {
    const q = m.lectures[0]?.interviewQuestions[0] ?? `Tell me about your experience with ${m.title}.`;
    return {
      questionId: `cq-${mi}`,
      questionText: q,
      modelAnswer: `Draw on your understanding of ${m.title} from the ${course.title} course.`,
      questionType: 'Technical' as const,
      difficulty: 'Medium' as const,
      source: 'Learn Engine',
      competencyTags: [m.title.toLowerCase()],
    };
  });
}

function CourseView({ course, onBack, onUpdateCourse }: { course: Course; onBack: () => void; onUpdateCourse: (course: Course) => void }) {
  const navigate = useNavigate();
  const [expandedModule, setExpandedModule] = useState<number>(1);
  const [activeLecture, setActiveLecture] = useState<{ module: Module; lecture: Lecture } | null>(() => {
    const firstLecture = course.modules[0]?.lectures[0];
    return firstLecture ? { module: course.modules[0], lecture: firstLecture } : null;
  });
  const [retryingModule, setRetryingModule] = useState<number | null>(null);
  const [miniPractice, setMiniPractice] = useState<{ topic: string; seedQuestion: string } | null>(null);
  const { accent, bg } = catStyle(course.category);
  const mins = totalMinutes(course);

  async function retryModule(modNumber: number) {
    const modIndex = course.modules.findIndex(m => m.number === modNumber);
    if (modIndex === -1) return;
    setRetryingModule(modNumber);
    let lectures: Lecture[] | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
        lectures = await generateModuleLectures(course.title, course.modules[modIndex], course.level);
        break;
      } catch (e) {
        console.warn(`[LearnEngine] Retry module ${modNumber} attempt ${attempt + 1} failed:`, e);
      }
    }
    const updatedModules = [...course.modules];
    updatedModules[modIndex] = { ...updatedModules[modIndex], lectures: lectures ?? [], loading: false };
    const updated = { ...course, modules: updatedModules };
    onUpdateCourse(updated);
    setRetryingModule(null);

    // Push the corrected course back to the platform cache so it stops
    // serving the previously-broken snapshot to other users.
    if (lectures) {
      fetch(`${API_BASE}/api/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: course.title, level: course.level, course: updated }),
      }).catch(() => { /* non-critical */ });
    }
  }

  // Auto-select first lecture once Module 1's content arrives (progressive load)
  useEffect(() => {
    if (!activeLecture) {
      const firstLecture = course.modules[0]?.lectures[0];
      if (firstLecture) setActiveLecture({ module: course.modules[0], lecture: firstLecture });
    }
  }, [course.modules[0]?.lectures[0]]);

  function handlePractice(question: string, lecture?: Lecture) {
    const questions = question && lecture
      ? buildQuestionsFromCourse(course, lecture)
      : buildQuestionsFromCourse(course);
    const sarahIntro = `Hi — I'm Sarah. Today we're going to run through some interview questions based on your ${course.title} course. James will be leading the technical questions. When each question appears, click Record to answer. Good luck!`;
    const jamesIntro = question
      ? `Thanks Sarah. I've been reviewing your ${course.title} course work, and I'd like to start with a question on ${lecture?.title ?? 'one of the topics'}. Here we go.`
      : `Thanks Sarah. I've prepared questions covering the key modules from your ${course.title} course. Let's see what you've learned.`;
    const state: RoomState = {
      questions,
      jobTitle: course.title,
      sarahIntro,
      jamesIntro,
      specialistTitle: 'Learn Engine',
      autoStart: true,
    };
    navigate('/interview/learn-practice', { state });
  }

  function handleMiniPractice(question: string, lecture: Lecture) {
    setMiniPractice({ topic: lecture.title, seedQuestion: question });
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
                    <div style={{ fontSize: 10, color: !mod.loading && mod.lectures.length === 0 ? '#F87171' : TEXT3 }}>
                      {mod.loading ? '…' : mod.lectures.length === 0 ? 'Failed' : fmtHours(modMins)}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: isExpanded ? TEXT1 : TEXT2, lineHeight: 1.4, fontWeight: isExpanded ? 600 : 400 }}>
                    {mod.title}
                  </div>
                </div>

                {/* Lectures — show skeleton while module is loading */}
                {isExpanded && mod.loading && (
                  <div style={{ padding: '12px 16px 12px 28px', borderBottom: `1px solid ${BORDER}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: TEXT3, fontSize: 12 }}>
                      <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                      Writing lectures…
                    </div>
                  </div>
                )}

                {/* Failed to generate — offer retry instead of leaving it silently empty */}
                {isExpanded && !mod.loading && mod.lectures.length === 0 && (
                  <div style={{ padding: '12px 16px 12px 28px', borderBottom: `1px solid ${BORDER}` }}>
                    <div style={{ fontSize: 12, color: '#F87171', marginBottom: 8 }}>
                      This module failed to generate.
                    </div>
                    <button
                      onClick={() => retryModule(mod.number)}
                      disabled={retryingModule === mod.number}
                      style={{
                        background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                        borderRadius: 8, color: retryingModule === mod.number ? TEXT3 : '#F87171',
                        fontSize: 11, fontWeight: 700, padding: '6px 12px',
                        cursor: retryingModule === mod.number ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                      {retryingModule === mod.number ? (
                        <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Retrying…</>
                      ) : '↻ Retry'}
                    </button>
                  </div>
                )}
                {isExpanded && !mod.loading && mod.lectures.length > 0 && mod.lectures.map(lec => {
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
              onMiniPractice={handleMiniPractice}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: TEXT3 }}>
              {course.modules[0]?.loading ? (
                <>
                  <span style={{ fontSize: 28, animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>⟳</span>
                  <div style={{ fontSize: 14 }}>Writing Module 1 lectures…</div>
                </>
              ) : (
                <div style={{ fontSize: 14 }}>Select a lecture to begin</div>
              )}
            </div>
          )}
        </div>
      </div>

      {miniPractice && (
        <MiniPracticeSession
          courseTitle={course.title}
          topic={miniPractice.topic}
          seedQuestion={miniPractice.seedQuestion}
          onClose={() => setMiniPractice(null)}
        />
      )}
    </div>
  );
}

// ── Main LearnPanel ────────────────────────────────────────────────────────────

export default function LearnPanel({ initialTopic }: { initialTopic?: string } = {}) {
  const [query, setQuery] = useState(initialTopic ?? '');
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Expert'>('Intermediate');
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [error, setError] = useState('');
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [savedCourses, setSavedCourses] = useState<Course[]>(() => loadCourses());
  const [suggestions, setSuggestions] = useState<{ title: string; level: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggFocused, setSuggFocused] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const genTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function handleQueryChange(val: string) {
    setQuery(val);
    setError('');
    setSuggFocused(-1);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (val.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceTimer.current = setTimeout(async () => {
      // Platform suggestions (courses other users have already generated)
      const platformSuggs: { title: string; level: string }[] = [];
      try {
        const r = await fetch(`${API_BASE}/api/courses/suggest?q=${encodeURIComponent(val.trim())}`);
        if (r.ok) platformSuggs.push(...(await r.json() as { title: string; level: string }[]));
      } catch { /* ignore */ }
      // Local SUGGESTIONS filtered by query
      const q = val.toLowerCase();
      const localSuggs = SUGGESTIONS
        .filter(s => s.title.toLowerCase().includes(q))
        .map(s => ({ title: s.title, level: '' }));
      // Merge: platform first, then local, deduplicated
      const seen = new Set(platformSuggs.map(s => s.title.toLowerCase()));
      const merged = [...platformSuggs, ...localSuggs.filter(s => !seen.has(s.title.toLowerCase()))].slice(0, 8);
      setSuggestions(merged);
      setShowSuggestions(merged.length > 0);
    }, 280);
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    deleteCourse(id);
    setSavedCourses(loadCourses());
  }

  async function handleGenerate(title?: string) {
    const t = (title ?? query).trim();
    if (!t || t.length < 3) {
      setError('Please enter a course topic (at least 3 characters).');
      inputRef.current?.focus();
      return;
    }
    setError('');

    // 1. Local browser cache (instant)
    const localCached = findCached(t, level);
    if (localCached) { setActiveCourse(localCached); return; }

    // 2. Platform cache (Cosmos — shared across all users)
    try {
      const pr = await fetch(`${API_BASE}/api/courses/cached?title=${encodeURIComponent(t)}&level=${encodeURIComponent(level)}`);
      if (pr.ok) {
        const platformCourse = await pr.json() as Omit<Course, 'id' | 'createdAt'>;
        const course: Course = { ...platformCourse, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        saveCourse(course);
        setSavedCourses(loadCourses());
        setActiveCourse(course);
        return;
      }
    } catch { /* platform cache unavailable — generate fresh */ }

    // 3. Generate fresh — phase 1: outline (fast), then modules in background
    setGenerating(true);
    try {
      const outline = await generateOutline(t, level);

      // Build course skeleton with loading placeholders for all modules
      const skeletonModules: Module[] = outline.modules.map(m => ({
        ...m,
        lectures: [],
        loading: true,
      }));
      const courseId = crypto.randomUUID();
      const skeleton: Course = {
        ...outline,
        id: courseId,
        createdAt: new Date().toISOString(),
        modules: skeletonModules,
      };

      setActiveCourse(skeleton);
      setGenerating(false);

      // Phase 2: fill every module's lectures concurrently in the background — not one at a
      // time — so clicking ahead to module 6 never means waiting on modules 2-5's turn in a
      // queue first. Each module still retries independently; the UI updates as each one
      // finishes, in whatever order they actually complete.
      const filled = { ...skeleton, modules: [...skeletonModules] };
      const fillModule = async (i: number) => {
        let lectures: Lecture[] | null = null;
        // Three attempts per module — GPT occasionally returns malformed JSON
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
            lectures = await generateModuleLectures(outline.title, outline.modules[i], level);
            break;
          } catch (e) {
            console.warn(`[LearnEngine] Module ${i + 1} attempt ${attempt + 1} failed:`, e);
          }
        }
        filled.modules[i] = { ...filled.modules[i], lectures: lectures ?? [], loading: false };
        setActiveCourse({ ...filled, modules: [...filled.modules] });
      };
      await Promise.allSettled(outline.modules.map((_, i) => fillModule(i)));

      // All done — save complete course locally regardless of per-module failures,
      // but only push to the shared platform cache if every module actually generated —
      // a partial course must never be cached, since every future viewer would be
      // served that same broken snapshot for the full 2-day Cosmos TTL.
      saveCourse(filled);
      setSavedCourses(loadCourses());
      if (filled.modules.every(m => m.lectures.length > 0)) {
        fetch(`${API_BASE}/api/courses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: t, level, course: filled }),
        }).catch(() => { /* non-critical */ });
      }
    } catch (e) {
      setError('Course generation failed — please try again. Check your OpenAI balance if the error persists.');
      setGenerating(false);
    }
  }

  // ── Course view ──
  if (activeCourse) {
    return (
      <CourseView
        course={activeCourse}
        onBack={() => setActiveCourse(null)}
        onUpdateCourse={(updated) => {
          setActiveCourse(updated);
          saveCourse(updated);
          setSavedCourses(loadCourses());
        }}
      />
    );
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
      <div style={{ maxWidth: 680, marginBottom: 32, position: 'relative' }}>
        {/* Title input */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(255,255,255,0.05)',
          border: `1.5px solid ${error ? '#f87171' : 'rgba(167,139,250,0.4)'}`,
          borderRadius: showSuggestions ? '12px 12px 0 0' : '12px 12px 0 0', padding: '0 18px',
          boxShadow: '0 0 0 4px rgba(167,139,250,0.06)',
        }}>
          <span style={{ fontSize: 20, marginRight: 4 }}>📚</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSuggFocused(i => Math.min(i + 1, suggestions.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setSuggFocused(i => Math.max(i - 1, -1)); }
              else if (e.key === 'Enter') {
                if (suggFocused >= 0 && suggestions[suggFocused]) {
                  const s = suggestions[suggFocused];
                  setQuery(s.title);
                  if (s.level) setLevel(s.level as 'Beginner' | 'Intermediate' | 'Expert');
                  setShowSuggestions(false);
                  setSuggFocused(-1);
                } else { handleGenerate(); }
              } else if (e.key === 'Escape') { setShowSuggestions(false); setSuggFocused(-1); }
            }}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="e.g. Certified Chief Technology Officer, Plumbing Fundamentals, Data Science..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: TEXT1, fontSize: 15, padding: '18px 12px',
              fontFamily: 'inherit',
            }}
          />
          {query && (
            <button onClick={() => { setQuery(''); setSuggestions([]); setShowSuggestions(false); setError(''); inputRef.current?.focus(); }}
              style={{ background: 'none', border: 'none', color: TEXT3, cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>✕</button>
          )}
        </div>

        {/* Typeahead dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute', top: 62, left: 0, right: 0, zIndex: 50,
            background: '#1a1d27', border: '1.5px solid rgba(167,139,250,0.35)',
            borderTop: 'none', borderRadius: '0 0 12px 12px',
            overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
            {suggestions.map((s, i) => (
              <div
                key={i}
                onMouseDown={() => {
                  setQuery(s.title);
                  if (s.level) setLevel(s.level as 'Beginner' | 'Intermediate' | 'Expert');
                  setShowSuggestions(false);
                  setSuggFocused(-1);
                  inputRef.current?.focus();
                }}
                style={{
                  padding: '11px 20px', cursor: 'pointer',
                  background: i === suggFocused ? 'rgba(167,139,250,0.12)' : 'transparent',
                  borderBottom: i < suggestions.length - 1 ? `1px solid ${BORDER}` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={() => setSuggFocused(i)}
                onMouseLeave={() => setSuggFocused(-1)}
              >
                <span style={{ fontSize: 14, color: TEXT1 }}>{s.title}</span>
                {s.level ? (
                  <span style={{
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                    color: LEVEL_COLOURS[s.level as keyof typeof LEVEL_COLOURS] ?? PURPLE,
                    background: (LEVEL_COLOURS[s.level as keyof typeof LEVEL_COLOURS] ?? PURPLE) + '18',
                    borderRadius: 20, padding: '2px 8px',
                  }}>{s.level} · cached</span>
                ) : (
                  <span style={{ fontSize: 10, color: TEXT3, flexShrink: 0 }}>suggestion</span>
                )}
              </div>
            ))}
          </div>
        )}

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
              <div key={course.id} style={{ position: 'relative' }}>
                <CourseCard course={course} onClick={() => setActiveCourse(course)} />
                <button
                  onClick={e => handleDelete(course.id, e)}
                  title="Remove course"
                  style={{
                    position: 'absolute', top: 10, right: 10,
                    background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`,
                    borderRadius: '50%', width: 22, height: 22,
                    color: TEXT3, cursor: 'pointer', fontSize: 12, lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#F87171'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(248,113,113,0.4)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = TEXT3; (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}
                >×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
