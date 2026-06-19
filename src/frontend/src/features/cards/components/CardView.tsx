/* ══════════════════════════════════════════════════════════════
   CardView — Library grid tile (Phase 1: layout + styling)
   ══════════════════════════════════════════════════════════════ */

import type { CognitiveCardData } from "../types";
import MasteryRing from "./shared/MasteryRing";
import DifficultyDots from "./shared/DifficultyDots";
import SectionLabel from "./shared/SectionLabel";
import { Clock, BookOpen, ChevronRight } from "lucide-react";

interface Props {
  card: CognitiveCardData;
  onStudy: (card: CognitiveCardData) => void;
}

function formatLastTested(d: Date | null): string {
  if (!d) return "Never tested";
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export default function CardView({ card, onStudy }: Props) {
  const masteryScore = card.mastery.score;

  return (
    <div
      className={`
        relative flex flex-col gap-3 p-4 rounded-2xl cursor-pointer group
        ${card.gradientBg}
        border border-white/[0.06]
        transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_16px_48px_rgba(0,0,0,0.6)]
      `}
      style={{
        boxShadow: "0 10px 36px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06) inset, 0 -1px 0 rgba(0,0,0,0.4) inset",
      }}
      onClick={() => onStudy(card)}
    >
      {/* Top accent bar */}
      <div className={`absolute top-0 left-4 right-4 h-[2px] rounded-b-full ${card.accent} opacity-70`} />

      {/* Header row */}
      <div className="flex items-start justify-between gap-2 pt-1">
        <div className="flex-1 min-w-0">
          <SectionLabel>{card.category}</SectionLabel>
          <h3 className="mt-1 text-[14px] font-semibold text-white/92 leading-snug truncate">{card.title}</h3>
          <p className="mt-1 text-[12px] text-white/55 truncate">{card.subject}</p>
        </div>

        <div className="relative shrink-0">
          <MasteryRing score={masteryScore} size={44} accent={`stroke-${card.textAccent.replace("text-", "")}`} />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/80">
            {masteryScore}
          </span>
        </div>
      </div>

      {/* Difficulty row */}
      <div className="flex items-center gap-2">
        <DifficultyDots level={card.difficulty} />
        <SectionLabel>Level {card.difficulty}</SectionLabel>
      </div>

      {/* Description */}
      <p className="text-[13px] text-white/60 leading-relaxed line-clamp-2">{card.description}</p>

      {/* Tags */}
      {card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-white/[0.05] text-white/50"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
        <div className="flex items-center gap-1 text-[11px] text-white/45">
          <Clock size={10} />
          <span>{formatLastTested(card.mastery.lastTested)}</span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-white/45">
          <BookOpen size={10} />
          <span>{card.concepts.length} concepts</span>
        </div>

        <div
          className={`
            flex items-center gap-0.5 text-[10px] font-semibold ${card.textAccent}
            opacity-0 group-hover:opacity-100 transition-opacity
          `}
        >
          <span>Study</span>
          <ChevronRight size={10} />
        </div>
      </div>
    </div>
  );
}
