import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { generateLesson, saveLesson, getLessons, getWeakTopics, dismissWeakTopic } from '../api/learnApi';
import { logFlowEvent } from '../api/flowLogger';
import type { LessonData } from '../types/learn';
import type { WeakTopic } from '../api/learnApi';

const LANGUAGES = [
  'English', 'French', 'Spanish', 'German', 'Portuguese', 'Dutch',
  'Italian', 'Polish', 'Arabic', 'Chinese (Mandarin)', 'Japanese',
  'Korean', 'Hindi', 'Swahili', 'Romanian',
];

const CAT_COLOURS: Record<string, string> = {
  Technology: '#1E4DD8', Mathematics: '#7C3AED', Business: '#0891B2',
  Science: '#DB2777', History: '#D97706', 'Sport & Fitness': '#2D9E6A',
  'Social Sciences': '#6366F1', 'Language & Literature': '#65A30D',
};

const LOADING_MSGS = [
  'Generating key concepts…',
  'Writing deep dives…',
  'Crafting exam questions…',
  'Building your glossary…',
  'Almost ready…',
];

type RecentLesson = { id: string; subject: string; category: string; emoji: string; createdAt: string; language: string };

export default function LearnHome() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [language, setLanguage] = useState('English');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const [recentLessons, setRecentLessons] = useState<RecentLesson[]>([]);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    logFlowEvent('LEARN_HOME_VIEWED');
    setWeakTopics(getWeakTopics());
    getLessons().then(lessons => {
      setRecentLessons(lessons.slice(0, 6).map(l => ({
        id: l.id,
        subject: l.subject,
        category: (l as any).category ?? l.lesson?.category ?? 'General',
        emoji: (l as any).emoji ?? l.lesson?.emoji ?? '📖',
        createdAt: l.createdAt,
        language: l.language,
      })));
    }).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    const trimmed = subject.trim();
    if (trimmed.length < 2) return;
    setError('');
    setLoading(true);
    logFlowEvent('GENERATE_LESSON_CLICKED', { subject: trimmed, language });

    let msgIdx = 0;
    setLoadingMsg(LOADING_MSGS[0]);
    const interval = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, LOADING_MSGS.length - 1);
      setLoadingMsg(LOADING_MSGS[msgIdx]);
    }, 2000);

    try {
      const lesson: LessonData = await generateLesson(trimmed, language);
      logFlowEvent('LESSON_GENERATED', { subject: trimmed, category: lesson.category, language });

      const { id } = await saveLesson(lesson, language);
      logFlowEvent('LESSON_SAVED', { id, subject: trimmed });

      navigate(`/learn/lesson/${id}`, { state: { lesson, language } });
    } catch (e: any) {
      setError(e.message ?? 'Failed to generate lesson. Please try again.');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleGenerate();
  };

  const catColour = (cat: string) => CAT_COLOURS[cat] ?? '#475569';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#080E1C', color: '#FFFFFF', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Glow */}
      <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '8px 14px', color: 'rgba(255,255,255,0.60)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            ← Back
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #6366F1, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📚</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>InterviewMe · Learn Engine</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/learn/flash-talk')} style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.30)', borderRadius: 10, padding: '8px 14px', color: '#F59E0B', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              ⚡ Flash Talk
            </button>
            <button onClick={() => navigate('/learn/bookshelf')} style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 10, padding: '8px 14px', color: '#A5B4FC', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              📚 My Bookshelf
            </button>
          </div>
        </div>

        {/* Weak spots from interview */}
        {weakTopics.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: 16, padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ fontSize: 14 }}>🎯</div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F87171' }}>
                Recommended — based on your last interview
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {weakTopics.map(t => (
                <div key={t.subject} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 20, padding: '6px 12px 6px 14px' }}>
                  <button onClick={() => setSubject(t.subject)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#FCA5A5', padding: 0, fontFamily: 'inherit' }}>
                    {t.subject}
                    <span style={{ fontSize: 10, color: 'rgba(252,165,165,0.6)', marginLeft: 6 }}>{t.scorePct}%</span>
                  </button>
                  <button onClick={() => { dismissWeakTopic(t.subject); setWeakTopics(getWeakTopics()); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(252,165,165,0.5)', fontSize: 14, padding: '0 0 0 2px', lineHeight: 1, fontFamily: 'inherit' }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <h1 style={{ fontSize: 38, fontWeight: 900, letterSpacing: -0.8, marginBottom: 8, lineHeight: 1.15 }}>
            What will you master<br /><span style={{ background: 'linear-gradient(90deg, #6366F1, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>today?</span>
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', marginBottom: 36, lineHeight: 1.6 }}>
            Enter any subject. Get a full structured lesson — key concepts, glossary, exam questions, and a quiz — in seconds.
          </p>
        </motion.div>

        {/* Subject input card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: 'rgba(255,255,255,0.30)', marginBottom: 10, textTransform: 'uppercase' }}>Your Topic</div>
          <input
            ref={inputRef}
            value={subject}
            onChange={e => { setSubject(e.target.value); logFlowEvent('SUBJECT_ENTERED', { subject: e.target.value }); }}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Quantum Entanglement, React Hooks, The Roman Empire…"
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 18, fontWeight: 600, color: '#FFFFFF', caretColor: '#6366F1', boxSizing: 'border-box' }}
          />
        </motion.div>

        {/* Language selector */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: 'rgba(255,255,255,0.30)', marginBottom: 8, textTransform: 'uppercase' }}>Lesson Language</div>
          <select
            value={language}
            onChange={e => { setLanguage(e.target.value); logFlowEvent('LANGUAGE_SELECTED', { language: e.target.value }); }}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '12px 16px', color: '#FFFFFF', fontSize: 15, fontWeight: 600, width: '100%', cursor: 'pointer', outline: 'none' }}
          >
            {LANGUAGES.map(l => <option key={l} value={l} style={{ background: '#0F172A' }}>{l}</option>)}
          </select>
          {language !== 'English' && (
            <p style={{ fontSize: 12, color: 'rgba(165,180,252,0.70)', marginTop: 6, marginBottom: 0 }}>
              Your full lesson — concepts, glossary, questions, and quiz — will be generated in {language}.
            </p>
          )}
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#F87171' }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generate button */}
        <motion.button
          onClick={handleGenerate}
          disabled={subject.trim().length < 2 || loading}
          whileHover={subject.trim().length >= 2 && !loading ? { scale: 1.02 } : {}}
          whileTap={subject.trim().length >= 2 && !loading ? { scale: 0.98 } : {}}
          style={{
            width: '100%', padding: '18px 24px', borderRadius: 16, border: 'none', cursor: subject.trim().length >= 2 && !loading ? 'pointer' : 'default',
            background: subject.trim().length >= 2 && !loading ? 'linear-gradient(135deg, #4F46E5, #6366F1)' : 'rgba(255,255,255,0.07)',
            color: subject.trim().length >= 2 && !loading ? '#FFFFFF' : 'rgba(255,255,255,0.30)',
            fontSize: 16, fontWeight: 800, transition: 'all 0.2s',
            boxShadow: subject.trim().length >= 2 && !loading ? '0 8px 24px rgba(99,102,241,0.35)' : 'none',
            marginBottom: 40,
          }}
        >
          {loading ? loadingMsg : subject.trim().length < 2 ? 'Enter a topic to generate your lesson' : `Generate Lesson in ${language} →`}
        </motion.button>

        {/* Recent lessons */}
        {recentLessons.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Recent Lessons</div>
              <button onClick={() => navigate('/learn/bookshelf')} style={{ background: 'none', border: 'none', color: '#6366F1', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>View all →</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {recentLessons.map(l => (
                <button key={l.id} onClick={() => navigate(`/learn/lesson/${l.id}`)}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 16, textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', color: '#FFFFFF' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.08)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.25)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{l.emoji}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>{l.subject}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: catColour(l.category) + '22', color: catColour(l.category), border: `1px solid ${catColour(l.category)}44` }}>{l.category}</span>
                    {l.language !== 'English' && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)' }}>{l.language}</span>}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Popular topics */}
        {recentLessons.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: 'rgba(255,255,255,0.35)', marginBottom: 12, textTransform: 'uppercase' }}>Popular Topics</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['React Hooks', 'Quantum Mechanics', 'The Psychology of Money', 'Docker & Kubernetes', 'The Roman Empire', 'Compound Interest', 'Machine Learning', 'Human Anatomy'].map(t => (
                <button key={t} onClick={() => setSubject(t)}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '8px 14px', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.40)'; (e.currentTarget as HTMLButtonElement).style.color = '#FFFFFF'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.65)'; }}
                >
                  {t}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Loading overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(8,14,28,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(99,102,241,0.30)', borderRadius: 24, padding: 40, textAlign: 'center', maxWidth: 360 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>📚</div>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>{subject}</div>
              <div style={{ fontSize: 14, color: '#A5B4FC', fontWeight: 700, marginBottom: 6 }}>{loadingMsg}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)' }}>AI is writing your lesson…</div>
              <div style={{ marginTop: 24, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  style={{ height: '100%', width: '40%', background: 'linear-gradient(90deg, transparent, #6366F1, transparent)', borderRadius: 4 }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
