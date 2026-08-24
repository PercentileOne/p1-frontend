import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generatePracticeMCQs, type PracticeMCQ } from '../api/learnApi';
import PracticeMCQOverlay from './PracticeMCQOverlay';

interface Props {
  courseTitle: string;
  topic: string;
  seedQuestion: string;
  onClose: () => void;
}

type Phase = 'loading' | 'active' | 'summary' | 'error';

const TOTAL = 6;

function ResultCard({ correctCount, onClose, onRetry }: { correctCount: number; onClose: () => void; onRetry: () => void }) {
  const verdict =
    correctCount === TOTAL ? "Perfect score — you've nailed this topic." :
    correctCount >= TOTAL * 0.7 ? 'Strong work — you clearly know this topic.' :
    correctCount >= TOTAL * 0.4 ? "Good effort — worth another pass through this topic." :
    "Worth revisiting this topic's lesson before your next interview.";

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 16 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      style={{
        position: 'relative', zIndex: 20,
        background: 'linear-gradient(160deg, #0f1629 0%, #141a30 100%)',
        border: '1px solid rgba(167,139,250,0.2)',
        borderRadius: '24px',
        padding: '44px 40px 36px',
        maxWidth: '460px', width: '100%',
        textAlign: 'center',
        boxShadow: '0 40px 100px rgba(0,0,0,0.65), 0 0 80px rgba(167,139,250,0.08)',
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 14 }}>
        {correctCount === TOTAL ? '🏆' : correctCount >= TOTAL * 0.7 ? '🎯' : '📘'}
      </div>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: 10 }}>
        Practice Complete
      </div>
      <div style={{ fontSize: 34, fontWeight: 900, color: '#f1f5f9', marginBottom: 10 }}>
        {correctCount} / {TOTAL}
      </div>
      <div style={{ fontSize: 14, color: 'rgba(240,244,255,0.7)', lineHeight: 1.6, marginBottom: 28 }}>
        {verdict}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onRetry}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(240,244,255,0.85)', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Practice Again
        </button>
        <button
          onClick={onClose}
          style={{
            flex: 1, background: 'linear-gradient(135deg, #7b5cf5, #5b8ff7)', border: 'none',
            color: '#fff', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    </motion.div>
  );
}

export default function MiniPracticeSession({ courseTitle, topic, seedQuestion, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<PracticeMCQ[]>([]);
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  async function load() {
    setPhase('loading');
    setIndex(0);
    setCorrectCount(0);
    try {
      const qs = await generatePracticeMCQs(courseTitle, topic, seedQuestion);
      if (qs.length === 0) throw new Error('No questions generated');
      setQuestions(qs);
      setPhase('active');
    } catch (e) {
      console.error('[MiniPracticeSession] failed to generate practice questions:', e);
      setPhase('error');
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleQuestionComplete(correct: boolean) {
    if (correct) setCorrectCount(c => c + 1);
    if (index + 1 >= questions.length) setPhase('summary');
    else setIndex(i => i + 1);
  }

  if (phase === 'active' && questions[index]) {
    return (
      <PracticeMCQOverlay
        key={index}
        mcq={questions[index]}
        ordinal={index + 1}
        total={questions.length}
        onComplete={handleQuestionComplete}
        onClose={onClose}
      />
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(4,8,18,0.82)',
          backdropFilter: 'blur(18px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close practice"
          style={{
            position: 'absolute', top: 20, right: 20, zIndex: 30,
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(240,244,255,0.6)', fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>

        {phase === 'loading' && (
          <div style={{ textAlign: 'center' }}>
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
              style={{ fontSize: '13px', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            >
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a78bfa' }}
              />
              Preparing your practice questions on {topic}…
            </motion.div>
          </div>
        )}

        {phase === 'error' && (
          <div style={{
            background: 'linear-gradient(160deg, #0f1629 0%, #141a30 100%)',
            border: '1px solid rgba(248,113,113,0.25)', borderRadius: 20, padding: '32px 36px',
            textAlign: 'center', maxWidth: 400,
          }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 14, color: 'rgba(240,244,255,0.8)', marginBottom: 20 }}>
              Couldn't put together practice questions right now. Please try again.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={load}
                style={{ background: 'linear-gradient(135deg, #7b5cf5, #5b8ff7)', border: 'none', color: '#fff', borderRadius: 9, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Retry
              </button>
              <button
                onClick={onClose}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(240,244,255,0.8)', borderRadius: 9, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {phase === 'summary' && (
          <ResultCard correctCount={correctCount} onClose={onClose} onRetry={load} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
