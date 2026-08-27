import { useEffect, useRef, useState } from 'react';

/**
 * Cheap "viseme-lite" talking illusion for the static interviewer photos (Sarah, James,
 * Mike) — not real lip-sync, just a soft dark shape at the mouth that pulses open/closed
 * with live speech volume. Reuses the exact same AnalyserNode WaveformBars already reads
 * (see InterviewerAvatar.tsx) — no new audio plumbing, no per-photo cropped mouth assets,
 * no third-party API cost. Deliberately simple: amplitude-driven, not phoneme-accurate.
 *
 * Position is given as a percentage of the CONTAINING element (which must be
 * `position: relative`), eyeballed against each photo — see MOUTH_POSITIONS below.
 * These are approximate (the photos render via object-fit:cover/object-position:center
 * top, so exact alignment shifts a little with container aspect ratio) — nudge the
 * percentages there if it looks off once live, not the logic in this file.
 */
export function MouthOverlay({
  analyserNode,
  active,
  left,
  top,
  size = 22,
}: {
  analyserNode?: AnalyserNode | null;
  active: boolean;
  left: string;
  top: string;
  size?: number;
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
        width: size, height: size,
        transform: `translate(-50%, -50%) scaleY(${0.25 + level * 0.85})`,
        transformOrigin: 'center',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(20,10,10,0.95) 0%, rgba(20,10,10,0.5) 55%, transparent 75%)',
        mixBlendMode: 'multiply',
        opacity: active ? Math.min(1, 0.15 + level * 1.1) : 0,
        filter: 'blur(1px)',
        pointerEvents: 'none',
        transition: 'opacity 0.08s linear',
      }}
    />
  );
}

// Eyeballed against the actual photos — see the class doc above for how to re-tune these.
export const MOUTH_POSITIONS = {
  hr: { left: '50%', top: '27%', size: 20 },         // sarah.jpg
  technical: { left: '50%', top: '37%', size: 22 },  // james.png
  mike: { left: '50%', top: '43%', size: 16 },        // mike.png, tighter circular crop
} as const;
