import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type AvatarState = 'idle' | 'speaking' | 'listening' | 'thinking';
export type InterviewerRole = 'hr' | 'technical';

interface Props {
  role: InterviewerRole;
  state: AvatarState;
  active: boolean;
  videoUrl?: string | null;
  specialistTitle?: string;
}

const PROFILES = {
  hr: {
    name: 'Sarah Mitchell',
    title: 'HR Director',
    initials: 'SM',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    ring: '#a78bfa',
    barColor: '#a78bfa',
    bg: 'linear-gradient(160deg, #1a1040 0%, #0f0c29 100%)',
  },
  technical: {
    name: 'James Okafor',
    title: 'Hiring Manager',
    initials: 'JO',
    gradient: 'linear-gradient(135deg, #1B3A6B 0%, #2563eb 100%)',
    ring: '#4F8EF7',
    barColor: '#4F8EF7',
    bg: 'linear-gradient(160deg, #0c1a2e 0%, #070b14 100%)',
  },
};

// Natural-shape factors — determines each bar's max relative height
const BAR_SHAPES = [0.45, 0.72, 0.88, 1.0, 0.95, 0.78, 0.92, 0.65, 0.82, 0.50];

function WaveformBars({ active, color }: { active: boolean; color: string }) {
  // Random-walk state — each bar independently drifts toward a new random target every 80 ms.
  // Gives organic, non-repetitive speech-rhythm animation without needing real audio data.
  const [heights, setHeights] = useState<number[]>(() => BAR_SHAPES.map(() => 0.12));

  useEffect(() => {
    if (!active) {
      setHeights(BAR_SHAPES.map(() => 0.12));
      return;
    }
    const id = setInterval(() => {
      setHeights(prev =>
        prev.map((h, i) => {
          const target = 0.18 + Math.random() * BAR_SHAPES[i] * 0.82;
          // Smooth interpolation toward target — 35% per tick ≈ natural damping
          return h + (target - h) * 0.35;
        })
      );
    }, 80);
    return () => clearInterval(id);
  }, [active]);

  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center', height: '28px' }}>
      {heights.map((h, i) => (
        <motion.div
          key={i}
          animate={{ scaleY: active ? h : 0.1 }}
          transition={{ duration: 0.07, ease: 'linear' }}
          style={{
            width: '3px',
            height: '100%',
            background: active ? color : 'rgba(255,255,255,0.12)',
            borderRadius: '2px',
            transformOrigin: 'center',
          }}
        />
      ))}
    </div>
  );
}

export function InterviewerAvatar({ role, state, active, videoUrl, specialistTitle }: Props) {
  const profile = { ...PROFILES[role], title: role === 'technical' ? (specialistTitle ?? PROFILES.technical.title) : PROFILES.hr.title };

  const statusLabel =
    state === 'speaking' ? 'Speaking'
    : state === 'thinking' ? 'Thinking…'
    : state === 'listening' ? 'Listening'
    : 'Ready';

  const statusColor =
    state === 'speaking' ? '#34D399'
    : state === 'thinking' ? '#F59E0B'
    : state === 'listening' ? '#4F8EF7'
    : 'rgba(255,255,255,0.3)';

  return (
    <div style={{
      flex: 1,
      background: profile.bg,
      borderRadius: '16px',
      border: `1px solid ${active
        ? (role === 'hr' ? 'rgba(167,139,250,0.4)' : 'rgba(79,142,247,0.4)')
        : 'rgba(255,255,255,0.06)'}`,
      padding: '28px 20px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'border-color 0.4s',
      minHeight: '260px',
    }}>

      {/* Active glow */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0,
              background: role === 'hr'
                ? 'radial-gradient(ellipse at 50% 0%, rgba(167,139,250,0.08) 0%, transparent 70%)'
                : 'radial-gradient(ellipse at 50% 0%, rgba(79,142,247,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* Avatar */}
      <div style={{ position: 'relative' }}>
        {/* Speaking ring */}
        <AnimatePresence>
          {state === 'speaking' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.2, 0.6] }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              style={{
                position: 'absolute', inset: -8, borderRadius: '50%',
                border: `2px solid ${profile.ring}`,
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {videoUrl ? (
            <motion.video
              key="video"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              src={videoUrl}
              autoPlay
              playsInline
              style={{
                width: '96px', height: '96px', borderRadius: '50%',
                objectFit: 'cover',
                boxShadow: active ? `0 0 32px ${profile.ring}60` : 'none',
                border: `2px solid ${profile.ring}44`,
              }}
            />
          ) : (
            <motion.div
              key="initials"
              animate={{ scale: [1, 1.012, 1] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              style={{
                width: '96px', height: '96px', borderRadius: '50%',
                background: profile.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px', fontWeight: 800, color: '#fff',
                letterSpacing: '-0.02em',
                boxShadow: active ? `0 0 32px ${profile.ring}40` : 'none',
                transition: 'box-shadow 0.4s',
                position: 'relative', overflow: 'hidden',
              }}
            >
              {profile.initials}
              <AnimatePresence>
                {state === 'thinking' && (
                  <motion.div
                    initial={{ x: '-100%' }} animate={{ x: '200%' }} exit={{ opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute', top: 0, bottom: 0, width: '40%',
                      background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status dot */}
        <div style={{
          position: 'absolute', bottom: 4, right: 4,
          width: '14px', height: '14px', borderRadius: '50%',
          background: statusColor, border: '2px solid var(--bg)',
          transition: 'background 0.3s',
        }} />
      </div>

      {/* Name + role */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>
          {profile.name}
        </div>
        <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
          {profile.title}
        </div>
      </div>

      {/* Waveform / status label */}
      <div style={{ height: '28px', display: 'flex', alignItems: 'center' }}>
        {state === 'speaking' ? (
          <WaveformBars active color={profile.barColor} />
        ) : (
          <div style={{
            fontSize: '11px', fontWeight: 600, color: statusColor,
            letterSpacing: '0.05em', transition: 'color 0.3s',
          }}>
            {statusLabel}
          </div>
        )}
      </div>
    </div>
  );
}
