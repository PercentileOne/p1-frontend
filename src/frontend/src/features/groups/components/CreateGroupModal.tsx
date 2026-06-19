/* ══════════════════════════════════════════════════════════════
   CreateGroupModal — name, description, emoji picker
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus } from "lucide-react";
import type { CreateGroupOpts } from "../groupsStore";
import SectionLabel from "../../cards/components/shared/SectionLabel";

const EMOJI_OPTIONS = [
  "⚡","🔷","🎓","✨","🚀","🔥","💡","🧠","🎯","🏆",
  "🌟","📚","🔬","🎮","💎","🌊","🦋","🦁","🐉","🎪",
];

interface Props {
  onConfirm: (opts: CreateGroupOpts) => void;
  onClose:   () => void;
}

export default function CreateGroupModal({ onConfirm, onClose }: Props) {
  const [name,  setName]  = useState("");
  const [desc,  setDesc]  = useState("");
  const [emoji, setEmoji] = useState("⚡");

  const valid = name.trim().length >= 2;

  const handleSubmit = () => {
    if (!valid) return;
    onConfirm({ name: name.trim(), description: desc.trim(), emoji });
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
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
              <h3 className="text-[14px] font-bold text-white/90">Create Group</h3>
              <p className="text-[10px] text-white/35 mt-0.5">Build your study community</p>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-xl bg-white/[0.05] flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <X size={12} className="text-white/40" />
            </button>
          </div>

          {/* Emoji picker */}
          <div className="flex flex-col gap-2">
            <SectionLabel>Icon</SectionLabel>
            <div className="grid grid-cols-10 gap-1">
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-8 h-8 rounded-lg text-[16px] flex items-center justify-center transition-all ${
                    emoji === e
                      ? "bg-indigo-600/40 border border-indigo-500/40 scale-110"
                      : "bg-white/[0.04] border border-white/[0.05] hover:bg-white/[0.08]"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <SectionLabel>Group name</SectionLabel>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={40}
              placeholder="React Wizards…"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[13px] text-white/80 placeholder-white/20 outline-none focus:border-indigo-500/40 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <SectionLabel>Description <span className="normal-case font-normal text-white/25">(optional)</span></SectionLabel>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              maxLength={120}
              rows={2}
              placeholder="What are you studying together?"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[12px] text-white/70 placeholder-white/20 outline-none focus:border-indigo-500/40 transition-colors resize-none"
            />
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/15 border border-white/[0.08] flex items-center justify-center text-[20px]">
              {emoji}
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white/80">{name || "Group name"}</p>
              <p className="text-[10px] text-white/35">1 member · Just created</p>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleSubmit}
            disabled={!valid}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-bold transition-all ${
              valid
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30"
                : "bg-white/[0.05] text-white/20 cursor-not-allowed"
            }`}
          >
            <Plus size={14} />
            Create Group
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
