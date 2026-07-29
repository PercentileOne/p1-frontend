import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Simulated waveform — animates like real audio bars
function WaveformBars({ color, active }: { color: string; active: boolean }) {
  const SHAPES = [0.45, 0.72, 0.88, 1.0, 0.95, 0.78, 0.92, 0.65, 0.82, 0.50];
  const [heights, setHeights] = useState(SHAPES.map(() => 0.1));

  useEffect(() => {
    if (!active) { setHeights(SHAPES.map(() => 0.1)); return; }
    const id = setInterval(() => {
      setHeights(prev => prev.map((h, i) => {
        const t = 0.2 + Math.random() * SHAPES[i] * 0.8;
        return h + (t - h) * 0.4;
      }));
    }, 80);
    return () => clearInterval(id);
  }, [active]);

  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 36 }}>
      {heights.map((h, i) => (
        <motion.div key={i}
          animate={{ scaleY: h }}
          transition={{ duration: 0.07, ease: 'linear' }}
          style={{ width: 4, height: '100%', background: color, borderRadius: 2, transformOrigin: 'center' }}
        />
      ))}
    </div>
  );
}

const INTERVIEWERS = [
  {
    id: 'sarah',
    name: 'Sarah Mitchell',
    title: 'HR Director',
    initials: 'SM',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    ring: '#a78bfa',
    barColor: '#a78bfa',
    bg: 'linear-gradient(160deg, #1a1040 0%, #0f0c29 100%)',
    photo: '/images/sarah.jpg',
  },
  {
    id: 'james',
    name: 'James Okafor',
    title: 'Hiring Manager',
    initials: 'JO',
    gradient: 'linear-gradient(135deg, #1B3A6B 0%, #2563eb 100%)',
    ring: '#4F8EF7',
    barColor: '#4F8EF7',
    bg: 'linear-gradient(160deg, #0c1a2e 0%, #070b14 100%)',
    photo: '/images/james.png',
  },
];

const DEMO_QUESTIONS = [
  'Tell me about a time you led a team through a difficult technical decision.',
  'How do you approach system design for high-scale distributed systems?',
  'Describe your experience with agile delivery and working across product teams.',
  'What does great engineering leadership look like to you?',
];

const SCORE_LABELS = [
  { label: 'Clarity', value: 88, color: '#34D399' },
  { label: 'Depth', value: 82, color: '#4F8EF7' },
  { label: 'Confidence', value: 79, color: '#a78bfa' },
  { label: 'Delivery', value: 91, color: '#F59E0B' },
];

