import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Sparkles, ChevronRight, Zap, Sun, Battery,
  CheckCircle2, Plus, Target, Clock, AlertTriangle,
} from "lucide-react";
import {
  DEMO_BLOCKS, DAILY_AGENT_SUGGESTIONS, PlanningEngine,
  BLOCK_COLORS, BLOCK_ICONS, BLOCK_LABELS,
} from "../lib/planningEngine";
import type { BlockType } from "../lib/planningEngine";

/* ══════════════════════════════════════════════════════════════
   DAILY PLANNING  /planning/daily
   ══════════════════════════════════════════════════════════════ */

const TODAY_INDEX = 0; // Monday demo

const ENERGY_LEVELS = [
  { value: 1, label: "Low",    emoji: "😴", color: "text-slate-400"  },
  { value: 2, label: "Medium", emoji: "😐", color: "text-amber-400"  },
  { value: 3, label: "High",   emoji: "⚡", color: "text-green-400"  },
  { value: 4, label: "Peak",   emoji: "🔥", color: "text-red-400"    },
];

const SUGGESTED_TASKS = [
  { id: "st1", source: "Goal",  title: "Write 3 new P1 investor one-pagers",       done: false },
  { id: "st2", source: "Cycle", title: "Reach proof submission milestone (Week 6)", done: false },
  { id: "st3", source: "Proof", title: "Upload gym progress photo as proof",        done: true  },
  { id: "st4", source: "Event", title: "Review MVP launch checklist",               done: false },
  { id: "st5", source: "Goal",  title: "Practice public speaking for 20 minutes",   done: false },
];

const CONSTRAINTS_OPTIONS = ["School run", "Calls scheduled", "Travel", "Limited wifi", "Team dependency", "Short day"];

