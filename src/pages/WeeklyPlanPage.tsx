import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Sparkles, ChevronRight, CheckCircle2, Zap,
  TrendingUp, AlertTriangle, Target, Trophy, BookOpen,
} from "lucide-react";
import {
  DEMO_BLOCKS, CURRENT_WEEKLY_PLAN, WEEKLY_AGENT_SUGGESTIONS,
  PlanningEngine, DAY_LABELS, DAY_FULL, BLOCK_COLORS, BLOCK_ICONS,
} from "../lib/planningEngine";
import type { BlockType } from "../lib/planningEngine";

/* ══════════════════════════════════════════════════════════════
   WEEKLY PLANNING  /planning/weekly
   ══════════════════════════════════════════════════════════════ */

const TABS = ["review", "goals", "blocks", "agent"] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  review: "Week Review",
  goals:  "Weekly Goals",
  blocks: "Block Grid",
  agent:  "Agent Plan",
};

const WEEKLY_GOALS = [
  { id: "wg1", title: "Ship Planning module end-to-end",             source: "Cycle", done: false },
  { id: "wg2", title: "Send 5 investor update emails",               source: "Goal",  done: false },
  { id: "wg3", title: "Complete 4 training sessions",                source: "Event", done: true  },
  { id: "wg4", title: "Record first public speaking video",           source: "Goal",  done: false },
  { id: "wg5", title: "Collect 2 pieces of proof",                   source: "Proof", done: true  },
];

const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } };

