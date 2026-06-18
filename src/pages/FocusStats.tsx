import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, BarChart2, Zap, Target, Sparkles, Flame, Timer, Shield,
} from "lucide-react";
import { DEMO_SESSIONS, FocusEngine, SESSION_TYPE_CONFIG } from "../lib/focusEngine";
import type { SessionType } from "../lib/focusEngine";

/* ══════════════════════════════════════════════════════════════
   FOCUS STATS  /focus/stats
   ══════════════════════════════════════════════════════════════ */

const fade = (d = 0) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, delay: d } });

export default function FocusStats() {
  const navigate = useNavigate();

  const perDay        = FocusEngine.minutesPerDay(DEMO_SESSIONS, 7);
  const perDayMonth   = FocusEngine.minutesPerDay(DEMO_SESSIONS, 30);
  const byType        = FocusEngine.byType(DEMO_SESSIONS);
  const perGoal       = FocusEngine.minutesPerGoal(DEMO_SESSIONS);
  const streak        = FocusEngine.currentStreak(DEMO_SESSIONS);
  const consistency   = FocusEngine.consistencyPct(DEMO_SESSIONS, 14);
  const bestHour      = FocusEngine.bestHour(DEMO_SESSIONS);
  const totalMins     = FocusEngine.totalMinutes(DEMO_SESSIONS);
  const avgDur        = FocusEngine.avgDuration(DEMO_SESSIONS);
  const maxDay        = Math.max(...perDay.map(d => d.minutes), 1);
  const maxMonth      = Math.max(...perDayMonth.map(d => d.minutes), 1);

  const SESSION_TYPES = Object.keys(SESSION_TYPE_CONFIG) as SessionType[];
  const maxTypeCount  = Math.max(...SESSION_TYPES.map(t => byType[t] ?? 0), 1);
  const maxGoalMins   = Math.max(...perGoal.map(g => g.minutes), 1);

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/focus")}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart2 size={14} className="text-indigo-400" /> Focus Analytics
            </h1>
            <p className="text-[11px] text-slate-500">{DEMO_SESSIONS.length} sessions · {totalMins} total minutes</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">

        {/* Summary tiles */}
        <motion.div {...fade(0)} className="grid grid-cols-2 gap-3">
          {[
            { icon: <Flame size={14} className="text-amber-400" />,  label: "Current Streak",    value: `${streak} days`      },
            { icon: <Timer size={14} className="text-indigo-400" />,  label: "Avg Session",       value: `${avgDur} min`       },
            { icon: <Zap   size={14} className="text-green-400" />,   label: "Consistency (14d)", value: `${consistency}%`     },
            { icon: <Shield size={14} className="text-purple-400" />, label: "Best Focus Hour",   value: bestHour              },
          ].map(s => (
            <div key={s.label} className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">{s.icon}<p className="text-[10px] text-slate-500">{s.label}</p></div>
              <p className="text-xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Weekly minutes chart */}
        <motion.div {...fade(0.05)} className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Daily Focus (Last 7 Days)</p>
          <div className="flex items-end gap-2 h-28">
            {perDay.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full relative flex items-end" style={{ height: "80px" }}>
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: `${(d.minutes / maxDay) * 80}px` }}
                    transition={{ duration: 0.5, delay: i * 0.06 }}
                    className="w-full rounded-t-md bg-indigo-600/70 hover:bg-indigo-500/80 transition-colors cursor-default"
                    title={`${d.minutes}min`}
                  />
                </div>
                <p className="text-[10px] text-slate-600">{d.label}</p>
                {d.minutes > 0 && <p className="text-[9px] text-indigo-400 font-bold">{d.minutes}m</p>}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Monthly chart (last 30 days, grouped by week) */}
        <motion.div {...fade(0.08)} className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Daily Focus (Last 30 Days)</p>
          <div className="flex items-end gap-0.5 h-20">
            {perDayMonth.map((d, i) => (
              <div key={i} className="flex-1 relative flex items-end" style={{ height: "64px" }}>
                <motion.div
                  initial={{ height: 0 }} animate={{ height: `${(d.minutes / maxMonth) * 64}px` }}
                  transition={{ duration: 0.4, delay: i * 0.015 }}
                  className="w-full rounded-t-sm bg-indigo-600/50 hover:bg-indigo-500/70 transition-colors"
                  title={`${d.label}: ${d.minutes}min`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-[10px] text-slate-700">30d ago</p>
            <p className="text-[10px] text-slate-700">Today</p>
          </div>
        </motion.div>

        {/* Session type breakdown */}
        <motion.div {...fade(0.11)} className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Session Type Breakdown</p>
          <div className="space-y-3">
            {SESSION_TYPES.map(t => {
              const cfg   = SESSION_TYPE_CONFIG[t];
              const count = byType[t] ?? 0;
              const pct   = Math.round((count / maxTypeCount) * 100);
              return (
                <div key={t}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{cfg.emoji}</span>
                      <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">{count} sessions</span>
                  </div>
                  <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full rounded-full bg-indigo-600/60"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Goal contribution */}
        {perGoal.length > 0 && (
          <motion.div {...fade(0.14)} className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <Target size={10} /> Goal Contribution
            </p>
            <div className="space-y-3">
              {perGoal.map(g => {
                const pct = Math.round((g.minutes / maxGoalMins) * 100);
                return (
                  <div key={g.title}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-white font-semibold truncate max-w-[60%]">{g.title}</p>
                      <span className="text-[11px] text-slate-500">{g.minutes}min · {g.count} sessions</span>
                    </div>
                    <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full rounded-full bg-green-600/60"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Cycle contribution */}
        <motion.div {...fade(0.17)} className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Cycle Contribution</p>
          <div className="space-y-2">
            {[...new Set(DEMO_SESSIONS.map(s => s.cycleWeek))].sort().map(week => {
              const weekSessions = DEMO_SESSIONS.filter(s => s.cycleWeek === week);
              const weekMins = FocusEngine.totalMinutes(weekSessions);
              return (
                <div key={week} className="flex items-center gap-3">
                  <p className="text-[11px] text-slate-500 w-16 shrink-0">Week {week}</p>
                  <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${Math.min(100, weekMins / 3)}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full rounded-full bg-purple-600/60"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 w-14 text-right shrink-0">{weekMins}min</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Agent insights */}
        <motion.div {...fade(0.20)} className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={13} className="text-indigo-400" />
            <p className="text-xs font-bold text-indigo-300">Agent Insights</p>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-slate-300">
              You focus best at <span className="text-white font-semibold">{bestHour}</span> — protect this window.
            </p>
            <p className="text-sm text-slate-300">
              <span className="text-amber-400 font-semibold">{streak}-day streak 🔥</span>{" "}
              {streak >= 7 ? "World-class consistency." : streak >= 3 ? "Momentum is building." : "Build the daily habit — 7 days changes everything."}
            </p>
            <p className="text-sm text-slate-300">
              Average session: <span className="text-white font-semibold">{avgDur} minutes.</span>{" "}
              {avgDur >= 45 ? "Deep work sessions — elite level." : avgDur >= 25 ? "Solid Pomodoro rhythm." : "Try pushing to 25+ minutes for deeper flow."}
            </p>
            <p className="text-sm text-slate-300">
              Consistency score: <span className="text-white font-semibold">{consistency}%</span>{" "}
              over the last 14 days.{" "}
              {consistency >= 80 ? "Exceptional. This is what identity looks like." : consistency >= 50 ? "Good. Keep closing the gap." : "Focus on showing up every day, even for 15 minutes."}
            </p>
          </div>
        </motion.div>

      </div>
      <div className="h-8" />
    </div>
  );
}
