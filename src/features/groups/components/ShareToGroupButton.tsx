/* ══════════════════════════════════════════════════════════════
   ShareToGroupButton — inline share-to-group picker
   Used in CardView / StudyView
   ══════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Check } from "lucide-react";
import { useGroupsStore } from "../groupsStore";

interface Props {
  cardTitle: string;
  className?: string;
}

export default function ShareToGroupButton({ cardTitle, className = "" }: Props) {
  const store     = useGroupsStore();
  const [open, setOpen]   = useState(false);
  const [shared, setShared] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleShare = (groupId: string) => {
    store.shareCard(groupId, cardTitle);
    setShared(groupId);
    setTimeout(() => { setShared(null); setOpen(false); }, 1400);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/60 hover:bg-white/[0.07] transition-all text-[10px] font-medium"
      >
        <Share2 size={10} />
        Share
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-full left-0 mb-2 z-40 w-52 flex flex-col rounded-2xl border border-white/[0.08] bg-[#13151c] overflow-hidden"
            style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.05) inset" }}
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{   opacity: 0, scale: 0.96,  y: 4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <div className="px-3 py-2 border-b border-white/[0.06]">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">Share to group</p>
              <p className="text-[10px] text-white/55 mt-0.5 truncate">"{cardTitle}"</p>
            </div>

            {store.groups.filter(g => g.localUserRole !== null).map(group => {
              const done = shared === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => handleShare(group.id)}
                  disabled={!!shared}
                  className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.04] transition-colors text-left"
                >
                  <span className="text-[14px]">{group.emoji}</span>
                  <span className="flex-1 text-[11px] font-medium text-white/70 truncate">{group.name}</span>
                  {done && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center"
                    >
                      <Check size={9} className="text-emerald-400" />
                    </motion.div>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
