import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getLeague, addLeagueEntry, type LeagueEntry } from '../utils/leagueStore';

type Phase = 'table' | 'setup' | 'subject' | 'cinematic' | 'quickfire' | 'scoring' | 'results';

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
const EL_KEY    = import.meta.env.VITE_ELEVENLABS_API_KEY as string | undefined;
const EL_VOICE  = import.meta.env.VITE_ELEVENLABS_VOICE_TECH as string | undefined;

const FALLBACK_QUESTIONS = [
  'Tell me about your greatest professional achievement and the impact it had.',
  'Describe a situation where you had to adapt quickly to a major change.',
  'How do you prioritise competing tasks under time pressure?',
  'Tell me about a time you disagreed with a senior colleague. How did you handle it?',
  "What's the most complex problem you've solved? Walk me through your approach.",
  'Describe a time you failed. What did you learn from it?',
  'How do you stay current with developments in your field?',
  'Tell me about a time you led or influenced without formal authority.',
  'What does great performance look like in your role?',
  'Describe a situation where you had to make a decision with incomplete information.',
  'How do you handle a difficult stakeholder or client?',
  'Where do you see your career in the next 3-5 years?',
];

const CHALLENGE_SUBJECTS = [
  'Software Architecture', 'System Design', 'Technical Leadership', 'Product Strategy',
  'Marketing Strategy', 'UX Design', 'Data Science', 'Machine Learning',
  'Stakeholder Management', 'Agile Leadership', 'Sales Excellence', 'Executive Presence',
];

async function generateQuestions(subject: string): Promise<string[]> {
  if (!OPENAI_KEY) return FALLBACK_QUESTIONS;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o', temperature: 0.8,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are an expert interview question writer. Return ONLY valid JSON.' },
          { role: 'user', content: `Generate 12 concise, challenging interview questions for: "${subject}". Mix behavioural, technical, and situational questions. No sub-parts. Return JSON: { "questions": ["Q1", "Q2", ...] }` },
        ],
      }),
    });
    const data = await res.json() as { choices: { message: { content: string } }[] };
    const parsed = JSON.parse(data.choices[0].message.content) as { questions: string[] };
    return parsed.questions.slice(0, 12);
  } catch {
    return FALLBACK_QUESTIONS;
  }
}

async function scoreSession(qas: { q: string; a: string }[], subject: string): Promise<{ rel: number; cla: number; dep: number; con: number; overall: number }> {
  const answered = qas.filter(qa => qa.a.trim().length > 10);
  if (!answered.length) return { rel: 0, cla: 0, dep: 0, con: 0, overall: 0 };

  if (!OPENAI_KEY) {
    const avg = Math.min(85, Math.round(answered.reduce((s, qa) => s + Math.min(100, qa.a.split(' ').length * 2.5), 0) / answered.length));
    return { rel: avg, cla: avg + 2, dep: avg - 8, con: avg - 4, overall: avg - 2 };
  }

  try {
    const formatted = answered.map((qa, i) => `Q${i + 1}: ${qa.q}\nA: ${qa.a}`).join('\n\n');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o', temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are an expert interview scorer. Return ONLY valid JSON.' },
          { role: 'user', content: `Score this candidate's ${subject} challenge session (0-100 per dimension).\n\n${formatted}\n\nrel = relevance & domain knowledge\ncla = clarity & structure\ndep = depth, examples, specifics\ncon = confidence, not hedged\noverall = weighted (rel 35%, cla 25%, dep 25%, con 15%)\n\nReturn JSON: { "rel": 0, "cla": 0, "dep": 0, "con": 0, "overall": 0 }` },
        ],
      }),
    });
    const data = await res.json() as { choices: { message: { content: string } }[] };
    return JSON.parse(data.choices[0].message.content) as { rel: number; cla: number; dep: number; con: number; overall: number };
  } catch {
    const avg = Math.min(80, Math.round(answered.length * 7));
    return { rel: avg, cla: avg, dep: avg - 5, con: avg - 3, overall: avg - 2 };
  }
}

