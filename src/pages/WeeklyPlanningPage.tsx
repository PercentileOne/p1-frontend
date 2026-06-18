import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Sparkles, CheckCircle2, ChevronRight, Shield,
  Flame, Target, Calendar, Zap, Star, Edit3, Plus, X, Check,
  AlertTriangle, Battery, Clock,
} from "lucide-react";
import { getCurrentCycle, CycleAgent, formatCycleDate } from "../lib/cycleEngine";

type Step = 1 | 2 | 3 | 4 | 5;

/* ── helpers ── */
const STEP_LABELS = ["Review Last Week", "Set Targets", "Priorities", "Agent Brief", "Confirm"];

function StepDot({ n, current }: { n: Step; current: Step }) {
  const done = n < current;
  return (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-all ${
      done    ? "bg-green-500 border-green-500 text-white" :
      n === current ? "bg-indigo-600 border-indigo-400 text-white" :
      "bg-transparent border-white/[0.12] text-slate-600"
    }`}>
      {done ? <Check size={10}/> : n}
    </div>
  );
}

export default function WeeklyPlanningPage() {
  const navigate = useNavigate();
  const cycle    = getCurrentCycle();
  const lastWeek = cycle.weeklyPlans[cycle.currentWeek - 2]; // previous week
  const thisWeek = cycle.weeklyPlans[cycle.currentWeek - 1]; // current

  const [step, setStep] = useState<Step>(1);
  const [targets, setTargets] = useState(
    cycle.goals.map(g => ({ goalId:g.id, goalTitle:g.title, target:g.weeklyTarget, completed:false, proofRequired:g.difficulty==="hard"||g.difficulty==="epic" }))
  );
  const [editIdx, setEditIdx] = useState<number|null>(null);
  const [editVal, setEditVal] = useState("");
  const [priorities, setPriorities] = useState<string[]>(thisWeek.priorities.slice(0, 4));
  const [newPriority, setNewPriority] = useState("");
  const [energyLevel, setEnergyLevel] = useState(4);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentDone, setAgentDone] = useState(false);
  const [planLaunched, setPlanLaunched] = useState(false);

  const suggestions = CycleAgent.generateWeeklyTargets(cycle, cycle.currentWeek);
  const risks       = CycleAgent.detectCycleRisk(cycle);

  const runAgentBrief = async () => {
    setAgentLoading(true);
    await new Promise(r => setTimeout(r, 1100));
    setAgentLoading(false);
    setAgentDone(true);
  };

  const launch = async () => {
    setAgentLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setPlanLaunched(true);
    setAgentLoading(false);
  };

  const addPriority = () => {
    if (newPriority.trim() && priorities.length < 5) {
      setPriorities(p => [...p, newPriority.trim()]);
      setNewPriority("");
    }
  };

  if (planLaunched) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-6">
        <motion.div initial={{ opacity:0, scale:0.92 }} animate={{ opacity:1, scale:1 }}
          className="max-w-md w-full text-center space-y-6">
          <motion.div
            animate={{ scale:[1,1.1,1], rotate:[0,5,-5,0] }}
            transition={{ duration:0.6, delay:0.1 }}
            className="w-20 h-20 rounded-3xl bg-indigo-600/20 border border-indigo-500/25 flex items-center justify-center mx-auto">
            <Zap size={32} className="text-indigo-400"/>
          </motion.div>
          <div>
            <p className="text-2xl font-bold text-white mb-2">Week {cycle.currentWeek} Launched</p>
            <p className="text-sm text-slate-400">Your weekly plan is set. Targets are live on Today Screen.</p>
          </div>
          <div className="space-y-2 text-left">
            {[
              `${priorities.length} priorities set`,
              `${targets.length} goal targets confirmed`,
              `Agent brief complete — ${risks.length} risk${risks.length !== 1 ? "s" : ""} flagged`,
              "Proof Engine calibrated for this week",
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="flex items-center gap-2.5 p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                <Check size={11} className="text-green-400 shrink-0"/>
                <p className="text-xs text-slate-300">{item}</p>
              </motion.div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/today")}
              className="flex-1 py-3 bg-indigo-600/20 border border-indigo-500/25 rounded-xl text-sm font-bold text-indigo-300 hover:bg-indigo-600/30 transition-colors">
              Go to Today
            </button>
            <button onClick={() => navigate("/cycle")}
              className="flex-1 py-3 bg-white/[0.04] border border-white/[0.07] rounded-xl text-sm font-bold text-slate-400 hover:bg-white/[0.07] transition-colors">
              View Cycle
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 font-sans">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-[#13151c]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center gap-3">
          <button onClick={() => navigate("/cycle")}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-xs font-medium">
            <ArrowLeft size={14}/> Cycle
          </button>
          <div className="w-px h-4 bg-white/10"/>
          <p className="text-sm font-bold text-white">Weekly Planning</p>
          <div className="ml-auto flex items-center gap-2">
            {([1,2,3,4,5] as Step[]).map(n => (
              <React.Fragment key={n}>
                <StepDot n={n} current={step}/>
                {n < 5 && <div className={`h-px w-4 ${n < step ? "bg-green-500/50" : "bg-white/[0.08]"}`}/>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">

        {/* Step label */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/60">Step {step} of 5</span>
          <span className="text-[10px] text-slate-600">·</span>
          <span className="text-[10px] text-slate-500">{STEP_LABELS[step - 1]}</span>
        </div>

        {/* ════════ STEP 1 — REVIEW LAST WEEK ════════ */}
        {step === 1 && (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} className="space-y-3">
            <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={12} className="text-slate-400"/>
                <p className="text-xs font-bold text-white">Week {cycle.currentWeek - 1} Summary</p>
                <span className="ml-auto text-xs font-bold text-green-400">{lastWeek?.completionRate ?? 90}% complete</span>
              </div>
              <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden mb-4">
                <div className="h-full rounded-full bg-green-500" style={{ width:`${lastWeek?.completionRate ?? 90}%` }}/>
              </div>
              {/* Completed tasks */}
              <div className="space-y-1.5 mb-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-green-400/70 mb-2">Completed</p>
                {[
                  "Scored 74% on AWS mock exam #1",
                  "Shipped Goals Dashboard + Goal Creation Flow",
                  "19-day exercise streak maintained",
                  "Finished 'The Hard Thing About Hard Things'",
                  "Tracked calories 5/7 days",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 size={10} className="text-green-400 shrink-0"/>
                    <p className="text-xs text-slate-400">{item}</p>
                  </div>
                ))}
              </div>
              {/* Missed */}
              <div className="space-y-1.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-red-400/70 mb-2">Missed</p>
                {[
                  "Body fat measurement not taken",
                  "Book chapter target missed by 2 chapters",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <X size={10} className="text-red-400 shrink-0"/>
                    <p className="text-xs text-slate-400">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Proof summary */}
            <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={12} className="text-indigo-400"/>
                <p className="text-xs font-bold text-white">Proof Summary</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label:"Submitted", value:"3", color:"text-slate-300" },
                  { label:"Approved",  value:"3", color:"text-green-400" },
                  { label:"Pending",   value:"0", color:"text-amber-400" },
                ].map(s => (
                  <div key={s.label}>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] text-slate-600 uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent reflection */}
            <div className="flex items-start gap-2.5 p-3.5 bg-indigo-600/8 border border-indigo-500/15 rounded-xl">
              <Sparkles size={12} className="text-indigo-400 shrink-0 mt-0.5"/>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/70 mb-1">Agent Reflection</p>
                <p className="text-xs text-slate-400 leading-relaxed">Strong week overall. AWS mock score needs 6% improvement — focus on VPC and IAM this week. Fitness streak is your best-performing habit. Nutrition tracking slipped mid-week — consider a simpler system.</p>
              </div>
            </div>

            <button onClick={() => setStep(2)}
              className="w-full py-3 bg-indigo-600/20 border border-indigo-500/25 rounded-xl text-sm font-bold text-indigo-300 hover:bg-indigo-600/30 transition-colors flex items-center justify-center gap-2">
              Set This Week's Targets <ChevronRight size={14}/>
            </button>
          </motion.div>
        )}

        {/* ════════ STEP 2 — SET TARGETS ════════ */}
        {step === 2 && (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-indigo-600/8 border border-indigo-500/15 rounded-xl">
              <Sparkles size={11} className="text-indigo-400 shrink-0 mt-0.5"/>
              <p className="text-[10px] text-slate-400 leading-snug">Agent has pre-filled targets based on your cycle goals. Edit any target to customise.</p>
            </div>

            <div className="space-y-2.5">
              {targets.map((t, i) => {
                const goal = cycle.goals.find(g => g.id === t.goalId);
                return (
                  <div key={t.goalId} className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${goal?.color ?? "bg-slate-600"}`}/>
                      <p className="text-xs font-semibold text-slate-300 flex-1 truncate">{t.goalTitle}</p>
                      <span className="text-[9px] text-slate-600 capitalize">{goal?.difficulty}</span>
                      {t.proofRequired && <Shield size={9} className="text-slate-600"/>}
                    </div>
                    {editIdx === i ? (
                      <div className="flex gap-2">
                        <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") { setTargets(p => p.map((x, idx) => idx===i ? {...x, target:editVal} : x)); setEditIdx(null); }
                            if (e.key === "Escape") setEditIdx(null);
                          }}
                          className="flex-1 bg-[#0f1117] border border-indigo-500/30 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"/>
                        <button onClick={() => { setTargets(p => p.map((x, idx) => idx===i ? {...x, target:editVal} : x)); setEditIdx(null); }}
                          className="px-3 py-2 bg-indigo-600/20 border border-indigo-500/25 rounded-xl text-indigo-300 hover:bg-indigo-600/30 transition-colors">
                          <Check size={12}/>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 group">
                        <p className="flex-1 text-xs text-slate-400 leading-relaxed">{t.target}</p>
                        <button onClick={() => { setEditIdx(i); setEditVal(t.target); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-slate-300 shrink-0">
                          <Edit3 size={11}/>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)}
                className="px-4 py-3 bg-white/[0.04] border border-white/[0.07] rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors">
                Back
              </button>
              <button onClick={() => setStep(3)}
                className="flex-1 py-3 bg-indigo-600/20 border border-indigo-500/25 rounded-xl text-sm font-bold text-indigo-300 hover:bg-indigo-600/30 transition-colors flex items-center justify-center gap-2">
                Set Priorities <ChevronRight size={14}/>
              </button>
            </div>
          </motion.div>
        )}

        {/* ════════ STEP 3 — PRIORITIES ════════ */}
        {step === 3 && (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} className="space-y-3">
            <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">This Week's Priorities (max 5)</p>
              <AnimatePresence>
                {priorities.map((p, i) => (
                  <motion.div key={p} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:8 }}
                    className="flex items-center gap-2.5 mb-2">
                    <div className="w-5 h-5 rounded-lg bg-indigo-600/20 border border-indigo-500/25 flex items-center justify-center shrink-0">
                      <span className="text-[8px] font-bold text-indigo-400">{i + 1}</span>
                    </div>
                    <p className="flex-1 text-xs text-slate-300">{p}</p>
                    <button onClick={() => setPriorities(ps => ps.filter((_, idx) => idx !== i))}
                      className="text-slate-700 hover:text-red-400 transition-colors">
                      <X size={11}/>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {priorities.length < 5 && (
                <div className="flex gap-2 mt-2">
                  <input value={newPriority} onChange={e => setNewPriority(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addPriority(); }}
                    placeholder="Add a priority…"
                    className="flex-1 bg-[#0f1117] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500/40"/>
                  <button onClick={addPriority}
                    className="px-3 py-2 bg-indigo-600/15 border border-indigo-500/25 rounded-xl text-indigo-300 hover:bg-indigo-600/25 transition-colors">
                    <Plus size={12}/>
                  </button>
                </div>
              )}
            </div>

            {/* Energy level */}
            <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Battery size={12} className="text-teal-400"/>
                <p className="text-xs font-bold text-white">Planned Energy Level</p>
                <span className="ml-auto text-xs font-bold text-teal-400">{energyLevel}/5</span>
              </div>
              <input type="range" min={1} max={5} value={energyLevel}
                onChange={e => setEnergyLevel(Number(e.target.value))}
                className="w-full accent-indigo-500"/>
              <div className="flex justify-between mt-1">
                {["Low","Med-Low","Moderate","High","Max"].map(l => (
                  <span key={l} className="text-[8px] text-slate-700">{l}</span>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(2)}
                className="px-4 py-3 bg-white/[0.04] border border-white/[0.07] rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors">
                Back
              </button>
              <button onClick={() => { setStep(4); runAgentBrief(); }}
                className="flex-1 py-3 bg-indigo-600/20 border border-indigo-500/25 rounded-xl text-sm font-bold text-indigo-300 hover:bg-indigo-600/30 transition-colors flex items-center justify-center gap-2">
                Get Agent Brief <Sparkles size={13}/>
              </button>
            </div>
          </motion.div>
        )}

        {/* ════════ STEP 4 — AGENT BRIEF ════════ */}
        {step === 4 && (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} className="space-y-3">
            {agentLoading && (
              <div className="flex flex-col items-center gap-3 py-10">
                <motion.div animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:1, ease:"linear" }}>
                  <Sparkles size={24} className="text-indigo-400"/>
                </motion.div>
                <p className="text-sm text-slate-400">Agent is analysing your cycle data…</p>
              </div>
            )}
            {!agentLoading && agentDone && (
              <>
                {/* Risk detections */}
                {risks.length > 0 && (
                  <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={12} className="text-amber-400"/>
                      <p className="text-xs font-bold text-white">Risks Detected</p>
                    </div>
                    <div className="space-y-2">
                      {risks.map(r => (
                        <div key={r.id} className="p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl">
                          <p className="text-xs font-semibold text-amber-300 mb-0.5">{r.title}</p>
                          <p className="text-[10px] text-slate-500 leading-snug">{r.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={12} className="text-indigo-400"/>
                    <p className="text-xs font-bold text-white">Agent Recommendations</p>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { title:"Energy Planning", body:`Energy set to ${energyLevel}/5. Agent recommends scheduling AWS study in your peak focus window (08:00–10:00).`, icon:<Battery size={11}/>, color:"text-teal-400" },
                      { title:"Habit Reinforcement", body:"Exercise streak at 19 days — the 21-day milestone is 2 days away. Protect it above all else this week.", icon:<Flame size={11}/>, color:"text-orange-400" },
                      { title:"Proof Scheduling", body:"2 proof submissions due this week. Batch them on Wednesday to stay ahead.", icon:<Shield size={11}/>, color:"text-indigo-400" },
                      ...CycleAgent.suggestAdjustments(getCurrentCycle()).map((s, i) => ({
                        title:"Cycle Adjustment", body:s, icon:<Target size={11}/>, color:"text-violet-400",
                      })),
                    ].map((s, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className={`${s.color} shrink-0 mt-0.5`}>{s.icon}</span>
                        <div>
                          <p className={`text-[10px] font-bold ${s.color} mb-0.5`}>{s.title}</p>
                          <p className="text-[10px] text-slate-400 leading-snug">{s.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Time allocation */}
                <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={12} className="text-slate-400"/>
                    <p className="text-xs font-bold text-white">Suggested Time Allocation</p>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label:"P1 Development",   hours:12, color:"bg-indigo-500" },
                      { label:"AWS Study",         hours:6,  color:"bg-blue-500"   },
                      { label:"Exercise",          hours:4,  color:"bg-green-500"  },
                      { label:"Reading",           hours:2,  color:"bg-violet-500" },
                      { label:"Nutrition Tracking",hours:1,  color:"bg-teal-500"   },
                    ].map(t => (
                      <div key={t.label} className="flex items-center gap-2.5">
                        <p className="text-[10px] text-slate-500 w-36 shrink-0">{t.label}</p>
                        <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${t.color}`} style={{ width:`${(t.hours/12)*100}%` }}/>
                        </div>
                        <p className="text-[9px] text-slate-600 w-8 text-right shrink-0">{t.hours}h</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setStep(3)}
                    className="px-4 py-3 bg-white/[0.04] border border-white/[0.07] rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors">
                    Back
                  </button>
                  <button onClick={() => setStep(5)}
                    className="flex-1 py-3 bg-indigo-600/20 border border-indigo-500/25 rounded-xl text-sm font-bold text-indigo-300 hover:bg-indigo-600/30 transition-colors flex items-center justify-center gap-2">
                    Review & Confirm <ChevronRight size={14}/>
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ════════ STEP 5 — CONFIRM ════════ */}
        {step === 5 && (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} className="space-y-3">
            <div className="bg-gradient-to-br from-indigo-900/20 to-[#13151c] border border-indigo-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={13} className="text-indigo-400"/>
                <p className="text-sm font-bold text-white">Week {cycle.currentWeek} Plan Summary</p>
              </div>

              {/* Priorities */}
              <div className="mb-4">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Priorities</p>
                {priorities.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1.5">
                    <div className="w-4 h-4 rounded-lg bg-indigo-600/20 border border-indigo-500/25 flex items-center justify-center shrink-0">
                      <span className="text-[7px] font-bold text-indigo-400">{i+1}</span>
                    </div>
                    <p className="text-xs text-slate-300">{p}</p>
                  </div>
                ))}
              </div>

              {/* Targets */}
              <div className="mb-4">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Goal Targets</p>
                {targets.map(t => (
                  <div key={t.goalId} className="flex items-start gap-2 mb-1.5">
                    <ChevronRight size={10} className="text-slate-600 shrink-0 mt-0.5"/>
                    <p className="text-[10px] text-slate-400 leading-snug"><strong className="text-slate-300">{t.goalTitle.split(" ").slice(0,3).join(" ")}:</strong> {t.target}</p>
                  </div>
                ))}
              </div>

              {/* Energy */}
              <div className="flex items-center gap-2 p-2.5 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                <Battery size={11} className="text-teal-400 shrink-0"/>
                <p className="text-[10px] text-slate-400">Energy: <strong className="text-slate-300">{energyLevel}/5</strong></p>
                <p className="text-[10px] text-slate-600 ml-auto">{risks.length} risk{risks.length !== 1 ? "s" : ""} flagged</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(4)}
                className="px-4 py-3 bg-white/[0.04] border border-white/[0.07] rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors">
                Back
              </button>
              <button onClick={launch} disabled={agentLoading}
                className="flex-1 py-3 bg-indigo-600 rounded-xl text-sm font-bold text-white hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {agentLoading
                  ? <motion.span animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:0.7 }}><Sparkles size={14}/></motion.span>
                  : <><Zap size={14}/> Start Week {cycle.currentWeek}</>
                }
              </button>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
