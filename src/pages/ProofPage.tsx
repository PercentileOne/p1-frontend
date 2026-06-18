import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Shield, Sparkles, CheckCircle2, Clock, AlertTriangle,
  Camera, Video, Mic, FileText, MessageSquare, Flame, Star,
  TrendingUp, TrendingDown, ChevronDown, X, Eye,
} from "lucide-react";
import { ProofEngine, seedDemoProofs } from "../lib/proofEngine";
import type { ProofSubmission, ProofStatus, ProofType } from "../lib/proofEngine";

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */
const MOCK_USER = { id:"u1", name:"Francis Cobbinah", trustScore:78, behaviourScore:82, proofCount:23, mismatchCount:0 };

const TYPE_ICON: Record<ProofType, React.ReactNode> = {
  photo:<Camera size={12}/>, video:<Video size={12}/>, voice:<Mic size={12}/>,
  screenshot:<FileText size={12}/>, document:<FileText size={12}/>,
  location:<Shield size={12}/>, timestamp:<Clock size={12}/>,
  behavioural:<Sparkles size={12}/>, reflection:<MessageSquare size={12}/>, social:<Star size={12}/>,
};

const STATUS_CFG: Record<ProofStatus, { label:string; color:string; bg:string; border:string }> = {
  pending:  { label:"Pending Review", color:"text-amber-300",  bg:"bg-amber-500/10",  border:"border-amber-500/25" },
  approved: { label:"Approved",       color:"text-green-300",  bg:"bg-green-500/10",  border:"border-green-500/25" },
  rejected: { label:"Rejected",       color:"text-red-300",    bg:"bg-red-500/10",    border:"border-red-500/25"   },
  flagged:  { label:"Flagged",        color:"text-orange-300", bg:"bg-orange-500/10", border:"border-orange-500/25"},
};

