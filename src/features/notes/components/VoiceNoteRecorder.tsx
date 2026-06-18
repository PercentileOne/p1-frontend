/* ══════════════════════════════════════════════════════════════
   VOICE NOTE RECORDER — Phase 13
   Real MediaRecorder (with blob URL) + mock fallback.
   Returns transcript + audioUrl + duration to caller.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Loader2, CheckCircle, X, RotateCcw } from "lucide-react";
import { transcribe } from "../transcriptionEngine";

export interface VoiceResult {
  transcript: string;
  audioUrl:   string;    // blob: URL or "" if mic unavailable
  duration:   number;    // seconds
}

interface Props {
  onSave:  (result: VoiceResult) => void;
  onClose: () => void;
}

type Phase = "idle" | "recording" | "transcribing" | "done";

// ── Waveform visualiser ───────────────────────────────────────────

const BAR_COUNT = 32;
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => ({
  min: 4 + Math.sin(i * 0.6) * 3,
  max: 18 + Math.sin(i * 0.4 + 1) * 14,
  dur: 0.35 + (i % 5) * 0.08,
  del: i * 0.03,
}));

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-[2.5px] h-12 w-full">
      {BAR_HEIGHTS.map((b, i) => (
        <motion.div
          key={i}
          className={`w-[3px] rounded-full ${active ? "bg-rose-400" : "bg-white/10"}`}
          animate={active
            ? { height: [`${b.min}px`, `${b.max}px`, `${b.min + 2}px`] }
            : { height: "3px" }
          }
          transition={{
            duration:   b.dur,
            repeat:     active ? Infinity : 0,
            repeatType: "mirror",
            delay:      b.del,
            ease:       "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ── Pulsing mic ring ──────────────────────────────────────────────

function MicRing({ active }: { active: boolean }) {
  return (
    <div className="relative flex items-center justify-center">
      {active && (
        <>
          <motion.div
            className="absolute w-28 h-28 rounded-full border-2 border-rose-500/40"
            animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute w-28 h-28 rounded-full border border-rose-500/25"
            animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
          />
        </>
      )}
      <motion.div
        className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors duration-300 ${
          active
            ? "bg-rose-500 shadow-[0_0_32px_rgba(239,68,68,0.5)]"
            : "bg-white/[0.08] border border-white/[0.12]"
        }`}
        whileTap={{ scale: 0.94 }}
      >
        <Mic size={28} className={active ? "text-white" : "text-white/50"} />
      </motion.div>
    </div>
  );
}

// ── Audio progress bar ────────────────────────────────────────────

function fmtTime(s: number) {
  const m   = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (Math.floor(s) % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

// ── Main component ────────────────────────────────────────────────

export default function VoiceNoteRecorder({ onSave, onClose }: Props) {
  const [phase,      setPhase]      = useState<Phase>("idle");
  const [elapsed,    setElapsed]    = useState(0);
  const [transcript, setTranscript] = useState("");
  const [audioUrl,   setAudioUrl]   = useState("");
  const [editMode,   setEditMode]   = useState(false);
  const [edited,     setEdited]     = useState("");

  const intervalRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const streamRef        = useRef<MediaStream | null>(null);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => () => {
    stopTimer();
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, [stopTimer]);

  // ── Start recording ─────────────────────────────────────────────
  async function startRecording() {
    setElapsed(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(100); // collect every 100ms
    } catch {
      // Mic unavailable (test env / no permission) — proceed in mock mode
      mediaRecorderRef.current = null;
    }

    setPhase("recording");
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  }

  // ── Stop recording ──────────────────────────────────────────────
  async function stopRecording() {
    stopTimer();
    const duration = elapsed;
    setPhase("transcribing");

    // Finalise real recording if we have one
    let blob: Blob | null = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      await new Promise<void>(res => {
        mediaRecorderRef.current!.onstop = () => res();
        mediaRecorderRef.current!.stop();
      });
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (chunksRef.current.length > 0) {
        blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
      }
    }

    // Transcribe
    const result = await transcribe(blob, duration);
    setTranscript(result.cleaned);
    setEdited(result.cleaned);
    setPhase("done");
  }

  function handleReset() {
    setPhase("idle");
    setElapsed(0);
    setTranscript("");
    setEdited("");
    setAudioUrl("");
    setEditMode(false);
  }

  function handleUse() {
    onSave({
      transcript: editMode ? edited : transcript,
      audioUrl,
      duration: elapsed,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget && phase !== "recording") onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0  }}
        exit={{   opacity: 0, y: 24  }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="relative w-full max-w-sm rounded-3xl border border-white/[0.09] bg-[#0d0e14] flex flex-col gap-0 overflow-hidden"
        style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.85), 0 1px 0 rgba(255,255,255,0.07) inset" }}
      >
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-600 via-rose-400 to-orange-400 opacity-80" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <Mic size={13} className="text-rose-400" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white leading-none">Voice Note</p>
              <p className="text-[10px] text-white/35 mt-0.5">
                {phase === "idle"         && "Ready to record"}
                {phase === "recording"    && "Recording…"}
                {phase === "transcribing" && "Processing audio…"}
                {phase === "done"         && "Transcript ready"}
              </p>
            </div>
          </div>
          {phase !== "recording" && (
            <button
              onClick={onClose}
              aria-label="Close recorder"
              className="p-1.5 rounded-lg hover:bg-white/[0.07] text-white/30 hover:text-white/60 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Waveform */}
        <div className="px-5 py-2">
          <Waveform active={phase === "recording"} />
        </div>

        {/* Mic + timer */}
        <div className="flex flex-col items-center gap-5 py-6">
          <AnimatePresence mode="wait">
            {(phase === "idle" || phase === "recording") && (
              <motion.button
                key="mic"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                onClick={phase === "idle" ? startRecording : stopRecording}
                aria-label={phase === "idle" ? "Start recording" : "Stop recording"}
              >
                {phase === "recording"
                  ? (
                    <div className="relative flex items-center justify-center">
                      <motion.div
                        className="absolute w-28 h-28 rounded-full border-2 border-rose-500/40"
                        animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                      />
                      <motion.div
                        className="absolute w-28 h-28 rounded-full border border-rose-500/25"
                        animate={{ scale: [1, 1.65, 1], opacity: [0.4, 0, 0.4] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.45 }}
                      />
                      <motion.div
                        whileTap={{ scale: 0.92 }}
                        className="w-20 h-20 rounded-full flex items-center justify-center bg-rose-500"
                        style={{ boxShadow: "0 0 36px rgba(239,68,68,0.5)" }}
                      >
                        <Square size={20} className="text-white fill-white" />
                      </motion.div>
                    </div>
                  ) : (
                    <motion.div
                      whileTap={{ scale: 0.92 }}
                      className="w-20 h-20 rounded-full flex items-center justify-center bg-white/[0.08] border border-white/[0.12]"
                    >
                      <Mic size={28} className="text-white/55" />
                    </motion.div>
                  )
                }
              </motion.button>
            )}

            {phase === "transcribing" && (
              <motion.div
                key="trans"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3"
              >
                <motion.div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 size={28} className="text-violet-400" />
                </motion.div>
                <p className="text-[12px] text-violet-300">Transcribing audio…</p>
              </motion.div>
            )}

            {phase === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}
              >
                <CheckCircle size={28} className="text-emerald-400" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Timer */}
          <p className={`text-[28px] font-black tabular-nums tracking-tight leading-none ${
            phase === "recording" ? "text-rose-400" : "text-white/25"
          }`}>
            {fmtTime(elapsed)}
          </p>
        </div>

        {/* Phase content */}
        <AnimatePresence mode="wait">
          {phase === "idle" && (
            <motion.p key="idle"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center text-[12px] text-white/30 pb-2 px-5"
            >
              Tap the mic to start recording
            </motion.p>
          )}

          {phase === "recording" && (
            <motion.p key="rec"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center text-[12px] text-rose-400/70 animate-pulse pb-2 px-5"
            >
              Speak clearly · tap the stop button to finish
            </motion.p>
          )}

          {phase === "done" && transcript && (
            <motion.div key="transcript"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-2.5 px-5 pb-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={11} className="text-emerald-400" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/45">
                    Transcript
                  </p>
                </div>
                <button
                  onClick={() => { setEditMode(e => !e); setEdited(transcript); }}
                  className="text-[10px] text-white/30 hover:text-white/55 transition-colors"
                >
                  {editMode ? "Done editing" : "Edit"}
                </button>
              </div>

              {editMode ? (
                <textarea
                  value={edited}
                  onChange={e => setEdited(e.target.value)}
                  rows={4}
                  autoFocus
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[12px] text-white/75 placeholder-white/25 outline-none focus:border-violet-500/40 transition-colors resize-none leading-relaxed"
                />
              ) : (
                <div className="max-h-28 overflow-y-auto bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5">
                  <p className="text-[12px] text-slate-300 leading-relaxed">{transcript}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="flex gap-2 px-5 py-4 pt-3">
          {(phase === "idle") && (
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-white/40 text-[12px] font-semibold hover:text-white/60 transition-colors"
            >
              Cancel
            </button>
          )}

          {phase === "done" && (
            <>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-white/40 text-[12px] font-semibold hover:text-white/60 transition-colors"
                aria-label="Re-record"
              >
                <RotateCcw size={12} />
                Re-record
              </button>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleUse}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-[13px] font-bold transition-all shadow-lg shadow-rose-900/30"
              >
                <CheckCircle size={14} />
                Use Recording
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
