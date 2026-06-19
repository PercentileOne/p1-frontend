import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Zap, CheckCircle2, Flame, BarChart3,
  ChevronRight, Plus, Star,
} from "lucide-react";
import { getCycles, formatCycleDate } from "../lib/cycleEngine";
import type { Cycle } from "../lib/cycleEngine";

function CycleCard({ cycle, index }: { cycle: Cycle; index: number }) {
  const navigate = useNavigate();
  const done     = cycle.goals.filter(g => g.progress >= 100).length;
  const total    = cycle.goals.length;
  const isActive = cycle.status === "active";

  return (
    <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
      transition={{ delay: index * 0.06 }}
      className={`bg-[#13151c] border rounded-2xl overflow-hidden ${
        isActive ? "border-indigo-500/25" : "border-white/[0.06]"
      }`}>

      <div className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
            isActive ? "bg-indigo-600/20 border border-indigo-500/25" : "bg-white/[0.04] border border-white/[0.08]"
          }`}>
            {isActive
              ? <Zap size={16} className="text-indigo-400"/>
              : <CheckCircle2 size={16} className="text-green-500"/>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-bold text-white truncate">{cycle.name}</p>
              {isActive && (
                <span className="text-[9px] font-bold text-indigo-300 bg-indigo-600/20 border border-indigo-500/25 px-2 py-0.5 rounded-full shrink-0">Active · W{cycle.currentWeek}/12</span>
              )}
            </div>
            <p className="text-[10px] text-slate-600">
              {formatCycleDate(cycle.startDate)} → {formatCycleDate(cycle.endDate)}
            </p>
            <p className="text-[10px] text-indigo-400/60 mt-0.5">{cycle.theme} Phase</p>
          </div>
        </div>

        {/* Momentum bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-slate-600 uppercase tracking-wider">Momentum Score</span>
            <span className={`text-xs font-bold ${
              cycle.momentumScore >= 75 ? "text-green-400" :
              cycle.momentumScore >= 55 ? "text-amber-400" : "text-red-400"
            }`}>{cycle.momentumScore}/100</span>
          </div>
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <motion.div initial={{ width:0 }} animate={{ width:`${cycle.momentumScore}%` }}
              transition={{ duration:0.7, ease:"easeOut", delay: index * 0.06 }}
              className={`h-full rounded-full ${
                cycle.momentumScore >= 75 ? "bg-green-500" :
                cycle.momentumScore >= 55 ? "bg-amber-500" : "bg-red-500"
              }`}/>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label:"Goals Done",  value: total ? `${done}/${total}` : "—",           color:"text-green-400"  },
            { label:"Points",      value: cycle.earnedPoints.toLocaleString(),          color:"text-yellow-400" },
            { label:"Trust ▲",    value: `${cycle.trustScoreImpact > 0 ? "+" : ""}${cycle.trustScoreImpact}`, color:"text-indigo-400" },
            { label:"Vision Fit",  value: `${cycle.visionAlignment}%`,                 color:"text-violet-400" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[8px] text-slate-700 uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Agent summary */}
        {cycle.intention && (
          <p className="text-[10px] text-slate-600 italic leading-snug mb-4">"{cycle.intention}"</p>
        )}

        <button
          onClick={() => isActive ? navigate("/cycles") : undefined}
          className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            isActive
              ? "bg-indigo-600/20 border border-indigo-500/25 text-indigo-300 hover:bg-indigo-600/30"
              : "bg-white/[0.04] border border-white/[0.07] text-slate-500 cursor-default"
          }`}>
          {isActive ? (
            <><ChevronRight size={12}/> View Current Cycle</>
          ) : (
            <><Star size={12}/> Cycle Complete</>
          )}
        </button>
      </div>
    </motion.div>
  );
}

export default function CycleListPage() {
  const navigate = useNavigate();
  const cycles   = getCycles().slice().reverse(); // newest first

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 font-sans">

      <header className="sticky top-0 z-20 bg-[#13151c]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <button onClick={() => navigate("/cockpit")}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-xs font-medium">
            <ArrowLeft size={14}/> Cockpit
          </button>
          <div className="w-px h-4 bg-white/10"/>
          <BarChart3 size={13} className="text-indigo-400"/>
          <h1 className="text-sm font-bold text-white">All Cycles</h1>
          <button onClick={() => navigate("/cycles")}
            className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold text-indigo-300 bg-indigo-600/15 border border-indigo-500/25 px-2.5 py-1.5 rounded-lg hover:bg-indigo-600/25 transition-colors">
            <Zap size={10}/> Current Cycle
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-5 space-y-4">

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:"Cycles Completed", value: cycles.filter(c=>c.status==="completed").length, color:"text-green-400", icon:<CheckCircle2 size={14}/> },
            { label:"Total Points",     value: cycles.reduce((s,c)=>s+c.earnedPoints,0).toLocaleString(), color:"text-yellow-400", icon:<Star size={14}/> },
            { label:"Avg Momentum",     value: Math.round(cycles.reduce((s,c)=>s+c.momentumScore,0)/cycles.length), color:"text-indigo-400", icon:<Flame size={14}/> },
          ].map(s => (
            <div key={s.label} className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4 flex items-center gap-3">
              <div className={`${s.color} shrink-0`}>{s.icon}</div>
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-slate-600 uppercase tracking-wider">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Cycle list */}
        <div className="space-y-3">
          {cycles.map((c, i) => <CycleCard key={c.id} cycle={c} index={i}/>)}
        </div>

        {/* Start new cycle CTA */}
        <button className="w-full py-4 rounded-2xl border border-dashed border-indigo-500/20 text-indigo-400/60 hover:border-indigo-500/40 hover:text-indigo-300 transition-colors text-xs font-medium flex items-center justify-center gap-2">
          <Plus size={13}/> Plan Next Cycle (starts 2026-08-03)
        </button>
      </div>
    </div>
  );
}
