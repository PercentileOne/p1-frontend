import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MouthOverlay, MOUTH_POSITIONS, MOUTH_OVERLAY_ENABLED } from './MouthOverlay';

export type AvatarState = 'idle' | 'speaking' | 'listening' | 'thinking';
export type InterviewerRole = 'hr' | 'technical';

interface Props {
  role: InterviewerRole;
  state: AvatarState;
  active: boolean;
  videoUrl?: string | null;
  posterUrl?: string | null;   // kept for API compat, unused now
  specialistTitle?: string;
  analyserNode?: AnalyserNode | null;
  onVideoEnded?: () => void;
  // Fired once, when a real <video> starts playing, with a live AnalyserNode tapped off its
  // OWN audio track — lets the caller feed WaveformBars from the video's real voice instead
  // of whatever analyserNode it was passed (which reflects a separate TTS call that a
  // pre-rendered video doesn't make, so the bars would otherwise fall back to their
  // synthetic simulation and visibly not match the video's actual speech).
  onVideoAnalyser?: (node: AnalyserNode) => void;
}

const PROFILES = {
  hr: {
    name: 'Sarah Mitchell',
    title: 'HR Director',
    initials: 'SM',
    photo: '/images/sarah.jpg',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    ring: '#a78bfa',
    barColor: '#a78bfa',
    bg: 'linear-gradient(160deg, #1a1040 0%, #0f0c29 100%)',
  },
  technical: {
    name: 'James Jacobs',
    title: 'Hiring Manager',
    initials: 'JJ',
    photo: '/images/james.png',
    gradient: 'linear-gradient(135deg, #1B3A6B 0%, #2563eb 100%)',
    ring: '#4F8EF7',
    barColor: '#4F8EF7',
    bg: 'linear-gradient(160deg, #0c1a2e 0%, #070b14 100%)',
  },
};

const BAR_COUNT = 10;
const BAR_SHAPES = [0.45, 0.72, 0.88, 1.0, 0.95, 0.78, 0.92, 0.65, 0.82, 0.50];

export function WaveformBars({ active, color, analyserNode }: {
  active: boolean;
  color: string;
  analyserNode?: AnalyserNode | null;
}) {
  const [heights, setHeights] = useState<number[]>(() => BAR_SHAPES.map(() => 0.12));
  const rafRef = useRef<number>(0);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);

    if (!active) {
      setHeights(BAR_SHAPES.map(() => 0.12));
      return;
    }

    if (analyserNode) {
      // ── Real audio path: read frequency bins every frame ──────────────────
      const bufLen = analyserNode.frequencyBinCount; // fftSize/2 = 32
      dataRef.current = new Uint8Array(bufLen) as Uint8Array<ArrayBuffer>;
      const step = Math.max(1, Math.floor(bufLen / BAR_COUNT));

      const tick = () => {
        analyserNode.getByteFrequencyData(dataRef.current!);
        const d = dataRef.current!;
        setHeights(BAR_SHAPES.map((_, i) => {
          const raw = d[Math.min(i * step, bufLen - 1)] / 255;
          return Math.max(0.08, raw);
        }));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    } else {
      // ── Simulation fallback: natural syllable-burst pattern ────────────────
      // Alternates between brief "utterance" bursts and short silence gaps
      // to mimic real speech rhythm rather than continuous random noise.
      let phase: 'speaking' | 'silent' = 'speaking';
      let phaseMs = 200 + Math.random() * 250;
      let elapsed = 0;
      const TICK = 60;

      const id = setInterval(() => {
        elapsed += TICK;
        if (elapsed >= phaseMs) {
          elapsed = 0;
          if (phase === 'speaking') {
            phase = 'silent';
            phaseMs = 60 + Math.random() * 120; // 60–180 ms pause
          } else {
            phase = 'speaking';
            phaseMs = 180 + Math.random() * 320; // 180–500 ms syllable burst
          }
        }

        if (phase === 'speaking') {
          const energy = 0.45 + Math.random() * 0.55;
          setHeights(prev =>
            prev.map((h, i) => {
              const target = 0.22 + energy * BAR_SHAPES[i] * 0.78;
              return h + (target - h) * 0.4;
            })
          );
        } else {
          setHeights(prev => prev.map(h => h + (0.06 - h) * 0.5));
        }
      }, TICK);
      return () => clearInterval(id);
    }
  }, [active, analyserNode]);

  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center', height: '40px' }}>
      {heights.map((h, i) => (
        <motion.div
          key={i}
          animate={{ scaleY: active ? h : 0.08 }}
          transition={{ duration: analyserNode ? 0.04 : 0.07, ease: 'linear' }}
          style={{
            width: '4px', height: '100%',
            background: active ? color : 'rgba(255,255,255,0.10)',
            borderRadius: '2px', transformOrigin: 'center',
          }}
        />
      ))}
    </div>
  );
}

