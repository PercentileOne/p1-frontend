import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Camera, Upload, Sparkles, Shield, Target, Zap,
  CheckCircle2, RefreshCw, Mic,
} from "lucide-react";
import { INGEST_SCENARIOS } from "../lib/messagesEngine";
import type { IngestResult } from "../lib/messagesEngine";

/* ══════════════════════════════════════════════════════════════
   MESSAGES INGEST  /messages/ingest
   Universal media → AI → Proof pipeline
   ══════════════════════════════════════════════════════════════ */

type Stage = "idle" | "processing" | "result" | "saved";

const PROCESSING_STEPS = [
  "Analysing image…",
  "Running OCR extraction…",
  "Identifying data points…",
  "Categorising content…",
  "Generating proof entry…",
  "Getting agent insight…",
];

const INGEST_SOURCES = [
  { emoji: "🏃", label: "Gym Machine",     desc: "Treadmill, bike, rower metrics"  },
  { emoji: "⌚", label: "Apple Watch",     desc: "Health, fitness, sleep stats"    },
  { emoji: "📊", label: "Whoop Band",      desc: "Recovery, strain, HRV"           },
  { emoji: "📔", label: "Study Notes",     desc: "Handwritten or typed notes"      },
  { emoji: "🖊️",  label: "Whiteboard",     desc: "Plans, diagrams, mind maps"     },
  { emoji: "📱", label: "Screenshot",      desc: "Any app data or achievement"     },
  { emoji: "🎙️", label: "Voice Note",     desc: "Speak what you accomplished"     },
  { emoji: "📸", label: "Any Photo",       desc: "Let AI figure it out"            },
];

