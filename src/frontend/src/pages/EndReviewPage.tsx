import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Sparkles, CheckCircle2, Star, Shield, Trophy, Target, ChevronRight, Compass, Zap,
  BarChart3, X, Heart,
} from "lucide-react";
import { getCurrentCycle, CycleAgent, formatCycleDate } from "../lib/cycleEngine";

export default function EndReviewPage() {
  const navigate  = useNavigate();
  const cycle     = getCurrentCycle();
  const [launched, setLaunched] = useState(false);
  const [loading, setLoading]   = useState(false);

  const endNotes   = CycleAgent.generateEndReview(cycle);
  const momentum   = CycleAgent.calculateMomentumScore(cycle);
  const allM       = cycle.goals.flatMap(g => g.milestones);
  const doneM      = allM.filter(m => m.status === "completed");
  const doneGoals  = cycle.goals.filter(g => g.progress >= 100);
  const partGoals  = cycle.goals.filter(g => g.progress >= 50 && g.progress < 100);
  const missGoals  = cycle.goals.filter(g => g.progress < 50);

  const startNext = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLaunched(true);
    setLoading(false);
  };

  if (launched) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-6">
        <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
          className="max-w-md w-full text-center space-y-6">
          <motion.div animate={{ scale:[1,1.15,1] }} transition={{ duration:0.6 }}
            className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-600/30 to-violet-600/20 border border-indigo-500/25 flex items-center justify-center mx-auto">
            <Trophy size={40} className="text-yellow-400"/>
          </motion.div>
          <div>
            <p className="text-2xl font-bold text-white mb-2">Cycle {cycle.number} Complete.</p>
            <p className="text-sm text-slate-400">Your legacy is being written one cycle at a time.</p>
          </div>
          <div className="space-y-2 text-left">
            {[
              `Momentum score: ${momentum}/100`,
              `${doneGoals.length} goals fully completed`,
              `${doneM.length}/${allM.length} milestones achieved`,
              `Trust score: +${cycle.trustScoreImpact} this cycle`,
              `Cycle ${cycle.number + 1} — Autumn 2026 is ready`,
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-2.5 p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                <Star size={10} className="text-yellow-400 shrink-0"/>
                <p className="text-xs text-slate-300">{item}</p>
              </motion.div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/cycles")}
              className="flex-1 py-3 bg-indigo-600 rounded-xl text-sm font-bold text-white hover:bg-indigo-500 transition-colors">
              Start Cycle {cycle.number + 1}
            </button>
            <button onClick={() => navigate("/cockpit")}
              className="flex-1 py-3 bg-white/[0.04] border border-white/[0.07] rounded-xl text-sm font-bold text-slate-400 hover:bg-white/[0.07] transition-colors">
              Go to Cockpit
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 font-sans">

      <header className="sticky top-0 z-20 bg-[#13151c]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <button onClick={() => navigate("/cycle")}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-xs font-medium">
            <ArrowLeft size={14}/> Cycle
          </button>
          <div className="w-px h-4 bg-white/10"/>
          <Trophy size={13} className="text-yellow-400"/>
          <h1 className="text-sm font-bold text-white">End-Cycle Review — Week 12</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-5 space-y-4">

        {/* ── Hero ── */}
        <div className="bg-gradient-to-br from-yellow-900/20 via-[#13151c] to-[#13151c] border border-yellow-500/15 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={12} className="text-yellow-400"/>
            <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400/70">Cycle {cycle.number} Complete · {cycle.name}</p>
          </div>
          <p className="text-xl font-bold text-white mb-1">12 weeks. What did you become?</p>
          <p className="text-sm text-slate-400 leading-relaxed">{formatCycleDate(cycle.startDate)} → {formatCycleDate(cycle.endDate)}</p>

          <div className="grid grid-cols-4 gap-3 mt-4">
            {[
              { label:"Momentum",  value:`${momentum}/100`,                           color: momentum >= 70 ? "text-green-400" : "text-amber-400" },
              { label:"Points",    value:cycle.earnedPoints.toLocaleString(),           color:"text-yellow-400" },
              { label:"Milestones",value:`${doneM.length}/${allM.length}`,             color:"text-slate-300"  },
              { label:"Trust ▲",  value:`+${cycle.trustScoreImpact}`,                 color:"text-indigo-400" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-xl font-bold leading-none ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Achievements ── */}
        {doneGoals.length > 0 && (
          <div className="bg-[#13151c] border border-green-500/15 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={12} className="text-green-400"/>
              <p className="text-xs font-bold text-green-300">Goals Completed</p>
            </div>
            <div className="space-y-2">
              {doneGoals.map(g => (
                <div key={g.id} className="flex items-center gap-2.5 p-2.5 bg-green-500/8 border border-green-500/15 rounded-xl">
                  <div className={`w-2 h-2 rounded-full ${g.color}`}/>
                  <p className="text-xs text-slate-300 flex-1">{g.title}</p>
                  <Star size={10} className="text-yellow-400"/>
                  <span className="text-[10px] font-bold text-yellow-400">{g.points}pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Partial progress ── */}
        {partGoals.length > 0 && (
          <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target size={12} className="text-amber-400"/>
              <p className="text-xs font-bold text-slate-300">In Progress (carrying forward)</p>
            </div>
            <div className="space-y-2">
              {partGoals.map(g => (
                <div key={g.id} className="flex items-center gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${g.color}`}/>
                  <p className="text-xs text-slate-400 flex-1 truncate">{g.title}</p>
                  <span className="text-xs font-bold text-amber-400">{g.progress}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Missed goals ── */}
        {missGoals.length > 0 && (
          <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <X size={12} className="text-red-400"/>
              <p className="text-xs font-bold text-slate-300">Not Achieved</p>
            </div>
            <div className="space-y-2">
              {missGoals.map(g => (
                <div key={g.id} className="flex items-center gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${g.color}`}/>
                  <p className="text-xs text-slate-500 flex-1 truncate">{g.title}</p>
                  <span className="text-xs font-bold text-slate-600">{g.progress}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Agent end-review ── */}
        <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={12} className="text-indigo-400"/>
            <p className="text-xs font-bold text-white">Agent End-Cycle Summary</p>
          </div>
          <div className="space-y-2">
            {endNotes.map((note, i) => (
              <motion.div key={i} initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-2.5">
                <ChevronRight size={11} className="text-indigo-500 shrink-0 mt-0.5"/>
                <p className="text-xs text-slate-400 leading-relaxed">{note}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Identity shifts ── */}
        <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Heart size={12} className="text-pink-400"/>
            <p className="text-xs font-bold text-white">Identity Shifts</p>
          </div>
          <div className="space-y-2">
            {[
              "I am someone who ships under pressure — P1 Beta is real.",
              "I am certified at the AWS level I targeted.",
              "I am an athlete who exercises even when I don't feel like it.",
              "I am a reader who finishes what I start.",
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Star size={9} className="text-yellow-400 shrink-0 mt-0.5"/>
                <p className="text-xs text-slate-300 italic">"{s}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Proof summary ── */}
        <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={12} className="text-indigo-400"/>
            <p className="text-xs font-bold text-white">Proof Verification Summary</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label:"Total Proofs",  value: cycle.goals.reduce((s,g)=>s+g.proofCount,0),   color:"text-slate-300" },
              { label:"Verified",      value: cycle.goals.reduce((s,g)=>s+g.proofVerified,0), color:"text-green-400" },
              { label:"Trust Change",  value:`+${cycle.trustScoreImpact}`,                     color:"text-indigo-400" },
            ].map(s => (
              <div key={s.label}>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Vision alignment ── */}
        <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Compass size={12} className="text-indigo-400"/>
            <p className="text-xs font-bold text-white">Vision Progress</p>
            <span className="ml-auto text-xs font-bold text-indigo-400">{cycle.visionAlignment}% aligned</span>
          </div>
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden mb-3">
            <motion.div initial={{ width:0 }} animate={{ width:`${cycle.visionAlignment}%` }}
              transition={{ duration:0.8 }} className="h-full rounded-full bg-indigo-500"/>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            This cycle contributed meaningfully to your Career & Purpose, Health & Vitality, and Mission & Legacy vision arcs.
            {cycle.visionAlignment >= 80
              ? " Outstanding alignment. Every goal pushed you toward who you intend to become."
              : " Consider increasing vision-linked goal assignments in Cycle 4."}
          </p>
        </div>

        {/* ── Lessons learned ── */}
        <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={12} className="text-violet-400"/>
            <p className="text-xs font-bold text-white">Lessons Learned</p>
          </div>
          <div className="space-y-2">
            {[
              "Shipping consistently beats planning perfectly. The weeks with most done were weeks with fewest plans.",
              "Nutrition tracking breaks first under pressure. Build a simpler system for high-output weeks.",
              "Proof submission is a lagging indicator — if you wait until end of week, detail drops.",
              "Streak momentum is real. The 30-day fitness streak made daily exercise automatic by Week 5.",
            ].map((l, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                <span className="text-[10px] font-bold text-violet-500 shrink-0 mt-0.5">{i+1}.</span>
                <p className="text-[10px] text-slate-400 leading-snug">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Start next cycle ── */}
        <div className="bg-gradient-to-br from-indigo-900/30 via-[#13151c] to-[#13151c] border border-indigo-500/20 rounded-2xl p-5 text-center">
          <p className="text-lg font-bold text-white mb-1">Ready for Cycle {cycle.number + 1}?</p>
          <p className="text-xs text-slate-400 mb-4">Autumn 2026 · Starts 2026-08-03 · 12 weeks of Mastery</p>
          <button onClick={startNext} disabled={loading}
            className="w-full py-3.5 bg-indigo-600 rounded-xl text-sm font-bold text-white hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading
              ? <motion.span animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:0.7 }}><Sparkles size={15}/></motion.span>
              : <><Zap size={15}/> Start Next Cycle</>
            }
          </button>
        </div>

      </div>
    </div>
  );
}
