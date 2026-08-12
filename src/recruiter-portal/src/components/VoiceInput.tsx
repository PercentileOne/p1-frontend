import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onTranscript: (text: string, meta: TranscriptMeta) => void;
  onInterimTranscript?: (text: string) => void;
  disabled?: boolean;
  highlightRecord?: boolean;
}

export interface TranscriptMeta {
  confidence: number;
  fillerWords: string[];
  paceWPM: number;
  durationSeconds: number;
}

type MicState = 'idle' | 'listening' | 'processing';

const FILLER_WORDS = ['um', 'uh', 'like', 'basically', 'literally', 'you know', 'i mean', 'sort of', 'kind of', 'right so'];
const API_BASE = import.meta.env.VITE_EXPLAIN_API_URL ?? 'https://explain-api.azurewebsites.net';
export const whisperConfigured = true;

function detectFillers(text: string): string[] {
  const lower = text.toLowerCase();
  return FILLER_WORDS.filter(f => lower.includes(f));
}

function estimateWPM(text: string, durationSeconds: number): number {
  if (durationSeconds < 1) return 0;
  return Math.round((text.trim().split(/\s+/).filter(Boolean).length / durationSeconds) * 60);
}

async function transcribeWithWhisper(blob: Blob, _durationSeconds: number): Promise<{ text: string; confidence: number }> {
  const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : 'webm';
  const form = new FormData();
  form.append('file', blob, `recording.${ext}`);
  form.append('model', 'whisper-1');
  form.append('language', 'en');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch(`${API_BASE}/api/ai/transcribe?language=en`, {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'audio/webm' },
      body: blob,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Whisper error ${res.status}`);
    const json = await res.json() as { text: string };
    return { text: json.text.trim(), confidence: 0.96 };
  } finally {
    clearTimeout(timeout);
  }
}

export function VoiceInput({ onTranscript, onInterimTranscript, disabled = false, highlightRecord = false }: Props) {
  const [micState, setMicState] = useState<MicState>('idle');
  const [interim, setInterim] = useState('');
  const [processingLabel, setProcessingLabel] = useState('Processing…');
  const [barHeights, setBarHeights] = useState<number[]>(Array(20).fill(0.1));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const interimRef = useRef('');   // mirror of interim state for use in callbacks

  const animateBars = useCallback(() => {
    if (analyserRef.current) {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      const step = Math.floor(data.length / 20);
      setBarHeights(Array.from({ length: 20 }, (_, i) => Math.max(0.08, data[i * step] / 255)));
    } else {
      setBarHeights(prev => prev.map(() => Math.max(0.08, Math.random() * 0.9)));
    }
    animFrameRef.current = requestAnimationFrame(animateBars);
  }, []);

  const stopMic = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    setBarHeights(Array(20).fill(0.1));
  }, []);

  const startListening = useCallback(async () => {
    if (disabled || micState !== 'idle') return;

    setMicState('listening');
    setInterim('');
    interimRef.current = '';
    chunksRef.current = [];
    startTimeRef.current = Date.now();

    // ── Mic stream ───────────────────────────────────────────────────────────
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
    } catch { /* no mic access — use fake waveform */ }

    animFrameRef.current = requestAnimationFrame(animateBars);

    // ── MediaRecorder (for Whisper) ───────────────────────────────────────────
    if (stream && whisperConfigured) {
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4']
        .find(t => MediaRecorder.isTypeSupported(t)) ?? '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(250);
      recorderRef.current = recorder;
    }

    // ── Web Speech API (live interim preview) ────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-GB';
      recognitionRef.current = recognition;

      recognition.onresult = (e: SpeechRecognitionEvent) => {
        let interimText = '';
        let finalText = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += t + ' ';
          else interimText += t;
        }
        if (interimText) {
          setInterim(interimText);
          onInterimTranscript?.(interimText);
        }
        if (finalText) {
          const updated = (interimRef.current + ' ' + finalText).trim();
          interimRef.current = updated;
          setInterim(updated);
        }
      };
      recognition.onerror = () => {};
      recognition.onend = () => {};
      recognition.start();
    }
  }, [disabled, micState, animateBars, onInterimTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setMicState('processing');

    const duration = (Date.now() - startTimeRef.current) / 1000;
    const fallbackText = interimRef.current.trim();
    const recorder = recorderRef.current;
    recorderRef.current = null;

    const finish = async () => {
      let text = fallbackText;
      let confidence = 0.78;

      if (whisperConfigured && recorder) {
        setProcessingLabel('Transcribing with Whisper…');
        try {
          // Stop recorder FIRST so it finalises and fires ondataavailable
          await new Promise<void>(resolve => {
            recorder.onstop = () => resolve();
            if (recorder.state !== 'inactive') {
              recorder.stop();
            } else {
              resolve();
            }
          });
          // Now safe to kill the stream
          stopMic();

          if (chunksRef.current.length > 0) {
            const mimeType = chunksRef.current[0]?.type ?? 'audio/webm';
            const blob = new Blob(chunksRef.current, { type: mimeType });
            const result = await transcribeWithWhisper(blob, duration);
            text = result.text;
            confidence = result.confidence;
          }
        } catch {
          stopMic();
          // Fall back to Web Speech transcript silently
        }
      } else {
        if (recorder?.state !== 'inactive') recorder?.stop();
        stopMic();
      }

      setProcessingLabel('Processing…');

      // Always fire onTranscript — use fallback text if Whisper gave nothing
      const finalText = text || fallbackText;
      if (finalText) {
        const meta: TranscriptMeta = {
          confidence: text ? confidence : 0.65,
          fillerWords: detectFillers(finalText),
          paceWPM: estimateWPM(finalText, duration),
          durationSeconds: Math.round(duration),
        };
        onTranscript(finalText, meta);
      }
      setInterim('');
      interimRef.current = '';
      chunksRef.current = [];
      setMicState('idle');
    };

    finish();
  }, [onTranscript, stopMic]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recorderRef.current?.stop();
      cancelAnimationFrame(animFrameRef.current);
      stopMic();
    };
  }, [stopMic]);

  const isListening = micState === 'listening';
  const isProcessing = micState === 'processing';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Your turn prompt — shown only when idle and ready to answer */}
      {micState === 'idle' && (
        <motion.div
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: '8px', background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.25)', borderRadius: '8px', padding: '6px 12px' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" fill="#4F8EF7"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M9 22h6" stroke="#4F8EF7" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#4F8EF7', letterSpacing: '0.02em' }}>Your turn — click Record to answer, then Stop when finished</span>
        </motion.div>
      )}

      {/* Waveform + mic button row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ position: 'relative', flexShrink: 0, width: '56px', height: '56px' }}>
          {!isListening && !isProcessing && (
            <>
              <motion.div
                animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                transition={{ repeat: Infinity, duration: 1.4, ease: 'easeOut' }}
                style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(79,142,247,0.5)', pointerEvents: 'none' }}
              />
              <motion.div
                animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
                transition={{ repeat: Infinity, duration: 1.4, delay: 0.35, ease: 'easeOut' }}
                style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(79,142,247,0.35)', pointerEvents: 'none' }}
              />
            </>
          )}
          <motion.button
            onClick={isListening ? stopListening : startListening}
            disabled={disabled || isProcessing}
            whileTap={{ scale: 0.92 }}
            style={{
              position: 'relative', zIndex: 1,
              width: '56px', height: '56px', borderRadius: '50%', border: 'none',
              cursor: disabled || isProcessing ? 'default' : 'pointer',
              background: isListening
                ? 'linear-gradient(135deg,#EF4444,#dc2626)'
                : 'linear-gradient(135deg,#4F8EF7,#2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isListening ? '0 0 20px rgba(239,68,68,0.4)' : highlightRecord ? '0 0 28px rgba(79,142,247,0.7)' : '0 0 16px rgba(79,142,247,0.3)',
              transition: 'background 0.3s, box-shadow 0.3s',
              opacity: disabled || isProcessing ? 0.5 : 1,
            }}
          >
            {isListening ? (
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" fill="#fff"/>
              </svg>
            ) : (
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" fill="#fff"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M9 22h6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
          </motion.button>
        </div>

        {/* Waveform */}
        <div style={{ flex: 1, height: '48px', display: 'flex', alignItems: 'center', gap: '2px', overflow: 'hidden' }}>
          {barHeights.map((h, i) => (
            <motion.div
              key={i}
              animate={{ scaleY: isListening ? h : 0.08 }}
              transition={{ duration: 0.1 }}
              style={{
                flex: 1, height: '100%',
                background: isListening ? `rgba(79,142,247,${0.4 + h * 0.6})` : 'rgba(255,255,255,0.08)',
                borderRadius: '2px', transformOrigin: 'center',
              }}
            />
          ))}
        </div>

        {/* Status */}
        <div style={{ minWidth: '90px', textAlign: 'right' }}>
          <AnimatePresence mode="wait">
            {isListening && (
              <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ fontSize: '12px', fontWeight: 700, color: '#EF4444', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}
                  style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#EF4444' }} />
                Listening
              </motion.div>
            )}
            {isProcessing && (
              <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ fontSize: '12px', fontWeight: 700, color: 'var(--amber)' }}>
                {processingLabel}
              </motion.div>
            )}
            {micState === 'idle' && (
              <motion.div key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ fontSize: '12px', color: 'var(--text-3)' }}>Ready</motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Live interim preview */}
      <AnimatePresence>
        {interim && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)',
              borderRadius: '10px', padding: '12px 14px',
              fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6, fontStyle: 'italic',
            }}>
              {interim}
              <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }}
                style={{ display: 'inline-block', width: '2px', height: '14px', background: 'var(--blue)', marginLeft: '3px', verticalAlign: 'text-bottom' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
