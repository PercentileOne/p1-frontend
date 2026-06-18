/* Shared avatar chip — used across all multiplayer components */

import { motion } from "framer-motion";

interface Props {
  initials: string;
  accent:   string;
  size?:    "xs" | "sm" | "md" | "lg";
  isLocal?: boolean;
  isBot?:   boolean;
  done?:    boolean;
  pulse?:   boolean;
}

const SIZE = {
  xs: "w-5 h-5 text-[7px]",
  sm: "w-7 h-7 text-[9px]",
  md: "w-9 h-9 text-[11px]",
  lg: "w-11 h-11 text-[13px]",
};

export default function Avatar({ initials, accent, size = "md", isLocal, isBot, done, pulse }: Props) {
  return (
    <div className="relative shrink-0">
      <motion.div
        className={`
          ${SIZE[size]} rounded-full ${accent} flex items-center justify-center
          font-bold text-white select-none
          ${isLocal ? "ring-2 ring-indigo-400/60 ring-offset-1 ring-offset-black/40" : ""}
        `}
        animate={pulse ? { scale: [1, 1.08, 1] } : {}}
        transition={{ duration: 1.2, repeat: Infinity }}
      >
        {initials}
      </motion.div>

      {/* Done badge */}
      {done && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border border-black flex items-center justify-center"
        >
          <span className="text-[7px] text-white font-bold leading-none">✓</span>
        </motion.div>
      )}

      {/* Bot badge */}
      {isBot && !done && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-black/70 border border-white/15 flex items-center justify-center">
          <span className="text-[5px] text-white/60 font-bold leading-none">AI</span>
        </div>
      )}
    </div>
  );
}
