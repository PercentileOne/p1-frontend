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
// Re-enabled 2026-08-27 after finding the actual root cause of the earlier live
// mispositioning: the first verification pass used a portrait-shaped (360×460) test card,
// but InterviewRoomPage.tsx's real Sarah/James cards render landscape (~448×300 — see
// MOUTH_POSITIONS below for the derivation). object-fit:cover crops very differently
// depending on that shape, which shifted the mouth position for real — confirmed by
// plotting the old coordinates on a correctly-shaped crop and seeing them land on Sarah's
// cheek and Mike's collar, exactly matching what was reported live.
//
// Final coordinates were locked in through direct pixel-by-pixel correction from Francis
// live — several rounds of "N px left/right/up/down" against rendered crosshair images,
// including a labeled percentage grid once small nudges stopped converging (Sarah's case:
// early freehand eyeballing was simply wrong by a wide margin — the grid caught it, small
// increments alone hadn't). Don't re-eyeball these again; if the layout changes, re-run
// the same crosshair-plus-grid process against fresh screenshots of the real render.
//
// Color/opacity formula was ALSO wrong on the first pass — it included a flat "+0.35"
// baseline added on top of level*peakOpacity, which pushed it to full opaque black at
// normal speaking volume ("looks like a black moustache on their lips"). Removed that
// baseline entirely; opacity now scales purely from level*peakOpacity, capped low enough
// (peakOpacity 0.45) to read as a soft shadow even at peak volume. Confirmed live.
export const MOUTH_OVERLAY_ENABLED = true;

export function MouthOverlay({
  analyserNode,
  active,
  left,
  top,
  width,
  height,
  peakOpacity = 0.45,
  color = '90,55,45',
  blur = 1.8,
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
        background: `radial-gradient(ellipse, rgba(${color},${Math.min(1, level * peakOpacity)}) 0%, rgba(${color},${Math.min(1, level * peakOpacity)}) 50%, rgba(${color},${Math.min(1, level * peakOpacity) * 0.45}) 50%, transparent 80%)`,
        opacity: active ? 1 : 0,
        filter: `blur(${blur}px)`,
        pointerEvents: 'none',
        transition: 'opacity 0.08s linear',
      }}
    />
  );
}

// Tuned per-profile against the ACTUAL rendered card shape, not the raw photo — this
// matters because object-fit:cover's crop shifts with container aspect ratio. Sarah/James
// render inside InterviewRoomPage.tsx's row: maxWidth:960px content area (minus 24px
// padding each side = 912px), two flex:1 cards with a 16px gap -> (912-16)/2 = 448px wide,
// minHeight:300px (nothing in normal flow stretches it taller) -> ~448×300, landscape.
// Mike's is a fixed 180×180 circle. Coordinates below were plotted directly on crops
// rendered at those exact sizes and visually confirmed against facial landmarks before
// shipping — re-derive the same way (Python/Pillow cover-crop + crosshair markers) if
// InterviewRoomPage.tsx's layout changes these dimensions again.
// Color/opacity/blur are left at MouthOverlay's own defaults for all three (a uniform
// soft-brown shadow confirmed to work across all skin tones/facial hair) — only
// position/size differ per profile.
export const MOUTH_POSITIONS = {
  hr:        { left: '50.97%', top: '30%',    width: 22, height: 14 }, // sarah.jpg, 448×300 crop — locked in via live pixel-by-pixel confirmation
  technical: { left: '50%',    top: '39%',    width: 26, height: 16 }, // james.png, 448×300 crop
  mike:      { left: '52.51%', top: '42.44%', width: 18, height: 11 }, // mike.png, 180×180 circle
} as const;
