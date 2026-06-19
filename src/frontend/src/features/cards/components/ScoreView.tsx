/* ══════════════════════════════════════════════════════════════
   ScoreView — Phase 2: real breakdown + concepts hit/miss +
   time used + streak update + 4-tab leaderboard
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, RotateCcw, Star, Hash, Globe, Crown, CheckCircle2, XCircle, Flame, Clock } from "lucide-react";
import type { ScoreBreakdown } from "../types";
import type { TestSession } from "../testStore";
import SectionLabel from "./shared/SectionLabel";
import MasteryRing from "./shared/MasteryRing";

interface Props {
  store:    TestSession;
  onRetry:  () => void;
  onClose:  () => void;
}

// ── Leaderboard data ──────────────────────────────────────────────
type LBScope = "global" | "country" | "university" | "friends";

interface LBEntry {
  rank:     number;
  name:     string;
  initials: string;
  accent:   string;
  score:    number;
  you?:     boolean;
}

const RIVALS = [
  { name: "Alex Chen",    initials: "AC", accent: "bg-amber-500",   baseScore: 92 },
  { name: "Sam Rivera",   initials: "SR", accent: "bg-emerald-500", baseScore: 85 },
  { name: "Jordan Park",  initials: "JP", accent: "bg-sky-500",     baseScore: 78 },
  { name: "Taylor Moore", initials: "TM", accent: "bg-violet-500",  baseScore: 71 },
  { name: "Riley Kim",    initials: "RK", accent: "bg-rose-500",    baseScore: 64 },
];

function buildLeaderboard(userScore: number): LBEntry[] {
  const all: Omit<LBEntry, "rank">[] = [
    ...RIVALS.map(r => ({ ...r, score: r.baseScore })),
    { name: "You", initials: "ME", accent: "bg-indigo-500", score: userScore, you: true },
  ];
  all.sort((a, b) => b.score - a.score);
  return all.map((e, i) => ({ ...e, rank: i + 1 }));
}

const LB_TABS: { id: LBScope; icon: React.ReactNode; label: string }[] = [
  { id: "global",     icon: <Globe size={11} />, label: "Global"  },
  { id: "country",    icon: <Hash size={11} />,  label: "Country" },
  { id: "university", icon: <Crown size={11} />, label: "Uni"     },
  { id: "friends",    icon: <Star size={11} />,  label: "Friends" },
];

// ── Breakdown rows helper ─────────────────────────────────────────
function breakdownRows(bd: ScoreBreakdown, elapsed: number, total: number) {
  const elapsedMins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const elapsedSecs = String(elapsed % 60).padStart(2, "0");
  const totalMins   = String(Math.floor(total / 60)).padStart(2, "0");
  const totalSecs   = String(total % 60).padStart(2, "0");

  return [
    { label: "Base score",            value: `${bd.rawPct}%`,                   accent: "text-white/70" },
    { label: "Time used",             value: `${elapsedMins}:${elapsedSecs} / ${totalMins}:${totalSecs}`, accent: "text-white/50" },
    { label: "Difficulty ×",          value: `${bd.diffMultiplier.toFixed(2)}`,  accent: "text-amber-400" },
    { label: "Speed bonus ×",         value: `${bd.speedBonus.toFixed(2)}`,      accent: "text-sky-400" },
    { label: "Accuracy bonus ×",      value: `${bd.accuracyBonus.toFixed(2)}`,   accent: "text-emerald-400" },
    { label: "Streak bonus ×",        value: `${bd.streakBonus.toFixed(2)}`,     accent: "text-violet-400" },
    { label: "Misconception penalty", value: `−${bd.misconceptionPenalty}`,      accent: "text-rose-400" },
  ];
}

// ── Grade ring accent color for stroke ──────────────────────────
function gradeRingAccent(grade: ScoreBreakdown["grade"]): string {
  return {
    S: "stroke-amber-400",
    A: "stroke-emerald-400",
    B: "stroke-sky-400",
    C: "stroke-violet-400",
    D: "stroke-rose-400",
  }[grade];
}

// ── Main component ────────────────────────────────────────────────
export default function ScoreView({ store, onRetry, onClose }: Props) {
  const { card, activeConcepts, totalConceptCount, breakdown, elapsed, conceptsHit, misconceptions, liveScore } = store;
  const [lbScope, setLbScope] = useState<LBScope>("global");

  const bd      = breakdown;
  const total   = card.testConfig.timeLimitSeconds;
  const hitIds  = conceptsHit;
  const missed  = activeConcepts.filter(c => !hitIds.has(c.id));
  const hitList = activeConcepts.filter(c =>  hitIds.has(c.id));
  const testedCount    = activeConcepts.length;
  const wasSubset      = testedCount < totalConceptCount;
  const newStreak = card.mastery.streak + (bd && bd.finalScore >= 70 ? 1 : 0);
  const streakGained = bd ? bd.finalScore >= 70 : false;

  const leaderboard = buildLeaderboard(bd?.finalScore ?? liveScore);

  if (!bd) {
    return (
      <div className="flex items-center justify-center h-40 text-white/30 text-[12px]">
        Calculating…
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-5 h-full overflow-y-auto"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* ── Hero score ── */}
      <div className="flex flex-col items-center gap-3 py-4">
        <motion.div
          className="relative"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.05 }}
        >
          <MasteryRing
            score={bd.finalScore}
            size={100}
            accent={gradeRingAccent(bd.grade)}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className={`text-[30px] font-black leading-none ${bd.gradeAccent}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.2 }}
            >
              {bd.grade}
            </motion.span>
            <span className="text-[10px] text-white/35 font-mono tabular-nums">{bd.finalScore} pts</span>
          </div>
        </motion.div>

        <motion.p
          className="text-[13px] text-white/65 font-medium text-center"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {bd.verdict}
        </motion.p>

        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5 text-white/30">
            <Trophy size={11} className="text-amber-400/60" />
            <span>{card.title}</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/30">
            <Clock size={11} />
            <span className="tabular-nums">{String(Math.floor(elapsed / 60)).padStart(2,"0")}:{String(elapsed % 60).padStart(2,"0")} used</span>
          </div>
        </div>

        {/* Streak update */}
        <AnimatePresence>
          {streakGained && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/25"
            >
              <Flame size={12} className="text-amber-400" />
              <span className="text-[11px] font-semibold text-amber-300">
                Streak {card.mastery.streak} → {newStreak}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Score breakdown table ── */}
      <div className="flex flex-col gap-2">
        <SectionLabel>Score breakdown</SectionLabel>
        <div className="rounded-xl overflow-hidden border border-white/[0.06]">
          {breakdownRows(bd, elapsed, total).map((row, i) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.2 }}
              className={`flex justify-between items-center px-3 py-2 text-[11px] ${
                i % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"
              }`}
            >
              <span className="text-white/40">{row.label}</span>
              <span className={`font-semibold tabular-nums ${row.accent}`}>{row.value}</span>
            </motion.div>
          ))}
          <div className="flex justify-between items-center px-3 py-2.5 bg-white/[0.05] border-t border-white/[0.06]">
            <span className="text-[12px] font-bold text-white/70">Final Score</span>
            <motion.span
              key={bd.finalScore}
              initial={{ scale: 1.3, color: "#7dd3fc" }}
              animate={{ scale: 1,    color: "currentColor" }}
              transition={{ duration: 0.4 }}
              className={`text-[17px] font-black tabular-nums ${bd.gradeAccent}`}
            >
              {bd.finalScore}
            </motion.span>
          </div>
        </div>
      </div>

      {/* ── Concepts hit / missed ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <SectionLabel>Concepts</SectionLabel>
          <span className="text-[10px] text-white/30">
            <span className="text-emerald-400 font-semibold">{hitList.length}</span> hit ·{" "}
            <span className="text-rose-400/70 font-semibold">{missed.length}</span> missed
          </span>
        </div>

        {/* Coverage stat row */}
        <div className="grid grid-cols-3 gap-1.5 mb-1">
          {[
            { label: "Available",  value: String(totalConceptCount), accent: "text-white/60" },
            { label: "Tested",     value: String(testedCount),       accent: wasSubset ? "text-amber-400" : "text-white/60" },
            { label: "Hit",        value: `${hitList.length}/${testedCount}`, accent: "text-emerald-400" },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center gap-0.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <span className={`text-[14px] font-black tabular-nums ${s.accent}`}>{s.value}</span>
              <SectionLabel>{s.label}</SectionLabel>
            </div>
          ))}
        </div>
        {wasSubset && (
          <p className="text-[9px] text-amber-400/60 text-center -mt-0.5">
            Subset mode — {totalConceptCount - testedCount} concept{totalConceptCount - testedCount !== 1 ? "s" : ""} not tested this session
          </p>
        )}
        <div className="grid grid-cols-1 gap-1.5">
          {/* Hits */}
          {hitList.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * i }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/8 border border-emerald-500/15"
            >
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
              <span className="text-[11px] text-emerald-300/80 flex-1">{c.text}</span>
              <span className="text-[9px] text-emerald-400/40">×{c.weight}</span>
            </motion.div>
          ))}
          {/* Misses */}
          {missed.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * (hitList.length + i) }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]"
            >
              <XCircle size={12} className="text-rose-400/50 shrink-0" />
              <span className="text-[11px] text-white/35 flex-1">{c.text}</span>
              <span className="text-[10px] text-white/35">×{c.weight}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Misconceptions (if any) ── */}
      {misconceptions.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Misconceptions flagged</SectionLabel>
          {misconceptions.map((m, i) => (
            <div key={i} className="flex gap-2 px-3 py-2 rounded-lg bg-rose-950/35 border border-rose-500/15">
              <span className="text-rose-400 text-[11px] shrink-0">✗</span>
              <span className="text-[11px] text-rose-300/70">{m}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Leaderboard ── */}
      <div className="flex flex-col gap-3">
        <SectionLabel>Leaderboard</SectionLabel>

        {/* Tab strip */}
        <div className="flex gap-1 p-1 rounded-lg bg-black/20">
          {LB_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setLbScope(t.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
                lbScope === t.id
                  ? "bg-indigo-600/40 text-indigo-300"
                  : "text-white/30 hover:text-white/50"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Rows */}
        <AnimatePresence mode="wait">
          <motion.div
            key={lbScope}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-1.5"
          >
            {leaderboard.map((entry, i) => (
              <motion.div
                key={entry.name}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                  entry.you
                    ? "bg-indigo-600/12 border-indigo-500/25"
                    : "bg-white/[0.03] border-white/[0.05]"
                }`}
              >
                <span className={`text-[11px] font-black tabular-nums w-4 shrink-0 ${
                  entry.rank === 1 ? "text-amber-400"
                  : entry.rank === 2 ? "text-white/50"
                  : entry.rank === 3 ? "text-amber-600/70"
                  : "text-white/20"
                }`}>
                  {entry.rank}
                </span>
                <div className={`w-7 h-7 rounded-full ${entry.accent} flex items-center justify-center shrink-0`}>
                  <span className="text-[9px] font-bold text-white">{entry.initials}</span>
                </div>
                <span className={`flex-1 text-[12px] font-semibold ${
                  entry.you ? "text-indigo-300" : "text-white/65"
                }`}>
                  {entry.name}
                  {entry.you && <span className="ml-1.5 text-[9px] font-normal text-indigo-400/60">you</span>}
                </span>
                <motion.span
                  key={`${entry.name}-${entry.score}`}
                  initial={entry.you ? { scale: 1.25, color: "#818cf8" } : {}}
                  animate={{ scale: 1, color: "currentColor" }}
                  transition={{ duration: 0.4 }}
                  className="text-[12px] font-bold tabular-nums text-white/55"
                >
                  {entry.score}
                </motion.span>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-2 pt-1 pb-4">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/50 text-[12px] font-semibold transition-colors"
        >
          Close
        </button>
        <button
          onClick={onRetry}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-semibold transition-colors shadow-lg shadow-indigo-900/30"
        >
          <RotateCcw size={12} />
          Retry
        </button>
      </div>
    </motion.div>
  );
}
