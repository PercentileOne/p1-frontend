import { motion } from "framer-motion";
import { useExplorerMachine } from "../../../state/useExplorerMachine";
import { useEmotionalMemory } from "../../../state/useEmotionalMemory";

export const WorldLightingLayer = () => {
  const machineState    = useExplorerMachine((s) => s.state);
  const selectedCareerId = useExplorerMachine((s) => s.selectedCareerId);
  const viewedCareerIds  = useEmotionalMemory((s) => s.viewedCareerIds);

  const tint =
    machineState === "enteringCareer"
      ? "rgba(255,183,76,0.12)"
      : machineState === "enteringSubcategory"
        ? "rgba(72,199,236,0.12)"
        : machineState === "enteringCategory"
          ? "rgba(255,255,255,0.06)"
          : "transparent";

  const familiarityBoost =
    selectedCareerId && viewedCareerIds.has(selectedCareerId) ? 0.04 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 3,
        background: `radial-gradient(circle at 50% 20%, rgba(255,255,255,${0.08 + familiarityBoost}), rgba(0,0,0,0.0) 60%)`,
        mixBlendMode: "screen",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: tint,
          transition: "background 0.45s ease",
        }}
      />
    </motion.div>
  );
};
