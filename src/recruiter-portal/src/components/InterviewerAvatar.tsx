import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type AvatarState = 'idle' | 'speaking' | 'listening' | 'thinking';
export type InterviewerRole = 'hr' | 'technical';

interface Props {
  role: InterviewerRole;
  state: AvatarState;
  active: boolean;
  videoUrl?: string | null;
  posterUrl?: string | null;   // kept for API compat, unused now
  specialistTitle?: string;
  onVideoEnded?: () => void;
}

const PROFILES = {
  hr: {
    name: 'Sarah Mitchell',
    title: 'HR Director',
    initials: 'SM',
    photo: '/images/sarah.png',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    ring: '#a78bfa',
    barColor: '#a78bfa',
    bg: 'linear-gradient(160deg, #1a1040 0%, #0f0c29 100%)',
  },
  technical: {
    name: 'James Okafor',
    title: 'Hiring Manager',
    initials: 'JO',
    photo: '/images/james.png',
    gradient: 'linear-gradient(135deg, #1B3A6B 0%, #2563eb 100%)',
    ring: '#4F8EF7',
    barColor: '#4F8EF7',
    bg: 'linear-gradient(160deg, #0c1a2e 0%, #070b14 100%)',
  },
};

const BAR_SHAPES = [0.45, 0.72, 0.88, 1.0, 0.95, 0.78, 0.92, 0.65, 0.82, 0.50];

function WaveformBars({ active, color }: { active: boolean; color: string }) {
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
            width: '3px', height: '100%',
            background: active ? color : 'rgba(255,255,255,0.12)',
            borderRadius: '2px', transformOrigin: 'center',
          }}
        />
      ))}
    </div>
  );
}

export function InterviewerAvatar({ role, state, active, videoUrl, specialistTitle, onVideoEnded }: Props) {
  const profile = {
    ...PROFILES[role],
    title: role === 'technical' ? (specialistTitle ?? PROFILES.technical.title) : PROFILES.hr.title,
  };

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

  const dotColor =
    state === 'speaking' ? '#34D399'
    : state === 'thinking' ? '#F59E0B'
    : state === 'listening' ? '#4F8EF7'
    : 'rgba(255,255,255,0.25)';

  return (
    <div style={{
      flex: 1,
      background: profile.bg,
      borderRadius: '16px',
      border: `1px solid ${active
        ? (role === 'hr' ? 'rgba(167,139,250,0.4)' : 'rgba(79,142,247,0.4)')
        : 'rgba(255,255,255,0.06)'}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      transition: 'border-color 0.4s',
      padding: '28px 20px 20px',
      gap: '16px',
      minHeight: '300px',
    }}>

      {/* Active glow */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0,
              background: role === 'hr'
                ? 'radial-gradient(ellipse at 50% 0%, rgba(167,139,250,0.10) 0%, transparent 70%)'
                : 'radial-gradient(ellipse at 50% 0%, rgba(79,142,247,0.10) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* Face circle — photo always visible; D-ID video overlays when speaking */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* Speaking ring */}
        <AnimatePresence>
          {active && state === 'speaking' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: [1, 1.06, 1], opacity: [0.7, 0.2, 0.7] }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              style={{
                position: 'absolute', inset: -10, borderRadius: '50%',
                border: `2px solid ${profile.ring}`, pointerEvents: 'none',
              }}
            />
          )}
        </AnimatePresence>

        {/* Circle container */}
        <div style={{
          width: '180px', height: '180px', borderRadius: '50%',
          overflow: 'hidden', position: 'relative',
          background: profile.gradient, flexShrink: 0,
        }}>
          {/* Static photo — always rendered as the base layer */}
          <img
            src={profile.photo}
            alt={profile.name}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center top',
              display: 'block',
            }}
          />

          {/* D-ID video — fades in on top when speaking, fades out when done */}
          <AnimatePresence>
            {videoUrl && (
              <motion.video
                key={videoUrl}
                src={videoUrl}
                autoPlay
                playsInline
                muted
                onEnded={onVideoEnded}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover', objectPosition: 'center top',
                  display: 'block',
                }}
              />
            )}
          </AnimatePresence>

          {/* Thinking shimmer overlay */}
          <AnimatePresence>
            {state === 'thinking' && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
              >
                <motion.div
                  initial={{ x: '-100%' }} animate={{ x: '200%' }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute', top: 0, bottom: 0, width: '40%',
                    background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)',
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status dot */}
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          width: '14px', height: '14px', borderRadius: '50%',
          background: dotColor,
          border: '2px solid rgba(0,0,0,0.6)',
          transition: 'background 0.3s',
          boxShadow: active ? `0 0 8px ${profile.ring}80` : 'none',
        }} />
      </div>

      {/* Name + role */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>{profile.name}</div>
        <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>{profile.title}</div>
      </div>

      {/* Waveform / status label */}
      <div style={{ height: '28px', display: 'flex', alignItems: 'center' }}>
        {state === 'speaking' ? (
          <WaveformBars active color={profile.barColor} />
        ) : (
          <div style={{ fontSize: '11px', fontWeight: 600, color: statusColor, letterSpacing: '0.05em', transition: 'color 0.3s' }}>
            {statusLabel}
          </div>
        )}
      </div>
    </div>
  );
}
