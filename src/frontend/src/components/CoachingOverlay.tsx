import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { speak } from '../api/ttsApi';
import type { CoachingMessage } from '../utils/coachingEngine';
import type { ScoreResponse } from '../api/explainApi';

interface Props {
  message: CoachingMessage;
  score?: ScoreResponse | null;
  onDone: () => void;
}

const TONE_CONFIG = {
  strong:    { emoji: '⭐', label: 'Great answer', accent: '#34D399', glow: 'rgba(52,211,153,0.25)' },
  encourage: { emoji: '💡', label: 'Good — here\'s how to level up', accent: '#FBBF24', glow: 'rgba(251,191,36,0.25)' },
  delivery:  { emoji: '🎯', label: 'Watch your delivery', accent: '#A78BFA', glow: 'rgba(167,139,250,0.25)' },
  relevance: { emoji: '🔗', label: 'Connect it to the role', accent: '#60A5FA', glow: 'rgba(96,165,250,0.25)' },
};

export function CoachingOverlay({ message, score, onDone }: Props) {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [speaking, setSpeaking] = useState(true);
  const cancelRef = useRef<(() => void) | null>(null);
  const cfg = TONE_CONFIG[message.tone];

  useEffect(() => {
    // Reveal lines progressively while TTS plays
    const msPerWord = 320;
    let wordCount = 0;

    const timers: ReturnType<typeof setTimeout>[] = [];
    message.lines.forEach((line, i) => {
      const delay = wordCount * msPerWord + 300;
      timers.push(setTimeout(() => setVisibleLines(i + 1), delay));
      wordCount += line.split(' ').length;
    });

    // Speak the full coaching message as a mentor (use 'hr' = Sarah's warm voice)
    cancelRef.current = speak(message.fullText, 'hr', () => {
      setSpeaking(false);
      timers.push(setTimeout(onDone, 1800));
    });

    // Hard safety timeout — dismiss after 45s no matter what
    timers.push(setTimeout(onDone, 45_000));

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
          position: 'fixed', inset: 0, zIndex: 1000,
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
            width: '100%', maxWidth: '540px',
            background: 'var(--bg2)',
            border: `1px solid ${cfg.accent}33`,
            borderRadius: '24px',
            padding: '36px 32px',
            boxShadow: `0 0 80px ${cfg.glow}, 0 24px 64px rgba(0,0,0,0.5)`,
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Ambient glow behind avatar */}
          <div style={{
            position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)',
            width: '200px', height: '200px', borderRadius: '50%',
            background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />

          {/* Coach avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px', position: 'relative' }}>
            <motion.div
              animate={speaking ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: `linear-gradient(135deg, ${cfg.accent}44, ${cfg.accent}22)`,
                border: `2px solid ${cfg.accent}66`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '30px',
                boxShadow: speaking ? `0 0 0 8px ${cfg.glow}` : 'none',
                transition: 'box-shadow 0.4s',
                marginBottom: '12px',
              }}
            >
              {cfg.emoji}
            </motion.div>

            {/* Speaking indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: cfg.accent }}>{cfg.label}</div>
              {speaking && (
                <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '14px' }}>
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ scaleY: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
                      style={{ width: '3px', height: '10px', borderRadius: '2px', background: cfg.accent, transformOrigin: 'bottom' }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lines — appear one by one */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {message.lines.map((line, i) => (
              <AnimatePresence key={i}>
                {i < visibleLines && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    style={{
                      margin: 0,
                      fontSize: i === message.lines.length - 1 ? '13px' : '15px',
                      fontWeight: i === message.lines.length - 1 ? 500 : 600,
                      color: i === message.lines.length - 1 ? 'var(--text-3)' : 'var(--text)',
                      lineHeight: 1.65,
                      fontStyle: i === message.lines.length - 1 ? 'italic' : 'normal',
                    }}
                  >
                    {line}
                  </motion.p>
                )}
              </AnimatePresence>
            ))}
          </div>

          {/* Compact score row */}
          {score && (
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Answer score</div>
                <div style={{
                  fontSize: '15px', fontWeight: 900, color:
                    score.overallScore >= 0.70 ? '#34D399' : score.overallScore >= 0.50 ? '#F59E0B' : '#EF4444',
                }}>
                  {Math.round(score.overallScore * 100)}%
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['relevance', 'clarity', 'depth', 'confidence'] as const).map(dim => (
                  <div key={dim} style={{ flex: 1 }}>
                    <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', textAlign: 'center' }}>{dim.slice(0,3)}</div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '2px',
                        width: `${Math.round((score[dim] ?? 0) * 100)}%`,
                        background: (score[dim] ?? 0) >= 0.70 ? '#34D399' : (score[dim] ?? 0) >= 0.50 ? '#F59E0B' : '#EF4444',
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-2)', textAlign: 'center', marginTop: '3px' }}>{Math.round((score[dim] ?? 0) * 100)}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skip button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button
              onClick={() => { cancelRef.current?.(); onDone(); }}
              style={{
                background: 'none', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '7px 18px',
                fontSize: '12px', color: 'var(--text-3)', cursor: 'pointer',
              }}
            >
              Skip →
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
