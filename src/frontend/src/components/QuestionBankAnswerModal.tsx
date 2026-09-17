import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, X } from 'lucide-react';
import { speak } from '../api/ttsApi';
import type { QuestionBankEntry } from '../api/questionBankApi';

// Copy-adapted from AnswerRevealOverlay.tsx's own shell (same "copy per use case rather than
// parameterise" convention its header comment states) — this one has no loading phase (the
// answer's already saved) and owns its own speak() call directly since there's no parent
// interview-room orchestrator here, just a candidate browsing their saved library.
interface Props {
  entry: QuestionBankEntry;
  onClose: () => void;
}

export default function QuestionBankAnswerModal({ entry, onClose }: Props) {
  const cancelSpeakRef = useRef<(() => void) | null>(null);

  const replay = () => {
    cancelSpeakRef.current?.();
    cancelSpeakRef.current = speak(entry.answerText, 'hr', () => {});
  };

  // Auto-plays on open — same behaviour as the live interview's own reveal overlay, per
  // Francis's explicit ask: "listen to the answer the same way they can during an interview."
  useEffect(() => {
    replay();
    return () => cancelSpeakRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id]);

  return (
    <AnimatePresence>
      <motion.div
        key="qbank-answer-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(4,8,18,0.82)',
          backdropFilter: 'blur(18px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '24px', overflowY: 'auto',
        }}
      >
        <motion.div
          initial={{ scale: 0.88, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: -16 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          onClick={e => e.stopPropagation()}
          style={{
            position: 'relative', zIndex: 20,
            background: 'linear-gradient(160deg, #0f1629 0%, #141a30 100%)',
            border: '1px solid rgba(52,211,153,0.2)',
            borderRadius: '24px',
            padding: '40px 40px 36px',
            maxWidth: '680px', width: '100%',
            margin: 'auto 0',
            boxShadow: '0 40px 100px rgba(0,0,0,0.65), 0 0 80px rgba(52,211,153,0.08)',
          }}
        >
          <button
            onClick={onClose}
            title="Close"
            style={{
              position: 'absolute', top: '20px', right: '20px', zIndex: 21,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', width: '30px', height: '30px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: 'rgba(240,244,255,0.7)', cursor: 'pointer',
            }}
          >
            <X size={15} />
          </button>

          <div style={{
            position: 'absolute', top: '-60px', left: '50%', transform: 'translateX(-50%)',
            width: '320px', height: '320px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(52,211,153,0.25), rgba(4,120,87,0.35))',
              border: '1.5px solid rgba(52,211,153,0.35)',
              fontSize: '32px',
              boxShadow: '0 0 40px rgba(52,211,153,0.2)',
            }}>
              💡
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            {(entry.jobTitle || entry.company) && (
              <div style={{ fontSize: '12px', color: 'rgba(240,244,255,0.4)', marginBottom: '8px' }}>
                {[entry.jobTitle, entry.company].filter(Boolean).join(' · ')}
              </div>
            )}
            <div style={{
              fontSize: '11px', fontWeight: 800, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: '#34D399', marginBottom: '10px',
            }}>
              Model Answer
            </div>
            <h2 style={{
              fontSize: '20px', fontWeight: 800, color: '#f1f5f9',
              lineHeight: 1.4, margin: 0, letterSpacing: '-0.02em',
            }}>
              {entry.questionText}
            </h2>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              background: 'rgba(52,211,153,0.06)',
              border: '1px solid rgba(52,211,153,0.2)',
              borderRadius: '14px', padding: '20px', marginTop: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.75)' }}>
                What a strong answer sounds like
              </div>
              <button
                onClick={replay}
                title="Play the narration again"
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
                  borderRadius: '8px', padding: '5px 10px', color: '#34D399',
                  fontSize: '11px', fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                }}
              >
                <RotateCcw size={12} /> Repeat
              </button>
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(240,244,255,0.85)', lineHeight: 1.65 }}>
              {entry.answerText}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
