import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getLessons } from '../api/learnApi';
import { logFlowEvent } from '../api/flowLogger';
import type { SavedLesson } from '../types/learn';

const CAT_COLOURS: Record<string, { spine: string; bg: string; text: string }> = {
  Technology:              { spine: '#1E4DD8', bg: '#1E3A7A', text: '#93C5FD' },
  Mathematics:             { spine: '#7C3AED', bg: '#3B1F6B', text: '#C4B5FD' },
  Business:                { spine: '#0891B2', bg: '#0C3A4A', text: '#67E8F9' },
  Science:                 { spine: '#DB2777', bg: '#5C1A3A', text: '#F9A8D4' },
  History:                 { spine: '#D97706', bg: '#4A2E0A', text: '#FCD34D' },
  'Sport & Fitness':       { spine: '#2D9E6A', bg: '#0A3D2B', text: '#6EE7B7' },
  'Social Sciences':       { spine: '#6366F1', bg: '#2D2B5C', text: '#C4B5FD' },
  'Language & Literature': { spine: '#65A30D', bg: '#1F3A1A', text: '#BEF264' },
};
const DEFAULT_CAT = { spine: '#475569', bg: '#1A1F3A', text: '#CBD5E1' };

const getCat = (cat: string) => CAT_COLOURS[cat] ?? DEFAULT_CAT;