async function speak(text: string): Promise<void> {
  if (!EL_KEY || !EL_VOICE) return;
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE}`, {
      method: 'POST',
      headers: { 'xi-api-key': EL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_turbo_v2_5', voice_settings: { stability: 0.5, similarity_boost: 0.8 } }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    await audio.play();
  } catch { /* silent */ }
}

function scoreColor(v: number) {
  if (v >= 88) return '#34D399';
  if (v >= 75) return '#60A5FA';
  if (v >= 60) return '#FBBF24';
  return '#F87171';
}

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function ScoreBadge({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)' }}>{label}</div>
      <div style={{ fontSize: '15px', fontWeight: 800, color: scoreColor(value), fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

export default function LeagueTable() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('table');
  const [entries, setEntries] = useState<LeagueEntry[]>([]);
  const [newEntry, setNewEntry] = useState<LeagueEntry | null>(null);

  // Setup
  const [userName, setUserName] = useState('');
  const [userJobTitle, setUserJobTitle] = useState('');
  const [userExp, setUserExp] = useState('');

  // Subject
  const [subject, setSubject] = useState('');

  // Cinematic
  const [cinematicStep, setCinematicStep] = useState(0);

  // Quickfire
  const [questions, setQuestions] = useState<string[]>([]);
  const [qReady, setQReady] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [sessionAnswers, setSessionAnswers] = useState<{ q: string; a: string }[]>([]);
  const [timeLeft, setTimeLeft] = useState(180);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Results
  const [scores, setScores] = useState<{ rel: number; cla: number; dep: number; con: number; overall: number } | null>(null);

  useEffect(() => { setEntries(getLeague()); }, []);

  // Cinematic phase: sequence text lines + auto-advance
  useEffect(() => {
    if (phase !== 'cinematic') return;
    setCinematicStep(0);
    const t1 = setTimeout(() => setCinematicStep(1), 800);
    const t2 = setTimeout(() => setCinematicStep(2), 2800);
    const t3 = setTimeout(() => setCinematicStep(3), 4800);
    const t4 = setTimeout(() => setCinematicStep(4), 6600);
    const advance = setTimeout(() => setPhase('quickfire'), 8200);
    return () => [t1, t2, t3, t4, advance].forEach(clearTimeout);
  }, [phase]);

  // Quickfire timer
  useEffect(() => {
    if (phase !== 'quickfire') return;
    setTimeLeft(180);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          finishSession();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const startChallenge = async () => {
    setPhase('cinematic');
    speak(`${userName}, you have chosen ${subject}. You have 3 minutes. Your time starts now.`);
    const qs = await generateQuestions(subject);
    setQuestions(qs);
    setQReady(true);
    setQIndex(0);
    setCurrentAnswer('');
    setSessionAnswers([]);
  };

  const nextQuestion = () => {
    const saved = [...sessionAnswers, { q: questions[qIndex] ?? '', a: currentAnswer }];
    setSessionAnswers(saved);
    setCurrentAnswer('');
    if (qIndex + 1 >= questions.length) {
      finishSession(saved);
    } else {
      setQIndex(i => i + 1);
    }
  };

  const finishSession = (overrideAnswers?: { q: string; a: string }[]) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const allAnswers = overrideAnswers ?? [...sessionAnswers, { q: questions[qIndex] ?? '', a: currentAnswer }];
    setPhase('scoring');
    scoreSession(allAnswers, subject).then(result => {
      setScores(result);
      const entry = addLeagueEntry({
        name: userName,
        jobTitle: userJobTitle,
        experience: parseInt(userExp) || 0,
        subject,
        ...result,
      });
      setNewEntry(entry);
      setEntries(getLeague());
      setPhase('results');
    });
  };

  const resetToTable = () => {
    setPhase('table');
    setNewEntry(null);
    setScores(null);
    setEntries(getLeague());
  };

  const card: React.CSSProperties = {
    background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px',
    width: '100%', maxWidth: '520px',
  };
  const input: React.CSSProperties = {
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px',
    padding: '13px 16px', color: 'var(--text)', fontSize: '14px', outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box',
  };
  const btnPrimary = (enabled: boolean): React.CSSProperties => ({
    background: enabled ? 'var(--blue)' : 'rgba(79,142,247,0.3)',
    color: '#fff', border: 'none', borderRadius: '10px', padding: '13px 32px',
    fontSize: '14px', fontWeight: 700, cursor: enabled ? 'pointer' : 'default', fontFamily: 'inherit',
    width: '100%', marginTop: '16px',
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: '-apple-system,"Segoe UI",sans-serif' }}>
      <AnimatePresence mode="wait">

        {/* ── LEAGUE TABLE ── */}
        {phase === 'table' && (
          <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ padding: '0 16px 60px' }}>
            {/* Header bar */}
            <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
              <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', padding: '4px 0' }}>← Back</button>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Explain Challenge League</span>
              <div style={{ width: 60 }} />
            </div>

            <div style={{ maxWidth: '900px', margin: '0 auto', paddingTop: '48px' }}>
              {/* Hero */}
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏆</div>
                <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text)', margin: '0 0 10px', letterSpacing: '-0.02em' }}>Explain Challenge League</h1>
                <p style={{ fontSize: '15px', color: 'var(--text-2)', margin: '0 0 28px', lineHeight: 1.6 }}>
                  3-minute quickfire challenge. No coaching. Your answers, your score, the global table.
                </p>
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setPhase('setup')}
                  style={{ background: 'linear-gradient(135deg,#1B3A6B,#2563eb)', color: '#fff', border: 'none', borderRadius: '12px', padding: '15px 40px', fontSize: '15px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(37,99,235,0.4)', letterSpacing: '0.01em' }}>
                  ⚡ Play Challenge
                </motion.button>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '10px' }}>Top scorer in each category wins 6 months free Percentile subscription.</div>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
                {[['REL', 'Relevance'], ['CLA', 'Clarity'], ['DEP', 'Depth'], ['CON', 'Confidence']].map(([abbr, full]) => (
                  <div key={abbr} style={{ fontSize: '11px', color: 'var(--text-3)' }}><strong style={{ color: 'var(--text-2)' }}>{abbr}</strong> = {full}</div>
                ))}
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['#', 'Name', 'Job Title', 'Exp', 'Challenge', 'REL', 'CLA', 'DEP', 'CON', 'Score', 'Date'].map(h => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '10px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, i) => {
                      const isNew = e.id === newEntry?.id;
                      return (
                        <motion.tr
                          key={e.id}
                          initial={isNew ? { background: 'rgba(79,142,247,0.15)' } : undefined}
                          animate={isNew ? { background: 'transparent' } : undefined}
                          transition={{ duration: 2 }}
                          style={{ borderBottom: i < entries.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: isNew ? 'rgba(79,142,247,0.06)' : 'transparent' }}
                        >
                          <td style={{ padding: '12px 14px', color: i < 3 ? ['#FFD700','#C0C0C0','#CD7F32'][i] : 'var(--text-3)', fontWeight: 700, fontSize: '12px', whiteSpace: 'nowrap' }}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                          </td>
                          <td style={{ padding: '12px 14px', color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {e.name}{isNew && <span style={{ marginLeft: '6px', fontSize: '10px', background: 'rgba(79,142,247,0.2)', color: 'var(--blue)', borderRadius: '4px', padding: '1px 6px', fontWeight: 700 }}>YOU</span>}
                          </td>
                          <td style={{ padding: '12px 14px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{e.jobTitle}</td>
                          <td style={{ padding: '12px 14px', color: 'var(--text-3)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{e.experience}y</td>
                          <td style={{ padding: '12px 14px', color: 'var(--text-2)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject}</td>
                          {([e.rel, e.cla, e.dep, e.con] as number[]).map((v, j) => (
                            <td key={j} style={{ padding: '12px 14px', fontWeight: 700, color: scoreColor(v), fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{v}</td>
                          ))}
                          <td style={{ padding: '12px 14px', fontWeight: 900, fontSize: '15px', color: scoreColor(e.overall), fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{e.overall}%</td>
                          <td style={{ padding: '12px 14px', color: 'var(--text-3)', fontSize: '11px', whiteSpace: 'nowrap' }}>{e.date}</td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── SETUP ── */}
        {phase === 'setup' && (
          <motion.div key="setup" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
            <div style={card}>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '6px' }}>Step 1 of 2</div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', margin: '0 0 24px' }}>Who's taking the challenge?</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Your Name</label>
                  <input style={input} value={userName} onChange={e => setUserName(e.target.value)} placeholder="e.g. Francis Cobbinah" />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Current Job Title</label>
                  <input style={input} value={userJobTitle} onChange={e => setUserJobTitle(e.target.value)} placeholder="e.g. Senior Software Architect" />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Years of Experience</label>
                  <input style={input} type="number" min="0" max="50" value={userExp} onChange={e => setUserExp(e.target.value)} placeholder="e.g. 10" />
                </div>
              </div>
              <button
                onClick={() => setPhase('subject')}
                disabled={!userName.trim() || !userJobTitle.trim()}
                style={btnPrimary(!!(userName.trim() && userJobTitle.trim()))}
              >
                Next: Choose Challenge →
              </button>
              <button onClick={resetToTable} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', display: 'block', textAlign: 'center', width: '100%', marginTop: '12px' }}>Cancel</button>
            </div>
          </motion.div>
        )}

        {/* ── SUBJECT ── */}
        {phase === 'subject' && (
          <motion.div key="subject" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
            <div style={card}>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '6px' }}>Step 2 of 2</div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>Choose your challenge</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 20px', lineHeight: 1.6 }}>What subject do you want to be challenged on? You'll face 12 quickfire questions with 3 minutes on the clock.</p>
              <input
                style={input}
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Software Architecture, Boxing Trainer, System Design…"
              />
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
                {CHALLENGE_SUBJECTS.map(s => (
                  <button key={s} onClick={() => setSubject(s)}
                    style={{ fontSize: '11px', fontWeight: 600, background: subject === s ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${subject === s ? 'rgba(79,142,247,0.3)' : 'var(--border)'}`, color: subject === s ? 'var(--blue)' : 'var(--text-3)', borderRadius: '20px', padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {s}
                  </button>
                ))}
              </div>
              <motion.button
                whileHover={subject.trim() ? { scale: 1.02 } : {}}
                onClick={subject.trim() ? startChallenge : undefined}
                disabled={!subject.trim()}
                style={{ ...btnPrimary(!!subject.trim()), background: subject.trim() ? 'linear-gradient(135deg,#1B3A6B,#2563eb)' : 'rgba(79,142,247,0.3)' }}
              >
                Accept Challenge ⚡
              </motion.button>
              <button onClick={() => setPhase('setup')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', display: 'block', textAlign: 'center', width: '100%', marginTop: '12px' }}>← Back</button>
            </div>
          </motion.div>
        )}

        {/* ── CINEMATIC ── */}
        {phase === 'cinematic' && (
          <motion.div key="cinematic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            {/* Spotlight */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 45%, rgba(255,200,80,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ textAlign: 'center', zIndex: 1, maxWidth: '560px', padding: '0 24px' }}>
              <AnimatePresence>
                {cinematicStep >= 1 && (
                  <motion.div key="l1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
                    style={{ fontSize: '28px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: '16px' }}>
                    {userName},
                  </motion.div>
                )}
                {cinematicStep >= 2 && (
                  <motion.div key="l2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
                    style={{ fontSize: '22px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: '12px' }}>
                    you have chosen <span style={{ color: '#60A5FA' }}>{subject}</span>.
                  </motion.div>
                )}
                {cinematicStep >= 3 && (
                  <motion.div key="l3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
                    style={{ fontSize: '18px', color: 'rgba(255,255,255,0.65)', marginBottom: '10px' }}>
                    You have <span style={{ color: '#FBBF24', fontWeight: 800 }}>3 minutes</span>.
                  </motion.div>
                )}
                {cinematicStep >= 4 && (
                  <motion.div key="l4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
                    style={{ fontSize: '16px', fontWeight: 700, color: '#F87171', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '8px' }}>
                    Your time starts now.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── QUICKFIRE ── */}
        {phase === 'quickfire' && (
          <motion.div key="quickfire" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column' }}>
            {/* Timer bar */}
            <div style={{ background: '#111', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em' }}>
                Q{qReady ? qIndex + 1 : '–'} / {questions.length || 12}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: timeLeft <= 30 ? '#F87171' : timeLeft <= 60 ? '#FBBF24' : '#fff', letterSpacing: '-0.02em' }}>
                {formatTime(timeLeft)}
              </div>
              <button onClick={() => finishSession()} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                End
              </button>
            </div>

            {/* Progress bar */}
            <div style={{ height: '2px', background: 'rgba(255,255,255,0.05)' }}>
              <motion.div animate={{ width: `${((180 - timeLeft) / 180) * 100}%` }} style={{ height: '100%', background: timeLeft <= 30 ? '#F87171' : '#2563eb' }} />
            </div>

            {/* Question + answer area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
              {!qReady ? (
                <div style={{ textAlign: 'center' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    style={{ width: '32px', height: '32px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#2563eb', borderRadius: '50%', margin: '0 auto 16px' }} />
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>Loading questions…</div>
                </div>
              ) : (
                <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <AnimatePresence mode="wait">
                    <motion.div key={qIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      style={{ fontSize: '20px', fontWeight: 700, color: '#fff', lineHeight: 1.4, letterSpacing: '-0.01em' }}>
                      {questions[qIndex]}
                    </motion.div>
                  </AnimatePresence>
                  <textarea
                    key={`ans-${qIndex}`}
                    value={currentAnswer}
                    onChange={e => setCurrentAnswer(e.target.value)}
                    autoFocus
                    placeholder="Type your answer…"
                    rows={5}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', color: '#fff', fontSize: '14px', lineHeight: 1.65, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    {qIndex + 1 < questions.length && (
                      <button onClick={nextQuestion} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 28px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Next →
                      </button>
                    )}
                    {qIndex + 1 >= questions.length && (
                      <button onClick={() => finishSession()} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 28px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Submit ✓
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── SCORING ── */}
        {phase === 'scoring' && (
          <motion.div key="scoring" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', gap: '20px' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
              style={{ width: '48px', height: '48px', border: '3px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%' }} />
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>Calculating your score…</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>Analysing relevance, clarity, depth and confidence</div>
          </motion.div>
        )}

        {/* ── RESULTS ── */}
        {phase === 'results' && scores && newEntry && (
          <motion.div key="results" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', gap: '24px' }}>
            {/* Score card */}
            <div style={{ ...card, textAlign: 'center', maxWidth: '420px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '12px' }}>Challenge Complete</div>
              {/* Big score ring */}
              <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 20px' }}>
                <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" strokeWidth="8" />
                  <motion.circle
                    cx="60" cy="60" r="52" fill="none" stroke={scoreColor(scores.overall)} strokeWidth="8"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: '0 327' }}
                    animate={{ strokeDasharray: `${(scores.overall / 100) * 327} 327` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: scoreColor(scores.overall), fontVariantNumeric: 'tabular-nums' }}>{scores.overall}%</div>
                </div>
              </div>

              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{userName}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>{subject}</div>

              <div style={{ display: 'flex', justifyContent: 'space-around', padding: '16px', background: 'var(--bg3)', borderRadius: '10px', marginBottom: '20px' }}>
                <ScoreBadge label="REL" value={scores.rel} />
                <ScoreBadge label="CLA" value={scores.cla} />
                <ScoreBadge label="DEP" value={scores.dep} />
                <ScoreBadge label="CON" value={scores.con} />
              </div>

              {/* Rank */}
              {(() => {
                const rank = entries.findIndex(e => e.id === newEntry.id) + 1;
                return rank > 0 && (
                  <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '20px' }}>
                    You ranked <strong style={{ color: 'var(--text)' }}>#{rank}</strong> globally in {subject}.
                    {rank === 1 && <span style={{ marginLeft: '6px' }}>🥇 You're #1!</span>}
                  </div>
                );
              })()}

              {/* LEARN recommendation */}
              {scores.overall < 75 && (
                <div style={{ background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: 'var(--text-2)', textAlign: 'left', marginBottom: '16px', lineHeight: 1.6 }}>
                  You scored <strong style={{ color: 'var(--blue)' }}>{scores.overall}%</strong> in {subject}. Top candidates score 90%+. Use <strong>LEARN</strong> to study this topic for free.
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <button onClick={resetToTable} style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', padding: '13px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  View Full League Table →
                </button>
                <button onClick={() => { setPhase('subject'); setQIndex(0); setCurrentAnswer(''); setSessionAnswers([]); setScores(null); setNewEntry(null); }}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 24px', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Challenge Again
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