export default function DailyPlanPage() {
  const navigate = useNavigate();
  const [step, setStep]       = useState<1 | 2 | 3>(1);
  const [focus, setFocus]     = useState("");
  const [energy, setEnergy]   = useState(3);
  const [constraints, setConstraints] = useState<Set<string>>(new Set());
  const [tasks, setTasks]     = useState(SUGGESTED_TASKS.map(t => ({ ...t })));
  const [blocks]              = useState(PlanningEngine.blocksForDay(DEMO_BLOCKS, TODAY_INDEX));
  const overlaps              = PlanningEngine.detectOverlap(DEMO_BLOCKS, TODAY_INDEX);
  const overloaded            = PlanningEngine.detectOverload(DEMO_BLOCKS, TODAY_INDEX);

  const toggleConstraint = (c: string) => {
    setConstraints(prev => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  };

  const toggleTask = (id: string) =>
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3 flex items-center gap-4">
        <button onClick={() => navigate("/planning")}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-sm font-bold text-white flex items-center gap-2">
            <Sun size={14} className="text-amber-400" /> Daily Planning
          </h1>
          <p className="text-[11px] text-slate-500">Monday · June 15, 2026</p>
        </div>
        {/* Step indicator */}
        <div className="ml-auto flex gap-1.5">
          {[1,2,3].map(s => (
            <button key={s} onClick={() => setStep(s as 1|2|3)}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s ? "bg-indigo-600 text-white" : step > s ? "bg-green-600/30 text-green-400" : "bg-white/[0.05] text-slate-500"
              }`}>{step > s ? "✓" : s}</button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-5 space-y-5">

        <AnimatePresence mode="wait">

          {/* ── Step 1: Morning Ritual ──────────────────────────────── */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} className="space-y-5">

              <div className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={13} className="text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-300">Morning Ritual</span>
                </div>
                <p className="text-[11px] text-slate-400">Set your intention before the day begins. This takes 2 minutes.</p>
              </div>

              {/* Focus */}
              <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                  What is your focus today?
                </p>
                <textarea
                  value={focus}
                  onChange={e => setFocus(e.target.value)}
                  placeholder="Today I am focused on…"
                  rows={3}
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl p-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 resize-none transition-colors"
                />
                {!focus && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["Shipping the Planning module", "Investor outreach", "Deep code work", "Strategy and thinking"].map(s => (
                      <button key={s} onClick={() => setFocus(s)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Energy */}
              <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                  <Battery size={10} /> What energy level are you at?
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {ENERGY_LEVELS.map(e => (
                    <button key={e.value} onClick={() => setEnergy(e.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                        energy === e.value
                          ? "bg-indigo-600/20 border-indigo-500/30"
                          : "bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]"
                      }`}>
                      <span className="text-xl">{e.emoji}</span>
                      <p className={`text-[11px] font-semibold ${energy === e.value ? e.color : "text-slate-500"}`}>{e.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Constraints */}
              <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                  What constraints do you have?
                </p>
                <div className="flex flex-wrap gap-2">
                  {CONSTRAINTS_OPTIONS.map(c => (
                    <button key={c} onClick={() => toggleConstraint(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                        constraints.has(c) ? "bg-amber-600/20 border-amber-500/30 text-amber-300" : "bg-white/[0.03] border-white/[0.06] text-slate-400"
                      }`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => setStep(2)}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
                Set Intention → <ChevronRight size={14} />
              </button>
            </motion.div>
          )}

          {/* ── Step 2: Tasks ───────────────────────────────────────── */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} className="space-y-5">

              <div className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={13} className="text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-300">AI-Suggested Tasks for Today</span>
                </div>
                <p className="text-[11px] text-slate-400">Pulled from your goals, cycle, proof queue, and active events.</p>
              </div>

              <div className="space-y-2">
                {tasks.map(task => (
                  <motion.button key={task.id} whileHover={{ x: 2 }}
                    onClick={() => toggleTask(task.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                      task.done ? "bg-green-600/8 border-green-500/15" : "bg-[#1c1f2e] border-white/[0.08] hover:border-indigo-500/20"
                    }`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      task.done ? "bg-green-500 border-green-500" : "border-white/20"
                    }`}>
                      {task.done && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${task.done ? "text-green-300 line-through" : "text-white"}`}>
                        {task.title}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                      task.source === "Goal"  ? "text-indigo-400 bg-indigo-600/10 border-indigo-500/20" :
                      task.source === "Cycle" ? "text-violet-400 bg-violet-600/10 border-violet-500/20" :
                      task.source === "Proof" ? "text-green-400 bg-green-600/10 border-green-500/20" :
                      "text-amber-400 bg-amber-600/10 border-amber-500/20"
                    }`}>{task.source}</span>
                  </motion.button>
                ))}
              </div>

              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 text-xs hover:text-slate-300 hover:bg-white/[0.06] transition-colors">
                <Plus size={12} /> Add custom task
              </button>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl bg-white/[0.05] text-slate-300 text-sm font-semibold hover:bg-white/[0.08] transition-colors">
                  ← Back
                </button>
                <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors">
                  View Blocks →
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Time blocks ─────────────────────────────────── */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} className="space-y-5">

              {/* Summary of ritual */}
              <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Today's Intention</p>
                <p className="text-sm text-white font-medium">{focus || "Not set"}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-slate-400">Energy: <span className="font-semibold text-white">{ENERGY_LEVELS.find(e => e.value === energy)?.emoji} {ENERGY_LEVELS.find(e => e.value === energy)?.label}</span></span>
                  {constraints.size > 0 && <span className="text-xs text-slate-400">Constraints: <span className="text-amber-300">{[...constraints].join(", ")}</span></span>}
                </div>
              </div>

              {/* Agent block suggestions */}
              <div className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-300">Agent Block Suggestions</span>
                </div>
                {energy >= 3 && <p className="text-xs text-slate-300">⚡ You're at high/peak energy — front-load your strategic blocks before noon.</p>}
                {energy < 3  && <p className="text-xs text-slate-300">🛡️ Lower energy today — more buffer blocks recommended. Protect your best hour for one strategic block.</p>}
                {overloaded  && <p className="text-xs text-amber-300">⚠️ Today is overloaded. Consider removing 1 block to protect quality.</p>}
                {constraints.has("Short day") && <p className="text-xs text-amber-300">📅 Short day detected — auto-compressing to 4 blocks max.</p>}
              </div>

              {/* Overlap warning */}
              {overlaps.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-red-600/10 border border-red-500/20 rounded-xl">
                  <AlertTriangle size={14} className="text-red-400 shrink-0" />
                  <p className="text-xs text-red-300">{overlaps.length / 2} block overlap detected. Visit the Time-Blocking Engine to fix.</p>
                  <button onClick={() => navigate("/planning/timeblocks")}
                    className="ml-auto text-[11px] text-red-400 font-semibold hover:text-red-300 flex items-center gap-1 shrink-0">
                    Fix <ChevronRight size={10} />
                  </button>
                </div>
              )}

              {/* Block list */}
              <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl overflow-hidden">
                <div className="px-5 pt-4 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Today's Blocks</p>
                </div>
                {blocks.map((block, i) => (
                  <div key={block.id} className={`px-5 py-3 flex items-center gap-3 ${i < blocks.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                    <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: block.color }} />
                    <div>
                      <p className="text-[10px] text-slate-500">{PlanningEngine.minuteToTime(block.startMinute)} · {block.durationMinutes}min</p>
                      <p className="text-xs font-semibold text-white">{block.icon} {block.title}</p>
                    </div>
                    <span className="ml-auto text-[10px] capitalize px-1.5 py-0.5 rounded"
                      style={{ color: block.color, backgroundColor: `${block.color}15` }}>
                      {block.type}
                    </span>
                  </div>
                ))}
              </div>

              {/* Block type legend */}
              <div className="grid grid-cols-4 gap-2">
                {(["strategic","buffer","breakout","custom"] as BlockType[]).map(t => (
                  <div key={t} className="bg-[#1c1f2e] border border-white/[0.06] rounded-lg p-2.5 text-center">
                    <span className="text-base">{BLOCK_ICONS[t]}</span>
                    <p className="text-[10px] font-semibold mt-1" style={{ color: BLOCK_COLORS[t] }}>{BLOCK_LABELS[t]}</p>
                    <p className="text-[9px] text-slate-600">{blocks.filter(b => b.type === t).length} blocks</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl bg-white/[0.05] text-slate-300 text-sm font-semibold hover:bg-white/[0.08] transition-colors">
                  ← Back
                </button>
                <button onClick={() => navigate("/planning/timeblocks")}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
                  <Target size={14} /> Open Time-Blocking Engine
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
      <div className="h-8" />
    </div>
  );
}
