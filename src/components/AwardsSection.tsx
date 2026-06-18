import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Trophy, Star, ChevronRight, Sparkles } from "lucide-react";
import { LargeAwardTile, MediumAwardTile } from "./AwardTiles";
import { WEEKLY_WINNERS, MONTHLY_WINNERS } from "../lib/awardsData";

/* ══════════════════════════════════════════════════════════════
   AWARDS SECTION — embedded in Stories Home
   ══════════════════════════════════════════════════════════════ */

type SectionTab = "weekly" | "monthly";

export default function AwardsSection() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<SectionTab>("weekly");

  const weekWinner   = WEEKLY_WINNERS[0];
  const weekRunners  = WEEKLY_WINNERS.slice(1, 4);
  const monthWinner  = MONTHLY_WINNERS[0];
  const monthRunners = MONTHLY_WINNERS.slice(1, 4);

  return (
    <div className="mb-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Trophy size={14} className="text-amber-400" />
          <h2 className="text-[13px] font-bold text-white">Story Awards</h2>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.07] rounded-xl p-0.5">
            {([
              { key: "weekly",  label: "🏆 This Week"  },
              { key: "monthly", label: "🌟 This Month" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                  tab === key
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/20"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => navigate("/awards")}
          className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 hover:text-amber-400 transition-colors"
        >
          View all awards <ChevronRight size={10} />
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {tab === "weekly" && (
          <motion.div key="weekly" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Trophy size={10} className="text-amber-400" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Story of the Week · {weekWinner.period}</span>
              </div>
              <LargeAwardTile winner={weekWinner} delay={0} />
            </div>
            {weekRunners.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2 mt-4">
                  <Star size={10} className="text-slate-600" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Category Winners</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {weekRunners.map((w, i) => (
                    <MediumAwardTile key={w.id} winner={w} delay={i * 0.08} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {tab === "monthly" && (
          <motion.div key="monthly" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Star size={10} className="text-amber-400" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Story of the Month · {monthWinner.period}</span>
              </div>
              <LargeAwardTile winner={monthWinner} delay={0} />
            </div>
            {monthRunners.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2 mt-4">
                  <Sparkles size={10} className="text-slate-600" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Category Winners</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {monthRunners.map((w, i) => (
                    <MediumAwardTile key={w.id} winner={w} delay={i * 0.08} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Divider */}
      <div className="mt-6 border-t border-white/[0.05]" />
    </div>
  );
}