function timeAgo(d: Date): string {
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.round(diff/60)}m ago`;
  if (diff < 86400) return `${Math.round(diff/3600)}h ago`;
  return `${Math.round(diff/86400)}d ago`;
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */
export default function ProofPage() {
  const navigate = useNavigate();
  const [proofs, setProofs] = useState<ProofSubmission[]>([]);
  const [filter, setFilter] = useState<ProofStatus | "all">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    seedDemoProofs();
    setProofs(ProofEngine.getProofs().filter(p => p.userId === MOCK_USER.id));
  }, []);

  const filtered = filter === "all" ? proofs : proofs.filter(p => p.status === filter);
  const pendingCount = proofs.filter(p => p.status === "pending").length;

  const toggleExpand = (id: string) =>
    setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const trust    = MOCK_USER.trustScore;
  const behaviour = MOCK_USER.behaviourScore;

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
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-indigo-400"/>
            <h1 className="text-sm font-bold text-white">My Proof History</h1>
          </div>
          {pendingCount > 0 && (
            <span className="ml-1 text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-full">
              {pendingCount} pending
            </span>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-5 space-y-4">

        {/* ── Integrity score cards ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Trust Score */}
          <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Trust Score</p>
              {trust >= 70
                ? <TrendingUp size={12} className="text-green-400"/>
                : <TrendingDown size={12} className="text-red-400"/>
              }
            </div>
            <div className="flex items-end gap-2 mb-3">
              <p className={`text-4xl font-bold leading-none ${trust >= 75 ? "text-green-400" : trust >= 55 ? "text-amber-400" : "text-red-400"}`}>{trust}</p>
              <p className="text-xs text-slate-600 mb-0.5">/100</p>
            </div>
            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden mb-2">
              <motion.div initial={{ width:0 }} animate={{ width:`${trust}%` }}
                transition={{ duration:0.8, ease:"easeOut" }}
                className={`h-full rounded-full ${trust >= 75 ? "bg-green-500" : trust >= 55 ? "bg-amber-500" : "bg-red-500"}`}/>
            </div>
            <p className="text-[10px] text-slate-600">
              {trust >= 80 ? "High trust — fewer proof requests" :
               trust >= 60 ? "Moderate trust — standard checks" :
               "Low trust — frequent proof required"}
            </p>
          </div>

          {/* Behaviour Score */}
          <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Behaviour Score</p>
              <Sparkles size={12} className="text-indigo-400"/>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <p className={`text-4xl font-bold leading-none ${behaviour >= 75 ? "text-indigo-400" : behaviour >= 55 ? "text-amber-400" : "text-red-400"}`}>{behaviour}</p>
              <p className="text-xs text-slate-600 mb-0.5">/100</p>
            </div>
            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden mb-2">
              <motion.div initial={{ width:0 }} animate={{ width:`${behaviour}%` }}
                transition={{ duration:0.8, ease:"easeOut", delay:0.1 }}
                className="h-full rounded-full bg-indigo-500"/>
            </div>
            <p className="text-[10px] text-slate-600">Consistency · Velocity · Honesty patterns</p>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label:"Total Proofs",  value:proofs.length,                              color:"text-slate-300" },
            { label:"Approved",      value:proofs.filter(p=>p.status==="approved").length, color:"text-green-400" },
            { label:"Pending",       value:proofs.filter(p=>p.status==="pending").length,  color:"text-amber-400" },
            { label:"Flagged",       value:proofs.filter(p=>p.status==="flagged"||p.status==="rejected").length, color:"text-red-400" },
          ].map(s => (
            <div key={s.label} className="bg-[#13151c] border border-white/[0.06] rounded-xl p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Agent insight ── */}
        <div className="flex items-start gap-2.5 p-3.5 bg-indigo-600/8 border border-indigo-500/15 rounded-xl">
          <Sparkles size={12} className="text-indigo-400 shrink-0 mt-0.5"/>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/70 mb-1">Agent Integrity Summary</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Trust score is <strong className="text-slate-300">strong</strong>. Behaviour patterns are consistent.
              Your last proof was submitted 2 days ago. No mismatches detected in the last 14 days.
              <span className="text-indigo-300"> Estimated proof frequency: every 8–15 completions.</span>
            </p>
          </div>
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-fit">
          {(["all","pending","approved","flagged","rejected"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                filter === f
                  ? "bg-white/[0.08] text-slate-200"
                  : "text-slate-500 hover:text-slate-300"
              }`}>
              {f}
            </button>
          ))}
        </div>

        {/* ── Proof list ── */}
        <div className="space-y-2.5">
          <AnimatePresence>
            {filtered.map((proof, idx) => {
              const sc = STATUS_CFG[proof.status];
              const isOpen = expanded.has(proof.id);
              return (
                <motion.div key={proof.id}
                  initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="bg-[#13151c] border border-white/[0.06] rounded-2xl overflow-hidden">

                  {/* Card header */}
                  <button onClick={() => toggleExpand(proof.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left group">
                    {/* Type icon */}
                    <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.07] flex items-center justify-center shrink-0 text-slate-500">
                      {TYPE_ICON[proof.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">{proof.taskName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-slate-600 capitalize">{proof.type}</span>
                        <span className="text-[9px] text-slate-700">·</span>
                        <span className="text-[9px] text-slate-600">{timeAgo(proof.timestamp)}</span>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0 ${sc.color} ${sc.bg} ${sc.border}`}>
                      {sc.label}
                    </span>
                    <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.18 }} style={{ display:"block" }}>
                      <ChevronDown size={13} className="text-slate-600 shrink-0"/>
                    </motion.span>
                  </button>

                  {/* Expanded content */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }}
                        exit={{ height:0, opacity:0 }} transition={{ duration:0.18 }} style={{ overflow:"hidden" }}>
                        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.05] pt-3">
                          {/* Media preview */}
                          {proof.mediaDataUrl && (
                            <div className="rounded-xl overflow-hidden border border-white/[0.08] max-h-48">
                              <img src={proof.mediaDataUrl} alt="Proof" className="w-full h-full object-cover"/>
                            </div>
                          )}
                          {proof.fileName && !proof.mediaDataUrl && (
                            <div className="flex items-center gap-2.5 p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                              <FileText size={13} className="text-slate-500"/>
                              <span className="text-xs text-slate-400">{proof.fileName}</span>
                            </div>
                          )}
                          {/* Reflection */}
                          {proof.reflectionText && (
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">Reflection</p>
                              <p className="text-xs text-slate-400 leading-relaxed italic">"{proof.reflectionText}"</p>
                            </div>
                          )}
                          {/* Agent analysis */}
                          {proof.agentAnalysis && (
                            <div className="flex items-start gap-2 p-2.5 bg-indigo-600/8 border border-indigo-500/15 rounded-xl">
                              <Sparkles size={10} className="text-indigo-400 shrink-0 mt-0.5"/>
                              <p className="text-[10px] text-slate-400 leading-snug">{proof.agentAnalysis}</p>
                            </div>
                          )}
                          {/* Meta */}
                          <div className="grid grid-cols-3 gap-2 text-center">
                            {[
                              { label:"Reason",    value:proof.reason.replace("_"," ") },
                              { label:"Difficulty",value:proof.difficulty              },
                              { label:"Trust at submission", value: `${proof.trustScoreBefore}/100` },
                            ].map(m => (
                              <div key={m.label} className="bg-white/[0.03] border border-white/[0.04] rounded-lg p-2">
                                <p className="text-[9px] text-slate-600 uppercase tracking-wider">{m.label}</p>
                                <p className="text-[11px] font-semibold text-slate-300 mt-0.5 capitalize">{m.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Shield size={28} className="text-slate-700"/>
              <p className="text-sm text-slate-500">No {filter === "all" ? "" : filter} proofs found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
