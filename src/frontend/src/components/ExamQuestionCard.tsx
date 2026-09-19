import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ExamQuestion } from '../api/certExamApi';
import { MathText } from './MathText';

interface Props {
  question: ExamQuestion;
  index: number;
  total: number;
  onAnswer: (selectedIndex: number) => void;
}

// A plain, serious exam-question card — deliberately NOT CinematicMCQ, whose confetti/reveal
// framing suits a rare 2-question bonus round inside a spoken interview, not a 15-60 question
// mock exam a candidate works through methodically. No per-question correctness reveal either —
// real certification exams don't tell you if you got a question right until the end, and neither
// does this.
export function ExamQuestionCard({ question, index, total, onAnswer }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  function choose(i: number) {
    if (selected !== null) return;
    setSelected(i);
    setTimeout(() => onAnswer(i), 250);
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={index}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.2 }}
        style={{ width: '100%', maxWidth: '640px', margin: '0 auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
            Question {index + 1} of {total}
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--blue)', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.25)', borderRadius: '20px', padding: '4px 10px' }}>
            {question.domain}
          </div>
        </div>

        <div style={{ height: '4px', borderRadius: '2px', background: 'var(--bg3)', marginBottom: '24px', overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${((index + 1) / total) * 100}%` }}
            transition={{ duration: 0.3 }}
            style={{ height: '100%', background: 'linear-gradient(90deg,#4F8EF7,#34D399)' }}
          />
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px 26px' }}>
          <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.5, marginBottom: '22px' }}>
            <MathText text={question.questionText} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {question.options.map((opt, i) => {
              const isSelected = selected === i;
              return (
                <button
                  key={i}
                  onClick={() => choose(i)}
                  disabled={selected !== null}
                  style={{
                    textAlign: 'left', padding: '14px 16px', borderRadius: '10px',
                    background: isSelected ? 'rgba(79,142,247,0.12)' : 'var(--bg3)',
                    border: `1px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}`,
                    color: 'var(--text)', fontSize: '14px', fontWeight: 600,
                    cursor: selected === null ? 'pointer' : 'default',
                    opacity: selected !== null && !isSelected ? 0.5 : 1,
                    transition: 'all 0.15s', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ color: 'var(--text-3)', marginRight: '10px', fontWeight: 700 }}>
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <MathText text={opt} />
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
