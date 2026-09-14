import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { speak } from '../api/ttsApi';

interface Props {
  onClose: () => void;
}

const ACCENT = '#7b5cf5';
const GLOW = 'rgba(120,80,255,0.28)';

// Static, not AI-generated — same reasoning as careersApi.ts's buildCareerScript: no
// candidate-specific data to draw on here, and no need for a live AI call for advice that's
// the same for everyone (see CLAUDE.md: never call a third-party AI provider from the
// browser). Grounded in a quick check against expert consensus (Toastmasters evaluation
// criteria, TED curator Chris Anderson's public-speaking framework, trial-lawyer closing-
// argument technique) done the same day the underlying Talk scoring rubric was built — every
// point below maps to something that rubric actually measures (Structure, Opening/Closing
// Strength, Confidence, Depth, Engagement, Takeaway Score, Time Management), so the coaching
// and the scoring tell a candidate the same story.
const TALK_COACHING_SCRIPT: string[] = [
  "Hi — I'm Amina. Before you dive in, here are the things that separate a forgettable talk from one people actually remember.",
  "First: pick one big idea. The best talks aren't packed with ten points — they're built around a single idea worth caring about.",
  "Structure it simply: tell them what you're about to tell them, tell them, then tell them what you just told them. That's the oldest trick in the book, and it still works.",
  "Your opening and your closing matter more than anything in the middle — people remember beginnings and endings best, so make your first line hook them and your last line land your point.",
  "Keep your language clear and confident — short sentences, no hedging, no 'I guess' or 'sort of'. Say what you mean.",
  "Back up your point with something concrete — a fact, an example, a moment from your own experience. That's what makes an idea stick, not just the number of words you use.",
  "When we score you, we'll count something called your Takeaway Score — how many clear points a listener could actually repeat back afterward. Two or three sharp points beats ten vague ones, every time.",
  "Practice hitting your target time — a talk that runs long or finishes early loses its shape.",
  "Take a breath, speak like you're talking to one person, not a crowd, and remember — this is practice. Good luck.",
];

// Amina's spoken coaching before a talk — copied from CareerGuideOverlay.tsx (the "Tell Me
// About This Role" guide) and trimmed: same glow/avatar/caption treatment, but a fixed script
// instead of one built from a data object, since there's nothing per-talk to personalize yet.
export function TalkCoachingOverlay({ onClose }: Props) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [speaking, setSpeaking] = useState(true);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const msPerWord = 320;
    let wordCount = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    TALK_COACHING_SCRIPT.forEach((line, i) => {
      const delay = wordCount * msPerWord + 300;
      timers.push(setTimeout(() => setVisibleLines(i + 1), delay));
      wordCount += line.split(' ').length;
    });

    cancelRef.current = speak(TALK_COACHING_SCRIPT.join(' '), 'hr', () => setSpeaking(false));

    // Hard safety timeout — dismiss after 90s no matter what (longer script than the career
    // guide's, so a longer ceiling)
    timers.push(setTimeout(onClose, 90_000));

    return () => {
      cancelRef.current?.();
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'rgba(0,0,0,0.82)',
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -16 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: '100%', maxWidth: '560px', maxHeight: '85vh', overflowY: 'auto',
            background: '#0a0818',
            border: `1px solid ${ACCENT}33`,
            borderRadius: '24px',
            padding: '36px 32px',
            boxShadow: `0 0 90px ${GLOW}, 0 24px 64px rgba(0,0,0,0.5)`,
            position: 'relative',
          }}
        >
          <div style={{
            position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)',
            width: '220px', height: '220px', borderRadius: '50%',
            background: `radial-gradient(circle, ${GLOW} 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px', position: 'relative' }}>
            <motion.div
              animate={speaking ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: `linear-gradient(135deg, ${ACCENT}44, ${ACCENT}22)`,
                border: `2px solid ${ACCENT}66`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '30px',
                boxShadow: speaking ? `0 0 0 8px ${GLOW}` : 'none',
                transition: 'box-shadow 0.4s',
                marginBottom: '12px',
              }}
            >
              🎙️
            </motion.div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'default', userSelect: 'none' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: ACCENT }}>Amina's Tips for a Great Talk</div>
              {speaking && (
                <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '14px' }}>
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ scaleY: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
                      style={{ width: '3px', height: '10px', borderRadius: '2px', background: ACCENT, transformOrigin: 'bottom' }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {TALK_COACHING_SCRIPT.map((line, i) => (
              <AnimatePresence key={i}>
                {i < visibleLines && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: 'var(--text, #e0dcff)', lineHeight: 1.65 }}
                  >
                    {line}
                  </motion.p>
                )}
              </AnimatePresence>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button
              onClick={() => { cancelRef.current?.(); onClose(); }}
              style={{
                background: 'none', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px', padding: '7px 18px',
                fontSize: '12px', color: '#9090b0', cursor: 'pointer',
              }}
            >
              Close ✕
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
