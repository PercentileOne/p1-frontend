import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { CognitiveCardGrid } from "./CognitivePage";

/* ══════════════════════════════════════════════════════════════
   LEARNING CARDS — /learning/cards
   Renders the full card grid + overlay inside the Learning Shell
   ══════════════════════════════════════════════════════════════ */

export default function LearningCards() {
  return (
    <div className="px-6 py-6 space-y-6">

      {/* Agent banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="flex items-start gap-3 p-4 rounded-2xl border border-indigo-500/20"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.04))" }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.28)" }}
        >
          <Sparkles size={13} className="text-indigo-400" />
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-400/70 mb-1">
            P1 Agent · Learning Summary
          </p>
          <p className="text-[12px] text-slate-300 leading-relaxed">
            Your strongest card is <span className="text-sky-300 font-semibold">Tailwind CSS v4</span> at 83% mastery.
            Your greatest gap is <span className="text-amber-300 font-semibold">Vite Build System</span> — last tested 2 weeks ago.
            Agent recommends testing <span className="text-violet-300 font-semibold">React Hooks</span> next — never tested.
          </p>
        </div>
      </motion.div>

      <CognitiveCardGrid />
    </div>
  );
}
