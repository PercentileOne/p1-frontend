import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  X, Camera, Video, Mic, FileText, MapPin, Clock, Brain,
  MessageSquare, Users, Upload, Sparkles, Check, Shield, AlertTriangle, Zap, Flame, RefreshCw,
} from "lucide-react";
import { ProofEngine } from "../lib/proofEngine";
import type { ProofType, ProofReason, ProofUser } from "../lib/proofEngine";

/* ══════════════════════════════════════════════════════════════
   PROPS
   ══════════════════════════════════════════════════════════════ */
interface ProofModalProps {
  taskName: string;
  taskId?: string;
  difficulty?: "easy" | "medium" | "hard" | "epic";
  streak?: number;
  reason: ProofReason;
  message: string;
  proofTypes: ProofType[];
  urgency: "low" | "medium" | "high";
  onClose: () => void;
  onSubmitted: () => void;
  user?: ProofUser;
}

/* ══════════════════════════════════════════════════════════════
   PROOF TYPE CONFIG
   ══════════════════════════════════════════════════════════════ */
const TYPE_CFG: Record<ProofType, { label: string; icon: React.ReactNode; accepts: string; desc: string }> = {
  photo:       { label:"Photo",       icon:<Camera size={14}/>,       accepts:"image/*",                desc:"Take or upload a photo"         },
  video:       { label:"Video",       icon:<Video size={14}/>,        accepts:"video/*",                desc:"Short video clip"               },
  voice:       { label:"Voice Note",  icon:<Mic size={14}/>,          accepts:"audio/*",                desc:"Record or upload audio"         },
  screenshot:  { label:"Screenshot",  icon:<FileText size={14}/>,     accepts:"image/*",                desc:"App or browser screenshot"      },
  document:    { label:"Document",    icon:<FileText size={14}/>,     accepts:".pdf,.doc,.docx,image/*",desc:"PDF or document"                },
  location:    { label:"Location",    icon:<MapPin size={14}/>,       accepts:"",                       desc:"Check-in (coming soon)"         },
  timestamp:   { label:"Timestamp",   icon:<Clock size={14}/>,        accepts:"",                       desc:"Time-verified completion"       },
  behavioural: { label:"Behavioural", icon:<Brain size={14}/>,        accepts:"",                       desc:"Agent-analysed pattern"         },
  reflection:  { label:"Reflection",  icon:<MessageSquare size={14}/>,accepts:"",                       desc:"Written or voice reflection"    },
  social:      { label:"Social",      icon:<Users size={14}/>,        accepts:"",                       desc:"Friend confirmation (coming soon)"},
};

const REASON_CFG: Record<ProofReason, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  random_check:       { label:"Random Check",          color:"text-indigo-300", bg:"bg-indigo-600/15", border:"border-indigo-500/30", icon:<Sparkles size={10}/> },
  behaviour_mismatch: { label:"Behaviour Mismatch",    color:"text-red-300",    bg:"bg-red-600/15",    border:"border-red-500/30",    icon:<AlertTriangle size={10}/> },
  streak_integrity:   { label:"Streak Integrity",      color:"text-orange-300", bg:"bg-orange-600/15", border:"border-orange-500/30", icon:<Flame size={10}/> },
  difficulty_weighted:{ label:"Difficulty Check",      color:"text-purple-300", bg:"bg-purple-600/15", border:"border-purple-500/30", icon:<Zap size={10}/> },
  mid_progress:       { label:"Progress Check",        color:"text-teal-300",   bg:"bg-teal-600/15",   border:"border-teal-500/30",   icon:<RefreshCw size={10}/> },
  high_value:         { label:"High-Value Goal",       color:"text-yellow-300", bg:"bg-yellow-600/15", border:"border-yellow-500/30", icon:<Shield size={10}/> },
};

const URGENCY_COLOR = { low:"text-slate-400", medium:"text-amber-400", high:"text-red-400" };

