import { useEffect, useRef, useState } from 'react';

/**
 * Cheap "viseme-lite" talking illusion for the static interviewer photos (Sarah, James,
 * Mike) — not real lip-sync, just a soft dark shape at the mouth that pulses open/closed
 * with live speech volume. Reuses the exact same AnalyserNode WaveformBars already reads
 * (see InterviewerAvatar.tsx) — no new audio plumbing, no per-photo cropped mouth assets,
 * no third-party API cost. Deliberately simple: amplitude-driven, not phoneme-accurate.
 *
 * Tuning history: the first pass used one flat dark ellipse + mix-blend-mode:multiply for
 * every profile, eyeballed against the raw (uncropped) photos. Looked like a black hole on
 * Sarah's fair skin and barely showed at all against James's beard — a single intensity
 * doesn't work across different faces. Fixed by rendering the ACTUAL object-fit:cover crop
 * each profile shows (not the raw photo) with Python/Pillow, compositing candidate mouth
 * shapes directly onto it, and iterating by looking at the resulting images directly —
 * the interview room is behind login and passwords are never typed on the user's behalf,
 * so this local-file route was the only way to actually see it before shipping. Per-profile
 * width/height/opacity/color/blur below came out of that pass, tuned against a 360×460
 * test card (InterviewerAvatar's real card size varies with viewport — close enough to be
 * a real improvement, not claimed to be pixel-perfect on every screen size).
 */
export function MouthOverlay({
  analyserNode,
  active,
  left,
  top,
  width,
  height,
  peakOpacity = 0.6,
  color = '30,15,12',
  blur = 1.4,
}: {
  analyserNode?: AnalyserNode | null;
  active: boolean;
  left: string;
  top: string;
  width: number;
  height: number;
  peakOpacity?: number;
  color?: string;
  blur?: number;
}) {
  const [level, setLevel] = useState(0); // 0 (closed) .. 1 (wide open)
  const rafRef = useRef<number>(0);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);

    if (!active) {
      setLevel(0);
      return;
    }

    if (analyserNode) {
      // Real audio path — same source WaveformBars reads. Average the low/low-mid
      // frequency bins (where vowel energy lives) as a simple loudness proxy rather
      // than anything phoneme-aware.
      const bufLen = analyserNode.frequencyBinCount;
      dataRef.current = new Uint8Array(bufLen) as Uint8Array<ArrayBuffer>;
      const sampleBins = Math.min(8, bufLen);

      const tick = () => {
        analyserNode.getByteFrequencyData(dataRef.current!);
        const d = dataRef.current!;
        let sum = 0;
        for (let i = 0; i < sampleBins; i++) sum += d[i];
        const raw = sum / sampleBins / 255;
        setLevel(prev => prev + (raw - prev) * 0.5); // light smoothing, avoids flicker
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    } else {
      // Simulation fallback — same syllable-burst rhythm as WaveformBars' fallback,
      // for when no analyser is available yet but speech is already "active".
      let phase: 'speaking' | 'silent' = 'speaking';
      let phaseMs = 200 + Math.random() * 250;
      let elapsed = 0;
      const TICK = 60;

      const id = setInterval(() => {
        elapsed += TICK;
        if (elapsed >= phaseMs) {
          elapsed = 0;
          if (phase === 'speaking') { phase = 'silent'; phaseMs = 60 + Math.random() * 120; }
          else { phase = 'speaking'; phaseMs = 180 + Math.random() * 320; }
        }
        const target = phase === 'speaking' ? 0.35 + Math.random() * 0.55 : 0.05;
        setLevel(prev => prev + (target - prev) * 0.4);
      }, TICK);
      return () => clearInterval(id);
    }
  }, [active, analyserNode]);

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left, top,
        width, height,
        transform: `translate(-50%, -50%) scaleY(${0.2 + level * 0.9})`,
        transformOrigin: 'center',
        borderRadius: '50%',
        background: `radial-gradient(ellipse, rgba(${color},${Math.min(1, 0.05 + level * peakOpacity + 0.35)}) 0%, rgba(${color},${Math.min(1, (0.05 + level * peakOpacity) * 0.5)}) 55%, transparent 78%)`,
        opacity: active ? 1 : 0,
        filter: `blur(${blur}px)`,
        pointerEvents: 'none',
        transition: 'opacity 0.08s linear',
      }}
    />
  );
}

// Tuned per-profile against the real object-fit:cover crop of each photo — see the class
// doc above for how these were derived and re-derive the same way if they need adjusting.
export const MOUTH_POSITIONS = {
  hr:        { left: '48.5%', top: '29.5%', width: 22, height: 14, peakOpacity: 0.55, color: '55,25,22', blur: 1.6 }, // sarah.jpg
  technical: { left: '49.5%', top: '39.5%', width: 26, height: 16, peakOpacity: 0.85, color: '30,15,12', blur: 1.3 }, // james.png
  mike:      { left: '49%',   top: '47%',   width: 18, height: 11, peakOpacity: 0.75, color: '30,18,15', blur: 1.1 }, // mike.png, tighter circular crop
} as const;
