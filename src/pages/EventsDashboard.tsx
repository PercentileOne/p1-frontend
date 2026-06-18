import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Sparkles, ChevronRight, Calendar,
  CheckCircle2, Clock, Target,
} from "lucide-react";
import {
  DEMO_EVENTS, EVENT_TYPE_CONFIG, PlanningEngine,
} from "../lib/planningEngine";
import type { EventType } from "../lib/planningEngine";

/* ══════════════════════════════════════════════════════════════
   EVENTS DASHBOARD  /planning/events
   ══════════════════════════════════════════════════════════════ */

const ALL_EVENT_TYPES: EventType[] = [
  "wedding","holiday","workout","study","project",
  "business_launch","exam","birthday","renovation","custom",
];

const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } };

export default function EventsDashboard() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<EventType | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle,   setNewTitle]   = useState("");
  const [newType,    setNewType]    = useState<EventType>("custom");

  const filtered = filter === "all" ? DEMO_EVENTS : DEMO_EVENTS.filter(e => e.type === filter);

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
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar size={14} className="text-indigo-400" /> Event Planning
            </h1>
            <p className="text-[11px] text-slate-500">{DEMO_EVENTS.length} active events</p>
          </div>
          <button onClick={() => setShowCreate(v => !v)}
            className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors">
            <Plus size={12} /> New Event
          </button>
        </div>

        {/* Type filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button onClick={() => setFilter("all")}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
              filter === "all" ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300" : "bg-white/[0.03] border-white/[0.06] text-slate-400"
            }`}>All</button>
          {ALL_EVENT_TYPES.map(t => {
            const cfg = EVENT_TYPE_CONFIG[t];
            return (
              <button key={t} onClick={() => setFilter(t)}
                className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                  filter === t ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300" : "bg-white/[0.03] border-white/[0.06] text-slate-400"
                }`}>
                {cfg.emoji} {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">

        {/* Create form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="bg-[#1c1f2e] border border-indigo-500/25 rounded-2xl p-5 space-y-4">
                <p className="text-sm font-bold text-white">Create New Event</p>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="Event title…"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 transition-colors" />
                <div className="grid grid-cols-5 gap-2">
                  {ALL_EVENT_TYPES.map(t => {
                    const cfg = EVENT_TYPE_CONFIG[t];
                    return (
                      <button key={t} onClick={() => setNewType(t)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${
                          newType === t ? "bg-indigo-600/20 border-indigo-500/30" : "bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]"
                        }`}>
                        <span className="text-lg">{cfg.emoji}</span>
                        <p className={`text-[10px] font-semibold ${newType === t ? "text-indigo-300" : "text-slate-500"}`}>{cfg.label}</p>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-slate-300 text-sm font-semibold hover:bg-white/[0.08] transition-colors">
                    Cancel
                  </button>
                  <button onClick={() => setShowCreate(false)}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors">
                    Create Event →
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Agent insight */}
        <motion.div {...fade} className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={13} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-300">Agent Insight</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            You have <span className="text-white font-semibold">{DEMO_EVENTS.length} active events</span>.
            {" "}<span className="text-red-400 font-semibold">P1 MVP Launch</span> is your most time-critical — {PlanningEngine.eventDaysRemaining(DEMO_EVENTS[0])} days remaining.
            {" "}Add more time blocks to fundraising — currently only 18 blocks allocated across 90 days.
          </p>
        </motion.div>

        {/* Events grid */}
        <div className="grid grid-cols-1 gap-4">
          {filtered.map(event => {
            const daysLeft = PlanningEngine.eventDaysRemaining(event);
            const progress = PlanningEngine.eventProgress(event);
            const doneTasks = event.tasks.filter(t => t.done).length;
            const cfg = EVENT_TYPE_CONFIG[event.type];
            return (
              <motion.button key={event.id} whileHover={{ y: -1 }}
                onClick={() => navigate(`/planning/events/${event.id}`)}
                className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5 text-left hover:border-indigo-500/20 transition-all">

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{event.emoji}</span>
                    <div>
                      <h3 className="text-base font-bold text-white">{event.title}</h3>
                      <p className={`text-[11px] mt-0.5 ${cfg.color}`}>{cfg.label}</p>
                      {event.budget && <p className="text-[10px] text-slate-500 mt-0.5">Budget: £{event.budget.toLocaleString()}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-bold ${daysLeft < 14 ? "text-red-400" : daysLeft < 30 ? "text-amber-400" : "text-slate-300"}`}>{daysLeft}</p>
                    <p className="text-[10px] text-slate-500">days left</p>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-[11px] mb-1.5">
                    <span className="text-slate-500">Progress</span>
                    <span className="text-white font-bold">{progress}%</span>
                  </div>
                  <div className="w-full bg-white/[0.05] rounded-full h-2">
                    <motion.div className="h-2 rounded-full bg-indigo-500"
                      initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.6 }} />
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <CheckCircle2 size={11} className="text-green-400" /> {doneTasks}/{event.tasks.length} tasks
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Target size={11} className="text-indigo-400" /> {event.blocksAllocated} blocks
                  </span>
                  {event.participants.length > 0 && (
                    <span className="text-[11px] text-slate-400">{event.participants.length} participants</span>
                  )}
                  <span className="ml-auto text-[11px] text-indigo-400 flex items-center gap-1">
                    Open workspace <ChevronRight size={11} />
                  </span>
                </div>

                {/* Next task */}
                {event.tasks.find(t => !t.done) && (
                  <div className="mt-3 pt-3 border-t border-white/[0.05]">
                    <p className="text-[10px] text-slate-500 mb-1">Next task</p>
                    <p className="text-xs text-slate-300 flex items-center gap-2">
                      <Clock size={10} className="text-amber-400 shrink-0" />
                      {event.tasks.find(t => !t.done)!.title}
                    </p>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Calendar size={24} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">No {filter !== "all" ? EVENT_TYPE_CONFIG[filter].label : ""} events yet</p>
            <p className="text-xs text-slate-500 mt-1">Create your first event to start planning with AI.</p>
            <button onClick={() => setShowCreate(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors">
              + New Event
            </button>
          </div>
        )}

      </div>
      <div className="h-8" />
    </div>
  );
}
