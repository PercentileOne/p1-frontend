import { useEffect, useRef } from "react";
import { useEmotionalMemory } from "../state/useEmotionalMemory";

export const useScrollPace = (scrollY: number) => {
  const lastY = useRef(scrollY);
  const lastTime = useRef(performance.now());
  const setUserPace = useEmotionalMemory((s) => s.setUserPace);

  useEffect(() => {
    const now = performance.now();
    const dy = Math.abs(scrollY - lastY.current);
    const dt = now - lastTime.current;

    const speed = dy / dt; // px/ms

    if (speed < 0.05) setUserPace("slow");
    else if (speed < 0.2) setUserPace("medium");
    else setUserPace("fast");

    lastY.current = scrollY;
    lastTime.current = now;
  }, [scrollY, setUserPace]);
};
