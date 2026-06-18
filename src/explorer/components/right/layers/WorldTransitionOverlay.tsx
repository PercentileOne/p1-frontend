import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  machineState: string;
};

export const WorldTransitionOverlay = ({ machineState }: Props) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      machineState === "enteringCategory" ||
      machineState === "enteringSubcategory" ||
      machineState === "enteringCareer" ||
      machineState === "exitingCareer"
    ) {
      setVisible(true);
      const timeout = setTimeout(() => setVisible(false), 600);
      return () => clearTimeout(timeout);
    }
  }, [machineState]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.85 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            background:
              machineState === "enteringCareer"
                ? "rgba(255,183,76,0.25)" // warm decision tint
                : machineState === "enteringSubcategory"
                  ? "rgba(72,199,236,0.25)" // cool exploration tint
                  : "rgba(0,0,0,0.35)", // neutral fade
            backdropFilter: "blur(12px)",
            zIndex: 999,
          }}
        />
      )}
    </AnimatePresence>
  );
};
