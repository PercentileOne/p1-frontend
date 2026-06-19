/* ══════════════════════════════════════════════════════════════
   StudyView — Phase 1 layout + Phase 4B Concept Count Modes
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Link2, Users, Settings2, CheckSquare, Sliders, Lock } from "lucide-react";
import type { CognitiveCardData, LearnContent, ConceptCountConfig, ConceptCountMode, DifficultyLevel } from "../types";
import { resolveConceptsForTest, conceptCountLabel } from "../engine/conceptCount";
import SectionLabel from "./shared/SectionLabel";
import DifficultyDots from "./shared/DifficultyDots";
import MasteryRing from "./shared/MasteryRing";
import ProgressBar from "./shared/ProgressBar";
import AgentInsight from "./shared/AgentInsight";
import LearnMode from "./LearnMode";

interface Props {
  card:           CognitiveCardData;
  learnContent?:  LearnContent;
  onClose:        () => void;
  onStartTest:    (config: ConceptCountConfig) => void;
  initialConfig?: ConceptCountConfig;
}

/* Placeholder learn content */
const PLACEHOLDER_LEARN: LearnContent = {
  summary: "Placeholder summary — real content loaded from learnContent.ts.",
  definitions: [{ term: "Term A", def: "Definition placeholder." }],
  principles: ["Principle placeholder"],
  examples: [{ label: "Example 1", text: "// code example placeholder" }],
  mistakes: ["Common mistake placeholder"],
  whyMatters: "Why this matters placeholder.",
  connections: ["Topic A", "Topic B"],
};

// ── Concept Count Mode selector ───────────────────────────────────

const CC_MODES: { key: ConceptCountMode; icon: React.ReactNode; label: string }[] = [
  { key: "auto",       icon: <Settings2  size={10} />, label: "Auto"       },
  { key: "manual",     icon: <CheckSquare size={10} />, label: "Manual"     },
  { key: "difficulty", icon: <Sliders    size={10} />, label: "Difficulty" },
  { key: "group",      icon: <Users      size={10} />, label: "Group"      },
];

const DIFF_LEVELS: { key: DifficultyLevel; label: string; range: string }[] = [
  { key: "easy",   label: "Easy",   range: "3–5 concepts"   },
  { key: "medium", label: "Medium", range: "6–10 concepts"  },
  { key: "hard",   label: "Hard",   range: "12–20 concepts" },
  { key: "expert", label: "Expert", range: "20+ concepts"   },
];