/* ══════════════════════════════════════════════════════════════
   MODAL
   ══════════════════════════════════════════════════════════════ */
export default function ProofModal({
  taskName, taskId, difficulty="medium", streak, reason, message,
  proofTypes, urgency, onClose, onSubmitted, user,
}: ProofModalProps) {

  const [selectedType, setSelectedType] = useState<ProofType>(proofTypes[0] ?? "reflection");
  const [mediaFile,    setMediaFile]    = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [reflection,   setReflection]   = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [done,         setDone]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = ev => setMediaPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setMediaPreview(null);
    }
  };

  const canSubmit = selectedType === "reflection"
    ? reflection.trim().length > 10
    : (mediaFile !== null || reflection.trim().length > 5);

  const handleSubmit = async () => {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));

    ProofEngine.submitProof({
      taskId:           taskId ?? "unknown",
      taskName,
      userId:           user?.id ?? "u1",
      userName:         user?.name ?? "Francis Cobbinah",
      type:             selectedType,
      reason,
      mediaDataUrl:     mediaPreview ?? undefined,
      mediaType:        mediaFile?.type,
      fileName:         mediaFile?.name,
      reflectionText:   reflection || undefined,
      trustScoreBefore: user?.trustScore ?? 78,
      behaviourScore:   user?.behaviourScore ?? 82,
      difficulty,
    });

    setDone(true);
    await new Promise(r => setTimeout(r, 900));
    onSubmitted();
  };

  const rc   = REASON_CFG[reason];
  const type = TYPE_CFG[selectedType];
  const needsFile = !["location","timestamp","behavioural","reflection","social"].includes(selectedType);

  return (
    <motion.div key="proof-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.96, y: 10  }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[480px] max-h-[88vh] overflow-y-auto rounded-2xl border border-white/[0.08] shadow-2xl shadow-black/60"
        style={{ background: "rgba(15,17,23,0.98)", backdropFilter: "blur(24px)" }}>

        {/* ── Header ── */}
        <div className="flex items-start justify-between p-5 border-b border-white/[0.06]">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Shield size={16} className="text-indigo-400"/>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Proof Required</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${rc.color} ${rc.bg} ${rc.border}`}>
                  {rc.icon} {rc.label}
                </span>
                <span className={`text-[10px] font-semibold ${URGENCY_COLOR[urgency]}`}>
                  {urgency === "high" ? "· Urgent" : urgency === "medium" ? "· Medium priority" : ""}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded-lg hover:bg-white/[0.06]">
            <X size={14}/>
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Task badge */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border border-white/[0.07] rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Task</span>
            <span className="text-xs font-semibold text-slate-300 flex-1 truncate">{taskName}</span>
            {streak && streak > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-orange-400 shrink-0">
                <Flame size={10}/> {streak}d
              </span>
            )}
          </div>

          {/* Agent message */}
          <div className="flex items-start gap-2.5 p-3 bg-indigo-600/8 border border-indigo-500/15 rounded-xl">
            <Sparkles size={12} className="text-indigo-400 shrink-0 mt-0.5"/>
            <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
          </div>

          {/* Proof type selector */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">Choose Proof Type</p>
            <div className="flex flex-wrap gap-1.5">
              {proofTypes.map(pt => {
                const cfg = TYPE_CFG[pt];
                const active = selectedType === pt;
                return (
                  <button key={pt} onClick={() => { setSelectedType(pt); setMediaFile(null); setMediaPreview(null); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      active
                        ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-200"
                        : "bg-white/[0.03] border-white/[0.08] text-slate-400 hover:border-white/20 hover:text-slate-300"
                    }`}>
                    {cfg.icon} {cfg.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5">{type.desc}</p>
          </div>

          {/* Upload zone */}
          {needsFile && !done && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">
                {selectedType === "photo" || selectedType === "screenshot" ? "Upload Image" :
                 selectedType === "video" ? "Upload Video" :
                 selectedType === "voice" ? "Upload Audio" : "Upload File"}
              </p>
              <input ref={fileRef} type="file" accept={type.accepts} onChange={onFileChange} className="hidden"/>

              {mediaFile ? (
                <div className="space-y-2">
                  {mediaPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-white/[0.08] aspect-video bg-black/30">
                      <img src={mediaPreview} alt="Proof preview" className="w-full h-full object-cover"/>
                      <div className="absolute inset-0 flex items-end">
                        <div className="bg-gradient-to-t from-black/80 to-transparent w-full px-3 pb-2">
                          <p className="text-[10px] text-slate-400 truncate">{mediaFile.name}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-white/[0.04] border border-white/[0.07] rounded-xl">
                      {TYPE_CFG[selectedType].icon}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 font-medium truncate">{mediaFile.name}</p>
                        <p className="text-[10px] text-slate-600">{(mediaFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <Check size={13} className="text-green-400 shrink-0"/>
                    </div>
                  )}
                  <button onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                    className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
                    Remove &amp; re-upload
                  </button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 py-7 rounded-xl border border-dashed border-white/[0.12] hover:border-indigo-500/30 hover:bg-indigo-600/5 transition-all group">
                  <Upload size={20} className="text-slate-600 group-hover:text-indigo-400 transition-colors"/>
                  <p className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                    Click to upload or drag &amp; drop
                  </p>
                  <p className="text-[10px] text-slate-700">{type.accepts.replace(/\*/g, "any").replace(/,/g, " ·")}</p>
                </button>
              )}
            </div>
          )}

          {/* Reflection */}
          {!done && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">
                Reflection
                {selectedType !== "reflection" && <span className="text-slate-700 font-normal normal-case"> (optional but encouraged)</span>}
              </label>
              <textarea value={reflection} onChange={e => setReflection(e.target.value)} rows={3}
                placeholder="Describe what you actually did, how it felt, and what you observed…"
                className="w-full bg-[#13151c] border border-white/[0.08] rounded-xl px-4 py-3 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500/40 resize-none leading-relaxed"/>
              {reflection.length > 0 && reflection.length < 10 && (
                <p className="text-[10px] text-amber-400/80 mt-1">Add a bit more detail to strengthen your proof.</p>
              )}
            </div>
          )}

          {/* Honesty note */}
          {!done && (
            <div className="flex items-start gap-2 text-[10px] text-slate-600 leading-relaxed">
              <Shield size={10} className="shrink-0 mt-0.5 text-slate-700"/>
              <p>Your proof is reviewed by the P1 integrity system. Honest submissions build your trust score. False submissions reduce it and may flag your account.</p>
            </div>
          )}

          {/* Success state */}
          {done && (
            <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
              className="flex flex-col items-center gap-3 py-6">
              <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-400/30 flex items-center justify-center">
                <Check size={22} className="text-green-400"/>
              </div>
              <p className="text-sm font-bold text-white">Proof Submitted</p>
              <p className="text-xs text-slate-500 text-center">Your completion is logged. The P1 agent is reviewing your proof. Trust score update incoming.</p>
            </motion.div>
          )}

          {/* Actions */}
          {!done && (
            <div className="space-y-2">
              <button onClick={handleSubmit} disabled={!canSubmit || submitting}
                className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                  canSubmit && !submitting
                    ? "text-white shadow-lg shadow-indigo-900/40"
                    : "bg-white/[0.05] text-slate-600 cursor-not-allowed"
                }`}
                style={canSubmit && !submitting ? { background:"linear-gradient(135deg,#4f46e5,#7c3aed)" } : {}}>
                {submitting
                  ? <><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"/><span>Submitting proof…</span></>
                  : <><Shield size={14}/> Submit Proof</>}
              </button>
              <button onClick={onClose}
                className="w-full text-xs text-slate-600 hover:text-slate-400 transition-colors py-2">
                Cancel — I'll come back to this
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
