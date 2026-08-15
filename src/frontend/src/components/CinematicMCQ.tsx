import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { speak } from '../api/ttsApi';

export interface MCQQuestion {
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface Props {
  mcq: MCQQuestion;
  candidateName?: string;
  questionOrdinal?: 'first' | 'second';
  onComplete: (bonusEarned: boolean, selectedIndex: number) => void;
}

function launchConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  const COLORS = ['#34D399', '#ffffff', '#F59E0B', '#a78bfa', '#60a5fa', '#4ade80'];
  const particles = Array.from({ length: 90 }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * 200,
    y: canvas.height * 0.4,
    vx: (Math.random() - 0.5) * 14,
    vy: -(Math.random() * 10 + 4),
    rot: Math.random() * 360,
    rotV: (Math.random() - 0.5) * 8,
    size: Math.random() * 8 + 5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    opacity: 1,
    shape: Math.random() > 0.5 ? 'rect' : 'circle' as 'rect' | 'circle',
  }));
  let frame = 0;
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.vx *= 0.99;
      p.rot += p.rotV; p.opacity = Math.max(0, p.opacity - 0.012);
      ctx.save(); ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y); ctx.rotate((p.rot * Math.PI) / 180); ctx.fillStyle = p.color;
      if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    if (frame < 120) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
  draw();
}

const LABELS = ['A', 'B', 'C', 'D'];

