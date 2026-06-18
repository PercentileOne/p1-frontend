/* ══════════════════════════════════════════════════════════════
   MultiplayerRoom — session phase controller
   idle → lobby → countdown → active → results
   ══════════════════════════════════════════════════════════════ */

import { motion, AnimatePresence } from "framer-motion";
import { Users, Play, Copy, Check, Crown, BookOpen } from "lucide-react";
import { useState } from "react";
import type { CognitiveCardData } from "../../types";
import type { MPStore } from "../../multiplayerStore";
import Avatar from "./Avatar";
import SectionLabel from "../shared/SectionLabel";
import MultiplayerOverlay from "./MultiplayerOverlay";
import MultiplayerResults from "./MultiplayerResults";

interface Props {
  card:    CognitiveCardData;
  store:   MPStore;
  onLeave: () => void;
}

// ── Lobby phase ───────────────────────────────────────────────────
function LobbyView({ card, store, onLeave }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(store.session?.code ?? "").catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHost = store.session?.hostId === store.localUserId;

  return (
    <motion.div
      className="flex flex-col gap-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Room header */}
      <div
        className="relative p-4 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-indigo-950/60 to-indigo-900/30"
        style={{ boxShadow: "0 10px 36px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06) inset" }}
      >
        <div className="absolute top-0 left-4 right-4 h-[2px] rounded-b-full bg-indigo-500/70" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <SectionLabel>Room</SectionLabel>
            <h2 className="mt-0.5 text-[15px] font-bold text-white/90">{store.session?.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1.5 text-[10px] text-indigo-300/70">
                <BookOpen size={10} />
                <span>{card.title}</span>
              </div>
              <span className="text-[10px] text-white/20">·</span>
              <span className="text-[10px] text-white/35 capitalize">{store.session?.mode}</span>
            </div>
          </div>
          {/* Room code */}
          {store.session?.code && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/25 hover:bg-indigo-600/30 transition-colors"
            >
              <span className="text-[12px] font-bold tracking-widest text-indigo-300">
                {store.session.code}
              </span>
              {copied
                ? <Check size={10} className="text-emerald-400" />
                : <Copy size={10} className="text-indigo-400/60" />}
            </button>
          )}
        </div>
      </div>

      {/* Participants */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <SectionLabel>Players</SectionLabel>
          <span className="text-[10px] text-white/30">
            {store.participants.length}/{store.session?.maxPlayers ?? 4}
          </span>
        </div>

        {store.participants.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
              p.isLocal
                ? "bg-indigo-600/10 border-indigo-500/20"
                : "bg-white/[0.03] border-white/[0.05]"
            }`}
          >
            <Avatar
              initials={p.initials}
              accent={p.accent}
              size="sm"
              isLocal={p.isLocal}
              isBot={p.isBot}
            />
            <span className={`flex-1 text-[12px] font-semibold ${p.isLocal ? "text-indigo-300" : "text-white/65"}`}>
              {p.name}
              {p.isBot && <span className="ml-1.5 text-[10px] text-white/38 font-normal">AI</span>}
              {p.isLocal && store.session?.hostId === p.id && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] text-amber-400/70">
                  <Crown size={8} /> host
                </span>
              )}
            </span>
            <div className={`w-2 h-2 rounded-full ${p.ready ? "bg-emerald-400" : "bg-white/15"}`} />
          </motion.div>
        ))}

        {/* Empty slots */}
        {Array.from({ length: (store.session?.maxPlayers ?? 4) - store.participants.length }, (_, i) => (
          <div
            key={`empty-${i}`}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dashed border-white/[0.06]"
          >
            <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-dashed border-white/10 flex items-center justify-center">
              <Users size={11} className="text-white/15" />
            </div>
            <span className="text-[11px] text-white/20 italic">Waiting for player…</span>
          </div>
        ))}
      </div>

      {/* Card preview */}
      <div className={`relative p-3 rounded-xl border border-white/[0.06] ${card.gradientBg}`}>
        <div className={`absolute top-0 left-3 right-3 h-[2px] rounded-b-full ${card.accent} opacity-50`} />
        <SectionLabel className="opacity-60">Card for this match</SectionLabel>
        <p className="mt-1 text-[13px] font-semibold text-white/80">{card.title}</p>
        <p className="mt-0.5 text-[10px] text-white/40 line-clamp-2">{card.description}</p>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-white/30">
          <BookOpen size={10} />
          <span>{card.concepts.length} concepts · {card.testConfig.timeLimitSeconds}s timer</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onLeave}
          className="px-4 py-2.5 rounded-xl bg-white/[0.05] text-white/40 text-[11px] font-semibold hover:text-white/60 transition-colors"
        >
          Leave
        </button>
        {isHost && (
          <button
            onClick={store.startCountdown}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-bold transition-colors shadow-lg shadow-indigo-900/30"
          >
            <Play size={13} />
            Start Match
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Countdown phase ───────────────────────────────────────────────
function CountdownView({ value }: { value: number }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full gap-6 py-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <SectionLabel>Match starting in</SectionLabel>
      <AnimatePresence mode="wait">
        <motion.div
          key={value}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1,   opacity: 1 }}
          exit={{   scale: 1.6,  opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="text-[80px] font-black text-white/90 leading-none tabular-nums"
          style={{
            textShadow: "0 0 60px rgba(99,102,241,0.6), 0 0 120px rgba(99,102,241,0.3)",
          }}
        >
          {value > 0 ? value : "GO!"}
        </motion.div>
      </AnimatePresence>
      <p className="text-[12px] text-white/35">Get ready to recall concepts…</p>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function MultiplayerRoom({ card, store, onLeave }: Props) {
  const { status, countdownValue } = store;

  return (
    <div className="h-full">
      <AnimatePresence mode="wait">

        {status === "lobby" && (
          <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <LobbyView card={card} store={store} onLeave={onLeave} />
          </motion.div>
        )}

        {status === "countdown" && (
          <motion.div key="countdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <CountdownView value={countdownValue} />
          </motion.div>
        )}

        {status === "active" && (
          <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <MultiplayerOverlay card={card} mpStore={store} />
          </motion.div>
        )}

        {status === "results" && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <MultiplayerResults
              store={store}
              cardTitle={card.title}
              onRematch={() => { store.leaveRoom(); setTimeout(store.quickMatch, 50); }}
              onLeave={onLeave}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
