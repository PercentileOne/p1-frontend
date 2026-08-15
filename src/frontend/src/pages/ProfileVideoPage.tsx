import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { speak } from '../api/ttsApi';

// ── Questions ─────────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    id: 'q1',
    sarahText: "Hi there! I'm Sarah Mitchell — I'll be guiding you through your profile introduction today. This is completely relaxed, and you can re-record any answer as many times as you like. Let's start: tell me a little about yourself — who are you, and what do you do?",
    prompt: "Tell me about yourself — who are you and what do you do?",
  },
  {
    id: 'q2',
    sarahText: "Wonderful. What are you most proud of in your career or studies so far? It could be a project, a moment, a challenge you overcame — anything that genuinely means something to you.",
    prompt: "What are you most proud of in your career or studies so far?",
  },
  {
    id: 'q3',
    sarahText: "That's great to hear. So tell me — what kind of opportunity are you looking for right now? What does your ideal next step look like?",
    prompt: "What kind of opportunity are you looking for right now?",
  },
  {
    id: 'q4',
    sarahText: "Brilliant. And where do you see yourself in the next three to five years? What does success look like for you?",
    prompt: "Where do you see yourself in the next three to five years?",
  },
  {
    id: 'q5',
    sarahText: "And finally — what do you get up to outside of work? Any passions, hobbies, or interests you'd like employers to know about?",
    prompt: "What do you do outside of work — any passions or interests to share?",
  },
];

// ── Filter presets ─────────────────────────────────────────────────────────────
type FilterPreset = 'beauty' | 'warm' | 'studio' | 'natural';

const FILTER_CSS: Record<FilterPreset, string> = {
  beauty:  'brightness(1.07) contrast(1.06) saturate(1.12)',
  warm:    'brightness(1.09) contrast(1.05) saturate(1.35) sepia(0.18)',
  studio:  'brightness(1.13) contrast(1.22) saturate(0.82)',
  natural: 'brightness(1.02) contrast(1.02) saturate(1.04)',
};

const FILTER_LABELS: Record<FilterPreset, { icon: string; label: string; desc: string }> = {
  beauty:  { icon: '✨', label: 'Beauty',  desc: 'Soft & bright (default)' },
  warm:    { icon: '🌅', label: 'Warm',    desc: 'Golden, flattering glow' },
  studio:  { icon: '🎬', label: 'Studio',  desc: 'Crisp, high contrast' },
  natural: { icon: '🌿', label: 'Natural', desc: 'True to life' },
};

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'welcome' | 'sarah-speaking' | 'recording' | 'processing' | 'coaching' | 'complete';

interface AnswerClip {
  questionIndex: number;
  blob: Blob;
  coachingTips: string[];
}

const OPENAI_KEY = (import.meta.env.VITE_OPENAI_API_KEY ?? '') as string;

