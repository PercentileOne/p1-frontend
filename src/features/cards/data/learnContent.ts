/* ══════════════════════════════════════════════════════════════
   Learn content store — Document 1B
   Keyed by card ID. Phase 1: sample entries for the 6 seed cards.
   ══════════════════════════════════════════════════════════════ */

import type { LearnContent } from "../types";

export const LEARN_CONTENT: Record<string, LearnContent> = {
  "card-react-components": {
    summary: "React components are the fundamental building blocks of any React application. Each component is a self-contained unit that manages its own markup, logic, and optionally its own state.",
    definitions: [
      { term: "Function Component", def: "A plain JavaScript function that accepts props and returns JSX. The modern standard in React 16.8+." },
      { term: "JSX", def: "A syntax extension that looks like HTML inside JavaScript. Transpiled to React.createElement() calls by your bundler." },
      { term: "Props", def: "Read-only inputs passed from a parent to a child component via HTML-like attributes." },
    ],
    principles: [
      "Components should do one thing well — keep them small and focused.",
      "Props flow down (parent → child); events flow up (callbacks).",
      "Component names must start with an uppercase letter so React can distinguish them from HTML elements.",
    ],
    examples: [
      { label: "Minimal function component", text: `function Hello({ name }: { name: string }) {\n  return <h1>Hello, {name}</h1>;\n}` },
      { label: "With children", text: `function Card({ children }: { children: React.ReactNode }) {\n  return <div className="card">{children}</div>;\n}` },
    ],
    mistakes: [
      "Mutating props directly — React will not re-render and your UI will be stale.",
      "Naming components with lowercase — React will try to render them as DOM elements.",
      "Putting side effects directly in the render body — use useEffect instead.",
    ],
    whyMatters: "Every React UI is a tree of components. Mastering the component model means you can compose any interface from small, testable, reusable pieces.",
    connections: ["State & Hooks", "React Router", "Framer Motion", "TypeScript Generics"],
  },

  "card-react-hooks": {
    summary: "Hooks let function components tap into React features — state, lifecycle, context, memoization — that were previously only available in class components.",
    definitions: [
      { term: "useState", def: "Returns a state value and a setter. Calling the setter queues a re-render with the new value." },
      { term: "useEffect", def: "Runs a side effect (fetch, subscription, DOM mutation) after the browser paints. Returns a cleanup function." },
      { term: "useMemo / useCallback", def: "Memoize expensive computed values or stable function references to avoid unnecessary child re-renders." },
    ],
    principles: [
      "Only call hooks at the top level — never inside conditions, loops, or nested functions.",
      "Only call hooks from React function components or custom hooks.",
      "Every useEffect with external dependencies needs a cleanup function.",
    ],
    examples: [
      { label: "useState counter", text: `const [count, setCount] = useState(0);\nreturn <button onClick={() => setCount(c => c + 1)}>{count}</button>;` },
      { label: "useEffect fetch", text: `useEffect(() => {\n  let active = true;\n  fetch(url).then(r => r.json()).then(d => { if (active) setData(d); });\n  return () => { active = false; };\n}, [url]);` },
    ],
    mistakes: [
      "Missing the dependency array in useEffect — causes an infinite loop.",
      "Stale closure: reading state inside a setInterval without using the functional updater form.",
      "Calling hooks conditionally — violates the Rules of Hooks.",
    ],
    whyMatters: "Hooks are the API surface through which you interact with React's rendering engine. Deep hook knowledge separates intermediate from senior React engineers.",
    connections: ["React Components", "Context API", "Custom Hooks", "React Query"],
  },

  "card-typescript-generics": {
    summary: "Generics allow you to write reusable, type-safe code that works with any data type, enforced at compile time with zero runtime overhead.",
    definitions: [
      { term: "Type Parameter", def: "A placeholder type written as <T> that is filled in at the call site. Think of it as a type-level variable." },
      { term: "Constraint", def: "A bound on a type parameter: `<T extends object>` restricts T to only object types." },
      { term: "Generic Inference", def: "TypeScript deduces the type argument from context so you rarely need to write it explicitly." },
    ],
    principles: [
      "Prefer T extends SomeInterface over T extends any for safety.",
      "Generic utility types (Partial<T>, Pick<T, K>, Record<K,V>) are your daily tools — know them.",
      "Generics are erased at compile time — they add no runtime cost.",
    ],
    examples: [
      { label: "Generic identity", text: `function identity<T>(value: T): T { return value; }` },
      { label: "Generic API response wrapper", text: `interface ApiResponse<T> {\n  data: T;\n  status: number;\n  error: string | null;\n}` },
    ],
    mistakes: [
      "Using `any` instead of a generic — loses all type safety.",
      "Over-constraining with `extends object` when `extends Record<string, unknown>` is more precise.",
      "Confusing generic functions with generic interfaces — they compose differently.",
    ],
    whyMatters: "Without generics you either duplicate code or lose type safety. Generics let you write library-quality, self-documenting, refactor-proof abstractions.",
    connections: ["TypeScript Interfaces", "Utility Types", "Type Guards", "React Props Typing"],
  },

  "card-vite-hmr": {
    summary: "Vite uses native ES modules in development so the browser only re-fetches the exact module that changed. HMR (Hot Module Replacement) applies that delta without a full page reload, preserving application state.",
    definitions: [
      { term: "HMR", def: "Hot Module Replacement — swaps a changed module in a running app without reloading the page." },
      { term: "ESM", def: "ECMAScript Modules — the native `import/export` system that modern browsers understand directly." },
      { term: "Rolldown", def: "The Rust-based bundler Vite uses for production builds, replacing esbuild for the bundle step." },
    ],
    principles: [
      "Dev server never bundles — it serves raw ESM. The browser's module graph IS the build.",
      "Only the changed module and its direct importers are re-executed during HMR.",
      "Pre-bundling of node_modules with esbuild happens once and is cached.",
    ],
    examples: [
      { label: "Accepting HMR in a module", text: `if (import.meta.hot) {\n  import.meta.hot.accept((newModule) => {\n    // apply newModule\n  });\n}` },
    ],
    mistakes: [
      "Thinking HMR does a full page reload — it patches only the changed module.",
      "Assuming Vite uses Webpack — it does not. Dev uses native ESM; prod uses Rolldown.",
      "Importing from node_modules in a loop without pre-bundling consideration.",
    ],
    whyMatters: "Vite's architecture gives sub-50ms feedback loops on changes regardless of project size. Understanding it helps you debug build issues and write HMR-friendly code.",
    connections: ["ES Modules", "Rolldown", "Tree-shaking", "Tailwind CSS v4"],
  },

  "card-tailwind-v4": {
    summary: "Tailwind CSS v4 drops the config file in favour of CSS-native configuration via @theme directives, uses @import 'tailwindcss' as its single entry point, and fully embraces CSS cascade layers.",
    definitions: [
      { term: "@theme", def: "A CSS directive that defines design tokens directly in CSS, replacing tailwind.config.js." },
      { term: "Arbitrary value", def: "One-off values written in bracket notation: `pt-[20px]`, `bg-white/[0.06]`. No config needed." },
      { term: "CSS Layers", def: "The @layer directive lets Tailwind insert its styles into specific cascade layers so your custom CSS always wins." },
    ],
    principles: [
      "Single import: `@import 'tailwindcss'` — no more three-line base/components/utilities split.",
      "Utility classes are generated on demand from your markup — zero dead CSS in production.",
      "Arbitrary values (bracket syntax) cover edge cases without touching config.",
    ],
    examples: [
      { label: "v4 CSS entry point", text: `@import "tailwindcss";\n\n@theme {\n  --color-brand: oklch(65% 0.22 260);\n}` },
      { label: "Arbitrary value usage", text: `<div class="pt-[20px] bg-white/[0.06] text-[11px]">…</div>` },
    ],
    mistakes: [
      "Using @tailwind base / components / utilities — those directives are gone in v4.",
      "Writing a tailwind.config.js — v4 uses @theme in CSS instead.",
      "Thinking Tailwind generates inline styles — it generates real utility CSS classes.",
    ],
    whyMatters: "Tailwind v4 aligns the framework with modern CSS standards, eliminates build-time config complexity, and makes design tokens first-class CSS variables.",
    connections: ["Vite / HMR", "CSS Custom Properties", "Dark Mode", "Arbitrary Values"],
  },

  "card-framer-motion": {
    summary: "Framer Motion is a production-ready React animation library built on spring physics. It provides declarative animate props, gesture recognition, layout animations, and AnimatePresence for enter/exit transitions.",
    definitions: [
      { term: "motion.div", def: "A Framer Motion component that wraps any HTML element to add animation capabilities via props." },
      { term: "Variant", def: "A named animation state object. Components transition between named variants via the `animate` prop." },
      { term: "AnimatePresence", def: "A wrapper that enables exit animations when components are removed from the React tree." },
      { term: "Spring", def: "A physics-based easing that simulates a mass-spring-damper system for natural, elastic motion." },
    ],
    principles: [
      "Prefer `layout` prop for size/position changes — it automatically interpolates between layouts.",
      "Spring physics look more natural than cubic-bezier for UI transitions.",
      "AnimatePresence must wrap any component that conditionally renders and needs an exit animation.",
    ],
    examples: [
      { label: "Fade in / slide up", text: `<motion.div\n  initial={{ opacity: 0, y: 12 }}\n  animate={{ opacity: 1, y: 0 }}\n  exit={{ opacity: 0 }}\n  transition={{ type: 'spring', stiffness: 300, damping: 25 }}\n/>` },
      { label: "Layout animation", text: `<motion.div layout className="card">…</motion.div>` },
    ],
    mistakes: [
      "Forgetting `exit` props on components inside AnimatePresence — no exit animation fires.",
      "Using CSS transitions alongside Framer Motion on the same property — they conflict.",
      "Not providing a stable `key` prop inside AnimatePresence — React reuses the element instead of remounting.",
    ],
    whyMatters: "Motion bridges the gap between functional UI and delightful product feel. Spring physics gives P1 its signature high-quality, tactile interface.",
    connections: ["React Components", "React 19 Concurrent", "CSS Transitions", "Gesture Handlers"],
  },
};