function OptionCard({ label, text, state, delay, onClick }: {
  label: string; text: string;
  state: 'idle' | 'correct' | 'wrong' | 'reveal';
  delay: number; onClick: () => void;
}) {
  const bg = state === 'correct' ? 'rgba(52,211,153,0.18)' : state === 'wrong' ? 'rgba(239,68,68,0.18)' : state === 'reveal' ? 'rgba(52,211,153,0.10)' : 'rgba(255,255,255,0.04)';
  const border = state === 'correct' ? '1.5px solid #34D399' : state === 'wrong' ? '1.5px solid #EF4444' : state === 'reveal' ? '1.5px solid rgba(52,211,153,0.5)' : '1.5px solid rgba(255,255,255,0.10)';
  const labelColor = state === 'correct' ? '#34D399' : state === 'wrong' ? '#EF4444' : state === 'reveal' ? '#34D399' : 'rgba(167,139,250,0.9)';
  const cursor = state === 'idle' ? 'pointer' : 'default';
  return (
    <motion.button initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay, duration: 0.38, ease: 'easeOut' }}
      whileHover={state === 'idle' ? { scale: 1.015, borderColor: 'rgba(167,139,250,0.5)' } : {}}
      whileTap={state === 'idle' ? { scale: 0.98 } : {}}
      onClick={state === 'idle' ? onClick : undefined}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '16px', background: bg, border, borderRadius: '14px', padding: '16px 20px', cursor, textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.25s, border-color 0.25s' }}>
      <div style={{ width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0, background: state === 'idle' ? 'rgba(167,139,250,0.12)' : `${labelColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 900, color: labelColor, transition: 'background 0.25s, color 0.25s' }}>
        {state === 'correct' ? '✓' : state === 'wrong' ? '✗' : state === 'reveal' ? '✓' : label}
      </div>
      <span style={{ fontSize: '15px', color: state === 'idle' ? 'rgba(240,244,255,0.88)' : state === 'wrong' ? 'rgba(240,244,255,0.55)' : '#f1f5f9', lineHeight: 1.5, fontWeight: 500 }}>
        {text}
      </span>
    </motion.button>
  );
}

type MCQState = 'entering' | 'question' | 'answered-correct' | 'answered-wrong' | 'exiting';

export default function CinematicMCQ({ mcq, candidateName, questionOrdinal, onComplete }: Props) {
  const [mcqState, setMcqState] = useState<MCQState>('entering');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [bonusVisible, setBonusVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cancelSpeakRef = useRef<(() => void) | null>(null);

  const stopSpeech = useCallback(() => { cancelSpeakRef.current?.(); cancelSpeakRef.current = null; }, []);

  useEffect(() => {
    const name = candidateName ? `, ${candidateName}` : '';
    const ordinalPhrase = questionOrdinal ? `your ${questionOrdinal} bonus question` : 'a bonus question';
    const line = `Okay${name}... here is ${ordinalPhrase}. ${mcq.questionText} Answer correctly and you'll earn bonus points.`;
    cancelSpeakRef.current = speak(line, 'hr', () => { setMcqState('question'); });
    return stopSpeech;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOption = useCallback((index: number) => {
    if (mcqState !== 'question') return;
    stopSpeech();
    setSelectedIndex(index);
    if (index === mcq.correctIndex) {
      setMcqState('answered-correct');
      setBonusVisible(true);
      setTimeout(() => { if (canvasRef.current) launchConfetti(canvasRef.current); }, 80);
      cancelSpeakRef.current = speak("Fantastic! That's correct — well done. Bonus points added to your score. Back to the interview.", 'hr',
        () => setTimeout(() => { setMcqState('exiting'); setTimeout(() => onComplete(true, index), 500); }, 1200));
    } else {
      setMcqState('answered-wrong');
      cancelSpeakRef.current = speak(`Not quite — but no worries. ${mcq.explanation} Let's keep going.`, 'hr',
        () => setTimeout(() => { setMcqState('exiting'); setTimeout(() => onComplete(false, index), 500); }, 1400));
    }
  }, [mcqState, mcq, stopSpeech, onComplete]);

  const isAnswered = mcqState === 'answered-correct' || mcqState === 'answered-wrong';

  function optionState(i: number): 'idle' | 'correct' | 'wrong' | 'reveal' {
    if (!isAnswered) return 'idle';
    if (i === selectedIndex && i === mcq.correctIndex) return 'correct';
    if (i === selectedIndex && i !== mcq.correctIndex) return 'wrong';
    if (i === mcq.correctIndex && selectedIndex !== mcq.correctIndex) return 'reveal';
    return 'idle';
  }

  return (
    <AnimatePresence>
      {mcqState !== 'exiting' && (
        <motion.div key="mcq-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(4,8,18,0.82)', backdropFilter: 'blur(18px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }} />
          <motion.div initial={{ scale: 0.88, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            style={{ position: 'relative', zIndex: 20, background: 'linear-gradient(160deg, #0f1629 0%, #141a30 100%)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '24px', padding: '40px 40px 36px', maxWidth: '680px', width: '100%', boxShadow: '0 40px 100px rgba(0,0,0,0.65), 0 0 80px rgba(167,139,250,0.08)' }}>
            <div style={{ position: 'absolute', top: '-60px', left: '50%', transform: 'translateX(-50%)', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <motion.div animate={mcqState === 'answered-correct' ? { scale: [1, 1.25, 1], rotate: [0, -10, 10, 0] } : {}} transition={{ duration: 0.5 }}
              style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(167,139,250,0.25), rgba(124,58,237,0.35))', border: '1.5px solid rgba(167,139,250,0.35)', fontSize: '32px', boxShadow: '0 0 40px rgba(167,139,250,0.2)' }}>
                {mcqState === 'answered-correct' ? '🏆' : mcqState === 'answered-wrong' ? '💡' : '⚡'}
              </div>
            </motion.div>

            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '10px' }}>
                ⚡ Bonus Round
              </motion.div>
              <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
                style={{ fontSize: '20px', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.4, margin: 0, letterSpacing: '-0.02em' }}>
                {mcq.questionText}
              </motion.h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {mcq.options.map((opt, i) => (
                <OptionCard key={i} label={LABELS[i]} text={opt} state={optionState(i)} delay={0.38 + i * 0.09} onClick={() => handleOption(i)} />
              ))}
            </div>

            <AnimatePresence>
              {mcqState === 'answered-correct' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
                  style={{ textAlign: 'center', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '14px', padding: '16px' }}>
                  <div style={{ fontSize: '22px', marginBottom: '6px' }}>🎉</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#34D399', marginBottom: '4px' }}>Correct!</div>
                  <div style={{ fontSize: '13px', color: 'rgba(240,244,255,0.65)', lineHeight: 1.5 }}>Brilliant answer. Back to your interview shortly…</div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {mcqState === 'answered-wrong' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>The answer</div>
                  <div style={{ fontSize: '13px', color: 'rgba(240,244,255,0.75)', lineHeight: 1.6 }}>{mcq.explanation}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(240,244,255,0.4)', marginTop: '10px' }}>No worries — back to your interview shortly…</div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {bonusVisible && (
                <motion.div initial={{ opacity: 1, y: 0, scale: 1 }} animate={{ opacity: 0, y: -60, scale: 1.4 }} transition={{ duration: 1.4, ease: 'easeOut' }}
                  onAnimationComplete={() => setBonusVisible(false)}
                  style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', fontSize: '32px', fontWeight: 900, color: '#34D399', textShadow: '0 0 20px rgba(52,211,153,0.8)', pointerEvents: 'none', zIndex: 30, whiteSpace: 'nowrap' }}>
                  +10 pts
                </motion.div>
              )}
            </AnimatePresence>

            {mcqState === 'entering' && (
              <div style={{ textAlign: 'center', paddingTop: '8px' }}>
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.6 }}
                  style={{ fontSize: '12px', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}
                    style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#a78bfa' }} />
                  Preparing your bonus question…
                </motion.div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