function ConceptCountSelector({
  config,
  onChange,
  allConcepts,
}: {
  config:      ConceptCountConfig;
  onChange:    (c: ConceptCountConfig) => void;
  allConcepts: CognitiveCardData["concepts"];
}) {
  const setMode = (mode: ConceptCountMode) => onChange({ ...config, mode });

  const toggleManual = (id: string) => {
    const current = new Set(config.selectedIds ?? []);
    current.has(id) ? current.delete(id) : current.add(id);
    onChange({ ...config, selectedIds: [...current] });
  };

  const selectedIds = new Set(config.selectedIds ?? []);

  return (
    <div className="flex flex-col gap-3">
      {/* Mode tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
        {CC_MODES.map(m => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all ${
              config.mode === m.key
                ? "bg-indigo-600 text-white"
                : "text-white/30 hover:text-white/50"
            }`}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>

      {/* Mode content */}
      <AnimatePresence mode="wait">

        {/* AUTO */}
        {config.mode === "auto" && (
          <motion.div
            key="auto"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-1.5"
          >
            {allConcepts.map(c => (
              <div key={c.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                <div className="w-3.5 h-3.5 rounded border border-indigo-500/40 bg-indigo-600/20 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-sm bg-indigo-400" />
                </div>
                <span className="flex-1 text-[11px] text-white/60">{c.text}</span>
                <span className="text-[10px] text-white/38">×{c.weight}</span>
              </div>
            ))}
            <p className="text-[10px] text-white/38 text-center mt-1">All {allConcepts.length} concepts included automatically</p>
          </motion.div>
        )}

        {/* MANUAL */}
        {config.mode === "manual" && (
          <motion.div
            key="manual"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-1.5"
          >
            <p className="text-[11px] text-white/45 mb-1">Select the concepts you want to test:</p>
            {allConcepts.map(c => {
              const checked = selectedIds.has(c.id);
              return (
                <motion.button
                  key={c.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleManual(c.id)}
                  className={`flex items-center gap-2 px-2.5 py-2.5 rounded-lg border text-left transition-all ${
                    checked
                      ? "bg-indigo-600/15 border-indigo-500/30"
                      : "bg-white/[0.03] border-white/[0.04] opacity-55 hover:opacity-80"
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    checked ? "border-indigo-500/70 bg-indigo-600/40" : "border-white/20"
                  }`}>
                    {checked && <div className="w-1.5 h-1.5 rounded-sm bg-indigo-300" />}
                  </div>
                  <span className={`flex-1 text-[11px] transition-colors ${checked ? "text-white/80" : "text-white/45"}`}>{c.text}</span>
                  <span className="text-[10px] text-white/38">×{c.weight}</span>
                </motion.button>
              );
            })}
            {selectedIds.size === 0 && (
              <p className="text-[9px] text-amber-400/60 text-center mt-1">Select at least one concept — defaults to All if none chosen</p>
            )}
            {selectedIds.size > 0 && (
              <p className="text-[9px] text-emerald-400/60 text-center mt-1">{selectedIds.size} of {allConcepts.length} selected</p>
            )}
          </motion.div>
        )}

        {/* DIFFICULTY */}
        {config.mode === "difficulty" && (
          <motion.div
            key="difficulty"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-2"
          >
            <p className="text-[11px] text-white/45 mb-0.5">P1 selects top concepts by weight and complexity:</p>
            <div className="grid grid-cols-2 gap-2">
              {DIFF_LEVELS.map(d => {
                const active = (config.difficultyLevel ?? "medium") === d.key;
                const resolved = resolveConceptsForTest(allConcepts, { mode: "difficulty", difficultyLevel: d.key });
                return (
                  <button
                    key={d.key}
                    onClick={() => onChange({ ...config, difficultyLevel: d.key })}
                    className={`flex flex-col gap-1 p-3 rounded-xl border text-left transition-all ${
                      active
                        ? "bg-indigo-600/20 border-indigo-500/35"
                        : "bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.05]"
                    }`}
                  >
                    <span className={`text-[11px] font-bold ${active ? "text-indigo-300" : "text-white/55"}`}>{d.label}</span>
                    <span className="text-[11px] text-white/45">{d.range}</span>
                    <span className={`text-[9px] font-medium ${active ? "text-indigo-400" : "text-white/20"}`}>
                      {resolved.length} concept{resolved.length !== 1 ? "s" : ""} on this card
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* GROUP */}
        {config.mode === "group" && (
          <motion.div
            key="group"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-center gap-3 py-4"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center">
              <Lock size={16} className="text-indigo-400" />
            </div>
            <div className="text-center">
              <p className="text-[12px] font-semibold text-white/60">Host-controlled</p>
              <p className="text-[10px] text-white/30 mt-0.5">The room host will set the concept count for all participants</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600/10 border border-indigo-500/20">
              <Users size={11} className="text-indigo-400" />
              <span className="text-[11px] text-indigo-300/70">
                {config.groupConceptCount
                  ? `${config.groupConceptCount} concepts selected by host`
                  : "Waiting for host selection…"}
              </span>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

// ── Main StudyView ─────────────────────────────────────────────────

export default function StudyView({ card, learnContent, onClose, onStartTest, initialConfig }: Props) {
  const [flipped,  setFlipped]  = useState(false);
  const [ccConfig, setCCConfig] = useState<ConceptCountConfig>(initialConfig ?? { mode: "auto" });

  const content    = learnContent ?? PLACEHOLDER_LEARN;
  const activeCount = resolveConceptsForTest(card.concepts, ccConfig).length;

  return (
    <motion.div
      className="flex flex-col gap-4 h-full overflow-y-auto"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <SectionLabel>{card.category} · {card.subject}</SectionLabel>
          <h2 className="mt-1 text-[17px] font-bold text-white/90 leading-snug">{card.title}</h2>
          <div className="mt-2 flex items-center gap-3">
            <DifficultyDots level={card.difficulty} />
            <SectionLabel>Difficulty {card.difficulty}/5</SectionLabel>
            {card.mastery.streak > 0 && (
              <span className="text-[10px] text-amber-400 font-semibold">🔥 {card.mastery.streak} streak</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <MasteryRing score={card.mastery.score} size={48} />
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white/80">
              {card.mastery.score}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] flex items-center justify-center transition-colors"
          >
            <X size={13} className="text-white/40" />
          </button>
        </div>
      </div>

      {/* Mastery bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between">
          <SectionLabel>Mastery</SectionLabel>
          <SectionLabel>{card.mastery.score}%</SectionLabel>
        </div>
        <ProgressBar pct={card.mastery.score} accent={`bg-${card.textAccent.replace("text-", "")}`} height="h-[4px]" />
      </div>

      {/* Flashcard flip surface */}
      <div
        className="relative cursor-pointer select-none"
        style={{ perspective: 800 }}
        onClick={() => setFlipped(f => !f)}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative"
        >
          {/* Front */}
          <div
            className={`p-5 rounded-2xl border border-white/[0.06] ${card.gradientBg} flex flex-col gap-3 min-h-[140px]`}
            style={{ backfaceVisibility: "hidden", boxShadow: "0 10px 36px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06) inset" }}
          >
            <div className={`absolute top-0 left-4 right-4 h-[2px] rounded-b-full ${card.accent} opacity-60`} />
            <SectionLabel className="opacity-60">Front — tap to flip</SectionLabel>
            <p className="text-[14px] text-white/85 leading-relaxed">{card.description}</p>
            <div className="flex flex-wrap gap-1.5 mt-auto">
              {card.tags.slice(0, 4).map(t => (
                <span key={t} className="px-2 py-0.5 text-[9px] uppercase tracking-wider rounded-full bg-white/[0.05] text-white/35">{t}</span>
              ))}
            </div>
          </div>
          {/* Back */}
          <div
            className={`absolute inset-0 p-5 rounded-2xl border border-white/[0.06] ${card.gradientBg} flex flex-col gap-3 min-h-[140px]`}
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", boxShadow: "0 10px 36px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06) inset" }}
          >
            <div className={`absolute top-0 left-4 right-4 h-[2px] rounded-b-full ${card.accent} opacity-60`} />
            <SectionLabel className="opacity-60">Back — Concepts</SectionLabel>
            <div className="flex flex-col gap-2">
              {card.concepts.slice(0, 4).map(c => (
                <div key={c.id} className="flex items-start gap-2">
                  <span className="text-emerald-400 text-[11px] mt-px">✓</span>
                  <span className="text-[12px] text-white/75 leading-relaxed">{c.text}</span>
                </div>
              ))}
            </div>
            {card.examples.length > 0 && (
              <div className="mt-auto">
                <SectionLabel>Example</SectionLabel>
                <p className="mt-1 text-[11px] text-white/50 italic">{card.examples[0]}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Notes link */}
      {card.notesLink && (
        <button className="flex items-center gap-2 text-[11px] text-sky-400/70 hover:text-sky-400 transition-colors">
          <Link2 size={11} />
          <span>View linked notes</span>
        </button>
      )}

      {/* Learn Mode */}
      <LearnMode content={content} accent="indigo" />

      {/* ── Concept Count Mode ───────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <SectionLabel>Concepts to recall</SectionLabel>
          <span className="text-[9px] text-indigo-400/70 font-medium">{conceptCountLabel(ccConfig)}</span>
        </div>
        <ConceptCountSelector
          config={ccConfig}
          onChange={setCCConfig}
          allConcepts={card.concepts}
        />
      </div>

      {/* Agent insight */}
      <AgentInsight>
        You've attempted this card {card.mastery.attempts}× — next test session recommended to consolidate memory traces.
      </AgentInsight>

      {/* Start test CTA */}
      <button
        onClick={() => onStartTest(ccConfig)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-semibold transition-colors shadow-lg shadow-indigo-900/40"
      >
        <Play size={14} />
        Start Test
        {activeCount < card.concepts.length && (
          <span className="ml-1 text-[10px] text-indigo-200/70">({activeCount} concepts)</span>
        )}
      </button>
    </motion.div>
  );
}
