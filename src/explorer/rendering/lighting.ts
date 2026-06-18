export type LightingMode =
  | "neutral"
  | "arrival"
  | "reflection"
  | "truth"
  | "decision";

export const getLightingMode = (chapter: number): LightingMode => {
  if (chapter <= 2) return "arrival";
  if (chapter <= 4) return "reflection";
  if (chapter <= 7) return "truth";
  if (chapter <= 9) return "decision";
  return "decision";
};
