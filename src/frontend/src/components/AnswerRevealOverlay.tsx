import { motion, AnimatePresence } from 'framer-motion';

// Copied and adapted from CinematicMCQ.tsx's shell (backdrop/card/glow/icon/header) — this
// codebase's own established convention for this cinematic-overlay visual language is
// copy-and-adapt per use case rather than parameterising one generic component (see
// PracticeMCQOverlay.tsx's own header comment making the same call). Mint accent instead of
// CinematicMCQ's purple — this is a core-brand learning moment, not the Bonus Round's own
// sub-brand.

interface Props {
  questionText: string;
  loading: boolean;
  answerText: string | null;
  onContinue: () => void;
}

export default function AnswerRevealOverlay({ questionText, loading, answerText, onContinue }: Props) {
  return (
    <AnimatePresence>
      <motion.div
        key="answer-reveal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(4,8,18,0.82)',
          backdropFilter: 'blur(18px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
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
              💡
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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
              {questionText}
            </h2>
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
                Preparing a model answer…
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
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.75)', marginBottom: '10px' }}>
                What a strong answer sounds like
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(240,244,255,0.85)', lineHeight: 1.65 }}>
                {answerText}
              </div>
            </motion.div>
          )}

          <button
            onClick={onContinue}
            disabled={loading}
            style={{
              width: '100%', padding: '13px', borderRadius: '12px',
              background: loading ? 'rgba(52,211,153,0.15)' : 'linear-gradient(135deg, #34D399, #047857)',
              border: 'none', color: loading ? 'rgba(240,244,255,0.4)' : '#fff',
              fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Continue →
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
