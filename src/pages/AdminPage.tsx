import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Shield, Sparkles, CheckCircle2, Clock, AlertTriangle,
  Camera, Video, Mic, FileText, MessageSquare, Flame, Star,
  TrendingUp, TrendingDown, X, Check, Flag, Users, Activity,
  HardDrive, Image as ImageIcon, BarChart3, Eye, ChevronDown,
} from "lucide-react";
import { ProofEngine, seedDemoProofs } from "../lib/proofEngine";
import type { ProofSubmission, ProofStatus, ProofUser } from "../lib/proofEngine";

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */
const DEMO_USERS: ProofUser[] = [
  { id:"u1", name:"Francis Cobbinah", trustScore:78, behaviourScore:82, proofCount:5, mismatchCount:0 },
  { id:"u2", name:"Alex Turner",       trustScore:43, behaviourScore:35, proofCount:4, mismatchCount:4 },
  { id:"u3", name:"Sarah Mitchell",    trustScore:92, behaviourScore:88, proofCount:4, mismatchCount:0 },
  { id:"u4", name:"Marcus Webb",       trustScore:62, behaviourScore:65, proofCount:2, mismatchCount:1 },
];

const STATUS_CFG: Record<ProofStatus, { label:string; color:string; bg:string; border:string }> = {
  pending:  { label:"Pending",  color:"text-amber-300",  bg:"bg-amber-500/10",  border:"border-amber-500/25" },
  approved: { label:"Approved", color:"text-green-300",  bg:"bg-green-500/10",  border:"border-green-500/25" },
  rejected: { label:"Rejected", color:"text-red-300",    bg:"bg-red-500/10",    border:"border-red-500/25"   },
  flagged:  { label:"Flagged",  color:"text-orange-300", bg:"bg-orange-500/10", border:"border-orange-500/25"},
};

