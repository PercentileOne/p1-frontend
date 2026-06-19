import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Timer, Sparkles, History, BarChart2,
  Target, Clock,
} from "lucide-react";
import BackToCockpit from "../components/BackToCockpit";
import {
  DURATION_PRESETS, SESSION_TYPE_CONFIG, LINK_OPTIONS,
  AGENT_SUGGESTIONS, DEMO_SESSIONS, FocusEngine,
  setActiveSession,
} from "../lib/focusEngine";
import type { SessionType } from "../lib/focusEngine";

/* ══════════════════════════════════════════════════════════════
   FOCUS MODE LAUNCHER  /focus
   ══════════════════════════════════════════════════════════════ */

const fade = (d = 0) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, delay: d } });

export default function FocusLauncher() {
  const navigate = useNavigate();

  const [minutes, setMinutes]     = useState(45);
  const [custom, setCustom]       = useState(false);
  const [customMin, setCustomMin] = useState(30);
  const [type, setType]           = useState<SessionType>("strategic");
  const [linkId, setLinkId]       = useState("");

  const todaySessions = FocusEngine.sessionsToday(DEMO_SESSIONS);
  const todayMins     = FocusEngine.totalMinutes(todaySessions);
  const streak        = FocusEngine.currentStreak(DEMO_SESSIONS);
  const finalMinutes  = custom ? customMin : minutes;
  const linkedItem    = LINK_OPTIONS.find(l => l.id === linkId);

  const handleStart = () => {
    setActiveSession({
      plannedMinutes: finalMinutes,
      type,
      linkedGoalId:    linkedItem?.category === "goal"  ? linkedItem.id    : undefined,
      linkedGoalTitle: linkedItem?.category === "goal"  ? linkedItem.title : undefined,
      linkedEventId:   linkedItem?.category === "event" ? linkedItem.id    : undefined,
      linkedEventTitle:linkedItem?.category === "event" ? linkedItem.title : undefined,
      startTime: new Date(),
    });
    navigate("/focus/session");
  };

  const applySuggestion = (s: typeof AGENT_SUGGESTIONS[0]) => {
    setMinutes(s.minutes);
    setCustom(false);
    setType(s.type);
    if (s.linkId) setLinkId(s.linkId);
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BackToCockpit />
            <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <Timer size={16} className="text-indigo-400" /> Focus Mode
            </h1>
            <p className="text-[11px] text-slate-500">
              {todaySessions.length} sessions today · {todayMins}min · {streak}-day streak
            </p>
          </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/focus/history")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300 text-xs font-medium hover:bg-white/[0.07] transition-colors">
              <History size={12} /> History
            </button>
            <button onClick={() => navigate("/focus/stats")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300 text-xs font-medium hover:bg-white/[0.07] transition-colors">
              <BarChart2 size={12} /> Stats
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 py-6 space-y-6">

        {/* Today snapshot */}
        <motion.div {...fade(0)} className="grid grid-cols-3 gap-3">
          {[
            { label: "Sessions today", value: todaySessions.length,         color: "text-indigo-400" },
            { label: "Minutes today",  value: `${todayMins}m`,              color: "text-green-400"  },
            { label: "Day streak",     value: `${streak}🔥`,               color: "text-amber-400"  },
          ].map(s => (
            <div key={s.label} className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Agent suggestions */}
        <motion.div {...fade(0.04)}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={12} className="text-indigo-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Agent Suggestions</p>
          </div>
          <div className="space-y-2">
            {AGENT_SUGGESTIONS.map((s, i) => (
              <motion.button key={i} whileHover={{ x: 2 }}
                onClick={() => applySuggestion(s)}
                className="w-full flex items-start gap-3 p-3.5 bg-indigo-600/8 border border-indigo-500/15 rounded-xl text-left hover:border-indigo-500/30 transition-all">
                <Sparkles size={11} className="text-indigo-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 leading-snug">{s.reason}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-bold text-indigo-400">{s.minutes}min</span>
                    <span className={`text-[10px] font-semibold ${SESSION_TYPE_CONFIG[s.type].color}`}>
                      {SESSION_TYPE_CONFIG[s.type].emoji} {SESSION_TYPE_CONFIG[s.type].label}
                    </span>
                    {s.linkTitle && <span className="text-[10px] text-slate-500 truncate">{s.linkTitle}</span>}
                  </div>
                </div>
                <span className="text-[10px] text-indigo-400 shrink-0 font-semibold">Use →</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Duration ────────────────────────────────────────────── */}
        <motion.div {...fade(0.07)} className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
            <Clock size={10} /> Session Duration
          </p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {DURATION_PRESETS.map(p => (
              <button key={p.minutes}
                onClick={() => { setMinutes(p.minutes); setCustom(false); }}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                  !custom && minutes === p.minutes
                    ? "bg-indigo-600/20 border-indigo-500/30"
                    : "bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]"
                }`}>
                <p className={`text-lg font-bold ${!custom && minutes === p.minutes ? "text-white" : "text-slate-300"}`}>
                  {p.minutes}
                </p>
                <p className={`text-[10px] font-semibold ${!custom && minutes === p.minutes ? p.color : "text-slate-600"}`}>
                  {p.badge}
                </p>
              </button>
            ))}
          </div>

          {/* Custom picker */}
          <button onClick={() => setCustom(v => !v)}
            className={`w-full py-2 rounded-xl border text-xs font-semibold transition-all ${
              custom ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300" : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-slate-300"
            }`}>
            {custom ? `Custom: ${customMin} minutes` : "Custom duration"}
          </button>

          <AnimatePresence>
            {custom && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-3">
                <div className="flex items-center gap-4">
                  <input type="range" min={5} max={180} step={5} value={customMin}
                    onChange={e => setCustomMin(Number(e.target.value))}
                    className="flex-1 accent-indigo-500" />
                  <span className="text-lg font-bold text-white w-16 text-right">{customMin}m</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Session Type ─────────────────────────────────────────── */}
        <motion.div {...fade(0.09)} className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Session Type</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(SESSION_TYPE_CONFIG) as SessionType[]).map(t => {
              const cfg = SESSION_TYPE_CONFIG[t];
              const active = type === t;
              return (
                <button key={t} onClick={() => setType(t)}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                    active ? `${cfg.bg} border-opacity-50` : "bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]"
                  }`}>
                  <span className="text-lg">{cfg.emoji}</span>
                  <p className={`text-xs font-semibold ${active ? cfg.color : "text-slate-400"}`}>{cfg.label}</p>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Linking ──────────────────────────────────────────────── */}
        <motion.div {...fade(0.11)} className="bg-[#1c1f2e] border border-white/[0.08] rounded-2xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
            <Target size={10} /> Link to Goal / Event / Block
          </p>
          <select
            value={linkId}
            onChange={e => setLinkId(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/40 transition-colors appearance-none cursor-pointer"
            style={{ colorScheme: "dark" }}>
            <option value="">— No link (free session) —</option>
            <optgroup label="Goals">
              {LINK_OPTIONS.filter(l => l.category === "goal").map(l => (
                <option key={l.id} value={l.id}>{l.emoji} {l.title}</option>
              ))}
            </optgroup>
            <optgroup label="Events">
              {LINK_OPTIONS.filter(l => l.category === "event").map(l => (
                <option key={l.id} value={l.id}>{l.emoji} {l.title}</option>
              ))}
            </optgroup>
            <optgroup label="Cycle Milestones">
              {LINK_OPTIONS.filter(l => l.category === "cycle").map(l => (
                <option key={l.id} value={l.id}>{l.emoji} {l.title}</option>
              ))}
            </optgroup>
            <optgroup label="Planning Blocks">
              {LINK_OPTIONS.filter(l => l.category === "block").map(l => (
                <option key={l.id} value={l.id}>{l.emoji} {l.title}</option>
              ))}
            </optgroup>
          </select>
          {linkedItem && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mt-2 flex items-center gap-2 text-[11px] text-indigo-300">
              <span>{linkedItem.emoji}</span>
              <span>Linked to: <span className="font-semibold">{linkedItem.title}</span></span>
            </motion.div>
          )}
        </motion.div>

        {/* ── Launch button ─────────────────────────────────────────── */}
        <motion.div {...fade(0.13)}>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleStart}
            className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg transition-colors flex items-center justify-center gap-3 shadow-lg shadow-indigo-900/30">
            <Timer size={22} />
            Start {finalMinutes}-Minute {SESSION_TYPE_CONFIG[type].label} Session
          </motion.button>
          <p className="text-center text-[11px] text-slate-600 mt-2">
            {linkedItem ? `Linked to: ${linkedItem.title}` : "No goal linked — free session"}
          </p>
        </motion.div>

      </div>
    </div>
  );
}
