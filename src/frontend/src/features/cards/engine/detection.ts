/* ══════════════════════════════════════════════════════════════
   CONCEPT DETECTION ENGINE — Document 4 §2
   Exact · synonym · partial · multi-word · misconception
   ══════════════════════════════════════════════════════════════ */

import type { Concept } from "../types";

// ── Synonym expansion map ────────────────────────────────────────
export const SYNONYM_MAP: Record<string, string[]> = {
  "component":    ["widget", "module", "building block", "element", "unit"],
  "state":        ["reactive data", "local data", "mutable data"],
  "jsx":          ["html in javascript", "template syntax", "markup syntax"],
  "props":        ["properties", "inputs", "parameters", "arguments"],
  "virtual dom":  ["vdom", "memory dom", "shadow dom"],
  "useeffect":    ["lifecycle", "side effect hook", "effect hook"],
  "usememo":      ["memoize", "memoization", "cache value", "cached computation"],
  "usecallback":  ["memoize function", "stable callback", "function cache"],
  "useref":       ["mutable ref", "persistent ref", "dom ref"],
  "usecontext":   ["context hook", "consume context"],
  "generic":      ["type parameter", "parameterized type", "type variable"],
  "interface":    ["type contract", "object shape", "type definition"],
  "hmr":          ["hot reload", "live reload", "module reload", "hot update"],
  "esm":          ["es modules", "native modules", "ecmascript modules"],
  "rolldown":     ["rust bundler", "vite bundler", "production bundler"],
  "spring":       ["physics animation", "elastic animation", "bouncy"],
  "variant":      ["animation state", "named state", "animation variant"],
  "arbitrary":    ["custom value", "one-off value", "bracket syntax"],
  "layer":        ["cascade layer", "@layer directive"],
  "tree-shaking": ["dead code elimination", "unused code removal"],
  "type guard":   ["type narrowing", "type narrowing check", "discriminated union"],
};

export function expandKeywords(keywords: string[]): string[] {
  const out = new Set(keywords);
  for (const kw of keywords) {
    SYNONYM_MAP[kw]?.forEach(s => out.add(s));
    for (const [canonical, syns] of Object.entries(SYNONYM_MAP)) {
      if (syns.some(s => kw === s)) out.add(canonical);
    }
  }
  return [...out];
}

// ── Misconception detection ──────────────────────────────────────
export const MISCONCEPTIONS: { phrase: string; label: string }[] = [
  { phrase: "state is global",              label: "State is component-local, not global by default" },
  { phrase: "props are mutable",            label: "Props are read-only — never mutate them" },
  { phrase: "props can be mutated",         label: "Props are read-only — never mutate them" },
  { phrase: "useeffect is synchronous",     label: "useEffect is asynchronous and runs after render" },
  { phrase: "virtual dom is the real dom",  label: "Virtual DOM is an in-memory copy, not the real DOM" },
  { phrase: "typescript adds runtime",      label: "TypeScript types are erased at compile time — zero runtime overhead" },
  { phrase: "generics are runtime",         label: "TypeScript generics are compile-time only" },
  { phrase: "components must be classes",   label: "Modern React uses function components — classes are legacy" },
  { phrase: "vite uses webpack",            label: "Vite uses Rolldown/esbuild, not Webpack" },
  { phrase: "hmr does full reload",         label: "HMR replaces only the changed module — no full page reload" },
  { phrase: "tailwind is inline styles",    label: "Tailwind generates real CSS classes, not inline styles" },
];

// ── Core detection function ──────────────────────────────────────
export interface DetectionResult {
  newHits: string[];
  partialHits: string[];
  misconceptions: string[];
}

export function detectConceptsEnhanced(
  text: string,
  concepts: Concept[],
  alreadyHit: Set<string>,
): DetectionResult {
  const lower = text.toLowerCase();
  const newHits: string[] = [];
  const partialHits: string[] = [];

  for (const c of concepts) {
    if (alreadyHit.has(c.id)) continue;

    const expanded = expandKeywords(c.keywords);

    // Exact or synonym match
    if (expanded.some(kw => lower.includes(kw))) {
      newHits.push(c.id);
      continue;
    }

    // Partial match: typed word (≥4 chars) that begins a keyword
    const words = lower.split(/\s+/);
    if (c.keywords.some(kw => words.some(w => w.length >= 4 && kw.startsWith(w)))) {
      partialHits.push(c.id);
    }
  }

  const misconceptions = MISCONCEPTIONS
    .filter(m => lower.includes(m.phrase))
    .map(m => m.label);

  return { newHits, partialHits, misconceptions };
}
