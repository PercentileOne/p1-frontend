/* ══════════════════════════════════════════════════════════════
   MultiplayerResults — final ranked leaderboard after the race
   ══════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { Trophy, RotateCcw, ArrowLeft, Clock, BookOpen, Crown, Zap } from "lucide-react";
import type { MPStore } from "../../multiplayerStore";
import Avatar from "./Avatar";
import SectionLabel from "../shared/SectionLabel";

interface Props {
  store:       MPStore;
  cardTitle:   string;
  onRematch:   () => void;
  onLeave:     () => void;
}

interface RankedEntry {
  participantId: string;
  name:          string;
  initials:      string;
  accent:        string;
  isLocal:       boolean;
  isBot:         boolean;
  score:         number;
  conceptsHit:   number;
  timeUsed:      number;
  rank:          number;
}

export default function MultiplayerResults({ store, cardTitle, onRematch, onLeave }: Props) {
  const { participants, results, localUserId } = store;

  // Build ranked list: sort by score desc, then timeUsed asc
  const ranked: RankedEntry[] = participants
    .map(p => {
      const r = results[p.id];
      return {
        participantId: p.id,
        name:          p.name,
        initials:      p.initials,
        accent:        p.accent,
        isLocal:       p.isLocal,
        isBot:         p.isBot,
        score:         r?.score ?? r?.currentScore ?? 0,
        conceptsHit:   (r?.conceptsHit ?? []).length,
        timeUsed:      r?.timeUsed ?? 0,
        rank:          0,
      };
    })
    .sort((a, b) => b.score !== a.score ? b.score - a.score : a.timeUsed - b.timeUsed)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  const localEntry = ranked.find(e => e.participantId === localUserId);
  const winner     = ranked[0];
  const youWon     = winner?.participantId === localUserId;

  function fmtTime(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  return (
    <motion.div
      className="flex flex-col gap-5 h-full overflow-y-auto"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* ── Hero banner ── */}
      <div className={`
        relative flex flex-col items-center gap-3 py-6 rounded-2xl border overflow-hidden
        ${youWon
          ? "bg-gradient-to-br from-amber-950/60 to-amber-900/30 border-amber-500/20"
          : "bg-gradient-to-br from-indigo-950/60 to-indigo-900/30 border-indigo-500/20"}
      `}>
        <div className={`absolute top-0 left-0 right-0 h-[2px] ${youWon ? "bg-amber-400" : "bg-indigo-500"}`} />

        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 20, delay: 0.1 }}
        >
          {youWon
            ? <Crown size={36} className="text-amber-400" />
            : <Trophy size={36} className="text-indigo-400" />}
        </motion.div>

        <div className="flex flex-col items-center gap-1">
          <span className={`text-[18px] font-black ${youWon ? "text-amber-300" : "text-white/90"}`}>
            {youWon ? "You Won!" : `${winner?.name} wins`}
          </span>
          <span className="text-[11px] text-white/40">{cardTitle} · Battle complete</span>
        </div>

        {localEntry && (
          <div className="flex items-center gap-4 mt-1">
            <div className="flex flex-col items-center">
              <span className={`text-[26px] font-black tabular-nums ${youWon ? "text-amber-300" : "text-white/80"}`}>
                {localEntry.score}
              </span>
              <SectionLabel>Your score</SectionLabel>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-center">
              <span className="text-[18px] font-bold text-white/70 tabular-nums">#{localEntry.rank}</span>
              <SectionLabel>Rank</SectionLabel>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-center">
              <span className="text-[18px] font-bold text-white/70 tabular-nums">{fmtTime(localEntry.timeUsed)}</span>
              <SectionLabel>Time</SectionLabel>
            </div>
          </div>
        )}
      </div>

      {/* ── Full leaderboard ── */}
      <div className="flex flex-col gap-2">
        <SectionLabel>Final standings</SectionLabel>

        {ranked.map((entry, i) => (
          <motion.div
            key={entry.participantId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 + i * 0.06, duration: 0.22 }}
            className={`
              flex items-center gap-3 px-3 py-3 rounded-xl border transition-all
              ${entry.isLocal
                ? "bg-indigo-600/12 border-indigo-500/25"
                : "bg-white/[0.03] border-white/[0.05]"}
            `}
          >
            {/* Rank */}
            <div className="w-6 text-center shrink-0">
              {entry.rank === 1 ? (
                <Crown size={14} className="text-amber-400 mx-auto" />
              ) : (
                <span className={`text-[12px] font-black tabular-nums ${
                  entry.rank === 2 ? "text-white/50" : entry.rank === 3 ? "text-amber-600/70" : "text-white/20"
                }`}>
                  {entry.rank}
                </span>
              )}
            </div>

            {/* Avatar */}
            <Avatar
              initials={entry.initials}
              accent={entry.accent}
              size="sm"
              isLocal={entry.isLocal}
              isBot={entry.isBot}
              done
              pulse={entry.rank === 1 && entry.isLocal}
            />

            {/* Name */}
            <div className="flex-1 min-w-0">
              <span className={`text-[12px] font-semibold ${entry.isLocal ? "text-indigo-300" : "text-white/70"}`}>
                {entry.name}
                {entry.isLocal && <span className="ml-1.5 text-[9px] text-indigo-400/50 font-normal">you</span>}
              </span>
              {/* Concept + time sub-row */}
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1 text-[11px] text-white/45">
                  <BookOpen size={8} />
                  <span>{entry.conceptsHit} concepts</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-white/45">
                  <Clock size={8} />
                  <span>{fmtTime(entry.timeUsed)}</span>
                </div>
              </div>
            </div>

            {/* Score */}
            <motion.span
              key={`score-${entry.score}`}
              initial={entry.isLocal ? { scale: 1.2, color: "#818cf8" } : {}}
              animate={{ scale: 1, color: "currentColor" }}
              transition={{ duration: 0.4 }}
              className={`text-[15px] font-black tabular-nums shrink-0 ${
                entry.rank === 1 ? "text-amber-400"
                : entry.isLocal ? "text-indigo-300"
                : "text-white/55"
              }`}
            >
              {entry.score}
            </motion.span>
          </motion.div>
        ))}
      </div>

      {/* ── Agent verdict ── */}
      {localEntry && (
        <div className="flex gap-3 px-3 py-3 rounded-xl bg-indigo-600/[0.07] border border-indigo-500/15">
          <Zap size={13} className="text-indigo-400 mt-px shrink-0" />
          <p className="text-[11px] text-white/55 leading-relaxed">
            {localEntry.rank === 1
              ? `Flawless — you topped ${ranked.length - 1} opponents with ${localEntry.score} points. Mastery confirmed.`
              : `You placed #${localEntry.rank} with ${localEntry.score} pts. The top score was ${ranked[0]?.score} — retry to close the gap.`}
          </p>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-2 pb-4">
        <button
          onClick={onLeave}
          className="flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/50 text-[12px] font-semibold transition-colors"
        >
          <ArrowLeft size={12} />
          Leave
        </button>
        <button
          onClick={onRematch}
          className="flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-semibold transition-colors shadow-lg shadow-indigo-900/30"
        >
          <RotateCcw size={12} />
          Rematch
        </button>
      </div>
    </motion.div>
  );
}