function timeAgo(d: Date): string {
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.round(diff/60)}m ago`;
  if (diff < 86400) return `${Math.round(diff/3600)}h ago`;
  return `${Math.round(diff/86400)}d ago`;
}

type Tab = "queue" | "users" | "media" | "system";

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */
export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("queue");
  const [proofs, setProofs] = useState<ProofSubmission[]>([]);
  const [queueFilter, setQueueFilter] = useState<ProofStatus | "all">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    seedDemoProofs();
    setProofs(ProofEngine.getProofs());
  }, []);

  const refreshProofs = () => setProofs(ProofEngine.getProofs());

  const filtered = queueFilter === "all" ? proofs : proofs.filter(p => p.status === queueFilter);
  const pending  = proofs.filter(p => p.status === "pending");
  const approved = proofs.filter(p => p.status === "approved");
  const flagged  = proofs.filter(p => p.status === "flagged");
  const rejected = proofs.filter(p => p.status === "rejected");
  const media    = proofs.filter(p => !!p.mediaDataUrl);

  const toggleExpand = (id: string) =>
    setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const doAction = async (id: string, status: ProofStatus) => {
    setActing(id);
    await new Promise(r => setTimeout(r, 420));
    ProofEngine.updateStatus(id, status);
    refreshProofs();
    setActing(null);
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id:"queue",  label:"Proof Queue", icon:<Shield size={12}/>,    badge: pending.length },
    { id:"users",  label:"Users",       icon:<Users size={12}/> },
    { id:"media",  label:"Media",       icon:<ImageIcon size={12}/>, badge: media.length   },
    { id:"system", label:"System",      icon:<Activity size={12}/> },
  ];

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 font-sans">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-[#13151c]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <button onClick={() => navigate("/cockpit")}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-xs font-medium">
            <ArrowLeft size={14}/> Cockpit
          </button>
          <div className="w-px h-4 bg-white/10"/>
          <Shield size={13} className="text-indigo-400"/>
          <h1 className="text-sm font-bold text-white">Admin — Proof Integrity Dashboard</h1>
          <span className="ml-1 text-[9px] font-bold text-slate-600 bg-white/[0.05] border border-white/[0.07] px-2 py-0.5 rounded-full uppercase tracking-wider">
            Dev Mode
          </span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-5 space-y-4">

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label:"Total Proofs", value:proofs.length,   color:"text-slate-200",  bg:"bg-white/[0.04]",    icon:<BarChart3 size={13}/> },
            { label:"Pending",      value:pending.length,  color:"text-amber-400",  bg:"bg-amber-500/10",   icon:<Clock size={13}/> },
            { label:"Approved",     value:approved.length, color:"text-green-400",  bg:"bg-green-500/10",   icon:<CheckCircle2 size={13}/> },
            { label:"Flagged",      value:flagged.length + rejected.length, color:"text-red-400", bg:"bg-red-500/10", icon:<AlertTriangle size={13}/> },
          ].map(k => (
            <div key={k.label} className={`${k.bg} border border-white/[0.06] rounded-2xl p-4`}>
              <div className={`${k.color} mb-2`}>{k.icon}</div>
              <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                tab === t.id ? "bg-white/[0.08] text-slate-200" : "text-slate-500 hover:text-slate-300"
              }`}>
              {t.icon} {t.label}
              {t.badge ? (
                <span className="text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 rounded-full">
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════
            TAB: PROOF QUEUE
            ════════════════════════════════════════ */}
        {tab === "queue" && (
          <div className="space-y-3">
            {/* Sub-filter */}
            <div className="flex gap-1 flex-wrap">
              {(["all","pending","approved","flagged","rejected"] as const).map(f => (
                <button key={f} onClick={() => setQueueFilter(f)}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg capitalize transition-all ${
                    queueFilter === f
                      ? "bg-white/[0.09] text-slate-200"
                      : "text-slate-600 hover:text-slate-400"
                  }`}>
                  {f}
                </button>
              ))}
            </div>

            <div className="space-y-2.5">
              {filtered.map((proof, idx) => {
                const sc = STATUS_CFG[proof.status];
                const isOpen = expanded.has(proof.id);
                const isActing = acting === proof.id;

                return (
                  <motion.div key={proof.id}
                    initial={{ opacity:0, y:-5 }} animate={{ opacity:1, y:0 }}
                    transition={{ delay: idx * 0.025 }}
                    className="bg-[#13151c] border border-white/[0.06] rounded-2xl overflow-hidden">

                    {/* Row header */}
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-xs font-semibold text-slate-200 truncate">{proof.taskName}</p>
                          <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0 ${sc.color} ${sc.bg} ${sc.border}`}>
                            {sc.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-600">{proof.userName}</span>
                          <span className="text-[9px] text-slate-700">·</span>
                          <span className="text-[9px] text-slate-600 capitalize">{proof.type}</span>
                          <span className="text-[9px] text-slate-700">·</span>
                          <span className="text-[9px] text-slate-600">{timeAgo(proof.timestamp)}</span>
                          <span className="text-[9px] text-slate-700">·</span>
                          <span className="text-[9px] text-slate-600 capitalize">{proof.reason.replace("_"," ")}</span>
                        </div>
                      </div>

                      {/* Action buttons — only for pending */}
                      {proof.status === "pending" && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => doAction(proof.id, "approved")} disabled={!!isActing}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500/15 border border-green-500/25 text-green-300 text-[10px] font-semibold hover:bg-green-500/25 transition-colors disabled:opacity-40">
                            {isActing ? <motion.span animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:0.7 }}>
                              <Sparkles size={9}/>
                            </motion.span> : <Check size={9}/>}
                            Approve
                          </button>
                          <button onClick={() => doAction(proof.id, "flagged")} disabled={!!isActing}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/15 border border-orange-500/25 text-orange-300 text-[10px] font-semibold hover:bg-orange-500/25 transition-colors disabled:opacity-40">
                            <Flag size={9}/> Flag
                          </button>
                          <button onClick={() => doAction(proof.id, "rejected")} disabled={!!isActing}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/25 text-red-300 text-[10px] font-semibold hover:bg-red-500/25 transition-colors disabled:opacity-40">
                            <X size={9}/> Reject
                          </button>
                        </div>
                      )}

                      <button onClick={() => toggleExpand(proof.id)}
                        className="ml-1 text-slate-600 hover:text-slate-400 transition-colors">
                        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration:0.18 }} style={{ display:"block" }}>
                          <ChevronDown size={13}/>
                        </motion.span>
                      </button>
                    </div>

                    {/* Expanded detail */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }}
                          exit={{ height:0, opacity:0 }} transition={{ duration:0.18 }} style={{ overflow:"hidden" }}>
                          <div className="px-4 pb-4 space-y-3 border-t border-white/[0.05] pt-3">
                            {proof.mediaDataUrl && (
                              <div className="rounded-xl overflow-hidden border border-white/[0.08] max-h-40">
                                <img src={proof.mediaDataUrl} alt="Proof" className="w-full h-full object-cover"/>
                              </div>
                            )}
                            {proof.reflectionText && (
                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">Reflection</p>
                                <p className="text-xs text-slate-400 leading-relaxed italic">"{proof.reflectionText}"</p>
                              </div>
                            )}
                            {proof.agentAnalysis && (
                              <div className="flex items-start gap-2 p-2.5 bg-indigo-600/8 border border-indigo-500/15 rounded-xl">
                                <Sparkles size={10} className="text-indigo-400 shrink-0 mt-0.5"/>
                                <p className="text-[10px] text-slate-400 leading-snug">{proof.agentAnalysis}</p>
                              </div>
                            )}
                            <div className="grid grid-cols-4 gap-2 text-center">
                              {[
                                { label:"User ID",    value: proof.userId },
                                { label:"Task ID",    value: proof.taskId },
                                { label:"Trust",      value: `${proof.trustScoreBefore}/100` },
                                { label:"Behaviour",  value: `${proof.behaviourScore}/100` },
                              ].map(m => (
                                <div key={m.label} className="bg-white/[0.03] border border-white/[0.04] rounded-lg p-2">
                                  <p className="text-[9px] text-slate-600 uppercase tracking-wider">{m.label}</p>
                                  <p className="text-[10px] font-semibold text-slate-300 mt-0.5">{m.value}</p>
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
              {filtered.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Shield size={24} className="text-slate-700"/>
                  <p className="text-sm text-slate-500">No proofs match this filter.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB: USERS
            ════════════════════════════════════════ */}
        {tab === "users" && (
          <div className="space-y-3">
            <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-6 gap-3 px-4 py-2.5 border-b border-white/[0.05]">
                {["User","Trust Score","Behaviour","Proofs","Mismatches","Risk Level"].map(h => (
                  <p key={h} className="text-[9px] font-bold uppercase tracking-widest text-slate-600">{h}</p>
                ))}
              </div>
              {DEMO_USERS.map((u, idx) => {
                const risk = u.trustScore < 50 ? "High" : u.trustScore < 70 ? "Medium" : "Low";
                const riskColor = risk === "High" ? "text-red-400" : risk === "Medium" ? "text-amber-400" : "text-green-400";
                const userProofs = proofs.filter(p => p.userId === u.id);
                return (
                  <motion.div key={u.id}
                    initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: idx * 0.04 }}
                    className="grid grid-cols-6 gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.015] transition-colors">
                    <div>
                      <p className="text-xs font-semibold text-slate-300">{u.name}</p>
                      <p className="text-[9px] text-slate-600">{u.id}</p>
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${u.trustScore >= 75 ? "text-green-400" : u.trustScore >= 55 ? "text-amber-400" : "text-red-400"}`}>{u.trustScore}</p>
                      <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden mt-1">
                        <div className={`h-full rounded-full ${u.trustScore >= 75 ? "bg-green-500" : u.trustScore >= 55 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width:`${u.trustScore}%` }}/>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-indigo-400">{u.behaviourScore}</p>
                      <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden mt-1">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width:`${u.behaviourScore}%` }}/>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 self-center">{userProofs.length}</p>
                    <p className={`text-xs font-semibold self-center ${u.mismatchCount > 0 ? "text-red-400" : "text-slate-600"}`}>{u.mismatchCount}</p>
                    <p className={`text-xs font-bold self-center ${riskColor}`}>{risk}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Flagged user callout */}
            {DEMO_USERS.filter(u => u.trustScore < 55).map(u => (
              <div key={u.id} className="flex items-start gap-2.5 p-3.5 bg-red-500/8 border border-red-500/20 rounded-xl">
                <AlertTriangle size={12} className="text-red-400 shrink-0 mt-0.5"/>
                <div>
                  <p className="text-xs font-semibold text-red-300">{u.name} — Low Trust</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Trust score {u.trustScore}/100. {u.mismatchCount} behaviour mismatch{u.mismatchCount !== 1 ? "es" : ""} detected.
                    Consider suspending proof-gated task completions pending investigation.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB: MEDIA
            ════════════════════════════════════════ */}
        {tab === "media" && (
          <div className="space-y-3">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
              {media.length} media submissions
            </p>
            {media.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-12">
                <ImageIcon size={24} className="text-slate-700"/>
                <p className="text-sm text-slate-500">No media submissions yet.</p>
                <p className="text-xs text-slate-600">Media uploaded via the Proof Modal will appear here.</p>
              </div>
            )}
            {media.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {media.map(p => (
                  <div key={p.id} className="bg-[#13151c] border border-white/[0.06] rounded-2xl overflow-hidden">
                    <div className="aspect-video overflow-hidden bg-white/[0.03]">
                      <img src={p.mediaDataUrl} alt="" className="w-full h-full object-cover"/>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-[10px] font-semibold text-slate-300 truncate">{p.taskName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] text-slate-600">{p.userName}</span>
                        <span className="text-[9px] text-slate-700">·</span>
                        <span className={`text-[9px] font-semibold ${STATUS_CFG[p.status].color}`}>{p.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB: SYSTEM
            ════════════════════════════════════════ */}
        {tab === "system" && (
          <div className="space-y-3">
            {/* System metrics */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label:"Proof Requests / Day",  value:"14.2 avg",     icon:<Activity size={13}/>,   color:"text-indigo-400" },
                { label:"Auto-Approval Rate",    value:"61%",          icon:<CheckCircle2 size={13}/>,color:"text-green-400"  },
                { label:"Manual Review Rate",    value:"27%",          icon:<Eye size={13}/>,         color:"text-amber-400"  },
                { label:"Rejection Rate",        value:"8%",           icon:<X size={13}/>,           color:"text-red-400"    },
                { label:"Flagged Users",         value:"1 / 4",        icon:<AlertTriangle size={13}/>,color:"text-orange-400" },
                { label:"Mismatch Detections",   value:"5 total",      icon:<Shield size={13}/>,      color:"text-slate-400"  },
              ].map(m => (
                <div key={m.label} className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4 flex items-center gap-3">
                  <div className={`${m.color} shrink-0`}>{m.icon}</div>
                  <div>
                    <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                    <p className="text-[9px] text-slate-600 uppercase tracking-wider">{m.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Agent status */}
            <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={12} className="text-indigo-400"/>
                <p className="text-xs font-bold text-slate-300">Proof Agent Status</p>
                <span className="ml-auto text-[9px] font-bold text-green-300 bg-green-500/15 border border-green-500/25 px-2 py-0.5 rounded-full">Active</span>
              </div>
              <div className="space-y-2">
                {[
                  { label:"BehaviourMonitor",    status:"Running",  color:"text-green-400"  },
                  { label:"ProofEngine",          status:"Running",  color:"text-green-400"  },
                  { label:"Auto-Analysis Module", status:"Running",  color:"text-green-400"  },
                  { label:"Backend Sync",         status:"Offline",  color:"text-amber-400"  },
                  { label:"Media Storage",        status:"In-Memory",color:"text-amber-400"  },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-500">{s.label}</p>
                    <p className={`text-[10px] font-semibold ${s.color}`}>{s.status}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.05]">
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  Backend sync is offline — all proof data is stored in-memory and will reset on page reload.
                  Connect a backend API to enable persistence, real media storage, and cross-session integrity.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
