import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Sparkles, CheckCircle2, AlertTriangle, Shield,
  TrendingUp, TrendingDown, Flame, Target, BarChart3, Edit3,
  ChevronRight, Star, Activity, Zap,
} from "lucide-react";
import { getCurrentCycle, CycleAgent, formatCycleDate } from "../lib/cycleEngine";

export default function MidReviewPage() {
  const navigate = useNavigate();
  const cycle    = getCurrentCycle();
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentDone, setAgentDone]       = useState(false);
  const [adjustments, setAdjustments]   = useState(CycleAgent.suggestAdjustments(cycle));

  const midNotes     = CycleAgent.generateMidReview(cycle);
  const risks        = CycleAgent.detectCycleRisk(cycle);
  const momentum     = CycleAgent.calculateMomentumScore(cycle);
  const allMilestone = cycle.goals.flatMap(g => g.milestones);
  const doneMilestone = allMilestone.filter(m => m.status === "completed");
  const atRisk        = allMilestone.filter(m => m.status === "at_risk");

  const runAgent = async () => {
    setAgentLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setAgentLoading(false);
    setAgentDone(true);
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 font-sans">

      <header className="sticky top-0 z-20 bg-[#13151c]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <button onClick={() => navigate("/cycle")}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-xs font-medium">
            <ArrowLeft size={14}/> Cycle
          </button>
          <div className="w-px h-4 bg-white/10"/>
          <Activity size={13} className="text-amber-400"/>
          <h1 className="text-sm font-bold text-white">Mid-Cycle Review — Week 6</h1>
          <span className="ml-auto text-[9px] text-slate-600">{formatCycleDate(cycle.startDate)} → Now</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-5 space-y-4">

        {/* ── Hero ── */}
        <div className="bg-gradient-to-br from-amber-900/20 via-[#13151c] to-[#13151c] border border-amber-500/15 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Star size={12} className="text-amber-400"/>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/70">Week 6 Checkpoint · {cycle.name}</p>
          </div>
          <p className="text-xl font-bold text-white mb-1">You're halfway there.</p>
          <p className="text-sm text-slate-400 leading-relaxed">6 weeks complete, 6 weeks to go. This is the moment to assess, adjust, and accelerate.</p>

          <div className="grid grid-cols-4 gap-3 mt-4">
            {[
              { label:"Momentum",       value:`${momentum}/100`,                            color: momentum >= 70 ? "text-green-400" : "text-amber-400" },
              { label:"Overall",        value:`${cycle.overallProgress}%`,                   color:"text-indigo-400" },
              { label:"Milestones",     value:`${doneMilestone.length}/${allMilestone.length}`, color:"text-slate-300" },
              { label:"Trust ▲",       value:`+${cycle.trustScoreImpact}`,                  color:"text-indigo-400" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-xl font-bold leading-none ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Agent notes ── */}
        <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={12} className="text-indigo-400"/>
            <p className="text-xs font-bold text-white">Agent Mid-Cycle Analysis</p>
          </div>
          <div className="space-y-2">
            {midNotes.map((note, i) => (
              <motion.div key={i} initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-2.5">
                <ChevronRight size={11} className="text-indigo-500 shrink-0 mt-0.5"/>
                <p className="text-xs text-slate-400 leading-relaxed">{note}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Goal progress ── */}
        <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={12} className="text-indigo-400"/>
            <p className="text-xs font-bold text-white">Goal Progress at Week 6</p>
            <p className="text-[10px] text-slate-600 ml-auto">Expected: ~50%</p>
          </div>
          <div className="space-y-3">
            {cycle.goals.map(g => {
              const expected = 50;
              const ahead = g.progress >= expected;
              return (
                <div key={g.id}>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs text-slate-300 flex-1 truncate">{g.title}</p>
                    <span className={`text-[10px] font-bold ${ahead ? "text-green-400" : "text-amber-400"}`}>
                      {ahead ? "▲" : "▼"} {g.progress}%
                    </span>
                  </div>
                  <div className="relative h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <motion.div initial={{ width:0 }} animate={{ width:`${g.progress}%` }}
                      transition={{ duration:0.7, ease:"easeOut" }}
                      className={`h-full rounded-full ${g.color}`}/>
                    {/* Expected marker */}
                    <div className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left:"50%" }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Risk analysis ── */}
        <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={12} className="text-amber-400"/>
            <p className="text-xs font-bold text-white">Risk Analysis</p>
            <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full border ${
              risks.length === 0 ? "text-green-300 bg-green-500/10 border-green-500/25" : "text-amber-300 bg-amber-500/10 border-amber-500/25"
            }`}>{risks.length === 0 ? "All Clear" : `${risks.length} Risk${risks.length>1?"s":""}`}</span>
          </div>
          {risks.length === 0 ? (
            <div className="flex items-center gap-2.5 py-2">
              <CheckCircle2 size={13} className="text-green-400"/>
              <p className="text-xs text-slate-400">No significant risks detected. Maintain current pace.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {risks.map(r => (
                <div key={r.id} className="p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl">
                  <p className="text-xs font-semibold text-amber-300 mb-1">{r.title}</p>
                  <p className="text-[10px] text-slate-500 leading-snug mb-1.5">{r.description}</p>
                  <p className="text-[10px] text-indigo-300">{r.recommendation}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Proof summary ── */}
        <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={12} className="text-indigo-400"/>
            <p className="text-xs font-bold text-white">Proof & Integrity Summary</p>
          </div>
          <div className="grid grid-cols-4 gap-3 text-center mb-3">
            {[
              { label:"Proofs Submitted", value: cycle.goals.reduce((s,g)=>s+g.proofCount,0),  color:"text-slate-300" },
              { label:"Verified",         value: cycle.goals.reduce((s,g)=>s+g.proofVerified,0),color:"text-green-400" },
              { label:"Trust Impact",     value:`+${cycle.trustScoreImpact}`,                    color:"text-indigo-400" },
              { label:"Behaviour",        value:`${cycle.behaviourScore}/100`,                   color:"text-violet-400" },
            ].map(s => (
              <div key={s.label}>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[8px] text-slate-700 uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="p-2.5 bg-indigo-600/8 border border-indigo-500/15 rounded-xl">
            <p className="text-[10px] text-slate-400 leading-snug">Proof Engine has verified all milestone completions. Behaviour score consistent with declared progress. Integrity intact.</p>
          </div>
        </div>

        {/* ── Adjustments ── */}
        <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target size={12} className="text-violet-400"/>
            <p className="text-xs font-bold text-white">Agent Adjustment Recommendations</p>
          </div>
          <div className="space-y-2">
            {adjustments.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                <ChevronRight size={11} className="text-violet-500 shrink-0 mt-0.5"/>
                <p className="text-xs text-slate-400 leading-snug">{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => navigate("/cycle/weekly-planning")}
            className="py-3 bg-indigo-600/20 border border-indigo-500/25 rounded-xl text-xs font-bold text-indigo-300 hover:bg-indigo-600/30 transition-colors flex items-center justify-center gap-1.5">
            <Zap size={12}/> Plan Week 7
          </button>
          <button onClick={() => navigate("/cycle")}
            className="py-3 bg-white/[0.04] border border-white/[0.07] rounded-xl text-xs font-bold text-slate-400 hover:bg-white/[0.07] transition-colors flex items-center justify-center gap-1.5">
            <BarChart3 size={12}/> View Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}
