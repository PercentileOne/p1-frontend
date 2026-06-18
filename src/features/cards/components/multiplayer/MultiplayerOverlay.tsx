/* ══════════════════════════════════════════════════════════════
   MultiplayerOverlay — local test wrapped in room context.
   - Owns useTestStore for local detection/scoring
   - Room header strip (LIVE badge + timer + players)
   - Live player score bars alongside the test
   - On local completion → submits to multiplayerStore
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Clock } from "lucide-react";
import type { CognitiveCardData } from "../../types";
import type { MPStore } from "../../multiplayerStore";
import { useTestStore } from "../../testStore";
import TestView from "../TestView";
import Avatar from "./Avatar";
import SectionLabel from "../shared/SectionLabel";

interface Props {
  card:    CognitiveCardData;
  mpStore: MPStore;
}

// ── Per-player score bar ──────────────────────────────────────────
function PlayerBar({
  initials, accent, name, currentScore, done, isLocal, revealedCount, totalConcepts,
}: {
  initials: string; accent: string; name: string;
  currentScore: number; done: boolean;
  isLocal: boolean; revealedCount: number; totalConcepts: number;
}) {
  const pct = Math.min(100, currentScore);

  return (
    <div className="flex items-center gap-2">
      <Avatar initials={initials} accent={accent} size="xs" isLocal={isLocal} done={done} />
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <div className="flex justify-between items-center">
          <span className={`text-[9px] font-semibold truncate ${isLocal ? "text-indigo-300" : "text-white/50"}`}>
            {isLocal ? "You" : name}
          </span>
          <span className="text-[9px] font-bold tabular-nums text-white/40">{currentScore}</span>
        </div>
        <div className="h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${done ? "bg-emerald-500" : isLocal ? "bg-indigo-500" : accent.replace("bg-", "bg-")}`}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────

export default function MultiplayerOverlay({ card, mpStore }: Props) {
  const store       = useTestStore(card);
  const submittedRef = useRef(false);
  const { participants, results, elapsedSeconds, localUserId } = mpStore;
  const timeLimit   = card.testConfig.timeLimitSeconds;
  const timeLeft    = Math.max(0, timeLimit - elapsedSeconds);

  // Format shared room timer
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");
  const timePct = (timeLeft / timeLimit) * 100;
  const timerColor = timePct > 50 ? "text-emerald-400" : timePct > 25 ? "text-amber-400" : "text-rose-400";

  // Submit local score when local test completes
  useEffect(() => {
    if (store.breakdown && !submittedRef.current) {
      submittedRef.current = true;
      mpStore.submitLocalScore({
        score:       store.breakdown.finalScore,
        conceptsHit: [...store.conceptsHit],
        timeUsed:    store.elapsed,
      });
    }
  }, [store.breakdown]);

  // Room time-up: force-submit if local hasn't finished
  useEffect(() => {
    if (elapsedSeconds >= timeLimit && !submittedRef.current) {
      submittedRef.current = true;
      const bd = store.submit();
      mpStore.submitLocalScore({
        score:       bd.finalScore,
        conceptsHit: [...store.conceptsHit],
        timeUsed:    store.elapsed,
      });
    }
  }, [elapsedSeconds]);

  const doneCount = Object.values(results).filter(r => r.done).length;
  const totalCount = participants.length;

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* ── Room header strip ── */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/30 border border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          {/* LIVE pulse */}
          <motion.div
            className="flex items-center gap-1.5"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-rose-400">Live</span>
          </motion.div>

          <div className="w-px h-3.5 bg-white/10" />
          <Radio size={10} className="text-white/25" />
          <span className="text-[10px] text-white/40">
            {mpStore.session?.name ?? "Room"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Participants done indicator */}
          <div className="flex items-center gap-1 text-[10px] text-white/30">
            <span className="text-emerald-400 font-semibold">{doneCount}</span>
            <span>/{totalCount} done</span>
          </div>

          {/* Shared timer */}
          <div className={`flex items-center gap-1 ${timerColor}`}>
            <Clock size={10} />
            <span className="text-[13px] font-mono font-bold tabular-nums">{mins}:{secs}</span>
          </div>
        </div>
      </div>

      {/* ── Player bars ── */}
      <div className="flex flex-col gap-1.5 px-1 shrink-0">
        <SectionLabel>Opponents</SectionLabel>
        {participants.map(p => {
          const r = results[p.id];
          return (
            <PlayerBar
              key={p.id}
              initials={p.initials}
              accent={p.accent}
              name={p.name}
              currentScore={r?.currentScore ?? 0}
              done={r?.done ?? false}
              isLocal={p.isLocal}
              revealedCount={(r?.revealedHits ?? []).length}
              totalConcepts={card.concepts.length}
            />
          );
        })}
      </div>

      {/* ── Local test (TestView) — fill remaining space ── */}
      <div className="flex-1 min-h-0 overflow-y-auto border-t border-white/[0.05] pt-3">
        <TestView store={store} onBack={() => {}} />
      </div>
    </div>
  );
}