export default function WeeklyPlanPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("review");
  const [goals, setGoals] = useState(WEEKLY_GOALS);

  const toggleGoal = (id: string) =>
    setGoals(prev => prev.map(g => g.id === id ? { ...g, done: !g.done } : g));

  const blocksByDay = DAY_LABELS.map((_, i) => PlanningEngine.blocksForDay(DEMO_BLOCKS, i));

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3">
        <div className="flex items-center gap-4 mb-3">
          <button onClick={() => navigate("/planning")}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">Weekly Planning</h1>
            <p className="text-[11px] text-slate-500">Week {CURRENT_WEEKLY_PLAN.weekNumber} · Cycle {CURRENT_WEEKLY_PLAN.cycleProgress}% complete</p>
          </div>
        </div>
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === t ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
              }`}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-5">
        <AnimatePresence mode="wait">

          {/* ── Review ──────────────────────────────────────────────── */}
          {tab === "review" && (
            <motion.div key="review" {...fade} className="space-y-5">

              <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
                <p className="text-sm font-bold text-white mb-1">{CURRENT_WEEKLY_PLAN.theme}</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 bg-white/[0.05] rounded-full h-2">
                    <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${CURRENT_WEEKLY_PLAN.cycleProgress}%` }} />
                  </div>
                  <span className="text-sm font-bold text-indigo-400 shrink-0">{CURRENT_WEEKLY_PLAN.cycleProgress}%</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">12-week cycle progress</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy size={13} className="text-amber-400" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Wins</p>
                  </div>
                  <div className="space-y-2">
                    {CURRENT_WEEKLY_PLAN.wins.map(w => (
                      <div key={w} className="flex items-start gap-2">
                        <CheckCircle2 size={11} className="text-green-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-slate-300">{w}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen size={13} className="text-blue-400" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Lessons</p>
                  </div>
                  <div className="space-y-2">
                    {CURRENT_WEEKLY_PLAN.lessons.map(l => (
                      <div key={l} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                        <p className="text-xs text-slate-300">{l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">{CURRENT_WEEKLY_PLAN.proofCollected}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Proof collected this week</p>
                </div>
                <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-indigo-400">{goals.filter(g => g.done).length}/{goals.length}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Weekly goals achieved</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Goals ───────────────────────────────────────────────── */}
          {tab === "goals" && (
            <motion.div key="goals" {...fade} className="space-y-4">
              <div className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={13} className="text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-300">AI-Suggested Weekly Goals</span>
                </div>
                <p className="text-[11px] text-slate-400">Auto-generated from your active Cycles, Goals, and Proof queue.</p>
              </div>

              <div className="space-y-2">
                {goals.map(g => (
                  <motion.button key={g.id} whileHover={{ x: 2 }}
                    onClick={() => toggleGoal(g.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                      g.done ? "bg-green-600/8 border-green-500/15" : "bg-[#1c1f2e] border-white/[0.08] hover:border-indigo-500/20"
                    }`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      g.done ? "bg-green-500 border-green-500" : "border-white/20"
                    }`}>
                      {g.done && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                    <p className={`flex-1 text-sm font-semibold ${g.done ? "text-green-300 line-through" : "text-white"}`}>{g.title}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                      g.source === "Goal"  ? "text-indigo-400 bg-indigo-600/10 border-indigo-500/20" :
                      g.source === "Cycle" ? "text-violet-400 bg-violet-600/10 border-violet-500/20" :
                      g.source === "Proof" ? "text-green-400 bg-green-600/10 border-green-500/20" :
                      "text-amber-400 bg-amber-600/10 border-amber-500/20"
                    }`}>{g.source}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Block Grid ──────────────────────────────────────────── */}
          {tab === "blocks" && (
            <motion.div key="blocks" {...fade} className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Weekly Block Overview</p>
                <button onClick={() => navigate("/planning/timeblocks")}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                  Edit in engine <ChevronRight size={10} />
                </button>
              </div>

              {/* High energy / danger legend */}
              <div className="flex gap-4 text-[11px]">
                <span className="flex items-center gap-1.5 text-indigo-400"><Zap size={10} /> High-energy days: {CURRENT_WEEKLY_PLAN.highEnergyDays.map(d => DAY_LABELS[d]).join(", ")}</span>
                <span className="flex items-center gap-1.5 text-amber-400"><AlertTriangle size={10} /> Danger zones: {CURRENT_WEEKLY_PLAN.dangerZones.map(d => DAY_LABELS[d]).join(", ")}</span>
              </div>

              {/* Per-day block cards */}
              <div className="space-y-3">
                {DAY_LABELS.map((day, i) => {
                  const dayBlocks = blocksByDay[i];
                  const isHigh    = CURRENT_WEEKLY_PLAN.highEnergyDays.includes(i);
                  const isDanger  = CURRENT_WEEKLY_PLAN.dangerZones.includes(i);
                  const totalMins = dayBlocks.reduce((s, b) => s + b.durationMinutes, 0);
                  return (
                    <div key={day} className={`bg-[#1c1f2e] border rounded-xl p-4 ${
                      isHigh ? "border-indigo-500/20" : isDanger ? "border-amber-500/20" : "border-white/[0.08]"
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white">{DAY_FULL[i]}</p>
                          {isHigh   && <span className="text-[10px] text-indigo-400 font-semibold flex items-center gap-0.5"><Zap size={9} /> High Energy</span>}
                          {isDanger && <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-0.5"><AlertTriangle size={9} /> Danger Zone</span>}
                        </div>
                        <span className="text-[10px] text-slate-500">{(totalMins/60).toFixed(1)}h blocked</span>
                      </div>
                      {dayBlocks.length === 0 ? (
                        <p className="text-[11px] text-slate-600 italic">No blocks yet</p>
                      ) : (
                        <div className="flex gap-1.5 flex-wrap">
                          {dayBlocks.map(b => (
                            <span key={b.id} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg"
                              style={{ backgroundColor: `${b.color}15`, border: `1px solid ${b.color}30`, color: b.color }}>
                              {b.icon} {b.title} · {b.durationMinutes}m
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── Agent ───────────────────────────────────────────────── */}
          {tab === "agent" && (
            <motion.div key="agent" {...fade} className="space-y-4">

              <div className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} className="text-indigo-400" />
                  <span className="text-sm font-bold text-indigo-300">Your Optimal Week</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Based on your cycle position, goal urgency, and energy patterns — here is your recommended week structure.
                  Front-load strategic work on <span className="text-indigo-300 font-semibold">Monday and Tuesday</span>.
                  Use <span className="text-amber-300 font-semibold">Wednesday afternoon</span> as a buffer to avoid Wednesday danger-zone overload.
                  <span className="text-green-300 font-semibold"> Thursday</span> is your best day for creative or investor work.
                </p>
              </div>

              {/* Suggestions */}
              <div className="space-y-3">
                {WEEKLY_AGENT_SUGGESTIONS.map(s => (
                  <div key={s.id} className={`flex items-start gap-3 p-4 rounded-xl border ${
                    s.type === "warning" ? "bg-amber-600/8 border-amber-500/20" :
                    s.type === "success" ? "bg-green-600/8 border-green-500/20" :
                    s.type === "action"  ? "bg-indigo-600/8 border-indigo-500/20" :
                    "bg-white/[0.03] border-white/[0.06]"
                  }`}>
                    <Sparkles size={13} className={
                      s.type === "warning" ? "text-amber-400 shrink-0 mt-0.5" :
                      s.type === "success" ? "text-green-400 shrink-0 mt-0.5" :
                      "text-indigo-400 shrink-0 mt-0.5"
                    } />
                    <div className="flex-1">
                      <p className={`text-sm ${
                        s.type === "warning" ? "text-amber-200" :
                        s.type === "success" ? "text-green-200" : "text-slate-300"
                      }`}>{s.message}</p>
                      {s.action && (
                        <button onClick={() => navigate(s.actionRoute!)}
                          className="mt-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                          {s.action} <ChevronRight size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* High-energy / danger days */}
              <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Energy Map</p>
                <div className="space-y-2">
                  {DAY_LABELS.map((d, i) => {
                    const isHigh   = CURRENT_WEEKLY_PLAN.highEnergyDays.includes(i);
                    const isDanger = CURRENT_WEEKLY_PLAN.dangerZones.includes(i);
                    return (
                      <div key={d} className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-400 w-8">{d}</span>
                        <div className={`flex-1 h-2 rounded-full ${
                          isHigh ? "bg-indigo-500" : isDanger ? "bg-amber-500/50" : "bg-white/[0.05]"
                        }`} />
                        <span className={`text-[10px] font-semibold w-20 text-right ${
                          isHigh ? "text-indigo-400" : isDanger ? "text-amber-400" : "text-slate-600"
                        }`}>{isHigh ? "High Energy" : isDanger ? "Danger Zone" : "Normal"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button onClick={() => navigate("/planning/timeblocks")}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
                <Target size={14} /> Auto-Place Optimal Blocks
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
      <div className="h-8" />
    </div>
  );
}
