import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw } from 'lucide-react';

// Copy-trimmed from AnswerRevealOverlay.tsx — same codebase convention its own header comment
// documents (copy-and-adapt per use case rather than parameterising one generic component).
// Same shell/mint accent, relabelled for suggesting a question to ask the interviewers instead
// of revealing a model answer.

interface Props {
  loading: boolean;
  question: string | null;
  rationale: string | null;
  onSaveAndContinue: () => void;
  // Narration already auto-plays once (InterviewRoomPage.tsx's handleAskInterviewerSuggest) —
  // this just lets a candidate hear it again without leaving/re-entering the overlay.
  onRepeat?: () => void;
}

export default function AskInterviewerOverlay({ loading, question, rationale, onSaveAndContinue, onRepeat }: Props) {
  return (
    <AnimatePresence>
      <motion.div
        key="ask-interviewer-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45 }}
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
              🤔
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              fontSize: '11px', fontWeight: 800, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: '#34D399', marginBottom: '10px',
            }}>
              Ask The Interviewer
            </div>
            {!loading && question && (
              <h2 style={{
                fontSize: '20px', fontWeight: 800, color: '#f1f5f9',
                lineHeight: 1.4, margin: 0, letterSpacing: '-0.02em',
              }}>
                {question}
              </h2>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
                style={{ fontSize: '13px', color: '#34D399', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#34D399' }}
                />
                Preparing a good question…
              </motion.div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                background: 'rgba(52,211,153,0.06)',
                border: '1px solid rgba(52,211,153,0.2)',
                borderRadius: '14px', padding: '20px', marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.75)' }}>
                  Why it's worth asking
                </div>
                {onRepeat && (
                  <button
                    onClick={onRepeat}
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
                )}
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(240,244,255,0.85)', lineHeight: 1.65 }}>
                {rationale}
              </div>
            </motion.div>
          )}

          <button
            onClick={onSaveAndContinue}
            disabled={loading}
            style={{
              width: '100%', padding: '13px', borderRadius: '12px',
              background: loading ? 'rgba(52,211,153,0.15)' : 'linear-gradient(135deg, #34D399, #047857)',
              border: 'none', color: loading ? 'rgba(240,244,255,0.4)' : '#fff',
              fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Save & Continue →
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