export function InterviewerAvatar({ role, state, active, videoUrl, specialistTitle, analyserNode, onVideoEnded, onVideoAnalyser }: Props) {
  const profile = {
    ...PROFILES[role],
    title: role === 'technical' ? (specialistTitle ?? PROFILES.technical.title) : PROFILES.hr.title,
  };

  // Taps a live AnalyserNode off the video's OWN audio track once it starts playing, so
  // WaveformBars can react to the video's real voice instead of sitting on whatever
  // analyserNode it was last given (stale from a previous speak() call, or null) — see the
  // onVideoAnalyser prop doc. createMediaElementSource can only be called once per <video>
  // element; the video's `key={videoUrl}` above means a new element (and a fresh effect run)
  // whenever videoUrl changes, so this only ever runs once per real element.
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!videoUrl || !videoRef.current || !onVideoAnalyser) return;
    const videoEl = videoRef.current;
    try {
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaElementSource(videoEl);
      const videoAnalyser = audioCtx.createAnalyser();
      videoAnalyser.fftSize = 128;
      // Must route back to destination — createMediaElementSource takes over the element's
      // audio output, so without this the video plays silently.
      source.connect(videoAnalyser);
      videoAnalyser.connect(audioCtx.destination);
      onVideoAnalyser(videoAnalyser);
      // A freshly-created AudioContext can start life 'suspended' per the browser's
      // autoplay policy — createMediaElementSource has already rerouted the video's audio
      // through this (possibly suspended) graph, so if we don't explicitly resume it here
      // the video plays and the mouth moves with zero sound reaching destination, silently.
      // Safe to call unconditionally — a no-op once the context is already running.
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      return () => { audioCtx.close().catch(() => {}); };
    } catch {
      // AudioContext can be blocked in some browsers without a prior user gesture — the
      // waveform just stays on its synthetic fallback in that edge case; the <video>
      // element's own audio still plays regardless, this only affects the visualizer.
      return undefined;
    }
  }, [videoUrl, onVideoAnalyser]);

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
      transition: 'border-color 0.1s',
      padding: 0,
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

      {/* Full-frame photo — fills the card, vignette overlay for name/status */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <img
          src={profile.photo}
          alt={profile.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
        />
        {/* Amplitude-driven mouth movement — skipped once a real D-ID talking-head video
            is playing (that already has real lip movement of its own). */}
        {MOUTH_OVERLAY_ENABLED && !videoUrl && (
          <MouthOverlay
            analyserNode={analyserNode}
            active={state === 'speaking'}
            {...MOUTH_POSITIONS[role]}
          />
        )}
        {/* Pre-rendered talking-head video overlay (e.g. Sarah's real intro clip) — carries
            its own audio track, so NOT muted. Autoplay-with-sound relies on the browser
            already having registered a user gesture earlier in the flow (uploading a CV,
            clicking "Begin Interview", granting mic/camera) — holds in practice, but if a
            browser ever blocks it, this plays silently rather than erroring; onEnded still
            fires either way. */}
        <AnimatePresence>
          {videoUrl && (
            <motion.video
              ref={videoRef}
              key={videoUrl}
              src={videoUrl}
              autoPlay playsInline
              onEnded={onVideoEnded}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
            />
          )}
        </AnimatePresence>
        {/* Thinking shimmer */}
        <AnimatePresence>
          {state === 'thinking' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <motion.div
                initial={{ x: '-100%' }} animate={{ x: '200%' }}
                transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                style={{ position: 'absolute', top: 0, bottom: 0, width: '40%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        {/* Bottom vignette */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)', pointerEvents: 'none' }} />
        {/* Speaking ring border — always rendered, opacity driven by state to avoid flash on mount/unmount */}
        <motion.div
          animate={active && state === 'speaking' ? { opacity: [0.35, 0.85, 0.35] } : { opacity: 0 }}
          transition={active && state === 'speaking'
            ? { repeat: Infinity, duration: 2.2, ease: 'easeInOut' }
            : { duration: 0.4, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: 0, borderRadius: '16px', border: `2px solid ${profile.ring}`, pointerEvents: 'none' }}
        />
      </div>

      {/* Name + status — overlaid bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 18px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', userSelect: 'none', cursor: 'default' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{profile.name}</div>
          <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>{profile.title}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          {state === 'speaking' ? (
            <WaveformBars active color={profile.barColor} analyserNode={analyserNode} />
          ) : (
            <div style={{ fontSize: '10px', fontWeight: 600, color: statusColor, letterSpacing: '0.05em' }}>{statusLabel}</div>
          )}
          {/* Status dot */}
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: dotColor, border: '2px solid rgba(0,0,0,0.5)', boxShadow: active ? `0 0 6px ${profile.ring}` : 'none', transition: 'background 0.3s' }} />
        </div>
      </div>
    </div>
  );
}
