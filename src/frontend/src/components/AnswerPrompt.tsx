import { motion, AnimatePresence } from 'framer-motion';
import type { MicState } from './VoiceInput';

// The "your turn" button that sits on the interviewer's own picture (Francis, 2026-10-09): people did not know they had to scroll down, find the small green
// microphone, click it to talk and click it again to stop. As soon as the interviewer has finished asking, this appears over their chest — big, green and pulsing —
// and turns red ("Click to stop recording") while the answer is being recorded. It drives the same VoiceInput as the small microphone below, so nothing else changes.
// Render it inside a `position: relative` picture box; it hides itself whenever `show` is false (for instance while the interviewer is speaking).

interface Props {
  show: boolean;
  mic: MicState;
  onPress: () => void;
  /** Whether typing is offered as an alternative (it always is, below the picture); only changes the wording. */
  canType?: boolean;
}

export function AnswerPrompt({ show, mic, onPress, canType = true }: Props) {
  const listening = mic === 'listening';
  const processing = mic === 'processing';
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="answer-prompt"
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.25 }}
          style={{ position: 'absolute', left: 0, right: 0, bottom: '17%', zIndex: 5, display: 'flex', justifyContent: 'center', padding: '0 12px', pointerEvents: 'none' }}
        >
          <div style={{ position: 'relative', maxWidth: '100%', pointerEvents: 'auto' }}>
            {!listening && !processing && (
              <motion.span
                aria-hidden="true"
                animate={{ opacity: [0.55, 0], scale: [1, 1.18] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
                style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'rgba(52,211,153,0.7)', pointerEvents: 'none' }}
              />
            )}
            <motion.button
              type="button"
              onClick={onPress}
              disabled={processing}
              whileTap={{ scale: 0.97 }}
              aria-live="polite"
              style={{
                position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, maxWidth: '100%',
                border: 'none', borderRadius: 999, padding: 'clamp(10px, 2.2vw, 15px) clamp(16px, 3.4vw, 30px)', cursor: processing ? 'default' : 'pointer',
                color: processing ? '#e2e8f0' : '#fff', fontFamily: 'inherit', fontWeight: 800, lineHeight: 1.25, textAlign: 'center',
                fontSize: 'clamp(13px, 2.1vw, 17px)', letterSpacing: '0.01em',
                background: processing ? 'rgba(30,41,59,0.92)' : listening ? 'linear-gradient(135deg,#EF4444,#B91C1C)' : 'linear-gradient(135deg,#34D399,#047857)',
                boxShadow: processing ? '0 6px 22px rgba(0,0,0,0.4)' : listening ? '0 8px 30px rgba(239,68,68,0.55)' : '0 8px 30px rgba(52,211,153,0.55)',
                transition: 'background 0.25s, box-shadow 0.25s',
              }}
            >
              {processing ? (
                <span>Got it, working out what you said…</span>
              ) : listening ? (
                <>
                  <motion.span aria-hidden="true" animate={{ opacity: [1, 0.25, 1] }} transition={{ repeat: Infinity, duration: 1.1 }} style={{ width: 11, height: 11, borderRadius: '50%', background: '#fff', flexShrink: 0 }} />
                  <span>Click to stop recording</span>
                </>
              ) : (
                <>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" fill="#fff" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M9 22h6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <span>Click to speak your answer{canType ? <span style={{ fontWeight: 600, opacity: 0.92 }}>, or type it below</span> : null}</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
