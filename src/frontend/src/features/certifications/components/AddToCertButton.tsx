/* ══════════════════════════════════════════════════════════════
   AddToCertButton — inline dropdown to add a source to a cert
   Works for sourceType: "book" | "note" | "card"
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Check, ChevronDown } from "lucide-react";
import { useCertificationsStore } from "../certificationsStore";
import type { ChapterRef, ChapterSourceType } from "../certificationsStore";

interface Props {
  sourceType: ChapterSourceType;
  sourceId:   string;
  chapterId?: string;
  title:      string;
  description?: string;
}

export default function AddToCertButton({
  sourceType, sourceId, chapterId, title, description,
}: Props) {
  const store  = useCertificationsStore();
  const [open,  setOpen]  = useState(false);
  const [added, setAdded] = useState<string | null>(null);   // sectionId

  const handleAdd = (certId: string, sectionId: string) => {
    const ref: Omit<ChapterRef, "id"> = {
      sourceType, sourceId, title, description,
      ...(chapterId ? { chapterId } : {}),
    };
    store.addChapterRef(certId, sectionId, ref);
    setAdded(sectionId);
    setTimeout(() => { setAdded(null); setOpen(false); }, 1400);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/30 hover:text-white/55 transition-all text-[9px] font-medium"
      >
        <Trophy size={9} />
        <span>Cert</span>
        <ChevronDown size={8} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute top-full right-0 mt-1.5 z-40 w-60 flex flex-col rounded-2xl border border-white/[0.08] bg-[#13151c] overflow-hidden"
            style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.65)" }}
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.96,  y: -4 }}
            transition={{ duration: 0.14 }}
          >
            <div className="px-3 py-2 border-b border-white/[0.06]">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">Add to certification</p>
            </div>

            <div className="max-h-[260px] overflow-y-auto">
              {store.certifications.map(cert => (
                <div key={cert.id}>
                  <div className="px-3 pt-2 pb-1">
                    <p className="text-[9px] font-bold text-white/40 truncate">{cert.title}</p>
                  </div>
                  {cert.syllabus.map(sec => {
                    const done = added === sec.id;
                    return (
                      <button
                        key={sec.id}
                        onClick={() => handleAdd(cert.id, sec.id)}
                        disabled={!!added}
                        className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-white/[0.04] transition-colors text-left"
                      >
                        <div className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                        <span className="flex-1 text-[10px] text-white/60 truncate">{sec.title}</span>
                        {done && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0"
                          >
                            <Check size={9} className="text-emerald-400" />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
