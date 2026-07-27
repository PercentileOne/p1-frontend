import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getLesson, updateProgress } from '../../api/learnApi';
import { logFlowEvent } from '../../api/flowLogger';
import type { LessonData, KeyConcept, SavedLesson } from '../../types/learn';

const CAT_COLOURS: Record<string, string> = {
  Technology: '#1E4DD8', Mathematics: '#7C3AED', Business: '#0891B2',
  Science: '#DB2777', History: '#D97706', 'Sport & Fitness': '#2D9E6A',
  'Social Sciences': '#6366F1', 'Language & Literature': '#65A30D',
};

type Tab = 'lesson' | 'quiz';

export default function LessonViewer() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [, setSavedLesson] = useState<SavedLesson | null>(null);
  const [lesson, setLesson] = useState<LessonData | null>((location.state as any)?.lesson ?? null);
  const [language, setLanguage] = useState<string>((location.state as any)?.language ?? 'English');
  const [loading, setLoading] = useState(!lesson);
  const [tab, setTab] = useState<Tab>('lesson');

  const [expandedConcept, setExpandedConcept] = useState<number | null>(null);
  const [conceptsUnderstood, setConceptsUnderstood] = useState<boolean[]>([]);
  const [misconceptionsUnderstood, setMisconceptionsUnderstood] = useState<boolean[]>([]);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  useEffect(() => {
    logFlowEvent('LESSON_OPENED', { lessonId });
    if (!lesson && lessonId) {
      getLesson(lessonId).then(sl => {
        setSavedLesson(sl);
        setLesson(sl.lesson);
        setLanguage(sl.language);
        setConceptsUnderstood(sl.progress?.conceptsUnderstood ?? sl.lesson.keyConcepts.map(() => false));
        setMisconceptionsUnderstood(sl.progress?.misconceptionsUnderstood ?? sl.lesson.misconceptions.map(() => false));
        setQuizAnswers(sl.lesson.mcQuestions.map(() => null));
      }).catch(() => navigate('/learn')).finally(() => setLoading(false));
    } else if (lesson) {
      setConceptsUnderstood(lesson.keyConcepts.map(() => false));
      setMisconceptionsUnderstood(lesson.misconceptions.map(() => false));
      setQuizAnswers(lesson.mcQuestions.map(() => null));
    }
  }, [lessonId]);

  const catColour = lesson ? (CAT_COLOURS[lesson.category] ?? '#6366F1') : '#6366F1';
  const conceptsDone = conceptsUnderstood.filter(Boolean).length;
  const misconsDone = misconceptionsUnderstood.filter(Boolean).length;
  const totalCheckable = (lesson?.keyConcepts.length ?? 0) + (lesson?.misconceptions.length ?? 0);
  const totalDone = conceptsDone + misconsDone;
  const progressPct = totalCheckable > 0 ? Math.round((totalDone / totalCheckable) * 100) : 0;
  const allDone = progressPct === 100;

  const toggleConcept = (i: number) => {
    const next = conceptsUnderstood.map((v, j) => j === i ? !v : v);
    setConceptsUnderstood(next);
    logFlowEvent('SECTION_UNDERSTOOD', { lessonId, index: i, type: 'concept', understood: !conceptsUnderstood[i] });
    if (lessonId) updateProgress(lessonId, { conceptsUnderstood: next });
  };

  const toggleMiscon = (i: number) => {
    const next = misconceptionsUnderstood.map((v, j) => j === i ? !v : v);
    setMisconceptionsUnderstood(next);
    logFlowEvent('SECTION_UNDERSTOOD', { lessonId, index: i, type: 'misconception', understood: !misconceptionsUnderstood[i] });
    if (lessonId) updateProgress(lessonId, { misconceptionsUnderstood: next });
  };

  const toggleExpand = (i: number) => {
    const next = expandedConcept === i ? null : i;
    setExpandedConcept(next);
    if (next !== null) logFlowEvent('SECTION_EXPANDED', { lessonId, conceptIndex: i });
  };

  const submitQuiz = () => {
    setQuizSubmitted(true);
    logFlowEvent('QUIZ_SUBMITTED', { lessonId, answers: quizAnswers });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#080E1C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#FFFFFF' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📚</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>Loading lesson…</div>
        </div>
      </div>
    );
  }

  if (!lesson) return null;

  const quizScore = quizSubmitted ? lesson.mcQuestions.filter((q, i) => quizAnswers[i] === q.answer).length : 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#080E1C', color: '#FFFFFF', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(8,14,28,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate('/learn')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 9, padding: '7px 12px', color: 'rgba(255,255,255,0.60)', cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            ← Learn
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lesson.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: catColour + '22', color: catColour, border: `1px solid ${catColour}44` }}>{lesson.emoji} {lesson.category}</span>
              {language !== 'English' && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', fontWeight: 600 }}>{language}</span>}
            </div>
          </div>
          {/* Progress */}
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: allDone ? '#2D9E6A' : 'rgba(255,255,255,0.40)', marginBottom: 4 }}>{allDone ? '✓ Complete' : `${progressPct}% done`}</div>
            <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <motion.div animate={{ width: `${progressPct}%` }} transition={{ duration: 0.4 }} style={{ height: '100%', background: allDone ? '#2D9E6A' : catColour, borderRadius: 2 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(8,14,28,0.85)', backdropFilter: 'blur(8px)', position: 'sticky', top: 65, zIndex: 30 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', padding: '0 24px' }}>
          {([
            { id: 'lesson', label: '📖 Lesson' },
            { id: 'quiz', label: '🎯 Quiz' },
          ] as { id: Tab; label: string }[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '14px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: tab === t.id ? catColour : 'rgba(255,255,255,0.35)', borderBottom: tab === t.id ? `2px solid ${catColour}` : '2px solid transparent', transition: 'all 0.2s', marginBottom: -1 }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* ── LESSON TAB ── */}
        {tab === 'lesson' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* Hook card */}
            <div style={{ background: `linear-gradient(135deg, ${catColour}12, ${catColour}08)`, border: `1px solid ${catColour}30`, borderLeft: `3px solid ${catColour}`, borderRadius: 14, padding: 20, marginBottom: 28 }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{lesson.emoji}</div>
              <p style={{ fontSize: 17, fontStyle: 'italic', fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55, margin: 0 }}>"{lesson.hook}"</p>
            </div>

            {/* Progress banner when all done */}
            <AnimatePresence>
              {allDone && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ background: 'rgba(45,158,106,0.12)', border: '1px solid rgba(45,158,106,0.35)', borderRadius: 14, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 28 }}>🎓</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#2D9E6A', marginBottom: 2 }}>You've signed off the whole lesson!</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)' }}>All concepts and misconceptions confirmed. Try the quiz to test yourself.</div>
                  </div>
                  <button onClick={() => setTab('quiz')} style={{ marginLeft: 'auto', background: '#2D9E6A', border: 'none', borderRadius: 10, padding: '8px 14px', color: '#FFFFFF', cursor: 'pointer', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                    Take Quiz →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* KEY CONCEPTS */}
            <SectionHead label="KEY CONCEPTS" count={lesson.keyConcepts.length} extra={conceptsDone > 0 ? `${conceptsDone}/${lesson.keyConcepts.length} understood` : undefined} extraColour="#2D9E6A" />
            {lesson.keyConcepts.map((c, i) => (
              <ConceptCard key={i} concept={c} catColour={catColour}
                isExpanded={expandedConcept === i}
                isUnderstood={conceptsUnderstood[i] ?? false}
                onToggleExpand={() => toggleExpand(i)}
                onToggleUnderstood={() => toggleConcept(i)}
              />
            ))}

            {/* MISCONCEPTIONS */}
            <SectionHead label="COMMON MISCONCEPTIONS" count={lesson.misconceptions.length} extra={misconsDone > 0 ? `${misconsDone}/${lesson.misconceptions.length} confirmed` : undefined} extraColour="#F59E0B" />
            {lesson.misconceptions.map((m, i) => (
              <motion.div key={i} layout
                style={{ background: misconceptionsUnderstood[i] ? 'rgba(45,158,106,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${misconceptionsUnderstood[i] ? 'rgba(45,158,106,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: 18, marginBottom: 10, transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                  <span style={{ color: '#F87171', fontSize: 14, marginTop: 2 }}>✕</span>
                  <span style={{ fontSize: 14, color: 'rgba(248,113,113,0.85)', lineHeight: 1.5, textDecoration: 'line-through' }}>{m.wrong}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14 }}>
                  <span style={{ color: '#34D399', fontSize: 14, marginTop: 2 }}>✓</span>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.80)', lineHeight: 1.5 }}>{m.right}</span>
                </div>
                <button onClick={() => toggleMiscon(i)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0 0', borderTop: '1px solid rgba(255,255,255,0.07)', width: '100%' }}>
                  <CheckBox checked={misconceptionsUnderstood[i] ?? false} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: misconceptionsUnderstood[i] ? '#2D9E6A' : 'rgba(255,255,255,0.55)' }}>
                    {misconceptionsUnderstood[i] ? "I understood this ✓" : "Tap when you've understood this"}
                  </span>
                </button>
              </motion.div>
            ))}

            {/* GLOSSARY */}
            <SectionHead label="KEY TERMS" count={lesson.glossary.length} />
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', marginBottom: 28 }}>
              {lesson.glossary.map((g, i) => (
                <div key={i} style={{ padding: '14px 18px', borderBottom: i < lesson.glossary.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: catColour, marginBottom: 4 }}>{g.term}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.60)', lineHeight: 1.55 }}>{g.def}</div>
                </div>
              ))}
            </div>

            {/* EXAM QUESTIONS */}
            <SectionHead label="EXAM QUESTIONS" count={lesson.examQuestions.length} />
            {lesson.examQuestions.map((q, i) => (
              <ExamQuestion key={i} index={i} question={q} answer={lesson.examAnswers[i]} catColour={catColour} />
            ))}

            {/* Quiz CTA */}
            <div style={{ marginTop: 32, padding: 24, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 18, textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>🎯</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Ready to test yourself?</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', marginBottom: 16 }}>{lesson.mcQuestions.length} multiple choice questions — instant feedback</div>
              <button onClick={() => setTab('quiz')} style={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)', border: 'none', borderRadius: 12, padding: '14px 32px', color: '#FFFFFF', cursor: 'pointer', fontSize: 14, fontWeight: 800 }}>
                Start Multiple Choice Quiz →
              </button>
            </div>
          </motion.div>
        )}

        {/* ── QUIZ TAB ── */}
        {tab === 'quiz' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>🎯 Multiple Choice Quiz</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.40)' }}>{lesson.mcQuestions.length} questions · Tap the right answer</div>
            </div>

            {quizSubmitted && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: quizScore / lesson.mcQuestions.length >= 0.7 ? 'rgba(45,158,106,0.12)' : 'rgba(245,158,11,0.10)', border: `1px solid ${quizScore / lesson.mcQuestions.length >= 0.7 ? 'rgba(45,158,106,0.30)' : 'rgba(245,158,11,0.30)'}`, borderRadius: 14, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 32 }}>{quizScore / lesson.mcQuestions.length >= 0.8 ? '🏆' : quizScore / lesson.mcQuestions.length >= 0.6 ? '✅' : '📖'}</span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 2 }}>{quizScore}/{lesson.mcQuestions.length} correct</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)' }}>
                    {quizScore / lesson.mcQuestions.length >= 0.8 ? 'Excellent — you really know this!' : quizScore / lesson.mcQuestions.length >= 0.6 ? 'Good effort. Review the concepts you missed.' : 'Keep studying — re-read the lesson and try again.'}
                  </div>
                </div>
                <button onClick={() => { setQuizAnswers(lesson.mcQuestions.map(() => null)); setQuizSubmitted(false); }} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 14px', color: '#FFFFFF', cursor: 'pointer', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  Retry
                </button>
              </motion.div>
            )}

            {lesson.mcQuestions.map((q, i) => (
              <MCCard key={i} index={i} question={q} selected={quizAnswers[i]} submitted={quizSubmitted}
                onSelect={idx => !quizSubmitted && setQuizAnswers(prev => prev.map((a, j) => j === i ? idx : a))} />
            ))}

            {!quizSubmitted && (
              <button onClick={submitQuiz}
                disabled={quizAnswers.some(a => a === null)}
                style={{ width: '100%', padding: '16px 24px', borderRadius: 14, border: 'none', cursor: quizAnswers.some(a => a === null) ? 'default' : 'pointer', background: quizAnswers.some(a => a === null) ? 'rgba(255,255,255,0.07)' : 'linear-gradient(135deg, #4F46E5, #6366F1)', color: quizAnswers.some(a => a === null) ? 'rgba(255,255,255,0.30)' : '#FFFFFF', fontSize: 15, fontWeight: 800, marginTop: 16 }}>
                {quizAnswers.filter(a => a !== null).length}/{lesson.mcQuestions.length} answered — Submit Quiz
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHead({ label, count, extra, extraColour }: { label: string; count?: number; extra?: string; extraColour?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: 'rgba(255,255,255,0.50)', textTransform: 'uppercase' }}>{label}</span>
        {count != null && <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 10, background: 'rgba(99,102,241,0.15)', color: '#A5B4FC' }}>{count}</span>}
      </div>
      {extra && <span style={{ fontSize: 11, fontWeight: 800, color: extraColour ?? '#2D9E6A' }}>{extra}</span>}
    </div>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <div style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${checked ? '#2D9E6A' : 'rgba(255,255,255,0.20)'}`, background: checked ? '#2D9E6A' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
      {checked && <span style={{ fontSize: 12, color: '#FFFFFF', fontWeight: 900 }}>✓</span>}
    </div>
  );
}

function ConceptCard({ concept, catColour, isExpanded, isUnderstood, onToggleExpand, onToggleUnderstood }: {
  concept: KeyConcept; catColour: string;
  isExpanded: boolean; isUnderstood: boolean;
  onToggleExpand: () => void; onToggleUnderstood: () => void;
}) {
  return (
    <motion.div layout style={{ background: isExpanded ? `${catColour}0D` : 'rgba(255,255,255,0.04)', border: `1px solid ${isExpanded ? catColour + '45' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: 18, marginBottom: 10, transition: 'border-color 0.2s, background 0.2s', cursor: 'pointer' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }} onClick={onToggleExpand}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{concept.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 5 }}>{concept.title}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.60)', lineHeight: 1.55 }}>{concept.body}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Deep Dive */}
              {concept.deepDive && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: 'rgba(255,255,255,0.28)', marginBottom: 6, textTransform: 'uppercase' }}>📖 Deep Dive</div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: 0 }}>{concept.deepDive}</p>
                </div>
              )}

              {/* Example */}
              {concept.example && (
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: 'rgba(255,255,255,0.28)', marginBottom: 4, textTransform: 'uppercase' }}>💡 Real-World Example</div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, margin: 0 }}>{concept.example}</p>
                </div>
              )}

              {/* Code snippet */}
              {concept.codeSnippet && (
                <div style={{ background: 'rgba(0,0,0,0.40)', borderRadius: 10, padding: 14, border: '1px solid rgba(255,255,255,0.10)' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: 'rgba(255,255,255,0.28)', marginBottom: 8, textTransform: 'uppercase' }}>💻 Code Example</div>
                  <pre style={{ fontSize: 12, color: '#A8D8A8', lineHeight: 1.65, margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>{concept.codeSnippet}</pre>
                </div>
              )}

              {/* Memory hook */}
              {concept.memoryHook && (
                <div style={{ background: catColour + '14', borderRadius: 10, padding: 12, border: `1px solid ${catColour}30` }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: 'rgba(255,255,255,0.28)', marginBottom: 4, textTransform: 'uppercase' }}>🧠 Memory Hook</div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: catColour, margin: 0 }}>{concept.memoryHook}</p>
                </div>
              )}

              {/* Exam trap */}
              {concept.examTrap && (
                <div style={{ background: 'rgba(220,38,38,0.07)', borderRadius: 10, padding: 12, border: '1px solid rgba(220,38,38,0.20)' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: 'rgba(220,38,38,0.70)', marginBottom: 4, textTransform: 'uppercase' }}>⚠️ Exam Trap</div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, margin: 0 }}>{concept.examTrap}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "I understood this" */}
      <button onClick={e => { e.stopPropagation(); onToggleUnderstood(); }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0 0', borderTop: '1px solid rgba(255,255,255,0.07)', width: '100%', marginTop: 12 }}>
        <CheckBox checked={isUnderstood} />
        <span style={{ fontSize: 13, fontWeight: 700, color: isUnderstood ? '#2D9E6A' : 'rgba(255,255,255,0.50)' }}>
          {isUnderstood ? 'I understood this ✓' : 'Tap when you\'ve understood this'}
        </span>
      </button>
    </motion.div>
  );
}

