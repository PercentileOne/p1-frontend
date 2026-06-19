import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays, Sparkles, ChevronRight, Zap, Target, Clock,
  CalendarCheck, LayoutGrid, TrendingUp,
} from "lucide-react";
import BackToCockpit from "../components/BackToCockpit";
import {
  DEMO_BLOCKS, DEMO_EVENTS, CURRENT_WEEKLY_PLAN, CURRENT_MONTHLY_PLAN,
  DAILY_AGENT_SUGGESTIONS, PlanningEngine, DAY_LABELS,
  EVENT_TYPE_CONFIG,
} from "../lib/planningEngine";

/* ══════════════════════════════════════════════════════════════
   PLANNING HOME  /planning
   ══════════════════════════════════════════════════════════════ */

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay },
});

const todayDayIndex = 0; // Monday (demo)
const todayBlocks = PlanningEngine.blocksForDay(DEMO_BLOCKS, todayDayIndex);
const strategicMins = PlanningEngine.strategicMinutes(DEMO_BLOCKS, todayDayIndex);
const overloaded = PlanningEngine.detectOverload(DEMO_BLOCKS, todayDayIndex);

export default function PlanningHome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BackToCockpit />
            <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <CalendarDays size={16} className="text-indigo-400" /> Planning
            </h1>
            <p className="text-[11px] text-slate-500">Week {CURRENT_WEEKLY_PLAN.weekNumber} · {CURRENT_MONTHLY_PLAN.month}</p>
            </div>
          </div>
          <button onClick={() => navigate("/planning/time-blocking")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors">
            <LayoutGrid size={12} /> Time-Blocking Engine
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-5 space-y-7">

        {/* Agent Insight */}
        <motion.div {...fade(0)} className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={13} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-300">Agent Overview</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            You're in <span className="text-white font-semibold">Week {CURRENT_WEEKLY_PLAN.weekNumber}</span> — theme:{" "}
            <span className="text-indigo-300 font-semibold">"{CURRENT_WEEKLY_PLAN.theme}"</span>.
            {" "}<span className="text-white font-semibold">{strategicMins / 60}h</span> of strategic work blocked today.
            {overloaded && <span className="text-amber-400 font-semibold"> Warning: today is overloaded — consider trimming 1 block.</span>}
            {!overloaded && <span className="text-green-400"> Load is balanced.</span>}
          </p>
        </motion.div>

        {/* Agent Suggestions strip */}
        <motion.div {...fade(0.05)} className="grid grid-cols-2 gap-3">
          {DAILY_AGENT_SUGGESTIONS.map(s => (
            <div key={s.id} className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${
              s.type === "warning" ? "bg-amber-600/8 border-amber-500/20" :
              s.type === "success" ? "bg-green-600/8 border-green-500/20" :
              s.type === "action"  ? "bg-indigo-600/8 border-indigo-500/20" :
              "bg-white/[0.03] border-white/[0.06]"
            }`}>
              <Sparkles size={10} className={
                s.type === "warning" ? "text-amber-400 shrink-0 mt-0.5" :
                s.type === "success" ? "text-green-400 shrink-0 mt-0.5" :
                "text-indigo-400 shrink-0 mt-0.5"
              } />
              <div className="flex-1 min-w-0">
                <p className={`leading-snug ${
                  s.type === "warning" ? "text-amber-200" :
                  s.type === "success" ? "text-green-200" : "text-slate-300"
                }`}>{s.message}</p>
                {s.action && (
                  <button onClick={() => navigate(s.actionRoute!)}
                    className="mt-1.5 text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                    {s.action} <ChevronRight size={9} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── Section 1: Today's Plan ─────────────────────────────── */}
        <motion.div {...fade(0.08)}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Clock size={10} /> Today's Plan
            </p>
            <button onClick={() => navigate("/planning/daily")}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              Open daily view <ChevronRight size={10} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <StatCard icon={<Target size={14} className="text-indigo-400" />}
              value={`${todayBlocks.filter(b => b.type === "strategic").length}`} label="Strategic blocks" color="text-indigo-400" />
            <StatCard icon={<Zap size={14} className="text-amber-400" />}
              value={`${(strategicMins / 60).toFixed(1)}h`} label="Deep work" color="text-amber-400" />
            <StatCard icon={<CalendarCheck size={14} className="text-green-400" />}
              value={`${todayBlocks.length}`} label="Total blocks" color="text-green-400" />
          </div>

          <div className="space-y-2">
            {todayBlocks.map(block => (
              <div key={block.id} className="flex items-center gap-3 p-3 bg-[#1c1f2e] border border-white/[0.08] rounded-xl">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: block.color }} />
                <span className="text-sm">{block.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{block.title}</p>
                  <p className="text-[10px] text-slate-500">
                    {PlanningEngine.minuteToTime(block.startMinute)} — {PlanningEngine.minuteToTime(block.startMinute + block.durationMinutes)}
                    {" "}· {block.durationMinutes}min
                  </p>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md capitalize"
                  style={{ color: block.color, backgroundColor: `${block.color}20`, border: `1px solid ${block.color}30` }}>
                  {block.type}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Section 2: This Week ─────────────────────────────────── */}
        <motion.div {...fade(0.1)}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <TrendingUp size={10} /> This Week
            </p>
            <button onClick={() => navigate("/planning/weekly")}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              Weekly view <ChevronRight size={10} />
            </button>
          </div>

          <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-bold text-white">{CURRENT_WEEKLY_PLAN.theme}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Week {CURRENT_WEEKLY_PLAN.weekNumber} · Cycle progress {CURRENT_WEEKLY_PLAN.cycleProgress}%</p>
              </div>
              <div className="flex gap-1">
                {[0,1,2,3,4,5,6].map(d => {
                  const count = PlanningEngine.blocksForDay(DEMO_BLOCKS, d).length;
                  const isHigh = CURRENT_WEEKLY_PLAN.highEnergyDays.includes(d);
                  const isDanger = CURRENT_WEEKLY_PLAN.dangerZones.includes(d);
                  return (
                    <div key={d} className="flex flex-col items-center gap-1">
                      <div className={`w-7 flex flex-col-reverse gap-0.5 pb-0.5`} style={{ height: `${Math.max(count * 8, 8)}px` }}>
                        {Array.from({ length: count }).map((_, i) => (
                          <div key={i} className={`w-full h-1.5 rounded-full ${
                            isHigh ? "bg-indigo-400" : isDanger ? "bg-amber-400" : "bg-slate-600"
                          }`} />
                        ))}
                      </div>
                      <p className={`text-[9px] font-bold ${isHigh ? "text-indigo-400" : isDanger ? "text-amber-400" : "text-slate-600"}`}>
                        {DAY_LABELS[d]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Goals</p>
                <div className="space-y-1.5">
                  {CURRENT_WEEKLY_PLAN.goals.slice(0, 3).map(g => (
                    <div key={g} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                      <p className="text-xs text-slate-300">{g}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Wins last week</p>
                <div className="space-y-1.5">
                  {CURRENT_WEEKLY_PLAN.wins.slice(0, 3).map(w => (
                    <div key={w} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                      <p className="text-xs text-slate-300">{w}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Section 3: Upcoming Events ───────────────────────────── */}
        <motion.div {...fade(0.12)}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <CalendarDays size={10} /> Upcoming Events
            </p>
            <button onClick={() => navigate("/planning/events")}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              All events <ChevronRight size={10} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {DEMO_EVENTS.map(event => {
              const daysLeft = PlanningEngine.eventDaysRemaining(event);
              const progress = PlanningEngine.eventProgress(event);
              return (
                <motion.button key={event.id} whileHover={{ y: -1 }}
                  onClick={() => navigate(`/planning/events/${event.id}`)}
                  className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-4 text-left hover:border-indigo-500/20 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xl">{event.emoji}</span>
                    <span className={`text-[10px] font-bold ${daysLeft < 14 ? "text-red-400" : daysLeft < 30 ? "text-amber-400" : "text-slate-500"}`}>
                      {daysLeft}d left
                    </span>
                  </div>
                  <p className="text-xs font-bold text-white">{event.title}</p>
                  <p className={`text-[10px] mt-0.5 ${EVENT_TYPE_CONFIG[event.type].color}`}>
                    {EVENT_TYPE_CONFIG[event.type].label}
                  </p>
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-500">Progress</span>
                      <span className="text-white font-semibold">{progress}%</span>
                    </div>
                    <div className="w-full bg-white/[0.05] rounded-full h-1">
                      <div className="h-1 rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Section 4: Quick Actions ─────────────────────────────── */}
        <motion.div {...fade(0.14)}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Plan Today",              icon: "☀️", route: "/planning/daily",      color: "border-amber-500/25 bg-amber-600/8 text-amber-300"   },
              { label: "Plan This Week",           icon: "📅", route: "/planning/weekly",     color: "border-indigo-500/25 bg-indigo-600/8 text-indigo-300" },
              { label: "Create Event Plan",        icon: "🎯", route: "/planning/events",     color: "border-violet-500/25 bg-violet-600/8 text-violet-300" },
              { label: "Time-Blocking Engine",     icon: "⚡", route: "/planning/time-blocking", color: "border-green-500/25 bg-green-600/8 text-green-300"    },
              { label: "Monthly Overview",         icon: "🗓️", route: "/planning/monthly",    color: "border-blue-500/25 bg-blue-600/8 text-blue-300"       },
            ].map(a => (
              <motion.button key={a.label} whileHover={{ scale: 1.01 }}
                onClick={() => navigate(a.route)}
                className={`flex items-center gap-3 p-4 rounded-xl border font-semibold text-sm transition-all ${a.color}`}>
                <span className="text-lg">{a.icon}</span> {a.label}
                <ChevronRight size={14} className="ml-auto opacity-60" />
              </motion.button>
            ))}
          </div>
        </motion.div>

      </div>
      <div className="h-8" />
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-3.5">
      <div className="mb-2">{icon}</div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
