import { useEffect } from "react";
import { useExplorerMachine } from "../state/useExplorerMachine";

export const useEmotionalDepth = (scrollY: number, maxScroll: number) => {
  const setEmotionalDepth = useExplorerMachine((s) => s.setEmotionalDepth);
  const setChapter = useExplorerMachine((s) => s.setChapter);

  useEffect(() => {
    const depth = Math.min(1, Math.max(0, scrollY / maxScroll));
    setEmotionalDepth(depth);

    const chapter = Math.min(10, Math.max(1, Math.floor(depth * 10) || 1));
    setChapter(chapter);
  }, [scrollY, maxScroll, setEmotionalDepth, setChapter]);
};
