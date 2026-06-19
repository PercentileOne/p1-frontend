import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Sparkles, Flame, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronRight, Shield, Calendar,
  BarChart3, Compass, Star, Zap, Activity, Plus,
} from "lucide-react";
import {
  getCurrentCycle, CycleAgent, formatCycleDate, weeksRemaining,
} from "../lib/cycleEngine";
import type { CycleGoal, CycleInsight } from "../lib/cycleEngine";

/* ── helpers ──────────────────────────────────────────────── */
const INSIGHT_ICON: Record<CycleInsight["icon"], React.ReactNode> = {
  sparkles: <Sparkles size={13}/>,
  alert:    <AlertTriangle size={13}/>,
  check:    <CheckCircle2 size={13}/>,
  flame:    <Flame size={13}/>,
  compass:  <Compass size={13}/>,
};

const MILESTONE_STATUS: Record<string, { label:string; color:string; bg:string; border:string }> = {
  upcoming:    { label:"Upcoming",    color:"text-slate-400",  bg:"bg-white/[0.04]",  border:"border-white/[0.08]" },
  in_progress: { label:"In Progress", color:"text-amber-300",  bg:"bg-amber-500/10",  border:"border-amber-500/25" },
  completed:   { label:"Done",        color:"text-green-300",  bg:"bg-green-500/10",  border:"border-green-500/25" },
  missed:      { label:"Missed",      color:"text-red-300",    bg:"bg-red-500/10",    border:"border-red-500/25"   },
  at_risk:     { label:"At Risk",     color:"text-orange-300", bg:"bg-orange-500/10", border:"border-orange-500/25"},
};

const RISK_COLOR: Record<string, string> = {
  low:"text-slate-400", medium:"text-amber-400", high:"text-red-400", critical:"text-red-300",
};

