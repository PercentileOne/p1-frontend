import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Sparkles, ChevronRight, TrendingUp,
  Target, AlertTriangle, Calendar, Zap,
} from "lucide-react";
import {
  CURRENT_MONTHLY_PLAN, DEMO_EVENTS, DEMO_BLOCKS,
  PlanningEngine, DAY_LABELS,
} from "../lib/planningEngine";

/* ══════════════════════════════════════════════════════════════
   MONTHLY PLANNING  /planning/monthly
   ══════════════════════════════════════════════════════════════ */

const fade = (d = 0) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, delay: d } });

// Simulated monthly calendar weeks
const WEEKS = [
  { label: "Week 22 · Jun 1–7",   days: [0,1,2,3,4,5,6], highlight: false },
  { label: "Week 23 · Jun 8–14",  days: [0,1,2,3,4,5,6], highlight: false },
  { label: "Week 24 · Jun 15–21", days: [0,1,2,3,4,5,6], highlight: true  }, // current
  { label: "Week 25 · Jun 22–28", days: [0,1,2,3,4,5,6], highlight: false },
];

const MOMENTUM_CURVE = [52, 61, 58, 72, 79, 72]; // weekly momentum scores

export default function MonthlyPlanPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3 flex items-center gap-4">
        <button onClick={() => navigate("/planning")}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-sm font-bold text-white">Monthly Planning</h1>
          <p className="text-[11px] text-slate-500">{CURRENT_MONTHLY_PLAN.month}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-5 space-y-7">

        {/* ── Theme & Identity ─────────────────────────────────────── */}
        <motion.div {...fade(0)} className="bg-gradient-to-br from-indigo-600/20 to-violet-600/10 border border-indigo-500/25 rounded-2xl p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Monthly Theme</p>
          <h2 className="text-xl font-bold text-white mb-2">{CURRENT_MONTHLY_PLAN.theme}</h2>
          <p className="text-sm text-indigo-200/80 italic">"{CURRENT_MONTHLY_PLAN.identityAffirmation}"</p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/[0.1] rounded-full h-1.5 w-32">
                <div className="h-1.5 rounded-full bg-indigo-400" style={{ width: `${CURRENT_MONTHLY_PLAN.momentumScore}%` }} />
              </div>
              <span className="text-xs font-bold text-indigo-300">{CURRENT_MONTHLY_PLAN.momentumScore}% momentum</span>
            </div>
          </div>
        </motion.div>

        {/* ── Focus Areas ──────────────────────────────────────────── */}
        <motion.div {...fade(0.04)}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Focus Areas</p>
          <div className="flex flex-wrap gap-2">
            {CURRENT_MONTHLY_PLAN.focusAreas.map(f => (
              <span key={f} className="px-3 py-1.5 rounded-xl text-sm font-semibold text-indigo-300 bg-indigo-600/10 border border-indigo-500/20">
                {f}
              </span>
            ))}
          </div>
        </motion.div>

        {/* ── Monthly Goals ─────────────────────────────────────────── */}
        <motion.div {...fade(0.06)}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Target size={10} /> Monthly Goals
            </p>
            <button onClick={() => navigate("/goals")} className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              Manage goals <ChevronRight size={10} />
            </button>
          </div>
          <div className="space-y-2">
            {CURRENT_MONTHLY_PLAN.goals.map((g, i) => (
              <div key={g} className="flex items-center gap-3 p-3.5 bg-[#1c1f2e] border border-white/[0.08] rounded-xl">
                <div className="w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/25 flex items-center justify-center text-[10px] font-bold text-indigo-400 shrink-0">
                  {i + 1}
                </div>
                <p className="text-sm text-white">{g}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Monthly Calendar ─────────────────────────────────────── */}
        <motion.div {...fade(0.08)}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Calendar size={10} /> Monthly Calendar
            </p>
            <span className="text-[11px] text-slate-500">June 2026</span>
          </div>

          {/* Day header */}
          <div className="grid grid-cols-8 gap-1 mb-1">
            <div className="text-[10px] text-slate-600 text-right pr-2">Week</div>
            {DAY_LABELS.map(d => (
              <div key={d} className="text-[10px] text-slate-500 text-center font-semibold">{d}</div>
            ))}
          </div>

          {WEEKS.map((week, wi) => {
            const weekBlocks = week.days.flatMap(d => PlanningEngine.blocksForDay(DEMO_BLOCKS, d));
            return (
              <div key={wi} className={`grid grid-cols-8 gap-1 mb-1`}>
                <div className={`text-[9px] text-right pr-2 flex items-center justify-end ${week.highlight ? "text-indigo-400 font-bold" : "text-slate-600"}`}>
                  W{22 + wi}
                </div>
                {week.days.map(d => {
                  const dayBs = PlanningEngine.blocksForDay(DEMO_BLOCKS, d);
                  const hasStrategic = dayBs.some(b => b.type === "strategic");
                  const hasBreakout  = dayBs.some(b => b.type === "breakout");
                  return (
                    <div key={d} className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 border cursor-pointer hover:border-indigo-500/30 transition-all ${
                      week.highlight ? "bg-indigo-600/15 border-indigo-500/25" : "bg-[#1c1f2e] border-white/[0.06]"
                    }`}>
                      <div className="text-[10px] font-bold text-white">{wi * 7 + d + 1}</div>
                      <div className="flex gap-0.5">
                        {hasStrategic && <div className="w-1 h-1 rounded-full bg-indigo-400" />}
                        {hasBreakout  && <div className="w-1 h-1 rounded-full bg-green-400" />}
                        {dayBs.length > 0 && <div className="w-1 h-1 rounded-full bg-amber-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          <div className="flex gap-4 mt-2 text-[10px]">
            <span className="flex items-center gap-1.5 text-indigo-400"><div className="w-2 h-2 rounded-full bg-indigo-400" /> Strategic</span>
            <span className="flex items-center gap-1.5 text-green-400"><div className="w-2 h-2 rounded-full bg-green-400" /> Breakout</span>
            <span className="flex items-center gap-1.5 text-amber-400"><div className="w-2 h-2 rounded-full bg-amber-400" /> Buffer</span>
          </div>
        </motion.div>

        {/* ── Momentum Curve ───────────────────────────────────────── */}
        <motion.div {...fade(0.1)}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
            <TrendingUp size={10} /> Momentum Curve
          </p>
          <div className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
            <div className="flex items-end justify-between gap-2 h-24">
              {MOMENTUM_CURVE.map((score, i) => (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <div className="w-full bg-white/[0.05] rounded-t-md overflow-hidden flex items-end" style={{ height: "80px" }}>
                    <motion.div className="w-full rounded-t-md bg-indigo-500"
                      initial={{ height: 0 }} animate={{ height: `${(score / 100) * 80}px` }}
                      transition={{ duration: 0.6, delay: i * 0.1 }} />
                  </div>
                  <span className="text-[9px] text-slate-500">W{22 + i}</span>
                  <span className="text-[10px] font-bold text-indigo-400">{score}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Agent Insights ───────────────────────────────────────── */}
        <motion.div {...fade(0.12)} className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-indigo-400" />
            <span className="text-sm font-bold text-indigo-300">Agent Monthly Insights</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <TrendingUp size={13} className="text-indigo-400 mt-0.5 shrink-0" />
              <p className="text-sm text-slate-300">
                <span className="text-white font-semibold">Your momentum is accelerating.</span> Weeks 22–24 show a recovery and build pattern. Protect Week 25 with 3 strategic blocks per day.
              </p>
            </div>
            {CURRENT_MONTHLY_PLAN.predictedBottlenecks.map((b, i) => (
              <div key={i} className="flex items-start gap-3">
                <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-300"><span className="text-amber-300 font-semibold">Predicted bottleneck:</span> {b}</p>
              </div>
            ))}
            <div className="flex items-start gap-3">
              <Zap size={13} className="text-green-400 mt-0.5 shrink-0" />
              <p className="text-sm text-slate-300">
                <span className="text-white font-semibold">Peak opportunity: </span>
                Your cycle hits a completion milestone at the end of this month. Align your biggest proof collection with this window.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Events on month calendar */}
        <motion.div {...fade(0.14)}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
            <Calendar size={10} /> Events This Month
          </p>
          <div className="space-y-2">
            {DEMO_EVENTS.map(e => {
              const daysLeft = PlanningEngine.eventDaysRemaining(e);
              return (
                <div key={e.id} className="flex items-center gap-3 p-3 bg-[#1c1f2e] border border-white/[0.08] rounded-xl">
                  <span className="text-lg">{e.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white">{e.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 bg-white/[0.05] rounded-full h-1">
                        <div className="h-1 rounded-full bg-indigo-500" style={{ width: `${PlanningEngine.eventProgress(e)}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">{PlanningEngine.eventProgress(e)}%</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold shrink-0 ${daysLeft < 14 ? "text-red-400" : daysLeft < 30 ? "text-amber-400" : "text-slate-500"}`}>
                    {daysLeft}d
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

      </div>
      <div className="h-8" />
    </div>
  );
}
