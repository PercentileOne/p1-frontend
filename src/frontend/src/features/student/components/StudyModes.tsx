/* ══════════════════════════════════════════════════════════════
   StudyModes — Quick Revision · Deep Dive · Mock Exam · Battle
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, BookOpen, Trophy, Swords, Clock,
  ArrowLeft, ChevronRight, Users, Check, Lock,
} from "lucide-react";
import type { Subject } from "../subjectsStore";
import SectionLabel from "../../cards/components/shared/SectionLabel";

type Mode = "quick" | "deep" | "mock" | "battle";

const MODE_META: Record<Mode, {
  icon:    React.ReactNode;
  label:   string;
  desc:    string;
  time:    string;
  color:   string;
  accent:  string;
  details: string[];
}> = {
  quick: {
    icon:    <Zap size={20} />,
    label:   "Quick Revision",
    desc:    "10–15 min burst — weak topics first",
    time:    "10–15 min",
    color:   "text-amber-400  border-amber-500/25  bg-amber-500/10",
    accent:  "from-amber-950/40 to-amber-900/20",
    details: ["Pulls your weakest subtopics automatically", "Short answer format — keyword detection", "Perfect for daily maintenance"],
  },
  deep: {
    icon:    <BookOpen size={20} />,
    label:   "Deep Dive",
    desc:    "Full learn + test on one subtopic",
    time:    "25–40 min",
    color:   "text-indigo-400 border-indigo-500/25 bg-indigo-500/10",
    accent:  "from-indigo-950/40 to-indigo-900/20",
    details: ["Choose a specific topic or subtopic", "Learn mode → concept test → score", "Boosts readiness by 15–20% per session"],
  },
  mock: {
    icon:    <Trophy size={20} />,
    label:   "Mock Exam",
    desc:    "Multi-topic timed exam — exam conditions",
    time:    "45–90 min",
    color:   "text-emerald-400 border-emerald-500/25 bg-emerald-500/10",
    accent:  "from-emerald-950/40 to-emerald-900/20",
    details: ["Covers all topics in the subject", "Strict timed conditions per section", "Predicted grade updated after each mock"],
  },
  battle: {
    icon:    <Swords size={20} />,
    label:   "Battle Mode",
    desc:    "Vs classmates — school-safe multiplayer",
    time:    "5–10 min",
    color:   "text-violet-400 border-violet-500/25 bg-violet-500/10",
    accent:  "from-violet-950/40 to-violet-900/20",
    details: ["Classmates only — no open rooms", "No chat — just scores", "Race to answer concepts first"],
  },
};

// ── Mode card ──────────────────────────────────────────────────────

function ModeCard({ mode, selected, onClick }: { mode: Mode; selected: boolean; onClick: () => void }) {
  const meta = MODE_META[mode];
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative w-full text-left flex items-center gap-4 p-4 rounded-2xl border transition-all ${
        selected ? meta.color + " ring-1 ring-current/20" : "border-white/[0.06] bg-[#0f1117] text-white/40"
      }`}
      style={selected ? { background: `linear-gradient(135deg, ${meta.accent.includes("amber") ? "rgba(120,53,15,0.25)" : meta.accent.includes("indigo") ? "rgba(30,27,75,0.25)" : meta.accent.includes("emerald") ? "rgba(6,78,59,0.20)" : "rgba(46,16,101,0.20)"} 0%, rgba(0,0,0,0) 100%)` } : undefined}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
        selected ? meta.color : "bg-white/[0.04] text-white/20 border border-white/[0.06]"
      }`}>
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] font-bold ${selected ? "" : "text-white/55"}`}>{meta.label}</p>
        <p className={`text-[10px] mt-0.5 ${selected ? "opacity-70" : "text-white/25"}`}>{meta.desc}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <Clock size={8} className={selected ? "opacity-60" : "text-white/20"} />
          <SectionLabel className={selected ? "opacity-60" : ""}>{meta.time}</SectionLabel>
        </div>
      </div>
      {selected && <Check size={14} className="shrink-0" />}
    </motion.button>
  );
}

// ── Quick Revision session ────────────────────────────────────────

function QuickRevisionSession({
  subject, onDone,
}: {
  subject: Subject; onDone: () => void;
}) {
  const weak = subject.topics.flatMap(t => t.subtopics).filter(st => st.readinessScore < 70)
    .sort((a, b) => a.readinessScore - b.readinessScore).slice(0, 5);

  const allConcepts = weak.flatMap(st => st.cardIds.length > 0 ? [] : [
    { id: `${st.id}-q1`, text: `${st.title} — core definition and application` },
    { id: `${st.id}-q2`, text: `${st.title} — when this technique is used` },
  ]);

  const [idx,      setIdx]      = useState(0);
  const [answer,   setAnswer]   = useState("");
  const [revealed, setRevealed] = useState(false);
  const [done,     setDone]     = useState(false);
  const [hits,     setHits]     = useState(0);

  const current = allConcepts[idx];
  const total   = allConcepts.length;

  if (done || total === 0) {
    const score = total === 0 ? 0 : Math.round((hits / total) * 100);
    return (
      <div className="flex flex-col items-center gap-5 py-8">
        <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
          <Trophy size={40} className="text-amber-400" />
        </motion.div>
        <div className="text-center">
          <p className="text-[28px] font-black text-white/90">{score}%</p>
          <p className="text-[12px] text-white/40 mt-1">Quick revision complete</p>
        </div>
        <button onClick={onDone} className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-bold transition-colors">
          Back to Study Modes
        </button>
      </div>
    );
  }

  const submit = () => {
    if (!answer.trim()) return;
    const hit = current.text.toLowerCase().split(/\s+/).filter(w => w.length > 3)
      .some(w => answer.toLowerCase().includes(w));
    if (hit) setHits(h => h + 1);
    setRevealed(true);
    setTimeout(() => {
      setRevealed(false);
      setAnswer("");
      if (idx >= total - 1) setDone(true);
      else setIdx(i => i + 1);
    }, 900);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <SectionLabel>{idx + 1} / {total}</SectionLabel>
        <SectionLabel className="text-amber-400/70">{hits} correct</SectionLabel>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div className="h-full rounded-full bg-amber-500" animate={{ width: `${((idx) / total) * 100}%` }} />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
          className="p-4 rounded-2xl border border-white/[0.08] bg-[#13151c]"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
        >
          <p className="text-[10px] text-white/35 mb-2">Explain:</p>
          <p className="text-[13px] font-bold text-white/88">"{current.text}"</p>
        </motion.div>
      </AnimatePresence>

      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) submit(); }}
        disabled={revealed}
        placeholder="Type your explanation… (Ctrl+Enter to submit)"
        rows={3}
        className={`w-full resize-none bg-white/[0.04] border rounded-2xl px-3.5 py-3 text-[12px] text-white/75 placeholder-white/20 outline-none transition-all ${
          revealed ? "border-white/[0.04] opacity-50" : "border-white/[0.08] focus:border-amber-500/40"
        }`}
      />

      <AnimatePresence>
        {revealed && (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className={`p-3 rounded-xl border flex items-center gap-2 ${
              current.text.toLowerCase().split(/\s+/).filter(w => w.length > 3).some(w => answer.toLowerCase().includes(w))
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-red-500/10 border-red-500/20 text-red-300"
            }`}>
            {current.text.toLowerCase().split(/\s+/).filter(w => w.length > 3).some(w => answer.toLowerCase().includes(w))
              ? <Check size={13} className="shrink-0" /> : <span className="text-[12px] shrink-0">✗</span>}
            <p className="text-[11px] font-medium">
              {current.text.toLowerCase().split(/\s+/).filter(w => w.length > 3).some(w => answer.toLowerCase().includes(w))
                ? "Great — key terms detected!" : "Missed — practice this concept"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {!revealed && (
        <motion.button whileTap={{ scale: 0.97 }} onClick={submit} disabled={!answer.trim()}
          className="py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-white text-[12px] font-bold transition-colors">
          Submit Answer
        </motion.button>
      )}
    </div>
  );
}

// ── Main StudyModes ───────────────────────────────────────────────

interface Props {
  subjects:  Subject[];
  onBack:    () => void;
}

export default function StudyModes({ subjects, onBack }: Props) {
  const [selected,       setSelected]       = useState<Mode>("quick");
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.id ?? "");
  const [running,        setRunning]        = useState(false);

  const subject = subjects.find(s => s.id === selectedSubject);

  if (running && selected === "quick" && subject) {
    return (
      <div className="flex flex-col gap-4">
        <button onClick={() => setRunning(false)} className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/55 transition-colors w-fit">
          <ArrowLeft size={11} /> Back
        </button>
        <QuickRevisionSession subject={subject} onDone={() => setRunning(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center hover:bg-white/10 transition-colors shrink-0">
          <ArrowLeft size={13} className="text-white/50" />
        </button>
        <div>
          <h2 className="text-[15px] font-bold text-white/90">Study Modes</h2>
          <p className="text-[10px] text-white/35 mt-0.5">Choose how you want to revise today</p>
        </div>
      </div>

      {/* Mode picker */}
      <div className="flex flex-col gap-2">
        <SectionLabel>Select mode</SectionLabel>
        {(["quick","deep","mock","battle"] as Mode[]).map(m => (
          <ModeCard key={m} mode={m} selected={selected === m} onClick={() => setSelected(m)} />
        ))}
      </div>

      {/* Mode details */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selected}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16 }}
          className="p-4 rounded-2xl border border-white/[0.06] bg-[#0f1117] flex flex-col gap-2"
        >
          <SectionLabel>What you'll do</SectionLabel>
          {MODE_META[selected].details.map((d, i) => (
            <div key={i} className="flex items-start gap-2">
              <ChevronRight size={10} className="text-white/25 mt-0.5 shrink-0" />
              <p className="text-[11px] text-white/55 leading-snug">{d}</p>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Subject selector */}
      {selected !== "battle" && (
        <div className="flex flex-col gap-1.5">
          <SectionLabel>Subject</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {subjects.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSubject(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-semibold transition-all ${
                  selectedSubject === s.id
                    ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-400"
                    : "border-white/[0.07] bg-white/[0.03] text-white/35"
                }`}
              >
                <span>{s.emoji}</span> {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Battle mode note */}
      {selected === "battle" && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-violet-500/15 bg-violet-950/15">
          <Users size={13} className="text-violet-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-violet-300">School-safe multiplayer</p>
            <p className="text-[10px] text-violet-400/60 mt-0.5">No open rooms — classmates only via share code. No chat — just scores. Fully monitored.</p>
          </div>
        </div>
      )}

      {/* CTA */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          if (selected === "quick") { setRunning(true); }
          // other modes: stub for Phase 10
        }}
        className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white text-[13px] font-bold transition-colors ${
          selected === "quick"  ? "bg-amber-600  hover:bg-amber-500" :
          selected === "deep"   ? "bg-indigo-600 hover:bg-indigo-500" :
          selected === "mock"   ? "bg-emerald-600 hover:bg-emerald-500" :
                                  "bg-violet-600 hover:bg-violet-500"
        }`}
      >
        {selected === "quick"  && <><Zap     size={15} /> Start Quick Revision</>}
        {selected === "deep"   && <><BookOpen size={15} /> Start Deep Dive</>}
        {selected === "mock"   && <><Trophy   size={15} /> Start Mock Exam</>}
        {selected === "battle" && <><Swords   size={15} /> Find Battle Room</>}
      </motion.button>

      {(selected === "deep" || selected === "mock" || selected === "battle") && (
        <div className="flex items-center gap-2 justify-center">
          <Lock size={9} className="text-white/15" />
          <p className="text-[9px] text-white/20">Full engine coming in Phase 10</p>
        </div>
      )}
    </div>
  );
}
