import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Sparkles, Shield, Zap, Timer,
  Target, RotateCcw,
} from "lucide-react";
import {
  getCompletedSession, setCompletedSession,
  DEMO_SESSIONS, FocusEngine, SESSION_TYPE_CONFIG,
} from "../lib/focusEngine";

/* ══════════════════════════════════════════════════════════════
   FOCUS SESSION COMPLETION  /focus/complete
   ══════════════════════════════════════════════════════════════ */

const fade = (d = 0) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay: d } });

export default function FocusComplete() {
  const navigate = useNavigate();
  const completed = getCompletedSession();
  const session   = completed?.session;

  const [whatWorkedOn, setWhatWorkedOn] = useState("");
  const [notes,        setNotes]        = useState("");
  const [saveProof,    setSaveProof]    = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);

  // Redirect if no completed session
  if (!completed || !session) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400">No session to complete.</p>
        <button onClick={() => navigate("/focus")} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
          Back to Focus
        </button>
      </div>
    );
  }

  const type       = session.type;
  const cfg        = SESSION_TYPE_CONFIG[type];
  const actual     = completed.actualMinutes;
  const planned    = session.plannedMinutes;
  const wasComplete = actual >= planned;
  const endTime    = new Date(session.startTime.getTime() + actual * 60000);
  const todayCount = FocusEngine.sessionsToday(DEMO_SESSIONS).length + 1;
  const streak     = FocusEngine.currentStreak(DEMO_SESSIONS);

  const handleSave = async () => {
    if (!whatWorkedOn.trim()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 1200));
    setCompletedSession(null);
    setSaving(false);
    setSaved(true);
  };

  if (saved) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center gap-6 px-6">
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}>
          <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center">
            <CheckCircle2 size={36} className="text-green-400" />
          </div>
        </motion.div>
        <motion.div {...fade(0.2)} className="text-center">
          <p className="text-2xl font-bold text-white mb-2">Session Saved</p>
          <p className="text-sm text-slate-400">
            {saveProof ? "Added to your Proof record. " : ""}
            Cycle progress updated.
          </p>
        </motion.div>
        <motion.div {...fade(0.35)} className="flex gap-3">
          <button onClick={() => navigate("/focus")}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors">
            <RotateCcw size={14} /> Start Another
          </button>
          <button onClick={() => navigate("/focus/history")}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-300 text-sm font-semibold hover:bg-white/[0.08] transition-colors">
            <Timer size={14} /> View History
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">
      <div className="max-w-lg mx-auto px-6 py-8 space-y-6">

        {/* Hero */}
        <motion.div {...fade(0)} className="text-center">
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: `${SESSION_TYPE_CONFIG[type].color.replace("text-","").split("-")[0] === "indigo" ? "#6366f1" : "#10b981"}20`,
                     border: `2px solid ${wasComplete ? "#4ade80" : "#f59e0b"}` }}>
            {wasComplete
              ? <CheckCircle2 size={36} className="text-green-400" />
              : <Timer size={36} className="text-amber-400" />
            }
          </motion.div>
          <h1 className="text-2xl font-bold text-white">
            {wasComplete ? "Session Complete! 🎉" : "Session Ended Early"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {wasComplete ? "You nailed it. Every minute counts." : `Completed ${actual} of ${planned} planned minutes.`}
          </p>
        </motion.div>

        {/* Summary card */}
        <motion.div {...fade(0.1)} className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Session Summary</p>
          <div className="grid grid-cols-2 gap-3">
            <SummaryItem icon={<Timer size={13} className="text-indigo-400" />}   label="Duration"    value={`${actual} minutes`} />
            <SummaryItem icon={<CheckCircle2 size={13} className="text-green-400" />} label="Status"  value={wasComplete ? "Completed ✓" : "Ended early"} />
            <SummaryItem icon={<Zap size={13} className="text-amber-400" />}       label="Start"      value={session.startTime.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" })} />
            <SummaryItem icon={<Zap size={13} className="text-amber-400" />}       label="End"        value={endTime.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" })} />
          </div>
          <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center gap-3">
            <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${cfg.bg} ${cfg.color}`}>
              {cfg.emoji} {cfg.label}
            </span>
            {(session.linkedGoalTitle || session.linkedEventTitle) && (
              <span className="text-[11px] text-slate-400">
                <Target size={10} className="inline mr-1" />
                {session.linkedGoalTitle ?? session.linkedEventTitle}
              </span>
            )}
          </div>
        </motion.div>

        {/* What did you work on */}
        <motion.div {...fade(0.15)} className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
            What did you work on? <span className="text-red-400">*</span>
          </p>
          <textarea
            value={whatWorkedOn}
            onChange={e => setWhatWorkedOn(e.target.value)}
            placeholder="Describe what you accomplished in this session…"
            rows={3}
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl p-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 resize-none transition-colors"
          />
          {!whatWorkedOn.trim() && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {["Built new features", "Wrote investor materials", "Studied and took notes", "Planning and strategy", "Client work"].map(s => (
                <button key={s} onClick={() => setWhatWorkedOn(s)}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Notes */}
        <motion.div {...fade(0.18)} className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
            What did you learn? <span className="text-slate-600">(optional)</span>
          </p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Key insight, decision made, or something worth remembering…"
            rows={2}
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl p-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 resize-none transition-colors"
          />
        </motion.div>

        {/* Proof + Cycle integration */}
        <motion.div {...fade(0.20)} className="space-y-3">
          {/* Save as proof */}
          <button onClick={() => setSaveProof(v => !v)}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
              saveProof ? "bg-green-600/8 border-green-500/20" : "bg-white/[0.03] border-white/[0.06]"
            }`}>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
              saveProof ? "bg-green-500 border-green-500" : "border-white/20"
            }`}>
              {saveProof && <CheckCircle2 size={12} className="text-white" />}
            </div>
            <div className="text-left">
              <p className={`text-sm font-semibold ${saveProof ? "text-green-300" : "text-slate-300"}`}>
                Save as Proof entry
              </p>
              <p className="text-[11px] text-slate-500">{actual}min · {type} · {session.startTime.toLocaleDateString("en-GB")}</p>
            </div>
            <Shield size={14} className={saveProof ? "text-green-400 ml-auto shrink-0" : "text-slate-600 ml-auto shrink-0"} />
          </button>

          {/* Cycle update info */}
          <div className="flex items-center gap-3 p-3.5 bg-indigo-600/8 border border-indigo-500/15 rounded-xl">
            <Zap size={13} className="text-indigo-400 shrink-0" />
            <p className="text-xs text-slate-300">
              <span className="text-white font-semibold">{actual} minutes</span> will be added to your Cycle Week 6 progress.
              Behaviour score +{Math.round(actual / 15)}.
            </p>
          </div>
        </motion.div>

        {/* Agent reflection */}
        <motion.div {...fade(0.22)} className="bg-indigo-600/8 border border-indigo-500/15 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={13} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-300">Agent Reflection</span>
          </div>
          <div className="space-y-2.5">
            <p className="text-sm text-slate-300">
              {wasComplete
                ? `💥 ${actual} minutes of ${cfg.label.toLowerCase()} work — that's exceptional.`
                : `⚡ Even ${actual} minutes of focused work compounds over time. Good.`}
            </p>
            {session.linkedGoalTitle && (
              <p className="text-sm text-slate-300">
                <span className="text-white font-semibold">Goal progress: </span>
                This session contributes directly to <span className="text-indigo-300 font-semibold">{session.linkedGoalTitle}</span>.
              </p>
            )}
            <p className="text-sm text-slate-300">
              You've completed{" "}
              <span className="text-white font-semibold">{todayCount} session{todayCount !== 1 ? "s" : ""} today</span> — {" "}
              {todayCount >= 3 ? "elite output. Consider a recovery block next." : "keep the momentum going."}
            </p>
            <p className="text-sm text-slate-300">
              <span className="text-amber-400 font-semibold">{streak}-day streak 🔥</span>{" "}
              {streak >= 5 ? "You're building a powerful identity pattern." : "Each session strengthens your identity."}
            </p>
          </div>
        </motion.div>

        {/* Save button */}
        <motion.div {...fade(0.25)}>
          <motion.button
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            onClick={handleSave}
            disabled={saving || !whatWorkedOn.trim()}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
              : <><CheckCircle2 size={18} /> Save Session{saveProof ? " + Proof" : ""}</>
            }
          </motion.button>
          {!whatWorkedOn.trim() && (
            <p className="text-center text-[11px] text-red-400/70 mt-1.5">Required: describe what you worked on</p>
          )}
        </motion.div>

        {/* Skip */}
        <div className="text-center">
          <button onClick={() => { setCompletedSession(null); navigate("/focus"); }}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
            Skip — don't save this session
          </button>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}

function SummaryItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-[#0f1117]/60 border border-white/[0.04] rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">{icon}<p className="text-[10px] text-slate-500">{label}</p></div>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
