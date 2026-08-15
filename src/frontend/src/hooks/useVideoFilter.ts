import { useState, useRef, useEffect, useCallback } from 'react';

// ── Filter presets ────────────────────────────────────────────────────────────
export type FilterPreset = 'beauty' | 'warm' | 'studio' | 'natural';

export const FILTER_CSS: Record<FilterPreset, string> = {
  beauty:  'brightness(1.07) contrast(1.06) saturate(1.12)',
  warm:    'brightness(1.09) contrast(1.05) saturate(1.35) sepia(0.18)',
  studio:  'brightness(1.13) contrast(1.22) saturate(0.82)',
  natural: 'brightness(1.02) contrast(1.02) saturate(1.04)',
};

export const FILTER_LABELS: Record<FilterPreset, { icon: string; label: string; desc: string }> = {
  beauty:  { icon: '✨', label: 'Beauty',  desc: 'Soft & bright (default)' },
  warm:    { icon: '🌅', label: 'Warm',    desc: 'Golden, flattering glow' },
  studio:  { icon: '🎬', label: 'Studio',  desc: 'Crisp, high contrast' },
  natural: { icon: '🌿', label: 'Natural', desc: 'True to life' },
};

export const FILTER_PRESETS = ['beauty', 'warm', 'studio', 'natural'] as FilterPreset[];

// ── Hook ──────────────────────────────────────────────────────────────────────
export interface UseVideoFilterReturn {
  // State
  filterPreset: FilterPreset;
  setFilterPreset: (p: FilterPreset) => void;
  cameraReady: boolean;
  cameraError: boolean;
  micLevel: number;

  // Refs the component attaches to DOM elements
  videoPreviewRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;

  // The raw stream — used for the visible <video> preview element
  rawStream: MediaStream | null;

  // The filtered canvas stream — what MediaRecorder should record
  canvasStream: MediaStream | null;

  // Controls
  startPreview: () => Promise<void>;
  stopPreview: () => void;
}

export function useVideoFilter(defaultPreset: FilterPreset = 'beauty'): UseVideoFilterReturn {
  const [filterPreset, setFilterPresetState] = useState<FilterPreset>(defaultPreset);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [rawStream, setRawStream] = useState<MediaStream | null>(null);
  const [canvasStream, setCanvasStream] = useState<MediaStream | null>(null);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const filterPresetRef = useRef<FilterPreset>(defaultPreset);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micFrameRef = useRef<number | null>(null);

  // Keep ref in sync so the draw loop always reads the latest preset without re-creating it
  const setFilterPreset = useCallback((p: FilterPreset) => {
    filterPresetRef.current = p;
    setFilterPresetState(p);
  }, []);

  const stopMicMeter = useCallback(() => {
    if (micFrameRef.current) { cancelAnimationFrame(micFrameRef.current); micFrameRef.current = null; }
    analyserRef.current = null;
    setMicLevel(0);
  }, []);

  const startMicMeter = useCallback((stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(100, avg * 2.5));
        micFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // AudioContext not available — mic meter is cosmetic, not critical
    }
  }, []);

  const stopPreview = useCallback(() => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    stopMicMeter();
    rawStreamRef.current?.getTracks().forEach(t => t.stop());
    rawStreamRef.current = null;
    setRawStream(null);
    setCanvasStream(null);
    setCameraReady(false);
  }, [stopMicMeter]);

  const startPreview = useCallback(async () => {
    setCameraReady(false);
    setCameraError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: true,
      });
      rawStreamRef.current = stream;
      setRawStream(stream);

      const video = videoPreviewRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width  = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw loop — applies the active filter to every frame
      const draw = () => {
        ctx.filter = FILTER_CSS[filterPresetRef.current];
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        animFrameRef.current = requestAnimationFrame(draw);
      };
      draw();

      // Canvas stream carries the filtered video; audio comes from the raw stream
      const cs = canvas.captureStream(30);
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) cs.addTrack(audioTrack);
      setCanvasStream(cs);

      setCameraReady(true);
      startMicMeter(stream);
    } catch {
      setCameraError(true);
    }
  }, [startMicMeter]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (micFrameRef.current) cancelAnimationFrame(micFrameRef.current);
      rawStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return {
    filterPreset,
    setFilterPreset,
    cameraReady,
    cameraError,
    micLevel,
    videoPreviewRef,
    canvasRef,
    rawStream,
    canvasStream,
    startPreview,
    stopPreview,
  };
}