export default function MessagesIngest() {
  const navigate  = useNavigate();
  const [stage,   setStage]   = useState<Stage>("idle");
  const [step,    setStep]    = useState(0);
  const [result,  setResult]  = useState<IngestResult | null>(null);
  const [goalLink, setGoalLink] = useState(true);
  const [cycleLink, setCycleLink] = useState(true);
  const [saveProof, setSaveProof] = useState(true);

  const runIngest = (scenario = 0) => {
    setStage("processing");
    setStep(0);
    let s = 0;
    const iv = setInterval(() => {
      s++;
      setStep(s);
      if (s >= PROCESSING_STEPS.length) {
        clearInterval(iv);
        setTimeout(() => {
          setResult(INGEST_SCENARIOS[scenario % INGEST_SCENARIOS.length]);
          setStage("result");
        }, 400);
      }
    }, 500);
  };

  const handleSave = async () => {
    await new Promise(r => setTimeout(r, 800));
    setStage("saved");
  };

  const reset = () => { setStage("idle"); setResult(null); setStep(0); };

  /* ── Saved ──────────────────────────────────────────────── */
  if (stage === "saved" && result) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center gap-6 px-6">
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}>
          <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center">
            <CheckCircle2 size={36} className="text-green-400" />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="text-center">
          <p className="text-2xl font-bold text-white">Proof Saved</p>
          <p className="text-sm text-slate-400 mt-1">{result.proofTitle}</p>
          {goalLink && result.suggestedGoal && (
            <p className="text-xs text-indigo-400 mt-2">Linked to: <span className="font-semibold">{result.suggestedGoal}</span></p>
          )}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="flex gap-3">
          <button onClick={reset}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors">
            <Camera size={14} /> Ingest Another
          </button>
          <button onClick={() => navigate("/messages")}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-300 text-sm font-semibold hover:bg-white/[0.08] transition-colors">
            Done
          </button>
        </motion.div>
      </div>
    );
  }

  /* ── Processing ─────────────────────────────────────────── */
  if (stage === "processing") {
    return (
      <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center gap-8 px-6">
        <div className="w-20 h-20 rounded-full bg-indigo-600/20 border-2 border-indigo-500/40 flex items-center justify-center">
          <Sparkles size={32} className="text-indigo-400 animate-pulse" />
        </div>
        <div className="space-y-3 w-full max-w-sm">
          {PROCESSING_STEPS.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: i <= step ? 1 : 0.2, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                i < step ? "bg-green-500 border-green-500" :
                i === step ? "border-indigo-400 animate-pulse" :
                "border-white/10"
              }`}>
                {i < step && <CheckCircle2 size={12} className="text-white" />}
              </div>
              <p className={`text-sm transition-colors ${i <= step ? "text-slate-200" : "text-slate-700"}`}>{s}</p>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Result ─────────────────────────────────────────────── */
  if (stage === "result" && result) {
    return (
      <div className="min-h-screen bg-[#0f1117] text-slate-200">
        <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-5 py-3">
          <div className="flex items-center gap-3">
            <button onClick={reset}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
              <ArrowLeft size={16} />
            </button>
            <h1 className="text-sm font-bold text-white">AI Extraction Result</h1>
            <span className="ml-auto text-[11px] text-green-400 font-semibold">{result.confidence}% confidence</span>
          </div>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Category */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 p-4 bg-[#1c1f2e] border border-white/[0.08] rounded-2xl">
              <span className="text-3xl">{result.emoji}</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{result.categoryLabel}</p>
                <p className="text-base font-bold text-white">{result.proofTitle}</p>
              </div>
            </div>
          </motion.div>

          {/* Extracted data */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Extracted Data</p>
            <div className="grid grid-cols-2 gap-2.5">
              {result.extractedData.map(d => (
                <div key={d.label} className="bg-[#0f1117]/60 border border-white/[0.04] rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 mb-0.5">{d.label}</p>
                  <p className="text-sm font-bold text-white">{d.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Agent insight */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={12} className="text-indigo-400" />
              <p className="text-xs font-semibold text-indigo-300">Agent Insight</p>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{result.agentInsight}</p>
            {result.streakBonus && (
              <p className="text-xs font-bold text-amber-400 mt-2">{result.streakBonus}</p>
            )}
          </motion.div>

          {/* Linking options */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
            className="space-y-2.5">

            {/* Proof */}
            <button onClick={() => setSaveProof(v => !v)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                saveProof ? "bg-green-600/8 border-green-500/20" : "bg-white/[0.03] border-white/[0.06]"
              }`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                saveProof ? "bg-green-500 border-green-500" : "border-white/20"
              }`}>
                {saveProof && <CheckCircle2 size={11} className="text-white" />}
              </div>
              <div className="text-left">
                <p className={`text-sm font-semibold ${saveProof ? "text-green-300" : "text-slate-300"}`}>Save as Proof Entry</p>
                <p className="text-[11px] text-slate-500">{result.categoryLabel} · {result.proofTitle}</p>
              </div>
              <Shield size={14} className={`ml-auto shrink-0 ${saveProof ? "text-green-400" : "text-slate-600"}`} />
            </button>

            {/* Goal link */}
            {result.suggestedGoal && (
              <button onClick={() => setGoalLink(v => !v)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  goalLink ? "bg-indigo-600/8 border-indigo-500/20" : "bg-white/[0.03] border-white/[0.06]"
                }`}>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  goalLink ? "bg-indigo-600 border-indigo-600" : "border-white/20"
                }`}>
                  {goalLink && <CheckCircle2 size={11} className="text-white" />}
                </div>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${goalLink ? "text-indigo-300" : "text-slate-300"}`}>Link to Goal</p>
                  <p className="text-[11px] text-slate-500">{result.suggestedGoal}</p>
                </div>
                <Target size={14} className={`ml-auto shrink-0 ${goalLink ? "text-indigo-400" : "text-slate-600"}`} />
              </button>
            )}

            {/* Cycle link */}
            {result.suggestedCycleWeek && (
              <button onClick={() => setCycleLink(v => !v)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  cycleLink ? "bg-blue-600/8 border-blue-500/20" : "bg-white/[0.03] border-white/[0.06]"
                }`}>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  cycleLink ? "bg-blue-600 border-blue-600" : "border-white/20"
                }`}>
                  {cycleLink && <CheckCircle2 size={11} className="text-white" />}
                </div>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${cycleLink ? "text-blue-300" : "text-slate-300"}`}>Link to Cycle Week {result.suggestedCycleWeek}</p>
                  <p className="text-[11px] text-slate-500">Adds to your Cycle 6 Week {result.suggestedCycleWeek} progress</p>
                </div>
                <Zap size={14} className={`ml-auto shrink-0 ${cycleLink ? "text-blue-400" : "text-slate-600"}`} />
              </button>
            )}
          </motion.div>

          {/* Save button */}
          <motion.button
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            onClick={handleSave}
            disabled={!saveProof}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            <CheckCircle2 size={16} />
            Save{saveProof ? " Proof" : ""}{goalLink && result.suggestedGoal ? " + Goal" : ""}
            {cycleLink && result.suggestedCycleWeek ? " + Cycle" : ""}
          </motion.button>

          <button onClick={reset}
            className="w-full py-2 text-xs text-slate-600 hover:text-slate-400 flex items-center justify-center gap-1.5 transition-colors">
            <RefreshCw size={11} /> Try a different source
          </button>
        </div>
      </div>
    );
  }

  /* ── Idle ───────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-5 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <Camera size={14} className="text-indigo-400" /> AI Ingest
            </h1>
            <p className="text-[11px] text-slate-500">Media → Extract → Proof → Goals</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">

        {/* What this does */}
        <div className="p-4 bg-indigo-600/8 border border-indigo-500/15 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={13} className="text-indigo-400" />
            <p className="text-xs font-bold text-indigo-300">Universal Proof Capture</p>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Send any image, screenshot, or voice note. AI will extract the data, categorise it, create a proof entry,
            and suggest goal and cycle links — automatically.
          </p>
        </div>

        {/* Main upload zone */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Upload or Capture</p>
          <div className="grid grid-cols-2 gap-3">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => runIngest(0)}
              className="flex flex-col items-center gap-3 py-8 bg-[#1c1f2e] border border-white/[0.08] border-dashed rounded-2xl hover:border-indigo-500/30 transition-all">
              <Camera size={28} className="text-indigo-400" />
              <div className="text-center">
                <p className="text-sm font-bold text-white">Take Photo</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Camera / screenshot</p>
              </div>
            </motion.button>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => runIngest(2)}
              className="flex flex-col items-center gap-3 py-8 bg-[#1c1f2e] border border-white/[0.08] border-dashed rounded-2xl hover:border-indigo-500/30 transition-all">
              <Upload size={28} className="text-purple-400" />
              <div className="text-center">
                <p className="text-sm font-bold text-white">Upload File</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Image or document</p>
              </div>
            </motion.button>
          </div>

          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            onClick={() => runIngest(1)}
            className="w-full mt-3 flex items-center justify-center gap-3 py-5 bg-[#1c1f2e] border border-white/[0.08] border-dashed rounded-2xl hover:border-green-500/25 transition-all">
            <Mic size={22} className="text-green-400" />
            <div className="text-left">
              <p className="text-sm font-bold text-white">Record Voice Note</p>
              <p className="text-[11px] text-slate-500">Tell the agent what you accomplished</p>
            </div>
          </motion.button>
        </div>

        {/* Source examples */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">What Can I Ingest?</p>
          <div className="grid grid-cols-2 gap-2">
            {INGEST_SOURCES.map((s, i) => (
              <motion.button key={s.label} whileHover={{ x: 1 }}
                onClick={() => runIngest(i % INGEST_SCENARIOS.length)}
                className="flex items-center gap-2.5 p-3 bg-[#1c1f2e] border border-white/[0.06] rounded-xl hover:border-white/[0.12] transition-all text-left">
                <span className="text-xl shrink-0">{s.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white">{s.label}</p>
                  <p className="text-[10px] text-slate-500 truncate">{s.desc}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Recent ingests */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Recent Ingests</p>
          {[
            { emoji: "🏋️", title: "5.2km Run · 28:45",              time: "2h ago",  category: "Fitness" },
            { emoji: "📚", title: "System Design Study · 90min",     time: "Yesterday", category: "Study"   },
            { emoji: "⌚", title: "Apple Watch · 87% Recovery",      time: "2d ago",  category: "Health"  },
          ].map(r => (
            <div key={r.title} className="flex items-center gap-3 py-3 border-b border-white/[0.04] last:border-0">
              <span className="text-xl">{r.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{r.title}</p>
                <p className="text-[10px] text-slate-500">{r.category} · {r.time}</p>
              </div>
              <Shield size={12} className="text-green-400 shrink-0" />
            </div>
          ))}
        </div>

      </div>
      <div className="h-8" />
    </div>
  );
}
