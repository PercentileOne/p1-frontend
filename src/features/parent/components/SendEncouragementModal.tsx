/* ══════════════════════════════════════════════════════════════
   SEND ENCOURAGEMENT MODAL — Phase 10
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Heart } from "lucide-react";
import { PRESET_MESSAGES, sendEncouragement } from "../encouragementStore";
import type { ChildProfile } from "../parentStore";

interface Props {
  child:    ChildProfile;
  parentId: string;
  parentName: string;
  onClose:  () => void;
}

export default function SendEncouragementModal({ child, parentId, parentName, onClose }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [custom,   setCustom]   = useState("");
  const [sent,     setSent]     = useState(false);

  const message = selected !== null ? PRESET_MESSAGES[selected].text : custom.trim();
  const emoji   = selected !== null ? PRESET_MESSAGES[selected].emoji : "❤️";
  const canSend = message.length > 0;

  function handleSend() {
    if (!canSend) return;
    sendEncouragement(parentId, parentName, child.linkedStudentId, message, emoji);
    setSent(true);
    setTimeout(onClose, 1400);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{   opacity: 0, scale: 0.94, y: 12 }}
        className="relative w-full max-w-md rounded-2xl border border-white/[0.09] bg-[#13151c] p-6"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.06) inset" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(244,114,182,0.15)", border: "1px solid rgba(244,114,182,0.25)" }}
          >
            <Heart size={14} className="text-pink-400" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">Send Encouragement</p>
            <p className="text-[10px] text-slate-500">to {child.name}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors">
            <X size={14} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-8 gap-3"
            >
              <span className="text-4xl">💌</span>
              <p className="text-[13px] font-semibold text-white">Message sent!</p>
              <p className="text-[11px] text-slate-500">{child.name} will see it next time they log in</p>
            </motion.div>
          ) : (
            <motion.div key="form" className="flex flex-col gap-3">
              {/* Preset messages */}
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Quick messages</p>
              <div className="grid grid-cols-1 gap-2">
                {PRESET_MESSAGES.map((pm, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelected(i); setCustom(""); }}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left border transition-all text-[11px] ${
                      selected === i
                        ? "bg-pink-500/15 border-pink-500/35 text-white"
                        : "bg-white/[0.03] border-white/[0.07] text-slate-400 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    <span>{pm.emoji}</span>
                    <span className="leading-snug">{pm.text}</span>
                  </button>
                ))}
              </div>

              {/* Custom */}
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">or write your own</p>
              <textarea
                rows={3}
                value={custom}
                onChange={e => { setCustom(e.target.value); setSelected(null); }}
                placeholder="Write a personal message…"
                className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-3 py-2.5 text-[12px] text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-pink-500/40"
              />

              {/* Send */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSend}
                disabled={!canSend}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${
                  canSend
                    ? "bg-pink-500 hover:bg-pink-400 text-white"
                    : "bg-white/[0.05] text-slate-600 cursor-not-allowed"
                }`}
              >
                <Send size={13} />
                Send to {child.name}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
