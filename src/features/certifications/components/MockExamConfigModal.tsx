/* ══════════════════════════════════════════════════════════════
   MockExamConfigModal — configure and launch a mock exam
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ClipboardList, Clock, Brain, Target, Check } from "lucide-react";
import type { Certification, SyllabusSection } from "../certificationsStore";
import type { DifficultyLevel, ConceptCountMode } from "../../cards/types";
import SectionLabel from "../../cards/components/shared/SectionLabel";

export interface MockExamConfig {
  questionCount:    number;
  timeLimitMinutes: number;
  difficulty:       DifficultyLevel;
  conceptCountMode: ConceptCountMode;
  includedSections: string[];   // sectionIds
}

interface Props {
  cert:      Certification;
  onLaunch:  (config: MockExamConfig) => void;
  onClose:   () => void;
}

const Q_COUNTS     = [5, 10, 20, 30] as const;
const TIME_OPTS    = [10, 20, 30, 45] as const;
const DIFFICULTY_OPTS: DifficultyLevel[] = ["easy", "medium", "hard", "expert"];
const DIFF_COLORS: Record<DifficultyLevel, string> = {
  easy:   "text-emerald-400 bg-emerald-500/15 border-emerald-500/25",
  medium: "text-sky-400     bg-sky-500/15     border-sky-500/25",
  hard:   "text-amber-400   bg-amber-500/15   border-amber-500/25",
  expert: "text-red-400     bg-red-500/15     border-red-500/25",
};

function ToggleChip({ label, selected, onClick, className = "" }: {
  label: string; selected: boolean; onClick: () => void; className?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
        selected
          ? `${className} ring-1 ring-inset ring-current/30`
          : "text-white/35 bg-white/[0.04] border-white/[0.08] hover:text-white/55"
      }`}
    >
      {selected && <Check size={9} />}
      {label}
    </motion.button>
  );
}

export default function MockExamConfigModal({ cert, onLaunch, onClose }: Props) {
  const [questionCount,    setQuestionCount]    = useState(10);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(20);
  const [difficulty,       setDifficulty]       = useState<DifficultyLevel>("medium");
  const [conceptCountMode, setConceptCountMode] = useState<ConceptCountMode>("auto");
  const [includedSections, setIncludedSections] = useState<string[]>(cert.syllabus.map(s => s.id));

  const toggleSection = (id: string) =>
    setIncludedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );

  const totalChapters = cert.syllabus
    .filter(s => includedSections.includes(s.id))
    .reduce((s, sec) => s + sec.chapters.length, 0);

  const launch = () => {
    onLaunch({ questionCount, timeLimitMinutes, difficulty, conceptCountMode, includedSections });
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative w-full max-w-md flex flex-col gap-5 p-5 rounded-3xl border border-white/[0.08] bg-[#0f1117]"
          style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.75), 0 1px 0 rgba(255,255,255,0.06) inset" }}
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{   opacity: 0, scale: 0.94,  y: 12 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="absolute top-0 left-5 right-5 h-[2px] rounded-b-full bg-gradient-to-r from-amber-500 to-orange-500 opacity-70" />

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-white/90">Configure Mock Exam</h3>
              <p className="text-[10px] text-white/35 mt-0.5 truncate max-w-[240px]">{cert.title}</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-xl bg-white/[0.05] flex items-center justify-center hover:bg-white/10 transition-colors">
              <X size={12} className="text-white/40" />
            </button>
          </div>

          {/* Questions */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <ClipboardList size={11} className="text-white/30" />
              <SectionLabel>Questions</SectionLabel>
            </div>
            <div className="flex gap-2">
              {Q_COUNTS.map(n => (
                <ToggleChip
                  key={n}
                  label={String(n)}
                  selected={questionCount === n}
                  onClick={() => setQuestionCount(n)}
                  className="text-indigo-400 bg-indigo-500/15 border-indigo-500/25"
                />
              ))}
            </div>
          </div>

          {/* Time limit */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Clock size={11} className="text-white/30" />
              <SectionLabel>Time limit</SectionLabel>
            </div>
            <div className="flex gap-2">
              {TIME_OPTS.map(t => (
                <ToggleChip
                  key={t}
                  label={`${t}m`}
                  selected={timeLimitMinutes === t}
                  onClick={() => setTimeLimitMinutes(t)}
                  className="text-sky-400 bg-sky-500/15 border-sky-500/25"
                />
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Target size={11} className="text-white/30" />
              <SectionLabel>Difficulty</SectionLabel>
            </div>
            <div className="flex gap-2 flex-wrap">
              {DIFFICULTY_OPTS.map(d => (
                <ToggleChip
                  key={d}
                  label={d.charAt(0).toUpperCase() + d.slice(1)}
                  selected={difficulty === d}
                  onClick={() => setDifficulty(d)}
                  className={DIFF_COLORS[d]}
                />
              ))}
            </div>
          </div>

          {/* Concept count mode */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Brain size={11} className="text-white/30" />
              <SectionLabel>Concept mode</SectionLabel>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["auto", "manual", "difficulty"] as ConceptCountMode[]).map(m => (
                <ToggleChip
                  key={m}
                  label={m.charAt(0).toUpperCase() + m.slice(1)}
                  selected={conceptCountMode === m}
                  onClick={() => setConceptCountMode(m)}
                  className="text-violet-400 bg-violet-500/15 border-violet-500/25"
                />
              ))}
            </div>
          </div>

          {/* Sections */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <SectionLabel>Sections ({includedSections.length}/{cert.syllabus.length})</SectionLabel>
              <button
                onClick={() => setIncludedSections(
                  includedSections.length === cert.syllabus.length
                    ? []
                    : cert.syllabus.map(s => s.id)
                )}
                className="text-[9px] text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {includedSections.length === cert.syllabus.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto">
              {cert.syllabus.map((sec: SyllabusSection) => {
                const on = includedSections.includes(sec.id);
                return (
                  <button
                    key={sec.id}
                    onClick={() => toggleSection(sec.id)}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors text-left ${
                      on ? "bg-indigo-500/10 border border-indigo-500/20" : "bg-white/[0.03] border border-white/[0.05]"
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 transition-all ${
                      on ? "bg-indigo-600 border-indigo-500" : "border-white/20"
                    }`}>
                      {on && <Check size={8} className="text-white" />}
                    </div>
                    <span className={`text-[11px] font-medium transition-colors ${on ? "text-white/80" : "text-white/35"}`}>
                      {sec.title}
                    </span>
                    <span className="ml-auto text-[9px] text-white/20 shrink-0">{sec.chapters.length} ch.</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary + Launch */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <p className="text-[10px] text-white/40">{totalChapters} chapters · {questionCount} Q · {timeLimitMinutes} min · {difficulty}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={launch}
              disabled={includedSections.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-[11px] font-bold transition-colors"
            >
              <ClipboardList size={12} /> Start Exam
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