export function InterviewShowcase() {
  const [speakerIdx, setSpeakerIdx] = useState(0); // 0=sarah, 1=james, 2=you
  const [qIdx, setQIdx] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [phase, setPhase] = useState<'asking' | 'answering' | 'scoring'>('asking');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // Cycle: Sarah asks → You answer → James asks → You answer → Score reveal → next question
    const seq = [
      { speaker: 0, ph: 'asking' as const,   duration: 3200, score: false },
      { speaker: 2, ph: 'answering' as const, duration: 3000, score: false },
      { speaker: 1, ph: 'asking' as const,   duration: 3400, score: false },
      { speaker: 2, ph: 'answering' as const, duration: 2600, score: false },
      { speaker: 2, ph: 'scoring' as const,  duration: 4200, score: true  },
    ];
    let step = 0;

    const tick = () => {
      const s = seq[step % seq.length];
      setSpeakerIdx(s.speaker);
      setPhase(s.ph);
      setShowScore(s.score);

      if (step > 0 && step % seq.length === 0) {
        setQIdx(q => (q + 1) % DEMO_QUESTIONS.length);
      }

      step++;
      timerRef.current = setTimeout(tick, s.duration);
    };

    timerRef.current = setTimeout(tick, 600);
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div style={{ padding: '0 24px 80px' }}>
      {/* Section header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#7b5cf5', marginBottom: 12 }}>
          ✦ INTERVIEW ROOM
        </div>
        <h2 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.8rem)', fontWeight: 900, color: '#fff', lineHeight: 1.15, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
          Your private interview studio.
        </h2>
        <p style={{ fontSize: 17, color: '#8080b0', lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
          Two live AI interviewers. Real questions for your exact role.
          Your score the moment you finish — and nobody watching but you.
        </p>
      </div>

      {/* The room */}
      <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative' }}>

        {/* Outer glow */}
        <div style={{ position: 'absolute', inset: -1, borderRadius: 24, background: 'linear-gradient(135deg, rgba(123,92,245,0.3), rgba(79,142,247,0.2))', filter: 'blur(1px)', zIndex: 0 }} />

        <div style={{
          position: 'relative', zIndex: 1,
          background: 'linear-gradient(160deg, #0d0b1e 0%, #080812 100%)',
          borderRadius: 22,
          border: '1px solid rgba(120,80,255,0.2)',
          overflow: 'hidden',
        }}>

          {/* Faux top bar */}
          <div style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['#EF4444','#F59E0B','#34D399'].map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
              ))}
            </div>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>
              explain.global · Interview Room · Senior Fullstack Engineer — Barclays
            </div>
            <div style={{ fontSize: 11, color: 'rgba(52,211,153,0.7)', fontWeight: 700 }}>● LIVE</div>
          </div>

          {/* Interview tiles */}
          <div style={{ display: 'flex', gap: 12, padding: '16px 16px 0' }}>

            {/* Interviewers */}
            {INTERVIEWERS.map((iv, idx) => {
              const isSpeaking = speakerIdx === idx;
              return (
                <div key={iv.id} style={{
                  flex: 1, borderRadius: 14, overflow: 'hidden', position: 'relative',
                  background: iv.bg,
                  border: `1px solid ${isSpeaking ? iv.ring + '66' : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: isSpeaking ? `0 0 20px ${iv.ring}22` : 'none',
                  transition: 'border-color 0.1s, box-shadow 0.1s',
                  minHeight: 200,
                }}>
                  {/* Photo */}
                  <img
                    src={iv.photo}
                    alt={iv.name}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', position: 'absolute', inset: 0 }}
                  />
                  {/* Vignette */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)', pointerEvents: 'none' }} />

                  {/* Pulsing ring when speaking */}
                  <AnimatePresence>
                    {isSpeaking && (
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: [0.4, 0.9, 0.4] }} exit={{ opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                        style={{ position: 'absolute', inset: 0, borderRadius: 14, border: `2px solid ${iv.ring}`, pointerEvents: 'none' }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Bottom info */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 14px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{iv.name}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{iv.title}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                      {isSpeaking
                        ? <WaveformBars color={iv.barColor} active={isSpeaking} />
                        : <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {speakerIdx === 2 ? 'Listening' : 'Ready'}
                          </div>
                      }
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: isSpeaking ? iv.ring : 'rgba(255,255,255,0.2)', boxShadow: isSpeaking ? `0 0 6px ${iv.ring}` : 'none', transition: 'all 0.2s' }} />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* YOU tile */}
            <div style={{
              width: 140, flexShrink: 0, borderRadius: 14, overflow: 'hidden', position: 'relative',
              background: 'linear-gradient(160deg, #111118 0%, #0a0a12 100%)',
              border: `1px solid ${phase === 'answering' ? 'rgba(52,211,153,0.55)' : 'rgba(255,255,255,0.06)'}`,
              boxShadow: phase === 'answering' ? '0 0 16px rgba(52,211,153,0.15)' : 'none',
              minHeight: 200,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'border-color 0.1s, box-shadow 0.1s',
            }}>
              {/* Silhouette */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <svg width="48" height="60" viewBox="0 0 48 60" fill="none">
                  <ellipse cx="24" cy="17" rx="13" ry="14" fill="rgba(255,255,255,0.08)" />
                  <path d="M2 58c0-12.15 9.85-22 22-22s22 9.85 22 22" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
                </svg>
              </div>
              {/* Vignette */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)', pointerEvents: 'none' }} />
              {/* Bottom label */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>You</div>
                  <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: phase === 'answering' ? '#34D399' : 'rgba(255,255,255,0.3)' }}>
                    {phase === 'answering' ? '● Speaking' : phase === 'scoring' ? 'Done' : 'Ready'}
                  </div>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: phase === 'answering' ? '#34D399' : 'rgba(255,255,255,0.2)', boxShadow: phase === 'answering' ? '0 0 6px #34D399' : 'none', transition: 'all 0.2s' }} />
              </div>
            </div>
          </div>

          {/* Question strip */}
          <div style={{ margin: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 18px', minHeight: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(120,80,255,0.7)', flexShrink: 0 }}>Q{qIdx + 1}/10</div>
            <AnimatePresence mode="wait">
              <motion.div key={qIdx}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, fontWeight: 500 }}
              >
                {phase === 'answering' ? (
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>Listening to your answer…</span>
                ) : DEMO_QUESTIONS[qIdx]}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Answer bar */}
          <div style={{ margin: '0 16px 16px', display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: speakerIdx === 2 ? '#EF4444' : 'rgba(255,255,255,0.15)', boxShadow: speakerIdx === 2 ? '0 0 6px #EF4444' : 'none', flexShrink: 0, transition: 'all 0.2s' }} />
              <span style={{ fontSize: 12, color: speakerIdx === 2 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)' }}>
                {speakerIdx === 2 ? 'Recording your answer…' : 'Waiting for your turn…'}
              </span>
            </div>
            {['⏭ Pass', '🔁 Repeat', '⏸ Pause'].map(btn => (
              <div key={btn} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600, cursor: 'default' }}>{btn}</div>
            ))}
          </div>
        </div>

        {/* Floating score card */}
        <AnimatePresence>
          {showScore && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 20 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'absolute', top: 60, right: -16,
                background: 'linear-gradient(135deg, #1a1040, #0f1729)',
                border: '1px solid rgba(167,139,250,0.3)',
                borderRadius: 16, padding: '16px 20px', width: 180,
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                zIndex: 10,
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(167,139,250,0.6)', marginBottom: 10 }}>ANSWER SCORE</div>
              {SCORE_LABELS.map((s, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{s.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: s.color }}>{s.value}</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.value}%` }}
                      transition={{ duration: 0.5, delay: i * 0.08 }}
                      style={{ height: '100%', background: s.color, borderRadius: 2 }}
                    />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Overall</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: '#34D399' }}>85%</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom CTAs */}
      <div style={{ textAlign: 'center', marginTop: 40, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a
          href="https://recruiter.explain.global/interview-room/demo"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: 'linear-gradient(135deg, #7b5cf5, #5b8ff7)',
            color: '#fff', border: 'none', borderRadius: 10,
            padding: '14px 28px', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', textDecoration: 'none',
            boxShadow: '0 4px 24px rgba(123,92,245,0.35)',
          }}
        >
          Try the interview room →
        </a>
        <a
          href="/pricing"
          style={{
            background: 'rgba(255,255,255,0.05)',
            color: '#c0c0e0', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10, padding: '14px 28px', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', textDecoration: 'none',
          }}
        >
          See pricing
        </a>
      </div>
    </div>
  );
}
