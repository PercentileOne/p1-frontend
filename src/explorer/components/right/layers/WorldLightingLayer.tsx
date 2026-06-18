import React from "react";
import { motion } from "framer-motion";

type Props = {
  selectedCareerId: string | null;
  machineState: string;
  emotionalMemory: any;
};

export const WorldLightingLayer = ({
  selectedCareerId,
  machineState,
  emotionalMemory,
}: Props) => {
  // Emotional tint based on transition type
  const tint =
    machineState === "enteringCareer"
      ? "rgba(255,183,76,0.12)" // warm golden tint for commitment
      : machineState === "enteringSubcategory"
        ? "rgba(72,199,236,0.12)" // cool teal tint for exploration
        : machineState === "enteringCategory"
          ? "rgba(255,255,255,0.06)" // soft neutral fade
          : "transparent";

  // Optional: memory-aware lighting (future expansion)
  const familiarityBoost =
    selectedCareerId && emotionalMemory?.viewedCareerIds?.has(selectedCareerId)
      ? 0.04
      : 0;

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

        // Base lighting gradient
        background: `
          radial-gradient(
            circle at 50% 20%,
            rgba(255,255,255,${0.08 + familiarityBoost}),
            rgba(0,0,0,0.0) 60%
          )
        `,
        mixBlendMode: "screen",
      }}
    >
      {/* Emotional tint overlay */}
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
