import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { speak } from '../api/ttsApi';
import { buildCareerScript, type Career } from '../api/careersApi';

interface Props {
  career: Career;
  onClose: () => void;
}

const ACCENT = '#7b5cf5';
const GLOW = 'rgba(120,80,255,0.28)';

// Sarah's spoken walkthrough of a career — modeled on CoachingOverlay's glow/avatar
// treatment so the two "AI voice" moments in the product feel like the same character.
export function CareerGuideOverlay({ career, onClose }: Props) {
  const lines = useRef(buildCareerScript(career)).current;
  const [visibleLines, setVisibleLines] = useState(0);
  const [speaking, setSpeaking] = useState(true);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const msPerWord = 320;
    let wordCount = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    lines.forEach((line, i) => {
      const delay = wordCount * msPerWord + 300;
      timers.push(setTimeout(() => setVisibleLines(i + 1), delay));
      wordCount += line.split(' ').length;
    });

    cancelRef.current = speak(lines.join(' '), 'hr', () => setSpeaking(false));

    // Hard safety timeout — dismiss after 60s no matter what
    timers.push(setTimeout(onClose, 60_000));

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
            width: '100%', maxWidth: '560px',
            background: '#0a0818',
            border: `1px solid ${ACCENT}33`,
            borderRadius: '24px',
            padding: '36px 32px',
            boxShadow: `0 0 90px ${GLOW}, 0 24px 64px rgba(0,0,0,0.5)`,
            position: 'relative', overflow: 'hidden',
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'default' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: ACCENT }}>Sarah on {career.title}</div>
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
            {lines.map((line, i) => (
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
