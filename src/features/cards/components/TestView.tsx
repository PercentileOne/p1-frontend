/* ══════════════════════════════════════════════════════════════
   TestView — Phase 2: fully wired test engine
   Reads from TestSession store. Owns no state of its own.
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Video, Type, StopCircle, RotateCcw, CheckCircle2 } from "lucide-react";
import type { InputMode } from "../types";
import type { TestSession } from "../testStore";
import SectionLabel from "./shared/SectionLabel";
import ProgressBar from "./shared/ProgressBar";

interface Props {
  store: TestSession;
  onBack: () => void;
}

// ── Timer bar accent ──────────────────────────────────────────────
function timerBarAccent(pct: number): string {
  if (pct > 50) return "bg-emerald-500";
  if (pct > 25) return "bg-amber-500";
  return "bg-rose-500";
}

// ── Animated waveform ─────────────────────────────────────────────
function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-10">
      {Array.from({ length: 20 }, (_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-indigo-400/70"
          style={{ height: 32, transformOrigin: "bottom" }}
          animate={active ? {
            scaleY: [0.15, 1, 0.4, 0.8, 0.25, 0.9, 0.15],
          } : { scaleY: 0.15 }}
          transition={{
            duration:  1.1 + i * 0.04,
            repeat:    Infinity,
            ease:      "easeInOut",
            delay:     i * 0.05,
          }}
        />
      ))}
    </div>
  );
}

// ── Concept row ───────────────────────────────────────────────────
function ConceptRow({
  id, text, weight, isHit, isPartial, isNew,
}: {
  id: string; text: string; weight: number;
  isHit: boolean; isPartial: boolean; isNew: boolean;
}) {
  return (
    <motion.div
      layout
      animate={{
        filter:  isHit ? "blur(0px)"  : "blur(3.5px)",
        opacity: isHit ? 1 : isPartial ? 0.65 : 0.45,
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`
        flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[11px] transition-colors duration-300
        ${isHit    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
        : isPartial ? "bg-amber-500/8   border-amber-500/20  text-amber-300"
                    : "bg-white/[0.03]  border-white/[0.06]  text-white/40"}
      `}
    >
      {/* Tick / circle indicator */}
      <AnimatePresence mode="wait">
        {isHit ? (
          <motion.span
            key="tick"
            initial={{ scale: 0, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0,   opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="shrink-0"
          >
            <CheckCircle2 size={13} className="text-emerald-400" />
          </motion.span>
        ) : (
          <motion.div
            key="dot"
            className={`w-3 h-3 rounded-full border shrink-0 ${
              isPartial ? "border-amber-400/60" : "border-white/20"
            }`}
          />
        )}
      </AnimatePresence>

      <span className="flex-1 leading-relaxed">{text}</span>

      {/* Weight badge */}
      <span className={`text-[9px] font-bold ${isHit ? "text-emerald-400/60" : "text-white/20"}`}>
        ×{weight}
      </span>

      {/* Flash ring on new hit */}
      {isNew && (
        <motion.div
          className="absolute inset-0 rounded-lg border-2 border-emerald-400/60 pointer-events-none"
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.6 }}
        />
      )}
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function TestView({ store, onBack }: Props) {
  const {
    card, isRunning, hasStarted, timeRemaining, elapsed,
    conceptsHit, partialHits, misconceptions,
    inputMode, pressureColor, liveScore,
    deliveryScore, transcript, lastHitId,
    start, submit, changeMode, processText,
  } = store;

  const total   = card.testConfig.timeLimitSeconds;
  const timePct = (timeRemaining / total) * 100;

  const mins = String(Math.floor(timeRemaining / 60)).padStart(2, "0");
  const secs = String(timeRemaining % 60).padStart(2, "0");

  // Textarea ref for controlled input
  const textRef = useRef("");

  // Auto-start on mount
  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allowedModes: { id: InputMode; icon: React.ReactNode; label: string }[] = [
    ...(card.testConfig.allowTyping ? [{ id: "typing" as InputMode, icon: <Type size={12} />,  label: "Type"  }] : []),
    ...(card.testConfig.allowVoice  ? [{ id: "voice"  as InputMode, icon: <Mic size={12} />,   label: "Voice" }] : []),
    ...(card.testConfig.allowVideo  ? [{ id: "video"  as InputMode, icon: <Video size={12} />, label: "Video" }] : []),
  ];

  const handleTextChange = (val: string) => {
    textRef.current = val;
    if (isRunning) processText(val);
  };

  const handleSubmit = () => {
    submit();
  };

  const hitCount  = conceptsHit.size;
  const totalC    = card.concepts.length;

  return (
    <motion.div
      className="flex flex-col gap-4 h-full"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      {/* ── Header: card name + live score + timer ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <SectionLabel>{card.category}</SectionLabel>
          <h2 className="mt-0.5 text-[15px] font-bold text-white/90 leading-snug truncate">{card.title}</h2>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Live score */}
          <div className="flex flex-col items-end">
            <SectionLabel>Score</SectionLabel>
            <motion.span
              key={liveScore}
              initial={{ scale: 1.35, color: "#7dd3fc" }}
              animate={{ scale: 1,    color: "#ffffff" }}
              transition={{ duration: 0.35 }}
              className="text-[18px] font-black tabular-nums text-white/90 leading-none"
            >
              {liveScore}
            </motion.span>
          </div>

          {/* Timer */}
          <motion.div
            className={`text-[22px] font-mono font-bold tabular-nums ${pressureColor}`}
            animate={{ scale: timeRemaining <= 10 && isRunning ? [1, 1.08, 1] : 1 }}
            transition={{ duration: 0.5, repeat: timeRemaining <= 10 ? Infinity : 0 }}
          >
            {mins}:{secs}
          </motion.div>
        </div>
      </div>

      {/* ── Timer bar ── */}
      <div className="relative">
        <ProgressBar
          pct={timePct}
          accent={timerBarAccent(timePct)}
          height="h-[4px]"
        />
        {/* Glow on the bar tip */}
        <motion.div
          className={`absolute top-0 h-[4px] w-3 rounded-full blur-sm ${timerBarAccent(timePct)} opacity-80`}
          style={{ left: `calc(${timePct}% - 6px)` }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>

      {/* ── Prompt card ── */}
      <div
        className={`relative p-4 rounded-2xl border border-white/[0.06] ${card.gradientBg} flex flex-col gap-1.5`}
        style={{ boxShadow: "0 10px 36px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06) inset" }}
      >
        <div className={`absolute top-0 left-4 right-4 h-[2px] rounded-b-full ${card.accent} opacity-60`} />
        <SectionLabel className="opacity-60">Describe this concept in your own words</SectionLabel>
        <p className="text-[13px] text-white/80 leading-relaxed">{card.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-[2px] rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full bg-emerald-500/60"
              animate={{ width: `${(hitCount / totalC) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-[10px] text-white/35 tabular-nums">{hitCount}/{totalC}</span>
        </div>
      </div>

      {/* ── Input mode selector ── */}
      {allowedModes.length > 1 && (
        <div className="flex gap-2">
          {allowedModes.map(m => (
            <button
              key={m.id}
              onClick={() => changeMode(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                inputMode === m.id
                  ? "bg-indigo-600/40 text-indigo-300 border border-indigo-500/30"
                  : "bg-white/[0.05] text-white/40 border border-transparent hover:text-white/60"
              }`}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Input area ── */}
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        <AnimatePresence mode="wait">

          {inputMode === "typing" && (
            <motion.div
              key="typing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1"
            >
              <textarea
                className="w-full h-full min-h-[110px] p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[13px] text-white/80 placeholder-white/20 resize-none focus:outline-none focus:border-indigo-500/40 transition-colors"
                placeholder="Start typing… mention key concepts to unlock them"
                onChange={e => handleTextChange(e.target.value)}
                disabled={!isRunning}
              />
            </motion.div>
          )}

          {inputMode === "voice" && (
            <motion.div
              key="voice"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[110px] rounded-xl bg-white/[0.03] border border-white/[0.06] px-4"
            >
              <Waveform active={isRunning} />
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-2 h-2 rounded-full bg-rose-400"
                  animate={isRunning ? { opacity: [1, 0.3, 1] } : { opacity: 0.3 }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-[11px] text-white/45">
                  {isRunning ? "Listening — speak naturally" : "Paused"}
                </span>
              </div>
              {transcript && (
                <p className="text-[10px] text-white/35 text-center italic leading-relaxed max-w-[260px]">
                  {transcript.split(" · ").at(-1)}
                </p>
              )}
            </motion.div>
          )}

          {inputMode === "video" && (
            <motion.div
              key="video"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[110px] rounded-xl bg-black/40 border border-white/[0.06]"
            >
              {/* Mock camera frame */}
              <div className="w-20 h-20 rounded-full bg-white/[0.04] border-2 border-white/10 flex items-center justify-center">
                <Video size={22} className="text-white/20" />
              </div>
              <Waveform active={isRunning} />
              {/* Delivery score meter */}
              <div className="flex flex-col items-center gap-1 w-full px-8">
                <div className="flex justify-between w-full">
                  <SectionLabel>Delivery</SectionLabel>
                  <span className="text-[10px] font-bold text-violet-400">{deliveryScore}%</span>
                </div>
                <div className="w-full h-[3px] rounded-full bg-white/[0.06]">
                  <motion.div
                    className="h-full rounded-full bg-violet-500"
                    animate={{ width: `${deliveryScore}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ── Concept reveal panel ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <SectionLabel>Concepts — {hitCount} / {totalC} unlocked</SectionLabel>
            {misconceptions.length > 0 && (
              <span className="text-[9px] text-rose-400/80 font-semibold">
                {misconceptions.length} misconception{misconceptions.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto pr-1 relative">
            {card.concepts.map(c => (
              <div key={c.id} className="relative">
                <ConceptRow
                  id={c.id}
                  text={c.text}
                  weight={c.weight}
                  isHit={conceptsHit.has(c.id)}
                  isPartial={partialHits.has(c.id)}
                  isNew={lastHitId === c.id}
                />
              </div>
            ))}
          </div>

          {/* Misconception alerts */}
          <AnimatePresence>
            {misconceptions.map((m, i) => (
              <motion.div
                key={m}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-2 px-3 py-2 rounded-lg bg-rose-950/40 border border-rose-500/20 text-[10px] text-rose-300/80"
              >
                <span className="text-rose-400 shrink-0">✗</span>
                <span>{m}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.05] text-white/40 text-[11px] hover:text-white/60 transition-colors"
        >
          <RotateCcw size={11} />
          Back
        </button>

        <button
          onClick={handleSubmit}
          disabled={!isRunning}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-semibold transition-colors shadow-lg shadow-indigo-900/30"
        >
          <StopCircle size={13} />
          Submit Answer
          <span className="text-indigo-300 text-[10px] tabular-nums">
            ({hitCount}/{totalC} concepts)
          </span>
        </button>
      </div>
    </motion.div>
  );
}
