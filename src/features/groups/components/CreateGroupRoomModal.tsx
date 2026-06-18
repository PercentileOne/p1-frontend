/* ══════════════════════════════════════════════════════════════
   CreateGroupRoomModal — schedule a group room
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CalendarClock, Play } from "lucide-react";
import type { CreateRoomOpts } from "../groupsStore";
import SectionLabel from "../../cards/components/shared/SectionLabel";
import { CARDS } from "../../cards/data/cards";

type RoomMode = "study" | "battle" | "exam" | "tournament";

const MODE_BADGE: Record<RoomMode, string> = {
  battle:     "text-rose-400   bg-rose-500/10   border-rose-500/20",
  study:      "text-sky-400    bg-sky-500/10    border-sky-500/20",
  exam:       "text-amber-400  bg-amber-500/10  border-amber-500/20",
  tournament: "text-violet-400 bg-violet-500/10 border-violet-500/20",
};

const MODES: RoomMode[] = ["study", "battle", "exam", "tournament"];

interface Props {
  onConfirm: (opts: CreateRoomOpts) => void;
  onClose:   () => void;
}

export default function CreateGroupRoomModal({ onConfirm, onClose }: Props) {
  const [cardId,    setCardId]    = useState(CARDS[0].id);
  const [mode,      setMode]      = useState<RoomMode>("battle");
  const [maxP,      setMaxP]      = useState(4);
  const [schedNow,  setSchedNow]  = useState(true);

  const card = CARDS.find(c => c.id === cardId) ?? CARDS[0];

  const handleSubmit = () => {
    onConfirm({
      cardTitle:    card.title,
      mode,
      scheduledFor: schedNow ? new Date() : new Date(Date.now() + 24 * 3_600_000),
      maxPlayers:   maxP,
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-sm flex flex-col gap-5 p-5 rounded-3xl border border-white/[0.08] bg-[#0f1117]"
          style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.75), 0 1px 0 rgba(255,255,255,0.06) inset" }}
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{   opacity: 0, scale: 0.94,  y: 12 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-white/90">Create Group Room</h3>
              <p className="text-[10px] text-white/35 mt-0.5">Invite members to compete</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-xl bg-white/[0.05] flex items-center justify-center hover:bg-white/10 transition-colors">
              <X size={12} className="text-white/40" />
            </button>
          </div>

          {/* Card picker */}
          <div className="flex flex-col gap-2">
            <SectionLabel>Card</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5 max-h-[130px] overflow-y-auto">
              {CARDS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCardId(c.id)}
                  className={`flex flex-col gap-0.5 p-2.5 rounded-xl border text-left transition-all ${
                    c.id === cardId
                      ? "border-indigo-500/40 bg-indigo-600/15 text-white/90"
                      : "border-white/[0.05] bg-white/[0.02] text-white/45 hover:text-white/60"
                  }`}
                >
                  <span className="text-[10px] font-semibold truncate">{c.title}</span>
                  <span className="text-[9px] text-white/30">{c.concepts.length} concepts</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mode */}
          <div className="flex flex-col gap-2">
            <SectionLabel>Mode</SectionLabel>
            <div className="grid grid-cols-4 gap-1">
              {MODES.map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`py-1.5 rounded-lg text-[9px] font-semibold capitalize border transition-all ${
                    mode === m ? `${MODE_BADGE[m]} border-current` : "bg-white/[0.03] border-white/[0.05] text-white/30"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <SectionLabel>Max players</SectionLabel>
              <select
                value={maxP}
                onChange={e => setMaxP(Number(e.target.value))}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-2 text-[11px] text-white/70 outline-none"
              >
                {[2,3,4,6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <SectionLabel>When</SectionLabel>
              <button
                onClick={() => setSchedNow(p => !p)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-[10px] font-medium transition-colors ${
                  schedNow
                    ? "bg-emerald-600/15 border-emerald-500/25 text-emerald-400"
                    : "bg-white/[0.04] border-white/[0.08] text-white/40"
                }`}
              >
                {schedNow ? <Play size={10} /> : <CalendarClock size={10} />}
                {schedNow ? "Now" : "Tomorrow"}
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-bold transition-colors shadow-lg shadow-indigo-900/30"
          >
            <Play size={13} />
            {schedNow ? "Start Room Now" : "Schedule Room"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