/* ── SVG Progress Chart ───────────────────────────────────── */
function ProgressChart({ cycle }: { cycle: ReturnType<typeof getCurrentCycle> }) {
  const W = 560, H = 140, PAD = 32;
  const weeks = Array.from({ length: 12 }, (_, i) => i + 1);
  // Actual progress per week (interpolated)
  const actual = weeks.map(w => {
    if (w > cycle.currentWeek) return null;
    const plan = cycle.weeklyPlans[w - 1];
    if (w < cycle.currentWeek) return (w / cycle.currentWeek) * cycle.overallProgress * (plan.completionRate / 85);
    return cycle.overallProgress;
  });
  const target = weeks.map(w => (w / 12) * 100);

  const xPos = (w: number) => PAD + ((w - 1) / 11) * (W - PAD * 2);
  const yPos = (v: number) => H - PAD - (v / 100) * (H - PAD * 2);

  const targetPath = weeks.map((w, i) => `${i === 0 ? "M" : "L"}${xPos(w)},${yPos(target[i])}`).join(" ");
  const actualPts  = weeks.filter((_, i) => actual[i] !== null);
  const actualPath = actualPts.map((w, i) => `${i === 0 ? "M" : "L"}${xPos(w)},${yPos(actual[w - 1]!)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Grid lines */}
      {[25, 50, 75, 100].map(pct => (
        <g key={pct}>
          <line x1={PAD} y1={yPos(pct)} x2={W - PAD} y2={yPos(pct)}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
          <text x={PAD - 6} y={yPos(pct) + 4} fill="rgba(148,163,184,0.4)"
            fontSize="9" textAnchor="end">{pct}%</text>
        </g>
      ))}
      {/* Week labels */}
      {[1, 3, 6, 9, 12].map(w => (
        <text key={w} x={xPos(w)} y={H - 4} fill="rgba(148,163,184,0.4)"
          fontSize="9" textAnchor="middle">W{w}</text>
      ))}
      {/* Current week marker */}
      <line x1={xPos(cycle.currentWeek)} y1={PAD}
        x2={xPos(cycle.currentWeek)} y2={H - PAD}
        stroke="rgba(99,102,241,0.3)" strokeWidth="1" strokeDasharray="3 3"/>
      {/* Target line */}
      <path d={targetPath} fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="1.5" strokeDasharray="4 3"/>
      {/* Actual line */}
      <path d={actualPath} fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round"/>
      {/* Actual dots */}
      {actualPts.map(w => (
        <circle key={w} cx={xPos(w)} cy={yPos(actual[w - 1]!)}
          r={w === cycle.currentWeek ? 4 : 2.5}
          fill={w === cycle.currentWeek ? "#818cf8" : "#4f46e5"}/>
      ))}
      {/* Legend */}
      <g transform={`translate(${W - PAD - 120}, ${PAD - 10})`}>
        <line x1="0" y1="6" x2="18" y2="6" stroke="rgba(148,163,184,0.3)" strokeWidth="1.5" strokeDasharray="4 3"/>
        <text x="22" y="10" fill="rgba(148,163,184,0.5)" fontSize="9">Target</text>
        <line x1="60" y1="6" x2="78" y2="6" stroke="#818cf8" strokeWidth="2"/>
        <text x="82" y="10" fill="rgba(148,163,184,0.5)" fontSize="9">Actual</text>
      </g>
    </svg>
  );
}

/* ── Goal Card ────────────────────────────────────────────── */
function GoalCard({ goal }: { goal: CycleGoal }) {
  const [open, setOpen] = useState(false);
  const doneMilestones = goal.milestones.filter(m => m.status === "completed").length;
  return (
    <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        {/* Color dot */}
        <div className={`w-2 h-8 rounded-full shrink-0 ${goal.color}`}/>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-semibold text-slate-200 truncate">{goal.title}</p>
            <span className="text-[9px] font-bold uppercase tracking-wide text-slate-600 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded-full shrink-0 capitalize">{goal.difficulty}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
              <motion.div initial={{ width:0 }} animate={{ width:`${goal.progress}%` }}
                transition={{ duration:0.7, ease:"easeOut" }}
                className={`h-full rounded-full ${goal.color}`}/>
            </div>
            <span className="text-[10px] font-bold text-slate-400 shrink-0">{goal.progress}%</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1 text-[9px] text-orange-400">
            <Flame size={9}/>{goal.streak}d
          </div>
          <div className="text-[9px] text-slate-600">{doneMilestones}/{goal.milestones.length} milestones</div>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration:0.18 }} style={{ display:"block" }}>
          <ChevronDown size={13} className="text-slate-600 ml-1"/>
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height:0 }} animate={{ height:"auto" }}
            exit={{ height:0 }} transition={{ duration:0.18 }} style={{ overflow:"hidden" }}>
            <div className="px-4 pb-4 border-t border-white/[0.05] pt-3 space-y-3">
              {/* Weekly target */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">This Week's Target</p>
                <p className="text-xs text-slate-300">{goal.weeklyTarget}</p>
              </div>
              {/* Agent insight */}
              <div className="flex items-start gap-2 p-2.5 bg-indigo-600/8 border border-indigo-500/15 rounded-xl">
                <Sparkles size={10} className="text-indigo-400 shrink-0 mt-0.5"/>
                <p className="text-[10px] text-slate-400 leading-snug">{goal.agentInsight}</p>
              </div>
              {/* Milestones */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Milestones</p>
                <div className="space-y-1.5">
                  {goal.milestones.map(m => {
                    const sc = MILESTONE_STATUS[m.status];
                    return (
                      <div key={m.id} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl border ${sc.bg} ${sc.border}`}>
                        <span className={`text-[9px] font-bold uppercase tracking-wide shrink-0 ${sc.color}`}>{sc.label}</span>
                        <p className="flex-1 text-[10px] text-slate-300 truncate">{m.title}</p>
                        <span className="text-[9px] text-slate-600 shrink-0">W{m.dueWeek}</span>
                        {m.proofRequired && (
                          <Shield size={9} className={m.proofSubmitted ? "text-green-400" : "text-slate-600"}/>
                        )}
                        <span className="text-[9px] text-slate-600 shrink-0">{m.points}pts</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Proof stats */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Shield size={10} className="text-green-400"/>{goal.proofVerified}/{goal.proofCount} proofs verified
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Star size={10} className="text-yellow-400"/>{goal.pointsEarned}/{goal.points} pts earned
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */
export default function CycleDashboard() {
  const navigate = useNavigate();
  const cycle    = getCurrentCycle();
  const [tab, setTab] = useState<"overview"|"milestones"|"weekly"|"insights">("overview");

  const allMilestones  = cycle.goals.flatMap(g => g.milestones);
  const doneMilestones = allMilestones.filter(m => m.status === "completed");
  const atRisk         = allMilestones.filter(m => m.status === "at_risk" || (m.status === "upcoming" && m.dueWeek <= cycle.currentWeek + 1));
  const currentPlan    = cycle.weeklyPlans[cycle.currentWeek - 1];

  const TABS = [
    { id:"overview",   label:"Overview"  },
    { id:"milestones", label:"Milestones" },
    { id:"weekly",     label:"Week Plan"  },
    { id:"insights",   label:"Insights"   },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 font-sans">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-[#13151c]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <button onClick={() => navigate("/cockpit")}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-xs font-medium">
            <ArrowLeft size={14}/> Cockpit
          </button>
          <div className="w-px h-4 bg-white/10"/>
          <Zap size={13} className="text-indigo-400"/>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-white leading-none truncate">{cycle.name}</h1>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {formatCycleDate(cycle.startDate)} → {formatCycleDate(cycle.endDate)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => navigate("/cycles")}
              className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors">
              All Cycles
            </button>
            <button onClick={() => navigate("/planning/weekly-session")}
              className="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-300 bg-indigo-600/15 border border-indigo-500/25 px-2.5 py-1.5 rounded-lg hover:bg-indigo-600/25 transition-colors">
              <Calendar size={10}/> Plan Week
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-5 space-y-4">

        {/* ── Hero card ── */}
        <div className="bg-gradient-to-br from-indigo-900/30 via-[#13151c] to-[#13151c] border border-indigo-500/15 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/60">Week {cycle.currentWeek} of 12 · {cycle.theme} Phase</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-md italic">"{cycle.intention}"</p>
            </div>
            {/* Momentum gauge */}
            <div className="shrink-0 text-center">
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 40 40" className="w-16 h-16 -rotate-90">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth="3"/>
                  <motion.circle cx="20" cy="20" r="16" fill="none"
                    stroke={cycle.momentumScore >= 75 ? "#818cf8" : cycle.momentumScore >= 55 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="3" strokeLinecap="round"
                    initial={{ strokeDasharray:"0 100.5" }}
                    animate={{ strokeDasharray:`${(cycle.momentumScore / 100) * 100.5} 100.5` }}
                    transition={{ duration:0.9, ease:"easeOut" }}/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-lg font-bold text-white leading-none">{cycle.momentumScore}</p>
                  <p className="text-[8px] text-slate-600 uppercase">Momentum</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cycle progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-slate-500">Cycle Progress</span>
              <span className="text-[10px] font-bold text-indigo-300">{cycle.overallProgress}% complete · {weeksRemaining(cycle)} weeks left</span>
            </div>
            <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
              <motion.div initial={{ width:0 }} animate={{ width:`${cycle.overallProgress}%` }}
                transition={{ duration:0.8, ease:"easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500"/>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[
              { label:"Goals",      value:`${cycle.goals.length}`,                                  color:"text-slate-300" },
              { label:"Milestones", value:`${doneMilestones.length}/${allMilestones.length}`,        color:"text-green-400" },
              { label:"Points",     value:`${cycle.earnedPoints}`,                                   color:"text-yellow-400" },
              { label:"Trust ▲",   value:`+${cycle.trustScoreImpact}`,                             color:"text-indigo-400" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-lg font-bold leading-none ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                tab === t.id ? "bg-white/[0.08] text-slate-200" : "text-slate-500 hover:text-slate-300"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ════════════════════ OVERVIEW ════════════════════ */}
        {tab === "overview" && (
          <div className="space-y-3">
            {/* Agent summary */}
            {cycle.insights.slice(0, 1).map(ins => (
              <div key={ins.id} className={`flex items-start gap-2.5 p-3.5 bg-indigo-600/8 border border-indigo-500/15 rounded-xl`}>
                <span className="text-indigo-400 shrink-0 mt-0.5">{INSIGHT_ICON[ins.icon]}</span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/70 mb-1">{ins.title}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{ins.body}</p>
                </div>
              </div>
            ))}

            {/* Risks */}
            {cycle.risks.map(r => (
              <div key={r.id} className="flex items-start gap-2.5 p-3.5 bg-red-500/8 border border-red-500/20 rounded-xl">
                <AlertTriangle size={12} className={`${RISK_COLOR[r.severity]} shrink-0 mt-0.5`}/>
                <div>
                  <p className={`text-xs font-semibold ${RISK_COLOR[r.severity]} mb-0.5`}>{r.title}</p>
                  <p className="text-[10px] text-slate-500 leading-snug">{r.description}</p>
                  <p className="text-[10px] text-indigo-300 mt-1">{r.recommendation}</p>
                </div>
              </div>
            ))}

            {/* Progress chart */}
            <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={12} className="text-indigo-400"/>
                <p className="text-xs font-bold text-slate-300">Actual vs Target Trajectory</p>
              </div>
              <ProgressChart cycle={cycle}/>
            </div>

            {/* Goal cards */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Goals in this Cycle</p>
            {cycle.goals.map(g => <GoalCard key={g.id} goal={g}/>)}
          </div>
        )}

        {/* ════════════════════ MILESTONES ════════════════════ */}
        {tab === "milestones" && (
          <div className="space-y-2.5">
            {atRisk.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                <AlertTriangle size={11} className="text-orange-400 shrink-0"/>
                <p className="text-xs text-orange-300">{atRisk.length} milestone{atRisk.length>1?"s":""} need attention this week.</p>
              </div>
            )}
            {["in_progress","at_risk","upcoming","completed","missed"].map(status => {
              const group = allMilestones.filter(m => m.status === status);
              if (group.length === 0) return null;
              const sc = MILESTONE_STATUS[status];
              return (
                <div key={status}>
                  <p className={`text-[9px] font-bold uppercase tracking-widest mb-2 ${sc.color}`}>{sc.label} · {group.length}</p>
                  <div className="space-y-2">
                    {group.map(m => {
                      const goal = cycle.goals.find(g => g.id === m.goalId);
                      return (
                        <motion.div key={m.id} initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}
                          className={`flex items-center gap-3 p-3.5 rounded-2xl border ${sc.bg} ${sc.border}`}>
                          <div className={`w-1.5 h-10 rounded-full shrink-0 ${goal?.color ?? "bg-slate-600"}`}/>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-200">{m.title}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{goal?.title}</p>
                            {m.description && <p className="text-[10px] text-slate-600 mt-0.5 italic">{m.description}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[9px] text-slate-600">Week {m.dueWeek}</span>
                            {m.proofRequired && (
                              <div className="flex items-center gap-1">
                                <Shield size={9} className={m.proofSubmitted ? "text-green-400" : "text-slate-600"}/>
                                <span className={`text-[9px] ${m.proofSubmitted ? "text-green-400" : "text-slate-600"}`}>
                                  {m.proofSubmitted ? "Verified" : "Proof req."}
                                </span>
                              </div>
                            )}
                            <span className="text-[9px] font-bold text-yellow-500">{m.points}pts</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ════════════════════ WEEKLY PLAN ════════════════════ */}
        {tab === "weekly" && (
          <div className="space-y-3">
            {/* Week selector row */}
            <div className="flex gap-1 flex-wrap">
              {cycle.weeklyPlans.slice(0, cycle.currentWeek).map(wp => (
                <div key={wp.weekNumber}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold border cursor-default ${
                    wp.weekNumber === cycle.currentWeek
                      ? "bg-indigo-600/25 border-indigo-500/40 text-indigo-300"
                      : "bg-white/[0.04] border-white/[0.07] text-slate-500"
                  }`}>
                  W{wp.weekNumber}
                </div>
              ))}
            </div>

            {/* Current week */}
            <div className="bg-[#13151c] border border-indigo-500/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar size={12} className="text-indigo-400"/>
                <p className="text-xs font-bold text-white">Week {cycle.currentWeek} — Current</p>
                <span className="ml-auto text-[9px] text-slate-600">
                  {formatCycleDate(currentPlan.startDate)} → {formatCycleDate(currentPlan.endDate)}
                </span>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Priorities</p>
                <div className="space-y-1.5">
                  {currentPlan.priorities.map((p, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-lg bg-indigo-600/20 border border-indigo-500/25 flex items-center justify-center shrink-0">
                        <span className="text-[8px] font-bold text-indigo-400">{i + 1}</span>
                      </div>
                      <p className="text-xs text-slate-300">{p}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Weekly Targets</p>
                <div className="space-y-1.5">
                  {currentPlan.targets.map(t => (
                    <div key={t.goalId} className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${
                      t.completed ? "bg-green-500/8 border-green-500/20" : "bg-white/[0.03] border-white/[0.06]"
                    }`}>
                      <CheckCircle2 size={11} className={t.completed ? "text-green-400 shrink-0 mt-0.5" : "text-slate-700 shrink-0 mt-0.5"}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-slate-400 truncate">{t.goalTitle}</p>
                        <p className="text-xs text-slate-300">{t.target}</p>
                      </div>
                      {t.proofRequired && <Shield size={9} className="text-slate-600 shrink-0 mt-0.5"/>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2 p-2.5 bg-indigo-600/8 border border-indigo-500/15 rounded-xl">
                <Sparkles size={10} className="text-indigo-400 shrink-0 mt-0.5"/>
                <p className="text-[10px] text-slate-400 leading-snug">{currentPlan.agentNotes}</p>
              </div>
            </div>

            {/* Past weeks */}
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-700">Past Weeks</p>
            {cycle.weeklyPlans.filter(w => w.locked).reverse().map(wp => (
              <div key={wp.weekNumber} className="bg-[#13151c] border border-white/[0.05] rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">W{wp.weekNumber}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400">{wp.keyFocus}</p>
                  <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden mt-1.5">
                    <div className="h-full rounded-full bg-green-600" style={{ width:`${wp.completionRate}%` }}/>
                  </div>
                </div>
                <span className="text-xs font-bold text-green-400 shrink-0">{wp.completionRate}%</span>
              </div>
            ))}

            <button onClick={() => navigate("/planning/weekly-session")}
              className="w-full py-3 rounded-2xl border border-dashed border-indigo-500/25 text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-600/5 transition-colors text-xs font-semibold flex items-center justify-center gap-2">
              <Plus size={13}/> Plan Next Week
            </button>
          </div>
        )}

        {/* ════════════════════ INSIGHTS ════════════════════ */}
        {tab === "insights" && (
          <div className="space-y-3">
            {cycle.insights.map((ins, i) => (
              <motion.div key={ins.id} initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
                <div className="flex items-start gap-2.5">
                  <span className={`${ins.color} shrink-0 mt-0.5`}>{INSIGHT_ICON[ins.icon]}</span>
                  <div>
                    <p className={`text-xs font-bold ${ins.color} mb-1`}>{ins.title}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{ins.body}</p>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Agent suggestions */}
            <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={12} className="text-indigo-400"/>
                <p className="text-xs font-bold text-slate-300">Agent Recommendations</p>
              </div>
              <div className="space-y-2">
                {CycleAgent.suggestAdjustments(cycle).map((s, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <ChevronRight size={11} className="text-indigo-500 shrink-0 mt-0.5"/>
                    <p className="text-xs text-slate-400 leading-snug">{s}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Vision alignment */}
            <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Compass size={12} className="text-indigo-400"/>
                <p className="text-xs font-bold text-slate-300">Vision Alignment</p>
                <span className="ml-auto text-xs font-bold text-indigo-400">{cycle.visionAlignment}%</span>
              </div>
              <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden mb-3">
                <motion.div initial={{ width:0 }} animate={{ width:`${cycle.visionAlignment}%` }}
                  transition={{ duration:0.8 }} className="h-full rounded-full bg-indigo-500"/>
              </div>
              <div className="space-y-2">
                {cycle.goals.map(g => (
                  <div key={g.id} className="flex items-center gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${g.color}`}/>
                    <p className="text-[10px] text-slate-500 flex-1 truncate">{g.title}</p>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {g.linkedVision.map(v => (
                        <span key={v} className="text-[8px] text-indigo-400/60 bg-indigo-600/10 border border-indigo-500/10 px-1.5 py-0.5 rounded-full">{v}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mid / End review shortcuts */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => navigate("/cycles")}
                className="flex flex-col items-center gap-2 p-4 bg-[#13151c] border border-white/[0.06] rounded-2xl hover:border-indigo-500/25 transition-colors">
                <Activity size={16} className="text-amber-400"/>
                <p className="text-xs font-bold text-slate-300">Mid-Cycle Review</p>
                <p className="text-[9px] text-slate-600">Week 6 checkpoint</p>
              </button>
              <button onClick={() => navigate("/cycles")}
                className="flex flex-col items-center gap-2 p-4 bg-[#13151c] border border-white/[0.06] rounded-2xl hover:border-indigo-500/25 transition-colors">
                <Star size={16} className="text-green-400"/>
                <p className="text-xs font-bold text-slate-300">End-Cycle Review</p>
                <p className="text-[9px] text-slate-600">Week 12 wrap-up</p>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
