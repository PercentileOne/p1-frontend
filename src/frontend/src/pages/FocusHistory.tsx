import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, SlidersHorizontal, Timer, Shield,
  Zap, X, BookOpen,
} from "lucide-react";
import {
  DEMO_SESSIONS, FocusEngine, SESSION_TYPE_CONFIG,
} from "../lib/focusEngine";
import type { SessionType } from "../lib/focusEngine";

/* ══════════════════════════════════════════════════════════════
   FOCUS HISTORY  /focus/history
   ══════════════════════════════════════════════════════════════ */

const SESSION_TYPES: SessionType[] = ["strategic","buffer","breakout","study","work","custom"];

export default function FocusHistory() {
  const navigate = useNavigate();
  const [search,       setSearch]       = useState("");
  const [showFilters,  setShowFilters]  = useState(false);
  const [filterType,   setFilterType]   = useState<SessionType | "">("");
  const [filterGoal,   setFilterGoal]   = useState("");
  const [filterMinMin, setFilterMinMin] = useState(0);
  const [filterProof,  setFilterProof]  = useState(false);

  const filtered = DEMO_SESSIONS.filter(s => {
    if (filterType && s.type !== filterType) return false;
    if (filterGoal && s.linkedGoalTitle !== filterGoal) return false;
    if (s.actualMinutes < filterMinMin) return false;
    if (filterProof && !s.proofSaved) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !s.whatWorkedOn.toLowerCase().includes(q) &&
        !s.notes.toLowerCase().includes(q) &&
        !(s.linkedGoalTitle ?? "").toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const grouped = FocusEngine.groupByDate(filtered);
  const allGoals = [...new Set(DEMO_SESSIONS.map(s => s.linkedGoalTitle).filter(Boolean))] as string[];
  const hasFilters = !!(filterType || filterGoal || filterMinMin > 0 || filterProof);

  const clearFilters = () => {
    setFilterType(""); setFilterGoal(""); setFilterMinMin(0); setFilterProof(false);
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate("/focus")}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">Focus History</h1>
            <p className="text-[11px] text-slate-500">{DEMO_SESSIONS.length} sessions · {FocusEngine.totalMinutes(DEMO_SESSIONS)} total minutes</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search sessions, notes, goals…"
              className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 transition-colors" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                <X size={13} />
              </button>
            )}
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
              showFilters || hasFilters ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300" : "bg-white/[0.04] border-white/[0.08] text-slate-400"
            }`}>
            <SlidersHorizontal size={13} />
            {hasFilters ? `Filters (${[filterType,filterGoal,filterMinMin>0,filterProof].filter(Boolean).length})` : "Filters"}
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-white/[0.06] bg-[#13151c]">
            <div className="px-6 py-4 space-y-4">

              {/* Type */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Session Type</p>
                <div className="flex flex-wrap gap-2">
                  {SESSION_TYPES.map(t => {
                    const cfg = SESSION_TYPE_CONFIG[t];
                    return (
                      <button key={t} onClick={() => setFilterType(prev => prev === t ? "" : t)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-all ${
                          filterType === t ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300" : "bg-white/[0.03] border-white/[0.06] text-slate-400"
                        }`}>
                        {cfg.emoji} {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Goal */}
              {allGoals.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Linked Goal</p>
                  <div className="flex flex-wrap gap-2">
                    {allGoals.map(g => (
                      <button key={g} onClick={() => setFilterGoal(prev => prev === g ? "" : g)}
                        className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                          filterGoal === g ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300" : "bg-white/[0.03] border-white/[0.06] text-slate-400"
                        }`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Min duration */}
              <div>
                <div className="flex justify-between mb-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Min Duration</p>
                  <span className="text-[11px] text-indigo-400 font-bold">{filterMinMin}+ min</span>
                </div>
                <input type="range" min={0} max={90} step={15} value={filterMinMin}
                  onChange={e => setFilterMinMin(Number(e.target.value))}
                  className="w-full accent-indigo-500" />
              </div>

              {/* Proof only */}
              <button onClick={() => setFilterProof(v => !v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                  filterProof ? "bg-green-600/15 border-green-500/25 text-green-300" : "bg-white/[0.03] border-white/[0.06] text-slate-400"
                }`}>
                <Shield size={11} /> Proof-saved sessions only
              </button>

              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-slate-500 hover:text-slate-400 flex items-center gap-1.5 transition-colors">
                  <X size={11} /> Clear all filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      <div className="px-6 py-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Timer size={24} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">No sessions found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or start your first session.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ date, sessions }) => (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{date}</p>
                  <div className="flex-1 h-px bg-white/[0.05]" />
                  <span className="text-[10px] text-slate-600">
                    {sessions.reduce((s, f) => s + f.actualMinutes, 0)}min
                  </span>
                </div>

                {/* Session cards */}
                <div className="space-y-2.5">
                  {sessions.map(s => {
                    const cfg = SESSION_TYPE_CONFIG[s.type];
                    return (
                      <motion.div key={s.id} whileHover={{ y: -1 }}
                        className="bg-[#1c1f2e] border border-white/[0.08] rounded-xl p-4 hover:border-indigo-500/15 transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
                            style={{ backgroundColor: `${cfg.color.replace("text-","").includes("indigo") ? "#6366f1" : "#10b981"}15` }}>
                            {cfg.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color}`}>
                                {cfg.label}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                <Timer size={9} /> {s.actualMinutes}min
                              </span>
                              <span className="text-[10px] text-slate-600">
                                {s.startTime.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" })}
                              </span>
                              {s.proofSaved && <Shield size={9} className="text-green-400" />}
                              {!s.completed && <span className="text-[10px] text-amber-400">ended early</span>}
                            </div>

                            <p className="text-sm font-semibold text-white">{s.whatWorkedOn}</p>

                            {s.notes && (
                              <div className="flex items-start gap-1.5 mt-1.5">
                                <BookOpen size={10} className="text-slate-600 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-slate-500 italic">{s.notes}</p>
                              </div>
                            )}

                            {(s.linkedGoalTitle || s.linkedEventTitle) && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <Zap size={9} className="text-indigo-400" />
                                <p className="text-[10px] text-indigo-400">{s.linkedGoalTitle ?? s.linkedEventTitle}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-8" />
    </div>
  );
}