function progressPct(sl: SavedLesson): number {
  const prog = sl.progress;
  if (!prog) return 0;
  const total = (prog.conceptsUnderstood?.length ?? 0) + (prog.misconceptionsUnderstood?.length ?? 0);
  const done = (prog.conceptsUnderstood?.filter(Boolean).length ?? 0) + (prog.misconceptionsUnderstood?.filter(Boolean).length ?? 0);
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

export default function LearnBookshelf() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<SavedLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SavedLesson | null>(null);
  const [filterCat, setFilterCat] = useState<string>('All');

  useEffect(() => {
    logFlowEvent('BOOKSHELF_VIEWED');
    getLessons().then(data => {
      setLessons(data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const categories = ['All', ...Array.from(new Set(lessons.map(l => l.lesson?.category).filter(Boolean)))];
  const filtered = filterCat === 'All' ? lessons : lessons.filter(l => l.lesson?.category === filterCat);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#080E1C', color: '#FFFFFF', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
          <button onClick={() => navigate('/learn')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '8px 14px', color: 'rgba(255,255,255,0.60)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            ← Learn
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5, margin: 0 }}>📚 My Bookshelf</h1>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{lessons.length} lesson{lessons.length !== 1 ? 's' : ''} saved</div>
          </div>
          <button onClick={() => navigate('/learn')} style={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)', border: 'none', borderRadius: 10, padding: '10px 18px', color: '#FFFFFF', cursor: 'pointer', fontSize: 13, fontWeight: 800 }}>
            + New Lesson
          </button>
        </div>

        {/* Category filter */}
        {categories.length > 2 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
            {categories.map(cat => {
              const c = getCat(cat);
              const active = filterCat === cat;
              return (
                <button key={cat} onClick={() => setFilterCat(cat)}
                  style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${active ? c.spine + '80' : 'rgba(255,255,255,0.08)'}`, background: active ? c.spine + '22' : 'rgba(255,255,255,0.04)', color: active ? c.text : 'rgba(255,255,255,0.50)', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s' }}>
                  {cat}
                </button>
              );
            })}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>Loading your lessons…</div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>No lessons yet</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.40)', marginBottom: 24 }}>Generate your first lesson and it will appear here</div>
            <button onClick={() => navigate('/learn')} style={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)', border: 'none', borderRadius: 12, padding: '14px 28px', color: '#FFFFFF', cursor: 'pointer', fontSize: 15, fontWeight: 800 }}>
              Generate a Lesson →
            </button>
          </div>
        )}

        {/* Book grid */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
            {filtered.map((sl, idx) => {
              const cat = getCat(sl.lesson?.category ?? '');
              const pct = progressPct(sl);
              const emoji = sl.lesson?.emoji ?? '📖';
              const subject = sl.subject;
              const date = new Date(sl.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              return (
                <motion.button
                  key={sl.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => setSelected(sl)}
                  style={{ background: cat.spine, border: 'none', borderRadius: '4px 6px 6px 4px', cursor: 'pointer', textAlign: 'left', position: 'relative', overflow: 'hidden', aspectRatio: '0.62', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '10px 8px', boxShadow: `3px 4px 14px rgba(0,0,0,0.55), inset 3px 0 0 rgba(255,255,255,0.15)` }}
                  whileHover={{ scale: 1.03, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: 'rgba(255,255,255,0.18)' }} />
                  <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 4, background: 'rgba(0,0,0,0.25)' }} />
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'rgba(0,0,0,0.20)' }} />

                  <div>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{emoji}</div>
                    <div style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.90)', lineHeight: 1.3, wordBreak: 'break-word' }}>{subject}</div>
                  </div>

                  <div>
                    {pct > 0 && (
                      <div style={{ height: 3, background: 'rgba(255,255,255,0.20)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#34D399' : 'rgba(255,255,255,0.70)', borderRadius: 2 }} />
                      </div>
                    )}
                    <div style={{ padding: '3px 0', borderTop: `1px solid ${cat.bg}` }}>
                      <div style={{ fontSize: 7, fontWeight: 800, color: cat.text, letterSpacing: 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sl.lesson?.category ?? ''}</div>
                      <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{date}</div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 }} onClick={() => setSelected(null)}>
          <motion.div
            initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, overflow: 'hidden', width: '100%', maxWidth: 440 }}>
            {(() => {
              const cat = getCat(selected.lesson?.category ?? '');
              const pct = progressPct(selected);
              return (
                <>
                  <div style={{ background: cat.spine, padding: 28, textAlign: 'center' }}>
                    <div style={{ fontSize: 44, marginBottom: 10 }}>{selected.lesson?.emoji ?? '📖'}</div>
                    <div style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, background: cat.bg, color: cat.text, fontSize: 11, fontWeight: 800, marginBottom: 10 }}>{selected.lesson?.category}</div>
                    <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.3, marginBottom: 6 }}>{selected.lesson?.title ?? selected.subject}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Saved {new Date(selected.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    {selected.language !== 'English' && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{selected.language}</div>}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {[
                      { num: selected.lesson?.keyConcepts.length ?? 0, label: 'Concepts' },
                      { num: selected.lesson?.mcQuestions.length ?? 0, label: 'Quiz Q' },
                      { num: pct + '%', label: 'Progress' },
                    ].map((s, i) => (
                      <div key={i} style={{ padding: '16px 10px', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 2 }}>{s.num}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {pct > 0 && (
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: pct === 100 ? '#2D9E6A' : 'rgba(255,255,255,0.40)', flexShrink: 0 }}>{pct === 100 ? '✓ Complete' : `${pct}% done`}</div>
                      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#2D9E6A' : cat.spine, borderRadius: 2 }} />
                      </div>
                    </div>
                  )}

                  <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button onClick={() => navigate(`/learn/lesson/${selected.id}`, { state: { lesson: selected.lesson, language: selected.language } })}
                      style={{ width: '100%', padding: '14px 20px', borderRadius: 14, border: 'none', cursor: 'pointer', background: cat.spine, color: '#FFFFFF', fontSize: 15, fontWeight: 800 }}>
                      📖 Open Lesson
                    </button>
                    <button onClick={() => setSelected(null)}
                      style={{ width: '100%', padding: '12px 20px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.40)', fontSize: 14, fontWeight: 700 }}>
                      Close
                    </button>
                  </div>
                </>
              );
            })()}
          </motion.div>
        </div>
      )}
    </div>
  );
}
