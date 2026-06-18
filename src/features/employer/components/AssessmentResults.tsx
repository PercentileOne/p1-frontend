/* ══════════════════════════════════════════════════════════════
   AssessmentResults — ranked candidate table with breakdown
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, BarChart3, Clock, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronUp, Trophy, Flame, XCircle,
} from "lucide-react";
import type { Assessment, AssessmentResult } from "../employerStore";
import SectionLabel from "../../cards/components/shared/SectionLabel";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function scoreColor(n: number) {
  if (n >= 80) return "text-emerald-400";
  if (n >= 60) return "text-amber-400";
  return "text-red-400";
}

function scoreBg(n: number) {
  if (n >= 80) return "bg-emerald-500/10 border-emerald-500/20";
  if (n >= 60) return "bg-amber-500/10  border-amber-500/20";
  return                "bg-red-500/10  border-red-500/20";
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-[11px]">🥇</span>;
  if (rank === 2) return <span className="text-[11px]">🥈</span>;
  if (rank === 3) return <span className="text-[11px]">🥉</span>;
  return <span className="text-[10px] font-bold text-white/20">#{rank}</span>;
}

function ScoreRing({ score }: { score: number }) {
  const r    = 16;
  const circ = 2 * Math.PI * r;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={40} height={40} viewBox="0 0 40 40" className="-rotate-90">
      <circle cx={20} cy={20} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
      <motion.circle
        cx={20} cy={20} r={r} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - score / 100) }}
        transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
      />
    </svg>
  );
}

function BreakdownPanel({ result }: { result: AssessmentResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{   opacity: 0, height: 0     }}
      transition={{ duration: 0.22 }}
      className="overflow-hidden"
    >
      <div className="px-4 pb-4 pt-2 flex flex-col gap-3 border-t border-white/[0.05]">

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: <Trophy size={10} className="text-amber-400" />,    label: "Score",    value: `${result.score}%`    },
            { icon: <Clock  size={10} className="text-sky-400"   />,    label: "Time",     value: fmt(result.timeUsed)   },
            { icon: <BarChart3 size={10} className="text-indigo-400" />, label: "Concepts", value: String(result.strongConcepts.length + result.weakConcepts.length) },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.04] border border-white/[0.05]">
              {s.icon}
              <span className="text-[12px] font-bold text-white/80">{s.value}</span>
              <SectionLabel>{s.label}</SectionLabel>
            </div>
          ))}
        </div>

        {/* Weak */}
        {result.weakConcepts.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle size={9} className="text-red-400" />
              <SectionLabel className="text-red-400/70">Missed concepts</SectionLabel>
            </div>
            <div className="flex flex-col gap-1">
              {result.weakConcepts.map(c => (
                <div key={c.id} className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-red-500/05 border border-red-500/10">
                  <XCircle size={8} className="text-red-400/60 mt-0.5 shrink-0" />
                  <span className="text-[10px] text-white/55 leading-snug">{c.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strong */}
        {result.strongConcepts.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Flame size={9} className="text-emerald-400" />
              <SectionLabel className="text-emerald-400/70">Strong concepts</SectionLabel>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.strongConcepts.map(c => (
                <span key={c.id} className="text-[9px] text-emerald-300/60 bg-emerald-500/08 border border-emerald-500/12 px-2 py-0.5 rounded-full">
                  {c.text.split(" ").slice(0, 5).join(" ")}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface Props {
  assessment: Assessment;
  onBack:     () => void;
}

export default function AssessmentResults({ assessment, onBack }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Sort by score desc
  const ranked = [...assessment.results].sort((a, b) => b.score - a.score);

  const avg    = ranked.length ? Math.round(ranked.reduce((s, r) => s + r.score, 0) / ranked.length) : 0;
  const passed = ranked.filter(r => r.score >= 70).length;

  return (
    <div className="flex flex-col gap-5">

      {/* Back + title */}
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center hover:bg-white/10 transition-colors shrink-0 mt-0.5"
        >
          <ArrowLeft size={13} className="text-white/50" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-bold text-white/90 leading-snug">{assessment.title}</h3>
          <p className="text-[10px] text-white/35 mt-0.5">Results · {ranked.length} candidates</p>
        </div>
      </div>

      {/* Summary stats */}
      <div
        className="relative grid grid-cols-3 gap-2 p-4 rounded-2xl border border-white/[0.06]"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(0,0,0,0) 70%)" }}
      >
        <div className="absolute top-0 left-4 right-4 h-[2px] rounded-b-full bg-gradient-to-r from-indigo-500 to-violet-500 opacity-50" />
        {[
          { label: "Avg score", value: `${avg}%`,        icon: <BarChart3    size={12} className="text-indigo-400" /> },
          { label: "Passed",    value: String(passed),   icon: <CheckCircle2 size={12} className="text-emerald-400" /> },
          { label: "Sections",  value: String(assessment.sections.length), icon: <Trophy size={12} className="text-amber-400" /> },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            {s.icon}
            <span className="text-[15px] font-black text-white/85">{s.value}</span>
            <SectionLabel>{s.label}</SectionLabel>
          </div>
        ))}
      </div>

      {/* Candidate rows */}
      <div className="flex flex-col gap-2">
        <SectionLabel>Ranked by score</SectionLabel>
        {ranked.length === 0 && (
          <div className="text-center py-10">
            <p className="text-[12px] text-white/30">No results yet</p>
            <p className="text-[10px] text-white/20 mt-1">Candidates must complete the assessment first</p>
          </div>
        )}
        {ranked.map((result, i) => {
          const open = expanded === result.userId;
          return (
            <motion.div
              key={result.userId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-2xl border overflow-hidden ${scoreBg(result.score)} transition-colors`}
              style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.04) inset" }}
            >
              <button
                className="w-full flex items-center gap-3 p-3.5 text-left"
                onClick={() => setExpanded(open ? null : result.userId)}
              >
                {/* Rank */}
                <div className="w-6 text-center shrink-0">
                  <RankBadge rank={i + 1} />
                </div>

                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl ${result.userAccent} flex items-center justify-center shrink-0`}>
                  <span className="text-[10px] font-bold text-white">{result.userInitials}</span>
                </div>

                {/* Name + date */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-white/80">{result.userName}</p>
                  <p className="text-[9px] text-white/30 mt-0.5">
                    {result.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {fmt(result.timeUsed)}
                  </p>
                </div>

                {/* Ring + score */}
                <div className="relative shrink-0">
                  <ScoreRing score={result.score} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-[9px] font-black ${scoreColor(result.score)}`}>{result.score}</span>
                  </div>
                </div>

                {/* Expand toggle */}
                <div className="text-white/20 shrink-0">
                  {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </div>
              </button>

              <AnimatePresence>
                {open && <BreakdownPanel result={result} />}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Pending candidates */}
      {assessment.assignedTo.filter(uid => !ranked.some(r => r.userId === uid)).length > 0 && (
        <div className="p-4 rounded-2xl border border-white/[0.05] bg-white/[0.02]">
          <SectionLabel>Pending — not yet completed</SectionLabel>
          <p className="text-[11px] text-white/30 mt-2">
            {assessment.assignedTo.filter(uid => !ranked.some(r => r.userId === uid)).length} candidate(s) assigned but not submitted
          </p>
        </div>
      )}
    </div>
  );
}