function ExamQuestion({ index, question, answer, catColour }: { index: number; question: string; answer: string; catColour: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${open ? catColour + '35' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: 16, marginBottom: 8, transition: 'all 0.2s', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: open ? catColour : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: open ? '#FFFFFF' : 'rgba(255,255,255,0.40)', flexShrink: 0, transition: 'all 0.2s' }}>Q{index + 1}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5, color: '#FFFFFF' }}>{question}</div>
          <AnimatePresence>
            {open && answer && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: 'rgba(255,255,255,0.28)', marginBottom: 4, textTransform: 'uppercase' }}>Model Answer</div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)', lineHeight: 1.6, margin: 0 }}>{answer}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', flexShrink: 0, marginTop: 4 }}>{open ? '▲' : '▼'}</span>
      </div>
    </div>
  );
}

function MCCard({ index, question, selected, submitted, onSelect }: {
  index: number;
  question: { q: string; options: [string, string, string, string]; answer: number };
  selected: number | null;
  submitted: boolean;
  onSelect: (i: number) => void;
}) {
  const isCorrect = selected === question.answer;
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 18, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(251,146,60,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#FB923C', flexShrink: 0 }}>Q{index + 1}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.5 }}>{question.q}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {question.options.map((opt, i) => {
          const isSelected = selected === i;
          const showCorrect = submitted && i === question.answer;
          const showWrong = submitted && isSelected && !isCorrect;
          return (
            <button key={i} onClick={() => onSelect(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: `1px solid ${showCorrect ? '#34D399' : showWrong ? '#F87171' : isSelected ? '#1E4DD8' : 'rgba(255,255,255,0.08)'}`, background: showCorrect ? 'rgba(52,211,153,0.10)' : showWrong ? 'rgba(248,113,113,0.10)' : isSelected ? 'rgba(30,77,216,0.12)' : 'rgba(255,255,255,0.04)', cursor: submitted ? 'default' : 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s' }}>
              <div style={{ width: 26, height: 26, borderRadius: 13, background: showCorrect ? 'rgba(52,211,153,0.25)' : showWrong ? 'rgba(248,113,113,0.25)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: showCorrect ? '#34D399' : showWrong ? '#F87171' : 'rgba(255,255,255,0.60)', flexShrink: 0 }}>
                {showCorrect ? '✓' : showWrong ? '✕' : String.fromCharCode(65 + i)}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: showCorrect ? '#34D399' : showWrong ? '#F87171' : 'rgba(255,255,255,0.80)' }}>{opt}</span>
            </button>
          );
        })}
      </div>
      {submitted && !isCorrect && selected !== null && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 13, fontWeight: 700, color: '#F87171' }}>
          ✕ The correct answer is: {question.options[question.answer]}
        </div>
      )}
      {submitted && isCorrect && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 13, fontWeight: 700, color: '#34D399' }}>
          ✓ Correct!
        </div>
      )}
    </div>
  );
}