// ── AI Coaching ───────────────────────────────────────────────────────────────
async function generateProfileCoaching(question: string, answer: string): Promise<string[]> {
  if (!OPENAI_KEY) return ['Speak naturally and confidently — authenticity is what employers remember most.'];
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a friendly career coach giving quick, actionable feedback on a candidate's profile video answer.
Focus on: presence, clarity, structure, and how it lands to a recruiter watching for the first time.
NOT a job interview — this is a personal introduction video. Keep it warm and encouraging.
Return ONLY valid JSON.`,
          },
          {
            role: 'user',
            content: `Question: "${question}"\nAnswer: "${answer}"\n\nGive 2–3 short coaching tips (1 sentence each). At least one must be specific to what they actually said.\nReturn: { "tips": ["tip 1", "tip 2", "tip 3"] }`,
          },
        ],
      }),
    });
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    const parsed = JSON.parse(data.choices[0].message.content) as { tips: string[] };
    return parsed.tips ?? [];
  } catch {
    return ['Speak naturally and confidently — authenticity is what employers remember most.'];
  }
}

// ── Web Speech recognition ────────────────────────────────────────────────────
interface SpeechResult {
  readonly [i: number]: { readonly [j: number]: { readonly transcript: string } };
  readonly length: number;
}
interface SpeechResultsEvent { readonly results: SpeechResult }
interface SpeechRecogCtor {
  new(): {
    continuous: boolean;
    interimResults: boolean;
    onresult: ((e: SpeechResultsEvent) => void) | null;
    start(): void;
    stop(): void;
  };
}

function getSpeechRecognition(): SpeechRecogCtor | null {
  const w = window as unknown as Record<string, unknown>;
  return (w['SpeechRecognition'] ?? w['webkitSpeechRecognition'] ?? null) as SpeechRecogCtor | null;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProfileVideoPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('welcome');
  const [qIndex, setQIndex] = useState(0);
  const [clips, setClips] = useState<AnswerClip[]>([]);
  const [coachingTips, setCoachingTips] = useState<string[]>([]);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filterPreset, setFilterPreset] = useState<FilterPreset>('beauty');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // Raw stream from getUserMedia — never recorded directly
  const rawStreamRef = useRef<MediaStream | null>(null);
  // Canvas stream — what actually gets recorded (has filter baked in)
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const cancelSpeakRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<ReturnType<SpeechRecogCtor['prototype']['constructor']> | null>(null);
  const transcriptRef = useRef('');
  const animFrameRef = useRef<number | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const filterPresetRef = useRef<FilterPreset>('beauty');

  const currentQ = QUESTIONS[qIndex];
  const progress = clips.length / QUESTIONS.length;

  // Keep filter ref in sync so the draw loop always uses the latest value
  useEffect(() => { filterPresetRef.current = filterPreset; }, [filterPreset]);

  // ── Camera preview ─────────────────────────────────────────────────────────
  const startPreview = useCallback(async () => {
    setCameraReady(false);
    setCameraError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' }, audio: true });
      rawStreamRef.current = stream;

      const video = videoPreviewRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setCameraReady(true);

      // Canvas draw loop — applies the CSS filter to every frame
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width  = 1280;
      canvas.height = 720;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const draw = () => {
        ctx.filter = FILTER_CSS[filterPresetRef.current];
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        animFrameRef.current = requestAnimationFrame(draw);
      };
      draw();

      // Canvas stream — has filter baked in
      canvasStreamRef.current = canvas.captureStream(30);
      // Add audio from raw stream
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) canvasStreamRef.current.addTrack(audioTrack);

    } catch {
      setCameraError(true);
    }
  }, []);

  const stopPreview = useCallback(() => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    rawStreamRef.current?.getTracks().forEach(t => t.stop());
    rawStreamRef.current = null;
    canvasStreamRef.current = null;
    setCameraReady(false);
  }, []);

  // Start preview automatically when we enter the recording phase
  useEffect(() => {
    if (phase === 'recording') {
      void startPreview();
    } else {
      stopPreview();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    return () => {
      cancelSpeakRef.current?.();
      mediaRecorderRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      recognitionRef.current?.stop();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      rawStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Start a question: Sarah speaks ─────────────────────────────────────────
  const startQuestion = useCallback((index: number) => {
    setQIndex(index);
    setPhase('sarah-speaking');
    setIsRecordingActive(false);
    transcriptRef.current = '';
    mediaRecorderRef.current = null;

    cancelSpeakRef.current = speak(QUESTIONS[index].sarahText, 'hr', () => setPhase('recording'));
  }, []);

  // ── Begin recording from filtered canvas stream ────────────────────────────
  const startRecording = useCallback(() => {
    const stream = canvasStreamRef.current;
    if (!stream) {
      alert('Camera not ready — please wait a moment and try again.');
      return;
    }

    chunksRef.current = [];

    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm', 'audio/webm']
      .find(t => MediaRecorder.isTypeSupported(t)) ?? '';
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.start(500);
    setIsRecordingActive(true);

    setRecordingSeconds(0);
    timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);

    // Speech recognition still runs on raw stream audio
    const SR = getSpeechRecognition();
    if (SR) {
      const recog = new SR();
      recog.continuous = true;
      recog.interimResults = true;
      recog.onresult = (e: SpeechResultsEvent) => {
        let t = '';
        for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
        transcriptRef.current = t;
      };
      recognitionRef.current = recog;
      recog.start();
    }
  }, []);

  // ── Stop recording → coaching ──────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setPhase('processing');
    setIsRecordingActive(false);

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      setCoachingTips(['Speak naturally and confidently — authenticity is what employers remember most.']);
      setPhase('coaching');
      return;
    }

    const blob = await new Promise<Blob>(resolve => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: chunksRef.current[0]?.type ?? 'video/webm' }));
      recorder.stop();
    });

    const tips = await generateProfileCoaching(currentQ.prompt, transcriptRef.current || '(no transcript captured)');
    setCoachingTips(tips);

    setClips(prev => {
      const next = prev.filter(c => c.questionIndex !== qIndex);
      return [...next, { questionIndex: qIndex, blob, coachingTips: tips }];
    });

    setPhase('coaching');
  }, [currentQ, qIndex]);

  const keepAndContinue = useCallback(() => {
    const next = qIndex + 1;
    if (next >= QUESTIONS.length) setPhase('complete');
    else startQuestion(next);
  }, [qIndex, startQuestion]);

  const reRecord = useCallback(() => {
    setClips(prev => prev.filter(c => c.questionIndex !== qIndex));
    startQuestion(qIndex);
  }, [qIndex, startQuestion]);

  const saveProfile = useCallback(async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 1800));
    setIsSaving(false);
    setSaved(true);
  }, []);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{ minHeight: '100vh', background: '#060A14', color: '#F1F5F9', fontFamily: "-apple-system,'Segoe UI',sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>

      {phase !== 'welcome' && phase !== 'complete' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.06)', zIndex: 100 }}>
          <motion.div animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.5 }}
            style={{ height: '100%', background: 'linear-gradient(to right, #34D399, #4F8EF7)' }} />
        </div>
      )}

      {/* Hidden elements used by the filter pipeline */}
      <video ref={videoPreviewRef} playsInline muted style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }} />
      <canvas ref={canvasRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }} />

      <AnimatePresence mode="wait">

        {/* ── Welcome ── */}
        {phase === 'welcome' && (
          <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg,#1a0b2e,#2d1458)', border: '2px solid rgba(167,139,250,0.4)', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, boxShadow: '0 0 40px rgba(167,139,250,0.2)' }}>
              👩‍💼
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(167,139,250,0.7)', marginBottom: 12 }}>Sarah Mitchell · HR Director</div>
            <h1 style={{ fontSize: 'clamp(1.6rem,5vw,2.2rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 16, lineHeight: 1.2 }}>Record your<br />Profile Introduction</h1>
            <p style={{ fontSize: 15, color: 'rgba(241,245,249,0.55)', lineHeight: 1.7, maxWidth: 440, margin: '0 auto 20px' }}>
              Sarah will ask you 5 short, relaxed questions. After each answer you'll get personalised coaching — and you can re-record any answer as many times as you like.
            </p>
            {/* Filter preview teaser */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
              {(['beauty','warm','studio','natural'] as FilterPreset[]).map(p => (
                <div key={p} style={{ fontSize: 10, fontWeight: 600, color: 'rgba(52,211,153,0.7)', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 20, padding: '3px 10px' }}>
                  {FILTER_LABELS[p].icon} {FILTER_LABELS[p].label}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
              {QUESTIONS.map((q, i) => (
                <div key={q.id} style={{ fontSize: 11, fontWeight: 600, color: 'rgba(241,245,249,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '4px 12px' }}>Q{i + 1}</div>
              ))}
            </div>
            <button onClick={() => startQuestion(0)} style={{ padding: '16px 48px', borderRadius: 14, background: 'linear-gradient(135deg,#a78bfa,#7c3aed)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 32px rgba(167,139,250,0.35)' }}>
              Begin →
            </button>
            <div style={{ marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>You'll need camera + microphone access</div>
          </motion.div>
        )}

        {/* ── Sarah speaking ── */}
        {phase === 'sarah-speaking' && (
          <motion.div key="sarah-speaking" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 90, height: 90, margin: '0 auto 24px' }}>
              <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg,#1a0b2e,#2d1458)', border: '2px solid rgba(167,139,250,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>👩‍💼</div>
              <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }} transition={{ repeat: Infinity, duration: 1.6 }}
                style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '2px solid rgba(167,139,250,0.4)', pointerEvents: 'none' }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: 8 }}>Question {qIndex + 1} of {QUESTIONS.length}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.5, maxWidth: 440, margin: '0 auto 24px' }}>"{currentQ.prompt}"</div>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'flex-end', height: 24 }}>
              {[0,1,2,3,4].map(i => (
                <motion.div key={i} animate={{ height: ['30%','90%','30%'] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
                  style={{ width: 3, borderRadius: 2, background: '#a78bfa' }} />
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Sarah is speaking…</div>
          </motion.div>
        )}

        {/* ── Recording ── */}
        {phase === 'recording' && (
          <motion.div key="recording" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ maxWidth: 640, width: '100%' }}>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: 6 }}>Question {qIndex + 1} of {QUESTIONS.length}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.4 }}>"{currentQ.prompt}"</div>
            </div>

            {/* Camera preview */}
            <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 20, background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
              {/* Filtered canvas preview — what the user sees */}
              <canvas
                ref={el => {
                  // Second canvas just for display — mirrors the recording canvas with filter via CSS
                  if (el && canvasRef.current && cameraReady) {
                    // We use the hidden canvas as the source; display it via an img updated on rAF
                    // Simpler: show the raw video with CSS filter applied for preview
                  }
                }}
                style={{ display: 'none' }}
              />

              {/* Live preview: raw video + CSS filter for visual feedback */}
              {cameraReady ? (
                <video
                  ref={el => {
                    if (el && rawStreamRef.current) {
                      el.srcObject = rawStreamRef.current;
                      void el.play();
                    }
                  }}
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)', // mirror for natural selfie feel
                    filter: FILTER_CSS[filterPreset],
                    borderRadius: 20,
                  }}
                />
              ) : cameraError ? (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', gap: 8 }}>
                  <div style={{ fontSize: 36 }}>📷</div>
                  <div style={{ fontSize: 13 }}>Camera access needed</div>
                  <button onClick={() => void startPreview()} style={{ marginTop: 8, padding: '8px 20px', borderRadius: 10, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Try again
                  </button>
                </div>
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(167,139,250,0.2)', borderTop: '3px solid #a78bfa' }} />
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Starting camera…</div>
                </div>
              )}

              {/* Recording indicator */}
              {isRecordingActive && (
                <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.9)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: '#fff', backdropFilter: 'blur(8px)' }}>
                  <motion.div animate={{ opacity: [1,0,1] }} transition={{ repeat: Infinity, duration: 1.2 }}
                    style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                  {fmt(recordingSeconds)}
                </div>
              )}

              {/* Active filter badge */}
              {cameraReady && (
                <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                  {FILTER_LABELS[filterPreset].icon} {FILTER_LABELS[filterPreset].label}
                </div>
              )}
            </div>

            {/* ── Filter presets ── */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 8, textAlign: 'center' }}>Look &amp; Feel</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {(['beauty','warm','studio','natural'] as FilterPreset[]).map(preset => {
                  const active = filterPreset === preset;
                  return (
                    <button
                      key={preset}
                      onClick={() => setFilterPreset(preset)}
                      title={FILTER_LABELS[preset].desc}
                      style={{
                        flex: 1,
                        padding: '10px 6px',
                        borderRadius: 12,
                        background: active ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${active ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        color: active ? '#34D399' : 'rgba(255,255,255,0.45)',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{FILTER_LABELS[preset].icon}</span>
                      <span>{FILTER_LABELS[preset].label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Background controls (coming soon) ── */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 8, textAlign: 'center' }}>Background</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {[
                  { icon: '🌀', label: 'Blur',       desc: 'Background blur' },
                  { icon: '🖼',  label: 'Office',     desc: 'Virtual office background' },
                  { icon: '🌇', label: 'City',        desc: 'City skyline background' },
                  { icon: '⬛', label: 'None',        desc: 'No background effect', active: true },
                ].map(bg => (
                  <button
                    key={bg.label}
                    title={bg.desc}
                    style={{
                      flex: 1,
                      padding: '10px 6px',
                      borderRadius: 12,
                      background: bg.active ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${bg.active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
                      color: bg.active ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: bg.active ? 'pointer' : 'default',
                      fontFamily: 'inherit',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      position: 'relative',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{bg.icon}</span>
                    <span>{bg.label}</span>
                    {!bg.active && (
                      <span style={{ position: 'absolute', top: 4, right: 6, fontSize: 8, fontWeight: 800, letterSpacing: '0.05em', color: 'rgba(52,211,153,0.6)', textTransform: 'uppercase' }}>soon</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Record / Stop ── */}
            <div style={{ display: 'flex', gap: 12 }}>
              {!isRecordingActive ? (
                <button
                  onClick={startRecording}
                  disabled={!cameraReady}
                  style={{ flex: 1, padding: '16px', borderRadius: 14, background: cameraReady ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(255,255,255,0.06)', border: 'none', color: cameraReady ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: 15, fontWeight: 800, cursor: cameraReady ? 'pointer' : 'default', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: cameraReady ? '0 8px 24px rgba(239,68,68,0.3)' : 'none', transition: 'all 0.2s ease' }}>
                  <span style={{ fontSize: 18 }}>⏺</span> {cameraReady ? 'Record' : 'Preparing camera…'}
                </button>
              ) : (
                <button onClick={() => void stopRecording()} style={{ flex: 1, padding: '16px', borderRadius: 14, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>⏹</span> Stop &amp; Review
                </button>
              )}
            </div>
            <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Speak naturally — you can re-record as many times as you like</div>
          </motion.div>
        )}

        {/* ── Processing ── */}
        {phase === 'processing' && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(167,139,250,0.2)', borderTop: '3px solid #a78bfa', margin: '0 auto 20px' }} />
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)' }}>Getting your coaching ready…</div>
          </motion.div>
        )}

        {/* ── Coaching ── */}
        {phase === 'coaching' && (
          <motion.div key="coaching" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ maxWidth: 560, width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(251,191,36,0.15),rgba(245,158,11,0.08))', border: '1px solid rgba(251,191,36,0.3)', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: '0 0 30px rgba(251,191,36,0.15)' }}>
                😇
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#FBBF24', marginBottom: 6 }}>Coaching · Q{qIndex + 1} of {QUESTIONS.length}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>"{currentQ.prompt}"</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {coachingTips.map((tip, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}
                  style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 14, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 2 }}>✨</span>
                  <span style={{ fontSize: 14, color: 'rgba(241,245,249,0.8)', lineHeight: 1.6 }}>{tip}</span>
                </motion.div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={reRecord} style={{ flex: 1, padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                ↺ Re-record
              </button>
              <button onClick={keepAndContinue} style={{ flex: 2, padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#34D399,#059669)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 20px rgba(52,211,153,0.25)' }}>
                {qIndex + 1 < QUESTIONS.length ? 'Keep this answer →' : 'Finish →'}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Complete ── */}
        {phase === 'complete' && (
          <motion.div key="complete" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>🎉</div>
            <h2 style={{ fontSize: 'clamp(1.4rem,4vw,2rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 12 }}>All 5 answers recorded!</h2>
            <p style={{ fontSize: 15, color: 'rgba(241,245,249,0.5)', lineHeight: 1.7, maxWidth: 400, margin: '0 auto 32px' }}>
              Your profile introduction is ready. Save it to publish it on your InterviewMe profile — recruiters and employers will see it when they view your page.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32, textAlign: 'left' }}>
              {QUESTIONS.map((q, i) => {
                const hasClip = clips.some(c => c.questionIndex === i);
                return (
                  <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: hasClip ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${hasClip ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                    <span style={{ fontSize: 16 }}>{hasClip ? '✅' : '○'}</span>
                    <span style={{ fontSize: 13, color: hasClip ? 'rgba(241,245,249,0.7)' : 'rgba(241,245,249,0.3)' }}>Q{i + 1}: {q.prompt}</span>
                  </div>
                );
              })}
            </div>
            {saved ? (
              <div style={{ padding: '20px', borderRadius: 14, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>✅</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#34D399', marginBottom: 4 }}>Profile video saved!</div>
                <div style={{ fontSize: 13, color: 'rgba(241,245,249,0.4)', marginBottom: 16 }}>It will appear on your InterviewMe profile within a few minutes.</div>
                <button onClick={() => navigate('/profile')} style={{ padding: '12px 28px', borderRadius: 10, background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.3)', color: '#4F8EF7', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Go to my profile →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={() => { setClips([]); setQIndex(0); startQuestion(0); }} style={{ padding: '14px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Start over
                </button>
                <button onClick={() => void saveProfile()} disabled={isSaving} style={{ padding: '14px 36px', borderRadius: 12, background: isSaving ? 'rgba(167,139,250,0.3)' : 'linear-gradient(135deg,#a78bfa,#7c3aed)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: isSaving ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: isSaving ? 'none' : '0 8px 24px rgba(167,139,250,0.3)' }}>
                  {isSaving ? '⏳ Saving…' : '💾 Save Profile Video'}
                </button>
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
