import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Pause, Play, StopCircle, Sparkles } from "lucide-react";
import {
  getActiveSession, setActiveSession, setCompletedSession,
  SESSION_TYPE_CONFIG, SESSION_RING_COLOR,
} from "../lib/focusEngine";

/* ══════════════════════════════════════════════════════════════
   ACTIVE FOCUS SESSION  /focus/session
   Full-screen immersive countdown with animated progress ring
   ══════════════════════════════════════════════════════════════ */

const RING_R    = 110;
const RING_CIRC = 2 * Math.PI * RING_R;

export default function FocusSession() {
  const navigate   = useNavigate();
  const session    = getActiveSession();

  // Redirect to launcher if no active session
  useEffect(() => {
    if (!session) navigate("/focus", { replace: true });
  }, []);

  const totalSecs  = (session?.plannedMinutes ?? 25) * 60;
  const [timeLeft, setTimeLeft]     = useState(totalSecs);
  const [paused,   setPaused]       = useState(false);
  const [elapsed,  setElapsed]      = useState(0);
  const [agentMsg, setAgentMsg]     = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const type = session?.type ?? "strategic";
  const cfg  = SESSION_TYPE_CONFIG[type];
  const ringColor = SESSION_RING_COLOR[type];

  // Agent messages at key moments
  const checkAgent = useCallback((left: number, total: number) => {
    const pct = 1 - left / total;
    if (pct >= 0.25 && pct < 0.27) setAgentMsg("25% done — you're in flow now. Keep going.");
    if (pct >= 0.50 && pct < 0.52) setAgentMsg("Halfway there. Incredible focus.");
    if (pct >= 0.75 && pct < 0.77) setAgentMsg("75% complete. Final stretch — finish strong.");
    if (left === 60)                setAgentMsg("⏰ 1 minute remaining.");
  }, []);

  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        setElapsed(e => e + 1);
        checkAgent(next, totalSecs);
        if (next <= 0) {
          clearInterval(intervalRef.current!);
          setCompletedSession({ session: session!, actualMinutes: session!.plannedMinutes });
          setActiveSession(null);
          navigate("/focus/complete", { replace: true });
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused, totalSecs]);

  const endEarly = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const actualMinutes = Math.max(1, Math.round(elapsed / 60));
    setCompletedSession({ session: session!, actualMinutes });
    setActiveSession(null);
    navigate("/focus/complete", { replace: true });
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = 1 - timeLeft / totalSecs;
  const dashOffset = RING_CIRC * progress;

  return (
    <div className="min-h-screen bg-[#080a0f] flex flex-col items-center justify-center relative overflow-hidden select-none">

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${ringColor}0a 0%, transparent 70%)` }} />

      {/* Type label */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="mb-10 flex flex-col items-center gap-2">
        <span className="text-4xl">{cfg.emoji}</span>
        <p className={`text-sm font-bold tracking-widest uppercase ${cfg.color}`}>{cfg.label} Session</p>
        {(session?.linkedGoalTitle || session?.linkedEventTitle) && (
          <p className="text-[11px] text-slate-500">
            {session.linkedGoalTitle ?? session.linkedEventTitle}
          </p>
        )}
      </motion.div>

      {/* Progress ring + timer */}
      <div className="relative flex items-center justify-center mb-10">
        <svg width="280" height="280" viewBox="0 0 280 280">
          {/* Track */}
          <circle cx="140" cy="140" r={RING_R} fill="none"
            stroke="white" strokeOpacity="0.05" strokeWidth="12" />
          {/* Progress arc */}
          <motion.circle cx="140" cy="140" r={RING_R} fill="none"
            stroke={ringColor} strokeWidth="12"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 140 140)"
            style={{ transition: "stroke-dashoffset 1s linear" }} />
          {/* Tick marks */}
          {Array.from({ length: 60 }, (_, i) => {
            const angle = (i / 60) * 2 * Math.PI - Math.PI / 2;
            const isMajor = i % 5 === 0;
            const inner = RING_R - (isMajor ? 16 : 10);
            const outer = RING_R - 4;
            return (
              <line key={i}
                x1={140 + Math.cos(angle) * inner}
                y1={140 + Math.sin(angle) * inner}
                x2={140 + Math.cos(angle) * outer}
                y2={140 + Math.sin(angle) * outer}
                stroke="white"
                strokeOpacity={isMajor ? 0.15 : 0.05}
                strokeWidth={isMajor ? 2 : 1} />
            );
          })}
        </svg>

        {/* Timer text */}
        <div className="absolute flex flex-col items-center">
          <motion.p key={mins}
            initial={{ opacity: 0.6, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="font-mono font-bold text-white leading-none"
            style={{ fontSize: "64px", letterSpacing: "-2px" }}>
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </motion.p>
          <p className="text-[12px] text-slate-500 mt-1 tracking-widest">
            {paused ? "PAUSED" : "REMAINING"}
          </p>
          <p className="text-[11px] mt-2" style={{ color: `${ringColor}aa` }}>
            {Math.round(progress * 100)}% complete
          </p>
        </div>
      </div>

      {/* Agent message */}
      <AnimatePresence>
        {agentMsg && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mb-8 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/10 border border-indigo-500/20">
            <Sparkles size={12} className="text-indigo-400 shrink-0" />
            <p className="text-xs text-indigo-200">{agentMsg}</p>
            <button onClick={() => setAgentMsg(null)} className="text-indigo-600 hover:text-indigo-400 ml-1 text-sm">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Pause / Resume */}
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setPaused(v => !v)}
          className="w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all"
          style={{
            borderColor: `${ringColor}80`,
            backgroundColor: `${ringColor}15`,
          }}>
          {paused
            ? <Play size={24} style={{ color: ringColor }} />
            : <Pause size={24} style={{ color: ringColor }} />
          }
        </motion.button>

        {/* End early */}
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={endEarly}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-400 text-sm font-semibold hover:text-slate-200 hover:bg-white/[0.08] transition-all">
          <StopCircle size={16} /> End Session
        </motion.button>
      </div>

      {/* Bottom subtle info */}
      <div className="absolute bottom-8 flex flex-col items-center gap-1">
        <p className="text-[11px] text-slate-700">Focus mode active · Navigation hidden</p>
        <p className="text-[10px] text-slate-800">{session?.plannedMinutes}min {cfg.label} session</p>
      </div>

      {/* Paused overlay */}
      <AnimatePresence>
        {paused && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
            <p className="text-2xl font-bold text-white/30 tracking-widest uppercase">Paused</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
