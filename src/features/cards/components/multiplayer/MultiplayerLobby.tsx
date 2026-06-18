/* ══════════════════════════════════════════════════════════════
   MultiplayerLobby — entry point for the multiplayer system
   Quick Match · Create Room · Browse public rooms
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Plus, Users, Globe, Lock, Crown, Trophy, BookOpen, ChevronRight, X } from "lucide-react";
import type { CognitiveCardData, RoomMode } from "../../types";
import type { MPStore, CreateRoomOpts } from "../../multiplayerStore";
import { CARDS } from "../../data/cards";
import SectionLabel from "../shared/SectionLabel";

interface Props {
  store:          MPStore;
  onCardChange:   (card: CognitiveCardData) => void;
  activeCard:     CognitiveCardData;
}

// ── Static mock public rooms ──────────────────────────────────────
const MOCK_PUBLIC_ROOMS = [
  { id: "p1", name: "React Speed Run",     hostName: "alex_dev",    cardTitle: "React Components",     mode: "battle",     players: 2, max: 4 },
  { id: "p2", name: "TypeScript Gauntlet", hostName: "tsmaster99",  cardTitle: "TypeScript Generics",  mode: "exam",       players: 3, max: 4 },
  { id: "p3", name: "CSS Masters",         hostName: "pixelpusher", cardTitle: "Tailwind CSS v4",      mode: "study",      players: 1, max: 4 },
  { id: "p4", name: "Hooks Deep Dive",     hostName: "hookworm",    cardTitle: "React Hooks",          mode: "tournament", players: 2, max: 6 },
] as const;

const MODE_BADGE: Record<string, string> = {
  battle:     "text-rose-400   bg-rose-500/10   border-rose-500/20",
  study:      "text-sky-400    bg-sky-500/10    border-sky-500/20",
  exam:       "text-amber-400  bg-amber-500/10  border-amber-500/20",
  tournament: "text-violet-400 bg-violet-500/10 border-violet-500/20",
};

// ── Create room form ──────────────────────────────────────────────
function CreateRoomForm({
  activeCard, onCardChange, onSubmit, onClose,
}: {
  activeCard:   CognitiveCardData;
  onCardChange: (c: CognitiveCardData) => void;
  onSubmit:     (opts: CreateRoomOpts) => void;
  onClose:      () => void;
}) {
  const [name,      setName]      = useState("My Room");
  const [mode,      setMode]      = useState<RoomMode>("battle");
  const [maxP,      setMaxP]      = useState(4);
  const [isPublic,  setIsPublic]  = useState(true);
  const [botCount,  setBotCount]  = useState(2);

  const MODES: RoomMode[] = ["study", "battle", "exam", "tournament"];

  return (
    <motion.div
      className="flex flex-col gap-4 p-4 rounded-2xl border border-white/[0.06] bg-[#0f1117]"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      style={{ boxShadow: "0 10px 36px rgba(0,0,0,0.55)" }}
    >
      <div className="flex items-center justify-between">
        <SectionLabel>Create Room</SectionLabel>
        <button onClick={onClose} className="w-6 h-6 rounded-lg bg-white/[0.05] flex items-center justify-center hover:bg-white/10 transition-colors">
          <X size={11} className="text-white/40" />
        </button>
      </div>

      {/* Room name */}
      <div className="flex flex-col gap-1">
        <SectionLabel>Room name</SectionLabel>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-[12px] text-white/80 placeholder-white/20 outline-none focus:border-indigo-500/40 transition-colors"
          placeholder="My Study Room…"
        />
      </div>

      {/* Card picker */}
      <div className="flex flex-col gap-1.5">
        <SectionLabel>Card</SectionLabel>
        <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-0.5">
          {CARDS.map(c => (
            <button
              key={c.id}
              onClick={() => onCardChange(c)}
              className={`flex flex-col gap-0.5 p-2.5 rounded-lg border text-left transition-all ${
                c.id === activeCard.id
                  ? "border-indigo-500/40 bg-indigo-600/15 text-white/90"
                  : "border-white/[0.05] bg-white/[0.02] text-white/45 hover:text-white/60"
              }`}
            >
              <span className="text-[10px] font-semibold truncate">{c.title}</span>
              <span className="text-[11px] text-white/45">{c.concepts.length} concepts</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex flex-col gap-1.5">
        <SectionLabel>Mode</SectionLabel>
        <div className="grid grid-cols-4 gap-1">
          {MODES.map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`py-1.5 rounded-lg text-[9px] font-semibold capitalize border transition-all ${
                mode === m
                  ? `${MODE_BADGE[m]} border-current`
                  : "bg-white/[0.03] border-white/[0.05] text-white/30"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Options row */}
      <div className="grid grid-cols-3 gap-2">
        {/* Max players */}
        <div className="flex flex-col gap-1">
          <SectionLabel>Players</SectionLabel>
          <select
            value={maxP}
            onChange={e => setMaxP(Number(e.target.value))}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[11px] text-white/70 outline-none"
          >
            {[2, 3, 4, 6].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        {/* Bots */}
        <div className="flex flex-col gap-1">
          <SectionLabel>Bots</SectionLabel>
          <select
            value={botCount}
            onChange={e => setBotCount(Number(e.target.value))}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[11px] text-white/70 outline-none"
          >
            {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        {/* Visibility */}
        <div className="flex flex-col gap-1">
          <SectionLabel>Vis</SectionLabel>
          <button
            onClick={() => setIsPublic(p => !p)}
            className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] text-white/50 hover:text-white/70 transition-colors"
          >
            {isPublic ? <Globe size={10} /> : <Lock size={10} />}
            {isPublic ? "Public" : "Private"}
          </button>
        </div>
      </div>

      <button
        onClick={() => onSubmit({ name, mode, maxPlayers: maxP, isPublic, botCount })}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-bold transition-colors"
      >
        <Plus size={13} />
        Create & Enter Room
      </button>
    </motion.div>
  );
}

// ── Main lobby ────────────────────────────────────────────────────
export default function MultiplayerLobby({ store, onCardChange, activeCard }: Props) {
  const [showCreate, setShowCreate] = useState(false);

  const handleQuickMatch = () => {
    onCardChange(CARDS[0]); // default to first card for quick match
    // small tick to let card state settle before quickMatch reads it
    setTimeout(() => store.quickMatch(), 20);
  };

  const handleCreate = (opts: CreateRoomOpts) => {
    setShowCreate(false);
    store.createRoom(opts);
  };

  return (
    <div className="flex flex-col gap-5 px-1 py-2">

      {/* Header */}
      <div>
        <h2 className="text-[16px] font-bold text-white/90">Multiplayer</h2>
        <p className="text-[11px] text-white/35 mt-0.5">Race to recall — learn faster together</p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: <Users size={12} className="text-indigo-400" />,  label: "Online",   value: "47" },
          { icon: <Zap   size={12} className="text-amber-400" />,   label: "Rooms",    value: "12" },
          { icon: <Trophy size={12} className="text-emerald-400" />, label: "Your rank", value: "#23" },
        ].map(s => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"
          >
            {s.icon}
            <span className="text-[15px] font-black text-white/85">{s.value}</span>
            <SectionLabel>{s.label}</SectionLabel>
          </div>
        ))}
      </div>

      {/* Quick Match CTA */}
      <AnimatePresence mode="wait">
        {!showCreate ? (
          <motion.div
            key="actions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-3"
          >
            {/* Quick Match */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleQuickMatch}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-white overflow-hidden relative"
              style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" }}
            >
              {/* Decorative rings */}
              <div className="absolute right-4 top-0 bottom-0 flex items-center opacity-10">
                <div className="w-20 h-20 rounded-full border-4 border-white" />
              </div>
              <div className="absolute right-8 top-0 bottom-0 flex items-center opacity-10">
                <div className="w-12 h-12 rounded-full border-2 border-white" />
              </div>

              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-[14px] font-bold">Quick Match</span>
                <span className="text-[10px] text-indigo-200/70">3 AI opponents · Random card</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Zap size={14} className="text-amber-300" />
                <ChevronRight size={14} />
              </div>
            </motion.button>

            {/* Create Room */}
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/20 flex items-center justify-center">
                  <Plus size={13} className="text-violet-400" />
                </div>
                <div className="flex flex-col gap-0.5 text-left">
                  <span className="text-[12px] font-semibold text-white/75">Create Room</span>
                  <span className="text-[10px] text-white/30">Choose card, mode, and bot count</span>
                </div>
              </div>
              <ChevronRight size={13} className="text-white/25" />
            </button>
          </motion.div>
        ) : (
          <motion.div key="create-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CreateRoomForm
              activeCard={activeCard}
              onCardChange={onCardChange}
              onSubmit={handleCreate}
              onClose={() => setShowCreate(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Public rooms */}
      {!showCreate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col gap-2"
        >
          <SectionLabel>Public rooms</SectionLabel>

          {MOCK_PUBLIC_ROOMS.map((room, i) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.05 }}
              whileHover={{ y: -1 }}
              className="flex items-center gap-3 p-3.5 rounded-2xl border border-white/[0.06] bg-[#0f1117] cursor-pointer"
              style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.05) inset" }}
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Users size={12} className="text-indigo-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[12px] font-semibold text-white/80 truncate">{room.name}</span>
                  <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${MODE_BADGE[room.mode] ?? ""}`}>
                    {room.mode}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-white/45">
                  <Crown size={8} className="text-amber-500/60" />
                  <span>{room.hostName}</span>
                  <BookOpen size={8} />
                  <span>{room.cardTitle}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-white/30 tabular-nums">{room.players}/{room.max}</span>
                <button
                  onClick={() => store.quickMatch()} // stub: joins as quick match for now
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-[9px] font-bold transition-colors"
                >
                  Join
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
