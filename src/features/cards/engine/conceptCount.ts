/* ══════════════════════════════════════════════════════════════
   CONCEPT COUNT ENGINE — Document 4B
   resolveConceptsForTest(concepts, config) → Concept[]
   ══════════════════════════════════════════════════════════════ */

import type { Concept } from "../types";
import type { ConceptCountConfig, DifficultyLevel } from "../types";

// Concept counts per difficulty band (Document 4B §1.3)
const DIFFICULTY_COUNTS: Record<DifficultyLevel, [number, number]> = {
  easy:   [3,  5],
  medium: [6,  10],
  hard:   [12, 20],
  expert: [20, Infinity],
};

// Pick top N concepts by (weight × difficulty) descending
function pickTopN(concepts: Concept[], n: number): Concept[] {
  return [...concepts]
    .sort((a, b) => b.weight * b.difficulty - a.weight * a.difficulty)
    .slice(0, n);
}

export function resolveConceptsForTest(
  concepts: Concept[],
  config: ConceptCountConfig,
): Concept[] {
  switch (config.mode) {
    case "auto":
      return concepts;

    case "manual": {
      if (!config.selectedIds?.length) return concepts;
      const ids = new Set(config.selectedIds);
      const selected = concepts.filter(c => ids.has(c.id));
      // Fall back to all if selection is empty (safety guard)
      return selected.length > 0 ? selected : concepts;
    }

    case "difficulty": {
      const level = config.difficultyLevel ?? "medium";
      const [min, max] = DIFFICULTY_COUNTS[level];
      const count = Math.min(max === Infinity ? concepts.length : max, concepts.length);
      const resolved = pickTopN(concepts, count);
      // Enforce minimum — if fewer concepts exist than min, return all
      return resolved.length >= min ? resolved : concepts;
    }

    case "group": {
      const n = config.groupConceptCount ?? concepts.length;
      return pickTopN(concepts, Math.min(n, concepts.length));
    }
  }
}

// Helper used by ScoreView: returns human-readable mode label
export function conceptCountLabel(config: ConceptCountConfig): string {
  switch (config.mode) {
    case "auto":       return "All concepts";
    case "manual":     return `${config.selectedIds?.length ?? 0} selected`;
    case "difficulty": return `${config.difficultyLevel ?? "medium"} difficulty`;
    case "group":      return `${config.groupConceptCount ?? "?"} (host-set)`;
  }
}
