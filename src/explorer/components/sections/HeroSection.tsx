import { motion } from "framer-motion";
import { motion as fm } from "framer-motion";
import { color, motion as motionTokens } from "../../tokens/designTokens";
import { useEmotionalMemory } from "../../state/useEmotionalMemory";

type Props = {
  careerId: string;
  heroImageUrl: string;
};

export const HeroSection = ({ careerId, heroImageUrl }: Props) => {
  const viewedCareerIds = useEmotionalMemory((s) => s.viewedCareerIds);
  const hasVisited = viewedCareerIds.has(careerId);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionTokens.duration.cinematic / 1000 }}
      style={{
        backgroundImage: `url(${heroImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        boxShadow: hasVisited ? `0 0 40px ${color.warm.tint}` : "none",
      }}
    >
      {/* overlay gradients, title, etc. */}
    </motion.section>
  );
};
