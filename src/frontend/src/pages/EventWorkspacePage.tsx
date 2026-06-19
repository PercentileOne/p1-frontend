import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, Plus, Sparkles, ChevronRight,
  Clock, Target, Calendar, Users, Shield, Zap,
} from "lucide-react";
import {
  DEMO_EVENTS, EVENT_TYPE_CONFIG, PlanningEngine,
} from "../lib/planningEngine";

/* ══════════════════════════════════════════════════════════════
   EVENT WORKSPACE  /planning/events/:id
   ══════════════════════════════════════════════════════════════ */

type Tab = "overview" | "tasks" | "timeline" | "blocks";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview",  label: "Overview"  },
  { key: "tasks",     label: "Tasks"     },
  { key: "timeline",  label: "Timeline"  },
  { key: "blocks",    label: "Blocks"    },
];

const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } };

export default function EventWorkspacePage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [tasks, setTasks] = useState(() =>
    DEMO_EVENTS.find(e => e.id === id)?.tasks.map(t => ({ ...t })) ?? []
  );

  const event = DEMO_EVENTS.find(e => e.id === id);
  if (!event) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-slate-400">
      Event not found. <button onClick={() => navigate("/planning/events")} className="ml-2 text-indigo-400">Back</button>
    </div>
  );

  const cfg = EVENT_TYPE_CONFIG[event.type];
  const daysLeft  = PlanningEngine.eventDaysRemaining(event);
  const progress  = Math.round((tasks.filter(t => t.done).length / Math.max(tasks.length, 1)) * 100);
  const totalDays = Math.ceil((event.endDate.getTime() - event.startDate.getTime()) / 86400000);

  const toggleTask = (tid: string) =>
    setTasks(prev => prev.map(t => t.id === tid ? { ...t, done: !t.done } : t));

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3">
        <div className="flex items-center gap-4 mb-3">
          <button onClick={() => navigate("/planning/events")}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">{event.emoji}</span>
            <div>
              <h1 className="text-sm font-bold text-white">{event.title}</h1>
              <p className={`text-[11px] ${cfg.color}`}>{cfg.label}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className={`text-[11px] font-bold ${daysLeft < 14 ? "text-red-400" : daysLeft < 30 ? "text-amber-400" : "text-slate-400"}`}>
              {daysLeft}d left
            </span>
            <span className="text-[11px] text-white font-bold">{progress}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="w-full bg-white/[0.05] rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === t.key ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-5">
        <AnimatePresence mode="wait">

          {/* ── Overview ─────────────────────────────────────────────── */}
          {tab === "overview" && (
            <motion.div key="overview" {...fade} className="space-y-5">

              {/* Details card */}
              <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Event Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 mb-1">Start Date</p>
                    <p className="text-sm text-white font-semibold">{event.startDate.toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 mb-1">End Date</p>
                    <p className="text-sm text-white font-semibold">{event.endDate.toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 mb-1">Duration</p>
                    <p className="text-sm text-white font-semibold">{totalDays} days</p>
                  </div>
                  {event.budget && (
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1">Budget</p>
                      <p className="text-sm text-white font-semibold">£{event.budget.toLocaleString()}</p>
                    </div>
                  )}
                </div>
                {event.description && (
                  <div className="mt-4 pt-4 border-t border-white/[0.05]">
                    <p className="text-[10px] text-slate-500 mb-1">Description</p>
                    <p className="text-sm text-slate-300">{event.description}</p>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-3.5 text-center">
                  <CheckCircle2 size={14} className="text-green-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-green-400">{tasks.filter(t => t.done).length}/{tasks.length}</p>
                  <p className="text-[10px] text-slate-500">Tasks done</p>
                </div>
                <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-3.5 text-center">
                  <Target size={14} className="text-indigo-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-indigo-400">{event.blocksAllocated}</p>
                  <p className="text-[10px] text-slate-500">Blocks allocated</p>
                </div>
                <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-3.5 text-center">
                  <Users size={14} className="text-violet-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-violet-400">{event.participants.length}</p>
                  <p className="text-[10px] text-slate-500">Participants</p>
                </div>
              </div>

              {/* Participants */}
              {event.participants.length > 0 && (
                <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Participants</p>
                  <div className="flex gap-2 flex-wrap">
                    {event.participants.map(p => (
                      <span key={p} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white">
                        <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold">{p[0]}</div>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Agent insight */}
              <div className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={13} className="text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-300">Agent Analysis</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  At your current pace you'll complete <span className="text-white font-semibold">{progress}%</span> of tasks before the deadline.
                  {progress < 50 && daysLeft < 30 && <span className="text-amber-400 font-semibold"> ⚠️ Pace risk detected — add 3 more time blocks this week.</span>}
                  {progress >= 50 && <span className="text-green-400"> ✓ You're on track.</span>}
                  {" "}Next key milestone: <span className="text-indigo-300 font-semibold">{tasks.find(t => !t.done)?.title ?? "All tasks complete!"}</span>
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Tasks ─────────────────────────────────────────────────── */}
          {tab === "tasks" && (
            <motion.div key="tasks" {...fade} className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Tasks ({tasks.filter(t => t.done).length}/{tasks.length} done)
                </p>
                <button className="flex items-center gap-1.5 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
                  <Plus size={11} /> Add task
                </button>
              </div>

              {tasks.map(task => (
                <motion.div key={task.id} whileHover={{ x: 1 }}
                  className={`bg-[#1c1f2e] border rounded-xl p-4 transition-all ${
                    task.done ? "border-green-500/15 opacity-70" : "border-white/[0.08]"
                  }`}>
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleTask(task.id)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        task.done ? "bg-green-500 border-green-500" : "border-white/25 hover:border-indigo-400"
                      }`}>
                      {task.done && <CheckCircle2 size={12} className="text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${task.done ? "text-green-300 line-through" : "text-white"}`}>
                        {task.title}
                      </p>
                      {task.deadline && (
                        <p className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                          <Clock size={10} />
                          Due: {task.deadline.toLocaleDateString("en-GB", { day:"numeric", month:"short" })}
                        </p>
                      )}
                      {task.subtasks.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {task.subtasks.map(s => (
                            <div key={s} className="flex items-center gap-2 text-[11px] text-slate-400">
                              <div className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />
                              {s}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.hasProof && <Shield size={12} className="text-green-400" />}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ── Timeline ──────────────────────────────────────────────── */}
          {tab === "timeline" && (
            <motion.div key="timeline" {...fade} className="space-y-4">

              <div className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={13} className="text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-300">AI-Generated Timeline</span>
                </div>
                <p className="text-[11px] text-slate-400">Tasks auto-placed across your {totalDays}-day window.</p>
              </div>

              {/* Vertical timeline */}
              <div className="relative pl-8">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-white/[0.08]" />
                {[...tasks].sort((a, b) => (a.daysFromStart ?? 99) - (b.daysFromStart ?? 99)).map((task, i) => {
                  const dayN = task.daysFromStart ?? i * 10;
                  const pct  = Math.min((dayN / totalDays) * 100, 100);
                  return (
                    <div key={task.id} className="relative mb-5">
                      <div className={`absolute -left-5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        task.done ? "bg-green-500 border-green-400" : "bg-[#1c1f2e] border-indigo-500"
                      }`}>
                        {task.done && <CheckCircle2 size={8} className="text-white" />}
                      </div>
                      <div className={`ml-2 p-3.5 rounded-xl border transition-all ${
                        task.done ? "bg-green-600/8 border-green-500/15" : "bg-[#1c1f2e] border-white/[0.08]"
                      }`}>
                        <div className="flex items-start justify-between">
                          <p className={`text-sm font-semibold ${task.done ? "text-green-300" : "text-white"}`}>{task.title}</p>
                          <span className="text-[10px] text-slate-500 shrink-0 ml-3">Day {dayN}</span>
                        </div>
                        {task.deadline && (
                          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                            <Calendar size={9} /> Due {task.deadline.toLocaleDateString("en-GB", { day:"numeric", month:"short" })}
                          </p>
                        )}
                        {/* Progress bar within full timeline */}
                        <div className="mt-2 w-full bg-white/[0.05] rounded-full h-0.5">
                          <div className={`h-0.5 rounded-full ${task.done ? "bg-green-400" : "bg-indigo-500"}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── Blocks ───────────────────────────────────────────────── */}
          {tab === "blocks" && (
            <motion.div key="blocks" {...fade} className="space-y-4">

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-4 text-center">
                  <Target size={18} className="text-indigo-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-indigo-400">{event.blocksAllocated}</p>
                  <p className="text-[11px] text-slate-500">Blocks allocated</p>
                </div>
                <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-4 text-center">
                  <Zap size={18} className="text-amber-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-amber-400">{Math.round(event.blocksAllocated * 1.5)}</p>
                  <p className="text-[11px] text-slate-500">Hours dedicated</p>
                </div>
              </div>

              {/* Agent suggestions */}
              <div className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-300">AI Block Suggestions</span>
                </div>
                {[
                  `Add 2 strategic blocks per week to meet your ${daysLeft}-day deadline`,
                  "Schedule a weekly review block for this event every Sunday evening",
                  "Add a proof collection block after each major task completion",
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <ChevronRight size={11} className="text-indigo-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-slate-300">{s}</p>
                  </div>
                ))}
              </div>

              {/* Simulated dedicated blocks */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Dedicated Blocks</p>
                {[
                  { title: `${event.title} — Deep Work`,    type: "Strategic", day: "Mon", time: "9:00am", dur: "2h"  },
                  { title: `${event.title} — Review`,       type: "Buffer",    day: "Wed", time: "1:00pm", dur: "45m" },
                  { title: `${event.title} — Preparation`,  type: "Strategic", day: "Thu", time: "2:00pm", dur: "90m" },
                  { title: `${event.title} — Admin`,        type: "Buffer",    day: "Fri", time: "11:00am",dur: "30m" },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-[#1c1f2e] border border-white/[0.08] rounded-xl">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${b.type === "Strategic" ? "bg-indigo-400" : "bg-amber-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{b.title}</p>
                      <p className="text-[10px] text-slate-500">{b.day} · {b.time} · {b.dur}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">{b.type}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => navigate("/planning/timeblocks")}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
                <Target size={14} /> Add Blocks in Time-Blocking Engine
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
      <div className="h-8" />
    </div>
  );
}
