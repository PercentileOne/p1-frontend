import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const INTERVIEWERS = [
  { name: 'Sarah M.', title: 'HR Director',     initials: 'SM', ring: '#a78bfa', bg: 'linear-gradient(160deg, #1a1040 0%, #0f0c29 100%)', photo: '/images/sarah.jpg' },
  { name: 'James O.', title: 'Hiring Manager',  initials: 'JO', ring: '#4F8EF7', bg: 'linear-gradient(160deg, #0c1a2e 0%, #070b14 100%)', photo: '/images/james.png' },
];

const QUESTIONS = [
  'Tell me about a time you led a team through a difficult decision.',
  'How do you handle pressure in fast-moving environments?',
  'Describe a technical challenge you solved creatively.',
  'What does great engineering leadership look like to you?',
];

const SEQ = [
  { speaker: 0, ph: 'asking'    as const, duration: 3200 },
  { speaker: 2, ph: 'answering' as const, duration: 2800 },
  { speaker: 1, ph: 'asking'    as const, duration: 3400 },
  { speaker: 2, ph: 'answering' as const, duration: 2600 },
  { speaker: 2, ph: 'scoring'   as const, duration: 3800 },
];

export function MiniInterviewRoom() {
  const [speakerIdx, setSpeakerIdx] = useState(0);
  const [phase, setPhase] = useState<'asking' | 'answering' | 'scoring'>('asking');
  const [qIdx, setQIdx] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let step = 0;
    const tick = () => {
      const s = SEQ[step % SEQ.length];
      setSpeakerIdx(s.speaker);
      setPhase(s.ph);
      setShowScore(s.ph === 'scoring');
      if (step > 0 && step % SEQ.length === 0) {
        setQIdx(q => (q + 1) % QUESTIONS.length);
      }
      step++;
      timerRef.current = setTimeout(tick, s.duration);
    };
    timerRef.current = setTimeout(tick, 800);
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
      {/* Outer glow frame */}
      <div style={{
        background: 'linear-gradient(160deg, #100c22 0%, #080812 100%)',
        borderRadius: 14,
        border: '1px solid rgba(120,80,255,0.18)',
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}>
        {/* Top bar */}
        <div style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {['#EF4444','#F59E0B','#34D399'].map(c => (
              <div key={c} style={{ width: 7, height: 7, borderRadius: '50%', background: c, opacity: 0.6 }} />
            ))}
          </div>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.2)', fontWeight: 600, letterSpacing: '0.04em' }}>
            INTERVIEW ROOM · LIVE
          </div>
          <div style={{ fontSize: 9, color: 'rgba(52,211,153,0.7)', fontWeight: 700 }}>●</div>
        </div>

        {/* Tiles */}
        <div style={{ display: 'flex', gap: 6, padding: '10px 10px 0' }}>
          {INTERVIEWERS.map((iv, idx) => {
            const speaking = speakerIdx === idx;
            return (
              <div key={iv.name} style={{
                flex: 1, borderRadius: 10, overflow: 'hidden', position: 'relative',
                background: iv.bg,
                border: `1px solid ${speaking ? iv.ring + '55' : 'rgba(255,255,255,0.06)'}`,
                boxShadow: speaking ? `0 0 14px ${iv.ring}22` : 'none',
                minHeight: 160,
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}>
                {/* Photo */}
                <img
                  src={iv.photo}
                  alt={iv.name}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', position: 'absolute', inset: 0 }}
                />
                {/* Vignette */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 55%)', pointerEvents: 'none' }} />
                {/* Speaking ring */}
                <AnimatePresence>
                  {speaking && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: [0.3, 0.8, 0.3] }} exit={{ opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      style={{ position: 'absolute', inset: 0, borderRadius: 10, border: `1.5px solid ${iv.ring}`, pointerEvents: 'none' }}
                    />
                  )}
                </AnimatePresence>
                {/* Name + dot */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{iv.name}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{iv.title}</div>
                  </div>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: speaking ? iv.ring : 'rgba(255,255,255,0.15)', boxShadow: speaking ? `0 0 5px ${iv.ring}` : 'none', transition: 'all 0.2s', flexShrink: 0 }} />
                </div>
              </div>
            );
          })}

          {/* YOU tile */}
          <div style={{
            width: 100, flexShrink: 0, borderRadius: 10, overflow: 'hidden', position: 'relative',
            background: 'linear-gradient(160deg, #111118 0%, #0a0a12 100%)',
            border: `1px solid ${phase === 'answering' ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.06)'}`,
            boxShadow: phase === 'answering' ? '0 0 12px rgba(52,211,153,0.12)' : 'none',
            minHeight: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}>
            <svg width="40" height="50" viewBox="0 0 48 60" fill="none">
              <ellipse cx="24" cy="17" rx="13" ry="14" fill="rgba(255,255,255,0.08)" />
              <path d="M2 58c0-12.15 9.85-22 22-22s22 9.85 22 22" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
            </svg>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>You</div>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: phase === 'answering' ? '#34D399' : 'rgba(255,255,255,0.15)', boxShadow: phase === 'answering' ? '0 0 5px #34D399' : 'none', transition: 'all 0.2s' }} />
            </div>
          </div>
        </div>

        {/* Question strip */}
        <div style={{ margin: '8px 10px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 14px', minHeight: 48, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(120,80,255,0.6)', flexShrink: 0 }}>Q{qIdx + 1}</div>
          <AnimatePresence mode="wait">
            <motion.div key={`${qIdx}-${phase}`}
              initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.2 }}
              style={{ fontSize: 12, color: phase === 'answering' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.75)', lineHeight: 1.45, fontStyle: phase === 'answering' ? 'italic' : 'normal' }}
            >
              {phase === 'answering' ? 'Listening to your answer…' : phase === 'scoring' ? 'Scoring your response…' : QUESTIONS[qIdx]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Floating score card */}
      <AnimatePresence>
        {showScore && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -8 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute', top: 36, right: 10,
              background: 'linear-gradient(135deg, #1a1040, #0f1729)',
              border: '1px solid rgba(167,139,250,0.3)',
              borderRadius: 12, padding: '12px 14px', width: 130,
              boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(167,139,250,0.6)', marginBottom: 8 }}>ANSWER SCORE</div>
            {[
              { label: 'Clarity',    value: 88, color: '#34D399' },
              { label: 'Depth',      value: 82, color: '#4F8EF7' },
              { label: 'Confidence', value: 79, color: '#a78bfa' },
              { label: 'Delivery',   value: 91, color: '#F59E0B' },
            ].map((s, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>{s.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: s.color }}>{s.value}</span>
                </div>
                <div style={{ height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${s.value}%` }}
                    transition={{ duration: 0.45, delay: i * 0.07 }}
                    style={{ height: '100%', background: s.color, borderRadius: 2 }}
                  />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>Overall</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#34D399' }}>85%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
