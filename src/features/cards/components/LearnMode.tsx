/* ══════════════════════════════════════════════════════════════
   LearnMode — Expandable micro-lesson panel (Document 1B)
   Collapsed by default. Structure + styling only.
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, BookOpen } from "lucide-react";
import type { LearnContent } from "../types";
import SectionLabel from "./shared/SectionLabel";

interface Props {
  content: LearnContent;
  accent?: string;
}

export default function LearnMode({ content, accent = "indigo" }: Props) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "defs" | "examples" | "mistakes">("summary");

  const TABS = [
    { id: "summary",  label: "Summary" },
    { id: "defs",     label: "Definitions" },
    { id: "examples", label: "Examples" },
    { id: "mistakes", label: "Mistakes" },
  ] as const;

  return (
    <div className={`rounded-xl border border-${accent}-500/15 bg-${accent}-600/[0.06] overflow-hidden`}>
      {/* Toggle header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <BookOpen size={13} className={`text-${accent}-400`} />
          <span className="text-[12px] font-semibold text-white/70">Learn Mode</span>
          <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-${accent}-500/20 text-${accent}-400`}>
            Micro-lesson
          </span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} className="text-white/30" />
        </motion.div>
      </button>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="learn-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 flex flex-col gap-4">
              {/* Tab strip */}
              <div className="flex gap-1 p-1 rounded-lg bg-black/20">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
                      activeTab === tab.id
                        ? `bg-${accent}-600/40 text-${accent}-300`
                        : "text-white/30 hover:text-white/50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeTab === "summary" && (
                    <div className="flex flex-col gap-3">
                      <p className="text-[12px] text-white/70 leading-relaxed">{content.summary}</p>
                      <div className={`px-3 py-2 rounded-lg bg-${accent}-600/10 border-l-2 border-${accent}-500/50`}>
                        <SectionLabel>Why it matters</SectionLabel>
                        <p className="mt-1 text-[11px] text-white/60 leading-relaxed">{content.whyMatters}</p>
                      </div>
                      {content.connections.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <SectionLabel>Connected to</SectionLabel>
                          <div className="flex flex-wrap gap-1.5">
                            {content.connections.map((c, i) => (
                              <span key={i} className="px-2 py-1 text-[10px] rounded-lg bg-white/[0.05] text-white/40">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "defs" && (
                    <div className="flex flex-col gap-2">
                      {content.definitions.map((d, i) => (
                        <div key={i} className="flex flex-col gap-0.5 p-2.5 rounded-lg bg-white/[0.03]">
                          <span className={`text-[11px] font-semibold text-${accent}-300`}>{d.term}</span>
                          <span className="text-[11px] text-white/55 leading-relaxed">{d.def}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "examples" && (
                    <div className="flex flex-col gap-2">
                      {content.examples.map((eg, i) => (
                        <div key={i} className="flex flex-col gap-1 p-2.5 rounded-lg bg-white/[0.03]">
                          <SectionLabel>{eg.label}</SectionLabel>
                          <pre className="text-[10px] text-white/60 whitespace-pre-wrap font-mono leading-relaxed">{eg.text}</pre>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "mistakes" && (
                    <div className="flex flex-col gap-2">
                      {content.mistakes.map((m, i) => (
                        <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/15">
                          <span className="text-rose-400 text-[11px] mt-px">✗</span>
                          <span className="text-[11px] text-white/60 leading-relaxed">{m}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
