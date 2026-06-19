/* ══════════════════════════════════════════════════════════════
   CardOverlay — owns the full card session flow
   study → test → score
   Calls useTestStore(card) once; passes store to children.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { CognitiveCardData, ConceptCountConfig } from "../types";
import { LEARN_CONTENT } from "../data/learnContent";
import { resolveConceptsForTest } from "../engine/conceptCount";
import { useTestStore } from "../testStore";
import StudyView from "./StudyView";
import TestView  from "./TestView";
import ScoreView from "./ScoreView";

type Phase = "study" | "test" | "score";

interface Props {
  card:    CognitiveCardData;
  onClose: () => void;
}

export default function CardOverlay({ card, onClose }: Props) {
  const [phase, setPhase]   = useState<Phase>("study");
  const [ccConfig, setCCConfig] = useState<ConceptCountConfig>({ mode: "auto" });

  const activeConcepts = resolveConceptsForTest(card.concepts, ccConfig);
  const store          = useTestStore(card, activeConcepts);

  // Switch to score view as soon as breakdown is ready
  useEffect(() => {
    if (store.breakdown && phase === "test") {
      setPhase("score");
    }
  }, [store.breakdown]);

  // Reset phase when card changes
  useEffect(() => {
    setPhase("study");
    setCCConfig({ mode: "auto" });
  }, [card.id]);

  const handleStartTest = (config: ConceptCountConfig) => {
    setCCConfig(config);
    setPhase("test");
    // store.start() is called inside TestView on mount
  };

  const handleRetry = () => {
    store.reset();
    setPhase("test");
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Phase indicator */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex gap-1.5">
          {(["study", "test", "score"] as Phase[]).map((p) => (
            <div
              key={p}
              className={`h-[2px] w-8 rounded-full transition-all duration-300 ${
                p === phase              ? "bg-indigo-500"
                : (phase === "test"     && p === "study") ||
                  (phase === "score"    && p !== "score")
                ? "bg-white/20"
                : "bg-white/[0.08]"
              }`}
            />
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] flex items-center justify-center transition-colors"
        >
          <X size={12} className="text-white/40" />
        </button>
      </div>

      {/* Phase views */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <AnimatePresence mode="wait">
          {phase === "study" && (
            <motion.div
              key="study"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              <StudyView
                card={card}
                learnContent={LEARN_CONTENT[card.id]}
                onClose={onClose}
                onStartTest={handleStartTest}
                initialConfig={ccConfig}
              />
            </motion.div>
          )}

          {phase === "test" && (
            <motion.div
              key="test"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              <TestView
                store={store}
                onBack={() => { store.reset(); setPhase("study"); }}
              />
            </motion.div>
          )}

          {phase === "score" && (
            <motion.div
              key="score"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              <ScoreView
                store={store}
                onRetry={handleRetry}
                onClose={onClose}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
