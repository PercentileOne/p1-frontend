import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Play, ChevronUp, ChevronDown, Trash2, Sparkles, BarChart3, Star,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════
   STUDY QUEUE — /learning/queue
   Priority-sorted cards: never tested → lowest mastery → oldest
   ══════════════════════════════════════════════════════════════ */

interface QueueItem {
  id: string;
  title: string;
  category: string;
  mastery: number;
  lastTested: string | null;
  accent: string;
  priority: "urgent" | "high" | "normal";
  reason: string;
}

const INITIAL_QUEUE: QueueItem[] = [
  { id: "q1", title: "React Hooks",        category: "Frontend",    mastery: 0,  lastTested: null,         accent: "#F59E0B", priority: "urgent", reason: "Never tested" },
  { id: "q2", title: "Vite Build System",  category: "Build Tools", mastery: 38, lastTested: "2026-06-03", accent: "#A78BFA", priority: "urgent", reason: "14 days without test · lowest mastery" },
  { id: "q3", title: "TypeScript Basics",  category: "Language",    mastery: 62, lastTested: "2026-06-10", accent: "#3178C6", priority: "high",   reason: "7 days without test" },
  { id: "q4", title: "Framer Motion",      category: "Animation",   mastery: 71, lastTested: "2026-06-12", accent: "#BB4AF8", priority: "high",   reason: "5 days without test" },
  { id: "q5", title: "React Fundamentals", category: "Frontend",    mastery: 79, lastTested: "2026-06-15", accent: "#61DAFB", priority: "normal", reason: "Due for review" },
  { id: "q6", title: "Tailwind CSS v4",    category: "CSS",         mastery: 83, lastTested: "2026-06-16", accent: "#38BDF8", priority: "normal", reason: "Strong — maintain mastery" },
];

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: "Urgent",  color: "text-rose-400",    bg: "border-rose-500/20 bg-rose-500/8" },
  high:   { label: "High",    color: "text-amber-400",   bg: "border-amber-500/20 bg-amber-500/8" },
  normal: { label: "Normal",  color: "text-slate-400",   bg: "border-white/[0.08] bg-white/[0.03]" },
};

const EASE = [0.4, 0, 0.2, 1] as const;

export default function LearningQueue() {
  const [queue, setQueue] = useState<QueueItem[]>(INITIAL_QUEUE);
  const [sessionStarted, setSessionStarted] = useState(false);

  const move = (id: string, dir: -1 | 1) => {
    setQueue(prev => {
      const idx = prev.findIndex(q => q.id === id);
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  const remove = (id: string) => setQueue(prev => prev.filter(q => q.id !== id));

  const totalTime = queue.length * 3;

  return (
    <div className="px-6 py-6 space-y-5">

      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-bold text-white">Study Queue</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">{queue.length} cards · ~{totalTime} min estimated</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setSessionStarted(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold text-white shrink-0"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          <Play size={11} /> Start Session
        </motion.button>
      </div>

      {/* Session started banner */}
      <AnimatePresence>
        {sessionStarted && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl border border-emerald-500/20"
            style={{ background: "rgba(16,185,129,0.07)" }}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[12px] text-emerald-300 font-semibold">Study session active — working through your queue</p>
            <button onClick={() => setSessionStarted(false)} className="ml-auto text-[10px] text-slate-500 hover:text-slate-300">Stop</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent recommendation */}
      <div
        className="flex items-start gap-3 p-4 rounded-2xl border border-indigo-500/15"
        style={{ background: "rgba(99,102,241,0.06)" }}
      >
        <Sparkles size={11} className="text-indigo-400 mt-0.5 shrink-0" />
        <p className="text-[11px] text-slate-400 leading-relaxed">
          <span className="font-semibold text-indigo-300">Agent:</span> Queue is ordered by urgency. Tackle{" "}
          <span className="text-amber-300 font-semibold">React Hooks</span> first — you've never tested it and it underlies all other React knowledge.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Clock size={13} className="text-indigo-400" />, label: "Est. Time", value: `${totalTime} min` },
          { icon: <BarChart3 size={13} className="text-amber-400" />, label: "Avg Mastery", value: `${Math.round(queue.reduce((s, q) => s + q.mastery, 0) / queue.length)}%` },
          { icon: <Star size={13} className="text-emerald-400" />, label: "Urgent", value: `${queue.filter(q => q.priority === "urgent").length}` },
        ].map(stat => (
          <div key={stat.label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[#13151c] border border-white/[0.07]">
            {stat.icon}
            <span className="text-[14px] font-bold text-white">{stat.value}</span>
            <span className="text-[9px] text-slate-600 uppercase tracking-widest">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Queue list */}
      <div className="space-y-2">
        <AnimatePresence>
          {queue.map((item, i) => {
            const pm = PRIORITY_META[item.priority];
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ ease: EASE, duration: 0.2 }}
                className="flex items-center gap-3 p-4 rounded-2xl border border-white/[0.07] bg-[#13151c]"
                style={{ boxShadow: "0 10px 36px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06) inset, 0 -1px 0 rgba(0,0,0,0.4) inset" }}
              >
                {/* Position */}
                <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.07] text-[10px] font-bold text-slate-600 shrink-0">
                  {i + 1}
                </div>

                {/* Accent dot */}
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.accent }} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[12px] font-semibold text-white truncate">{item.title}</p>
                    <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${pm.bg} ${pm.color}`}>
                      {pm.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-slate-600">
                    <span>{item.mastery}% mastery</span>
                    <span>·</span>
                    <span>{item.reason}</span>
                  </div>
                </div>

                {/* Mastery bar */}
                <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden shrink-0">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${item.mastery}%`,
                      background: item.mastery >= 70 ? "#10b981" : item.mastery >= 40 ? "#f59e0b" : "#ef4444",
                    }}
                  />
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button onClick={() => move(item.id, -1)} className="text-slate-700 hover:text-slate-300 transition-colors"><ChevronUp size={11} /></button>
                  <button onClick={() => move(item.id, 1)} className="text-slate-700 hover:text-slate-300 transition-colors"><ChevronDown size={11} /></button>
                </div>
                <button onClick={() => remove(item.id)} className="text-slate-700 hover:text-rose-400 transition-colors shrink-0">
                  <Trash2 size={11} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
