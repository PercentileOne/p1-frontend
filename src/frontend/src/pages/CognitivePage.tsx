import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Clock, Trophy, Mic, Video, StopCircle, RotateCcw,
  ChevronRight, ChevronDown, Users, Star, CheckCircle2, X, Play,
  BarChart3, Flame, Sparkles, Link2, Zap, Crown, Hash, Shield,
} from "lucide-react";
import BackToCockpit from "../components/BackToCockpit";

/* ══════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════ */

type Difficulty = 1 | 2 | 3 | 4 | 5;
type CardState = "study" | "test" | "score" | "multiplayer";

interface Concept {
  id: string;
  text: string;
  keywords: string[];   // runtime-only — used for real-time concept detection
  difficulty: number;
  weight: number;
  aiGenerated: boolean;
  order: number;
}

interface TestConfig {
  timeLimitSeconds: number;
  allowVoice: boolean;
  allowVideo: boolean;
  allowTyping: boolean;
  revealMode: "blur" | "fade";
  scoringMode: "standard" | "strict" | "speed";
}

interface AttemptRecord {
  timestamp: Date;
  score: number;
  conceptsHit: string[];
  conceptsMissed: string[];
  timeUsed: number;
}

interface MasteryData {
  score: number;
  lastTested: Date | null;
  streak: number;
  attempts: number;
  history: AttemptRecord[];
}

interface CardAI {
  generatedFrom: string | null;
  modelVersion: string | null;
  autoImprove: boolean;
  suggestions: string[];
}

interface CognitiveCardData {
  id: string;
  userId: string;
  // Identity
  title: string;
  category: string;
  subject: string;
  difficulty: Difficulty;
  tags: string[];
  // Content
  description: string;
  examples: string[];
  notesLink: string | null;
  // Concepts
  concepts: Concept[];
  // Testing
  testConfig: TestConfig;
  // Scoring
  mastery: MasteryData;
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  source: "manual" | "ai" | "notes" | "import";
  version: number;
  // AI
  ai: CardAI;
  // Display-only (not persisted — assigned by the UI layer)
  accent: string;
  gradientBg: string;
  textAccent: string;
}

interface LearnDef   { term: string; def: string; }
interface LearnEg    { label: string; text: string; }

interface LearnContent {
  summary: string;
  definitions: LearnDef[];
  principles: string[];
  examples: LearnEg[];
  mistakes: string[];
  whyMatters: string;
  connections: string[];
}

/* Helper: convert a Date to a human-readable "last tested" string */
function formatLastTested(date: Date | null): string {
  if (!date) return "Never tested";
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)  return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";
  if (diffDays < 21) return "2 weeks ago";
  return `${Math.floor(diffDays / 7)} weeks ago`;
}

const DEFAULT_TEST_CONFIG: TestConfig = {
  timeLimitSeconds: 180,
  allowVoice: true,
  allowVideo: true,
  allowTyping: true,
  revealMode: "blur",
  scoringMode: "standard",
};

const DEFAULT_AI: CardAI = {
  generatedFrom: null,
  modelVersion: null,
  autoImprove: true,
  suggestions: [],
};

/* ══════════════════════════════════════════════════════════════
   SAMPLE DATA
   ══════════════════════════════════════════════════════════════ */

const CARDS: CognitiveCardData[] = [
  {
    id: "react-fundamentals",
    userId: "user-p1",
    title: "React Fundamentals",
    category: "Frontend",
    subject: "React 19",
    difficulty: 2,
    tags: ["react", "jsx", "components", "state", "frontend"],
    description: "Core building blocks of React applications — components, JSX, state, and the rendering lifecycle.",
    examples: [
      "function Counter() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>;\n}",
      "function Greeting({ name }: { name: string }) {\n  return <p>Hello, {name}!</p>;\n}",
    ],
    notesLink: null,
    concepts: [
      { id: "c1", text: "Components are reusable, self-contained UI units that accept props and return JSX.", keywords: ["component", "components"], difficulty: 1, weight: 1.0, aiGenerated: false, order: 1 },
      { id: "c2", text: "JSX is a syntax extension that lets you write HTML-like markup inside JavaScript.", keywords: ["jsx", "markup"], difficulty: 1, weight: 0.8, aiGenerated: false, order: 2 },
      { id: "c3", text: "State is local mutable data that triggers a re-render when changed via setState.", keywords: ["state", "setstate", "usestate"], difficulty: 2, weight: 1.2, aiGenerated: false, order: 3 },
      { id: "c4", text: "useEffect runs side effects after render — data fetching, subscriptions, DOM mutations.", keywords: ["useeffect", "side effect", "effect"], difficulty: 2, weight: 1.1, aiGenerated: false, order: 4 },
      { id: "c5", text: "The Virtual DOM is React's lightweight in-memory copy of the real DOM used for diffing.", keywords: ["virtual dom", "vdom", "diffing"], difficulty: 2, weight: 1.0, aiGenerated: false, order: 5 },
      { id: "c6", text: "Props are read-only inputs passed from parent to child components.", keywords: ["props", "prop"], difficulty: 1, weight: 0.9, aiGenerated: false, order: 6 },
    ],
    testConfig: { ...DEFAULT_TEST_CONFIG },
    mastery: {
      score: 78,
      lastTested: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      streak: 3,
      attempts: 5,
      history: [],
    },
    createdAt: new Date("2026-05-01"),
    updatedAt: new Date("2026-06-15"),
    source: "manual",
    version: 1,
    ai: { ...DEFAULT_AI },
    accent: "#61DAFB",
    gradientBg: "from-cyan-950/70 to-sky-900/40",
    textAccent: "text-cyan-400",
  },
  {
    id: "typescript-essentials",
    userId: "user-p1",
    title: "TypeScript Essentials",
    category: "Language",
    subject: "TypeScript 5",
    difficulty: 3,
    tags: ["typescript", "types", "generics", "interfaces", "static typing"],
    description: "Static typing, interfaces, generics, and the advanced type system that makes large codebases safe.",
    examples: [
      "function identity<T>(value: T): T { return value; }",
      "type ApiResponse<T> = { data: T; status: number; error: string | null; }",
    ],
    notesLink: null,
    concepts: [
      { id: "c1", text: "Types describe the shape of data — primitives, unions, intersections, and literals.", keywords: ["type", "union", "intersection"], difficulty: 2, weight: 1.0, aiGenerated: false, order: 1 },
      { id: "c2", text: "Interfaces define contracts for object shapes and can be extended or merged.", keywords: ["interface", "extends"], difficulty: 2, weight: 1.0, aiGenerated: false, order: 2 },
      { id: "c3", text: "Generics allow writing reusable code that works with any type via type parameters.", keywords: ["generic", "generics", "type parameter"], difficulty: 3, weight: 1.3, aiGenerated: false, order: 3 },
      { id: "c4", text: "Type guards narrow a type within a conditional block using typeof, instanceof, or 'in'.", keywords: ["type guard", "typeof", "instanceof", "narrowing"], difficulty: 3, weight: 1.2, aiGenerated: false, order: 4 },
      { id: "c5", text: "Utility types like Partial, Required, Pick, Omit, and Record transform existing types.", keywords: ["partial", "required", "pick", "omit", "record", "utility"], difficulty: 3, weight: 1.1, aiGenerated: false, order: 5 },
      { id: "c6", text: "Enums are named sets of constants — prefer const enums or string literal unions.", keywords: ["enum", "enums"], difficulty: 2, weight: 0.8, aiGenerated: false, order: 6 },
    ],
    testConfig: { ...DEFAULT_TEST_CONFIG },
    mastery: {
      score: 62,
      lastTested: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      streak: 1,
      attempts: 4,
      history: [],
    },
    createdAt: new Date("2026-05-05"),
    updatedAt: new Date("2026-06-10"),
    source: "manual",
    version: 1,
    ai: { ...DEFAULT_AI },
    accent: "#3178C6",
    gradientBg: "from-blue-950/70 to-blue-900/40",
    textAccent: "text-blue-400",
  },
  {
    id: "framer-motion",
    userId: "user-p1",
    title: "Framer Motion",
    category: "Animation",
    subject: "Framer Motion v12",
    difficulty: 3,
    tags: ["framer-motion", "animation", "react", "gestures", "variants"],
    description: "Production-ready animation library for React — variants, gestures, layout animations, and presence.",
    examples: [
      "<motion.div animate={{ x: 100 }} transition={{ type: 'spring', stiffness: 300 }} />",
      "<AnimatePresence>{isVisible && <motion.div exit={{ opacity: 0 }} />}</AnimatePresence>",
    ],
    notesLink: null,
    concepts: [
      { id: "c1", text: "Variants are named animation states that can be applied and transitioned between declaratively.", keywords: ["variant", "variants"], difficulty: 2, weight: 1.2, aiGenerated: false, order: 1 },
      { id: "c2", text: "AnimatePresence enables exit animations when components are removed from the React tree.", keywords: ["animatepresence", "exit"], difficulty: 2, weight: 1.2, aiGenerated: false, order: 2 },
      { id: "c3", text: "whileHover and whileTap apply animations on gesture interaction without extra state.", keywords: ["whilehover", "whiletap", "gesture"], difficulty: 2, weight: 1.0, aiGenerated: false, order: 3 },
      { id: "c4", text: "Layout animations auto-animate between layout changes using the layout prop.", keywords: ["layout", "layout animation"], difficulty: 3, weight: 1.1, aiGenerated: false, order: 4 },
      { id: "c5", text: "Spring physics create natural motion via stiffness, damping, and mass parameters.", keywords: ["spring", "stiffness", "damping"], difficulty: 3, weight: 1.0, aiGenerated: false, order: 5 },
      { id: "c6", text: "The motion component wraps HTML/SVG elements to give them animation superpowers.", keywords: ["motion", "motion.div"], difficulty: 1, weight: 0.8, aiGenerated: false, order: 6 },
    ],
    testConfig: { ...DEFAULT_TEST_CONFIG },
    mastery: {
      score: 55,
      lastTested: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      streak: 0,
      attempts: 3,
      history: [],
    },
    createdAt: new Date("2026-05-10"),
    updatedAt: new Date("2026-06-14"),
    source: "manual",
    version: 1,
    ai: { ...DEFAULT_AI },
    accent: "#BB4AF8",
    gradientBg: "from-purple-950/70 to-violet-900/40",
    textAccent: "text-purple-400",
  },
  {
    id: "react-hooks",
    userId: "user-p1",
    title: "React Hooks",
    category: "Frontend",
    subject: "React 19",
    difficulty: 4,
    tags: ["react", "hooks", "usestate", "useeffect", "custom hooks"],
    description: "The complete hooks system — built-in hooks, rules of hooks, and writing your own custom hooks.",
    examples: [
      "function useLocalStorage<T>(key: string, init: T) {\n  const [val, setVal] = useState<T>(() => JSON.parse(localStorage.getItem(key) ?? JSON.stringify(init)));\n  useEffect(() => localStorage.setItem(key, JSON.stringify(val)), [key, val]);\n  return [val, setVal] as const;\n}",
      "const memoized = useMemo(() => expensiveCalc(input), [input]);",
    ],
    notesLink: null,
    concepts: [
      { id: "c1", text: "useState returns a stateful value and a setter; setting it schedules a re-render.", keywords: ["usestate", "state"], difficulty: 1, weight: 1.0, aiGenerated: false, order: 1 },
      { id: "c2", text: "useRef gives you a mutable ref object that persists across renders without causing re-renders.", keywords: ["useref", "ref"], difficulty: 2, weight: 1.0, aiGenerated: false, order: 2 },
      { id: "c3", text: "useMemo memoizes expensive computed values, recomputing only when dependencies change.", keywords: ["usememo", "memo", "memoize"], difficulty: 3, weight: 1.2, aiGenerated: false, order: 3 },
      { id: "c4", text: "useCallback memoizes function references so child components don't re-render unnecessarily.", keywords: ["usecallback", "callback"], difficulty: 3, weight: 1.2, aiGenerated: false, order: 4 },
      { id: "c5", text: "useContext reads a React context value created by createContext and provided by a Provider.", keywords: ["usecontext", "context", "provider"], difficulty: 2, weight: 1.0, aiGenerated: false, order: 5 },
      { id: "c6", text: "Custom hooks are functions starting with 'use' that compose built-in hooks into reusable logic.", keywords: ["custom hook", "custom hooks"], difficulty: 3, weight: 1.3, aiGenerated: false, order: 6 },
    ],
    testConfig: { ...DEFAULT_TEST_CONFIG },
    mastery: {
      score: 45,
      lastTested: null,
      streak: 0,
      attempts: 0,
      history: [],
    },
    createdAt: new Date("2026-05-15"),
    updatedAt: new Date("2026-06-01"),
    source: "manual",
    version: 1,
    ai: { ...DEFAULT_AI },
    accent: "#F59E0B",
    gradientBg: "from-amber-950/70 to-amber-900/40",
    textAccent: "text-amber-400",
  },
  {
    id: "tailwind-v4",
    userId: "user-p1",
    title: "Tailwind CSS v4",
    category: "Styling",
    subject: "Tailwind v4",
    difficulty: 2,
    tags: ["tailwind", "css", "utility-first", "responsive", "dark mode"],
    description: "Utility-first CSS framework reimagined for the modern web — CSS-native configuration, lightning-fast.",
    examples: [
      "<div class=\"flex items-center gap-3 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors\">Button</div>",
      "@import 'tailwindcss';\n@theme { --color-brand: #6366f1; }",
    ],
    notesLink: null,
    concepts: [
      { id: "c1", text: "Utility classes are single-purpose CSS classes composed directly in markup.", keywords: ["utility", "utility class", "utility-first"], difficulty: 1, weight: 0.8, aiGenerated: false, order: 1 },
      { id: "c2", text: "Responsive prefixes (sm:, md:, lg:, xl:) apply utilities at specific breakpoints.", keywords: ["responsive", "breakpoint", "sm:", "md:", "lg:"], difficulty: 2, weight: 1.0, aiGenerated: false, order: 2 },
      { id: "c3", text: "Arbitrary values let you use any CSS value inline: w-[123px], text-[#ff0080].", keywords: ["arbitrary", "arbitrary value"], difficulty: 2, weight: 1.0, aiGenerated: false, order: 3 },
      { id: "c4", text: "v4 uses @import 'tailwindcss' instead of @tailwind directives — CSS-first config.", keywords: ["@import", "v4", "css-first"], difficulty: 2, weight: 1.1, aiGenerated: false, order: 4 },
      { id: "c5", text: "CSS layers (@layer base, components, utilities) control cascade order without specificity wars.", keywords: ["layer", "@layer", "cascade"], difficulty: 3, weight: 1.0, aiGenerated: false, order: 5 },
      { id: "c6", text: "Dark mode uses the 'dark:' prefix — class or media strategy selectable per project.", keywords: ["dark mode", "dark:", "dark"], difficulty: 2, weight: 0.9, aiGenerated: false, order: 6 },
    ],
    testConfig: { ...DEFAULT_TEST_CONFIG },
    mastery: {
      score: 83,
      lastTested: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      streak: 5,
      attempts: 8,
      history: [],
    },
    createdAt: new Date("2026-04-20"),
    updatedAt: new Date("2026-06-16"),
    source: "manual",
    version: 1,
    ai: { ...DEFAULT_AI },
    accent: "#38BDF8",
    gradientBg: "from-sky-950/70 to-sky-900/40",
    textAccent: "text-sky-400",
  },
  {
    id: "vite-build",
    userId: "user-p1",
    title: "Vite Build System",
    category: "Tooling",
    subject: "Vite 8",
    difficulty: 3,
    tags: ["vite", "build", "hmr", "esm", "rolldown", "bundler"],
    description: "Next-generation frontend tooling — ESM-native dev server, Rolldown bundler, lightning HMR.",
    examples: [
      "// vite.config.ts\nexport default defineConfig({ plugins: [react()], build: { target: 'esnext' } });",
      "const apiUrl = import.meta.env.VITE_API_URL;",
    ],
    notesLink: null,
    concepts: [
      { id: "c1", text: "HMR (Hot Module Replacement) swaps changed modules instantly without a full page reload.", keywords: ["hmr", "hot module", "hot reload"], difficulty: 2, weight: 1.0, aiGenerated: false, order: 1 },
      { id: "c2", text: "Vite uses native ESM in dev — browsers import modules directly, no bundling needed.", keywords: ["esm", "native esm", "es modules"], difficulty: 2, weight: 1.1, aiGenerated: false, order: 2 },
      { id: "c3", text: "Rolldown is Vite's Rust-based bundler used in production builds for maximum speed.", keywords: ["rolldown", "bundler", "rust"], difficulty: 3, weight: 1.2, aiGenerated: false, order: 3 },
      { id: "c4", text: "Plugins extend Vite using the Rollup plugin API — React, SSR, PWA, etc.", keywords: ["plugin", "plugins"], difficulty: 2, weight: 0.9, aiGenerated: false, order: 4 },
      { id: "c5", text: "import.meta.env exposes environment variables prefixed with VITE_ to client code.", keywords: ["import.meta.env", "env", "environment variable"], difficulty: 2, weight: 1.0, aiGenerated: false, order: 5 },
      { id: "c6", text: "Tree-shaking removes unused exports at build time, reducing bundle size.", keywords: ["tree-shaking", "tree shaking", "dead code"], difficulty: 2, weight: 1.0, aiGenerated: false, order: 6 },
    ],
    testConfig: { ...DEFAULT_TEST_CONFIG },
    mastery: {
      score: 38,
      lastTested: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      streak: 0,
      attempts: 2,
      history: [],
    },
    createdAt: new Date("2026-05-20"),
    updatedAt: new Date("2026-06-03"),
    source: "manual",
    version: 1,
    ai: { ...DEFAULT_AI },
    accent: "#A78BFA",
    gradientBg: "from-violet-950/70 to-violet-900/40",
    textAccent: "text-violet-400",
  },
];

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   LEARN CONTENT
   ══════════════════════════════════════════════════════════════ */

const LEARN_CONTENT: Record<string, LearnContent> = {

  "react-fundamentals": {
    summary:
      "React is a declarative, component-based JavaScript library for building user interfaces. Instead of directly manipulating the DOM, you describe what the UI should look like at any given state, and React efficiently updates the real DOM to match. The core mental model is simple: UI = f(state). Every piece of your interface is a component — a self-contained function that receives data as props and returns JSX markup. When state changes, React re-renders only the nodes that need to change using its Virtual DOM diffing algorithm, keeping updates fast even in complex applications.",
    definitions: [
      { term: "Component", def: "A reusable function that returns JSX — the fundamental building block of every React app." },
      { term: "JSX",       def: "A syntax extension that lets you write HTML-like markup inside JavaScript; compiled to React.createElement() calls." },
      { term: "Props",     def: "Read-only inputs passed from a parent component to a child; never mutate them." },
      { term: "State",     def: "Mutable data local to a component; changing it via the setter triggers a re-render." },
      { term: "Virtual DOM", def: "A lightweight in-memory copy of the real DOM React uses to diff changes before committing updates." },
      { term: "Re-render", def: "React recalculating a component's output when its state or props change." },
    ],
    principles: [
      "Components should be pure functions — same inputs always produce the same output.",
      "Data flows one way: from parent to child via props.",
      "State is the single source of truth for dynamic UI.",
      "Prefer composition over inheritance — build complex UIs from small, focused components.",
      "The Virtual DOM makes updates efficient — only changed nodes are committed to the real DOM.",
    ],
    examples: [
      { label: "Function component with state",
        text: "function Counter() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>;\n}" },
      { label: "Passing props",
        text: "function Greeting({ name }: { name: string }) {\n  return <p>Hello, {name}!</p>;\n}\n// Usage: <Greeting name=\"Francis\" />" },
    ],
    mistakes: [
      "Mutating state directly (state.count++ instead of setState) — React won't detect the change and won't re-render.",
      "Using array index as a key in lists — causes incorrect reconciliation when items reorder or are deleted.",
      "Reading state immediately after setting it — setState is async; the new value is only available on the next render.",
      "Defining components inside other components — causes them to fully re-mount on every parent render, destroying their state.",
    ],
    whyMatters:
      "React powers the entire P1 Cockpit UI. Every page, card, sidebar section, and animation is a tree of components. Mastering fundamentals means you can read, debug, and extend any screen in the application confidently.",
    connections: [
      "React Hooks — extends component state and lifecycle (useState, useEffect, useRef)",
      "Framer Motion — wraps React components with declarative animation",
      "Vite Build System — bundles and hot-reloads your React application",
      "TypeScript — adds static typing to props, state, and component interfaces",
    ],
  },

  "typescript-essentials": {
    summary:
      "TypeScript is a statically typed superset of JavaScript developed by Microsoft. It adds an optional type system that catches errors at compile time rather than at runtime. Every valid JavaScript file is also valid TypeScript — you opt into typing gradually. The compiler erases all types during compilation, producing clean JavaScript with zero runtime overhead. TypeScript's real power comes from its structural type system: two types are compatible if they have the same shape, regardless of their name. Strict mode catches the most bugs and should be enabled from day one.",
    definitions: [
      { term: "Type",            def: "A label describing the shape and kind of a value — primitives, unions, object shapes." },
      { term: "Interface",       def: "A named contract defining an object shape; can be extended with 'extends' and merged by declaration." },
      { term: "Generic",         def: "A type parameter <T> that lets a function or type work with any type while preserving type information." },
      { term: "Type Guard",      def: "A runtime check (typeof, instanceof, 'in') that narrows a union type within a conditional block." },
      { term: "Utility Type",    def: "A built-in mapped type that transforms another type: Partial<T>, Pick<T,K>, Omit<T,K>, Record<K,V>." },
      { term: "Structural Typing", def: "Compatibility based on shape, not name — if it has the right properties, it fits the type." },
    ],
    principles: [
      "TypeScript is a superset — all JavaScript is valid TypeScript to start with.",
      "Types are erased at compile time — zero runtime cost, zero bundle size impact.",
      "Structural typing: compatibility is about shape, not name.",
      "Prefer interfaces for object shapes; use type aliases for unions, intersections, and mapped types.",
      "Enable strict mode from day one — it catches null, undefined, and implicit any errors.",
      "Generics enable code reuse without sacrificing type safety.",
    ],
    examples: [
      { label: "Generic function",
        text: "function first<T>(arr: T[]): T | undefined {\n  return arr[0];\n}\n// TypeScript infers T from the argument" },
      { label: "Type guard",
        text: "function process(val: string | number) {\n  if (typeof val === 'string') {\n    val.toUpperCase(); // val is string here\n  }\n}" },
    ],
    mistakes: [
      "Using 'any' to silence errors — it disables type checking entirely and defeats TypeScript's purpose.",
      "Forgetting to enable strict mode — many common bugs (null, implicit any) escape without it.",
      "Confusing interface and type — interfaces can be merged and extended; type aliases cannot be re-opened.",
      "Assuming TypeScript catches runtime errors — it only validates at compile time; runtime values can still surprise you.",
    ],
    whyMatters:
      "TypeScript is what makes the P1 Cockpit maintainable at scale. Without it, a 60,000-line codebase would be unworkable. It documents intent, prevents regressions, and enables IDE autocomplete across every file in the project.",
    connections: [
      "React Fundamentals — React 19 ships full TypeScript types for all components and hooks",
      "React Hooks — hook return types are typed generics (<T> in useState<T>)",
      "Vite Build System — Vite transpiles TypeScript natively via oxc/esbuild",
    ],
  },

  "framer-motion": {
    summary:
      "Framer Motion is a production-grade animation library for React that abstracts the complexity of CSS animations and the Web Animations API into a clean, declarative interface. You wrap any HTML or SVG element in a motion.* component and describe animations using props: initial (start state), animate (target state), and exit (unmount state). The library handles easing curves, spring physics, gesture detection, layout transitions, and orchestration across component trees. AnimatePresence is the key enabler of exit animations — without it, components simply disappear on unmount.",
    definitions: [
      { term: "motion.div",      def: "A supercharged <div> that accepts animation props: initial, animate, exit, transition, variants." },
      { term: "Variants",        def: "Named animation states defined as an object; enables coordinated animations across a tree with one prop change." },
      { term: "AnimatePresence", def: "A wrapper component that holds unmounting children in the DOM long enough for their exit animation to complete." },
      { term: "Spring",          def: "A physics-based easing simulating a real spring via stiffness, damping, and mass parameters." },
      { term: "Layout animation",def: "Automatic animation between DOM layout changes triggered by adding the layout prop to a motion element." },
      { term: "Gesture",         def: "Mouse/touch interaction props: whileHover, whileTap, whileDrag, whileFocus." },
    ],
    principles: [
      "Animations are declarative — describe the end state, not the steps to reach it.",
      "AnimatePresence is required for any exit animation to work.",
      "Variants enable coordinated, staggered animations across a component tree with a single prop.",
      "Spring physics create more natural motion than cubic-bezier curves for most interactions.",
      "Layout animations require stable keys on all participating elements.",
    ],
    examples: [
      { label: "Fade-in on mount",
        text: "<motion.div\n  initial={{ opacity: 0, y: 8 }}\n  animate={{ opacity: 1, y: 0 }}\n  transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}\n/>" },
      { label: "Exit animation with AnimatePresence",
        text: "<AnimatePresence>\n  {isOpen && (\n    <motion.div exit={{ opacity: 0, scale: 0.96 }}>\n      {children}\n    </motion.div>\n  )}\n</AnimatePresence>" },
    ],
    mistakes: [
      "Forgetting AnimatePresence when you need exit animations — the component will disappear instantly without it.",
      "Using duration-based easing for physics-like motion — use type:'spring' with stiffness/damping instead.",
      "Animating layout without stable keys — elements teleport to their new position instead of transitioning.",
      "Nesting AnimatePresence unnecessarily — one wrapper at the right level is always enough.",
    ],
    whyMatters:
      "Every smooth transition in the P1 Cockpit — sidebar collapse, card overlays, concept reveals, stagger effects on library cards — runs through Framer Motion. It is the motion language of the entire application.",
    connections: [
      "React Fundamentals — motion.* wraps standard React components",
      "React Hooks — useAnimation hook enables imperative animation control",
    ],
  },

  "react-hooks": {
    summary:
      "React Hooks are functions that let you use state, lifecycle behaviour, and other React features inside function components without writing a class. Introduced in React 16.8, they are now the primary and recommended way to build all React UI. Two inviolable rules govern hooks: only call them at the top level (never inside conditions, loops, or nested functions), and only call them from React function components or other custom hooks. Custom hooks — functions starting with 'use' — are the primary mechanism for extracting and sharing stateful logic.",
    definitions: [
      { term: "useState",    def: "Returns [value, setter] — calling the setter with a new value triggers a re-render." },
      { term: "useEffect",   def: "Runs a side effect after render; optionally returns a cleanup function called before the next effect or on unmount." },
      { term: "useRef",      def: "Returns a mutable .current object that persists across renders without triggering re-renders." },
      { term: "useMemo",     def: "Memoizes an expensive computation; only recomputes when its dependency array changes." },
      { term: "useCallback", def: "Memoizes a function reference; prevents downstream re-renders when the function identity hasn't changed." },
      { term: "useContext",  def: "Subscribes to the nearest matching Context.Provider above the component in the tree." },
    ],
    principles: [
      "Call hooks only at the top level — never inside if, for, or nested functions.",
      "Call hooks only inside React function components or other custom hooks.",
      "useEffect dependency arrays must be exhaustive — missing deps cause stale closure bugs.",
      "useRef is the escape hatch for values that must persist without causing re-renders.",
      "useMemo and useCallback are optimisations — add them after measuring a real performance problem.",
      "Custom hooks extract and share stateful logic; they must start with 'use'.",
    ],
    examples: [
      { label: "State with derived value (no double useState)",
        text: "const [items, setItems] = useState<string[]>([]);\nconst count = items.length; // derived — no useState needed" },
      { label: "Custom hook for local storage",
        text: "function useLocalStorage<T>(key: string, init: T) {\n  const [v, setV] = useState<T>(() =>\n    JSON.parse(localStorage.getItem(key) ?? 'null') ?? init\n  );\n  useEffect(() => localStorage.setItem(key, JSON.stringify(v)), [key, v]);\n  return [v, setV] as const;\n}" },
    ],
    mistakes: [
      "Calling hooks conditionally — breaks the invariant React depends on to match hook calls across renders.",
      "Missing useEffect dependencies — causes stale closure bugs where the effect reads outdated values.",
      "Overusing useMemo and useCallback — they have overhead; profile before optimising.",
      "Directly mutating state (pushing to an array, editing object properties) — React won't detect the change.",
    ],
    whyMatters:
      "Every interactive element in the P1 Cockpit — form state, sidebar collapse, test timers, personalisation engine, concept detection — is built with hooks. They are the primary tool for managing complexity in React.",
    connections: [
      "React Fundamentals — hooks extend what function components can do",
      "Framer Motion — useAnimation, useMotionValue, and useScroll are Framer hooks",
      "TypeScript — all hooks are fully typed generics: useState<string[]>(), useRef<HTMLDivElement>()",
    ],
  },

  "tailwind-v4": {
    summary:
      "Tailwind CSS v4 is a utility-first CSS framework that provides thousands of single-purpose class names you compose directly in JSX markup. Instead of naming CSS classes and writing stylesheets, you apply utilities like flex, p-4, bg-indigo-600, and rounded-xl directly to elements. v4 is a ground-up rewrite with a CSS-native configuration model: you import Tailwind with @import 'tailwindcss' and configure design tokens directly in CSS using @theme — no tailwind.config.js required in most projects. The JIT engine generates only the classes you actually use, so your production CSS stays minimal regardless of how many utilities the framework provides.",
    definitions: [
      { term: "Utility class",    def: "A single-purpose CSS class (p-4 = padding: 1rem) composed directly in markup." },
      { term: "Arbitrary value",  def: "A custom value in bracket syntax: w-[123px], text-[#c4c8d6], mt-[5px]." },
      { term: "Responsive prefix",def: "Breakpoint modifier applied at a specific screen width: sm:flex, lg:grid-cols-3." },
      { term: "@theme",           def: "v4 CSS block for configuring design tokens (colours, spacing, fonts) without a JS config file." },
      { term: "Variant",          def: "A modifier prefix that scopes a utility: hover:, focus:, dark:, disabled:, group-hover:." },
      { term: "JIT",              def: "Just-in-Time compilation — Tailwind generates only the classes referenced in your source files." },
    ],
    principles: [
      "Compose utilities in markup — avoid writing custom CSS class names for one-off styles.",
      "Arbitrary values let you escape the design scale for exceptions: p-[17px], w-[calc(100%-2rem)].",
      "Responsive design is mobile-first — unprefixed utilities apply at all sizes, prefixed ones from their breakpoint up.",
      "v4 is CSS-first — configure everything in CSS with @import and @theme.",
      "JIT means production CSS only contains what you use — no purge step required.",
    ],
    examples: [
      { label: "Raised card",
        text: '<div class="rounded-2xl bg-[#13151c] border border-white/[0.07] p-5\n     shadow-[0_10px_36px_rgba(0,0,0,0.55)] hover:-translate-y-1 transition-transform">' },
      { label: "Responsive grid",
        text: '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">' },
    ],
    mistakes: [
      "Reaching for @apply to create component classes — defeats the purpose; extract a React component instead.",
      "Using arbitrary values everywhere instead of the design scale — breaks visual consistency across the app.",
      "Forgetting Tailwind is mobile-first — adding md:hidden means 'hide on medium and above', not 'hide on mobile'.",
      "Trying to generate class names dynamically with string concatenation — JIT can't scan them; use complete class strings.",
    ],
    whyMatters:
      "Tailwind is the styling engine of every pixel in the P1 Cockpit. Understanding it means you can read any component's visual structure instantly from the className prop and make precise changes without opening a stylesheet.",
    connections: [
      "Vite Build System — PostCSS plugin scans source files and generates the Tailwind CSS output",
      "React Fundamentals — Tailwind classes are applied to JSX via the className prop",
    ],
  },

  "vite-build": {
    summary:
      "Vite is a next-generation frontend build tool that dramatically improves developer experience. In development, Vite serves your source files as native ES modules directly to the browser — no bundling step, instant cold starts, and sub-millisecond Hot Module Replacement. In production, Vite 8 uses Rolldown (a Rust-based bundler) to produce an optimised, tree-shaken, code-split bundle. Environment variables are managed through import.meta.env, with client-exposed vars requiring a VITE_ prefix. Vite's plugin system extends its capabilities for React, TypeScript, SSR, PWA, and more.",
    definitions: [
      { term: "HMR",             def: "Hot Module Replacement — swaps a changed module in the running browser without a full page reload." },
      { term: "Native ESM",      def: "Browsers importing ES modules directly via <script type='module'> — Vite's dev server sends raw source files." },
      { term: "Rolldown",        def: "A Rust-based JavaScript bundler powering Vite 8 production builds; significantly faster than the old Rollup pipeline." },
      { term: "import.meta.env", def: "Vite's runtime-replaced object exposing environment variables; only VITE_-prefixed vars are sent to the client." },
      { term: "Tree-shaking",    def: "Removing unused exports from the bundle at build time — reduces production JavaScript size." },
      { term: "Plugin",          def: "A function extending Vite's dev server and build pipeline using the Rollup plugin API." },
    ],
    principles: [
      "Dev uses native ESM — the browser resolves modules on demand; no bundling required.",
      "Production uses Rolldown for an optimised, code-split bundle with tree-shaking.",
      "Only VITE_-prefixed environment variables are exposed to client code — others stay server-side.",
      "Plugins extend Vite for React JSX, TypeScript, SSR, environment injection, and more.",
      "Dynamic imports (import()) create separate chunks automatically — use them for large routes.",
    ],
    examples: [
      { label: "Reading environment variables",
        text: "// .env\nVITE_API_URL=https://api.percentile.one\n\n// In your component\nconst apiUrl = import.meta.env.VITE_API_URL;" },
      { label: "Code splitting with dynamic import",
        text: "const HeavyPage = lazy(() => import('./pages/HeavyPage'));\n// Vite creates a separate chunk — loaded only when this route is visited" },
    ],
    mistakes: [
      "Using process.env instead of import.meta.env — Vite doesn't replace process.env; use import.meta.env.*.",
      "Forgetting the VITE_ prefix on env vars — un-prefixed vars are excluded from the client bundle for security.",
      "Running tsc to build — Vite handles transpilation; tsc is for type-checking only (use tsc --noEmit).",
      "Not using dynamic imports for large routes — everything ends up in one chunk and slows the initial page load.",
    ],
    whyMatters:
      "Vite is why the P1 dev server starts in under a second. Understanding it means you can debug build errors, configure environment-specific behaviour, optimise production chunk sizes, and understand why each import matters.",
    connections: [
      "TypeScript Essentials — Vite transpiles TypeScript via oxc/esbuild without a separate tsc step",
      "React Fundamentals — @vitejs/plugin-react enables JSX transform and Fast Refresh HMR",
      "Tailwind CSS v4 — PostCSS plugin processes Tailwind inside Vite's transform pipeline",
    ],
  },
};

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════ */

const DIFF_LABEL: Record<Difficulty, string> = { 1: "Starter", 2: "Easy", 3: "Medium", 4: "Hard", 5: "Expert" };
const DIFF_COLOR: Record<Difficulty, string> = {
  1: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  2: "text-green-400 bg-green-500/10 border-green-500/20",
  3: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  4: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  5: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};
const EASE = [0.4, 0, 0.2, 1] as const;

/* ══════════════════════════════════════════════════════════════
   TESTING ENGINE — detection, scoring, synonyms, misconceptions
   ══════════════════════════════════════════════════════════════ */

const SYNONYM_MAP: Record<string, string[]> = {
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

function expandKeywords(keywords: string[]): string[] {
  const out = new Set(keywords);
  for (const kw of keywords) {
    SYNONYM_MAP[kw]?.forEach(s => out.add(s));
    for (const [canonical, syns] of Object.entries(SYNONYM_MAP)) {
      if (syns.some(s => kw === s)) out.add(canonical);
    }
  }
  return [...out];
}

const MISCONCEPTIONS: { phrase: string; label: string }[] = [
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

function detectConceptsEnhanced(
  text: string,
  concepts: Concept[],
  alreadyHit: Set<string>
): { newHits: string[]; partialHits: string[]; misconceptions: string[] } {
  const lower = text.toLowerCase();
  const newHits: string[] = [];
  const partialHits: string[] = [];

  for (const c of concepts) {
    if (alreadyHit.has(c.id)) continue;
    const expanded = expandKeywords(c.keywords);
    // Exact / synonym match
    if (expanded.some(kw => lower.includes(kw))) {
      newHits.push(c.id);
      continue;
    }
    // Partial match: any keyword that starts with a word in the text
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

const DIFF_MULTIPLIER: Record<Difficulty, number> = { 1: 1.0, 2: 1.1, 3: 1.3, 4: 1.6, 5: 2.0 };

interface ScoreBreakdown {
  weightedHits: number;
  totalWeight: number;
  rawPct: number;
  diffMultiplier: number;
  speedBonus: number;
  accuracyBonus: number;
  streakBonus: number;
  misconceptionPenalty: number;
  finalScore: number;
  grade: "S" | "A" | "B" | "C" | "D";
  gradeAccent: string;
  verdict: string;
}

function computeScore(
  hitIds: string[],
  concepts: Concept[],
  elapsed: number,
  timeLimitSeconds: number,
  difficulty: Difficulty,
  misconceptionCount: number,
  streak: number,
): ScoreBreakdown {
  const hitSet = new Set(hitIds);
  const totalWeight = concepts.reduce((s, c) => s + c.weight, 0);
  const weightedHits = concepts.filter(c => hitSet.has(c.id)).reduce((s, c) => s + c.weight, 0);
  const rawPct = totalWeight > 0 ? (weightedHits / totalWeight) * 100 : 0;

  const diffMultiplier = DIFF_MULTIPLIER[difficulty];

  const timeRatio = elapsed / timeLimitSeconds;
  const speedBonus = timeRatio < 0.4 ? 1.25 : timeRatio < 0.6 ? 1.12 : timeRatio < 0.8 ? 1.0 : 0.9;

  const accuracyBonus = hitIds.length === concepts.length ? 1.15 : 1.0;
  const streakBonus   = streak >= 7 ? 1.12 : streak >= 3 ? 1.06 : 1.0;

  const misconceptionPenalty = misconceptionCount * 8;

  const raw = rawPct * diffMultiplier * speedBonus * accuracyBonus * streakBonus;
  const finalScore = Math.max(0, Math.min(100, Math.round(raw - misconceptionPenalty)));

  const grade: ScoreBreakdown["grade"] =
    finalScore >= 90 ? "S" : finalScore >= 75 ? "A" : finalScore >= 60 ? "B" : finalScore >= 40 ? "C" : "D";
  const gradeAccent =
    finalScore >= 90 ? "#FBBF24" : finalScore >= 75 ? "#34D399" : finalScore >= 60 ? "#60A5FA" : finalScore >= 40 ? "#F59E0B" : "#F87171";
  const verdict =
    finalScore >= 90 ? "Exceptional recall." : finalScore >= 75 ? "Strong performance." :
    finalScore >= 60 ? "Solid foundation." : finalScore >= 40 ? "Keep practising." : "Review and retry.";

  return { weightedHits, totalWeight, rawPct, diffMultiplier, speedBonus, accuracyBonus, streakBonus, misconceptionPenalty, finalScore, grade, gradeAccent, verdict };
}

function timerPressureColor(timeLeft: number, total: number): string {
  const r = timeLeft / total;
  return r > 0.5 ? "#10b981" : r > 0.25 ? "#f59e0b" : "#ef4444";
}

type InputMode = "typing" | "voice" | "video";

const MOCK_LEADERBOARD = {
  global:     [{ rank:1,name:"Alex Kim",     country:"🇰🇷",score:98 },{ rank:2,name:"Priya S.",    country:"🇮🇳",score:96 },{ rank:3,name:"Tom W.",      country:"🇬🇧",score:94 },{ rank:4,name:"You",         country:"🇬🇧",score:0  },{ rank:5,name:"Lena M.",     country:"🇩🇪",score:88 }],
  country:    [{ rank:1,name:"Tom W.",        country:"🇬🇧",score:94 },{ rank:2,name:"You",         country:"🇬🇧",score:0  },{ rank:3,name:"Sarah J.",    country:"🇬🇧",score:85 },{ rank:4,name:"Chris D.",    country:"🇬🇧",score:82 },{ rank:5,name:"Rachel B.",   country:"🇬🇧",score:79 }],
  university: [{ rank:1,name:"You",           country:"Essex",score:0 },{ rank:2,name:"Kai P.",      country:"Essex",score:87 },{ rank:3,name:"Nina R.",     country:"Essex",score:81 },{ rank:4,name:"Omar T.",     country:"Essex",score:76 },{ rank:5,name:"Bella C.",    country:"Essex",score:72 }],
  friends:    [{ rank:1,name:"Marcus B.",     country:"🤝",score:91 },{ rank:2,name:"Lena M.",      country:"🤝",score:88 },{ rank:3,name:"You",          country:"🤝",score:0  },{ rank:4,name:"Jordan L.",   country:"🤝",score:72 },],
};

/* ══════════════════════════════════════════════════════════════
   SHARED MICRO-COMPONENTS
   ══════════════════════════════════════════════════════════════ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
      {children}
    </p>
  );
}

function DifficultyDots({ n }: { n: Difficulty }) {
  return (
    <span className="flex gap-[3px] items-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i < n ? "bg-current" : "bg-white/[0.10]"}`} />
      ))}
    </span>
  );
}

function MasteryRing({ pct, size = 36, stroke = 3 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const color = pct >= 80 ? "#34D399" : pct >= 50 ? "#FBBF24" : "#F87171";
  return (
    <svg width={size} height={size} className="-rotate-90" style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={circ - (pct / 100) * circ}
        strokeLinecap="round"
      />
      <text
        x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        style={{ transform: "rotate(90deg)", transformOrigin: "50% 50%", fontSize: size * 0.22, fill: "#94a3b8", fontWeight: 700 }}
      >
        {pct}%
      </text>
    </svg>
  );
}

function AgentInsight({ children, color = "indigo" }: { children: React.ReactNode; color?: "indigo" | "amber" | "emerald" }) {
  const cls = {
    indigo: { bg: "bg-indigo-600/8",  border: "border-indigo-500/15", icon: "text-indigo-400/70", label: "text-indigo-400/70" },
    amber:  { bg: "bg-amber-500/8",   border: "border-amber-500/20",  icon: "text-amber-400",     label: "text-amber-400/80"  },
    emerald:{ bg: "bg-emerald-500/8", border: "border-emerald-500/20",icon: "text-emerald-400",   label: "text-emerald-400/80"},
  }[color];
  return (
    <div className={`flex items-start gap-2.5 p-3.5 rounded-xl border ${cls.bg} ${cls.border}`}>
      <Sparkles size={12} className={`${cls.icon} shrink-0 mt-0.5`} />
      <div>
        <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${cls.label}`}>Agent Insight</p>
        <p className="text-[11px] text-slate-400 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function ProgressBar({ pct, color = "#6366F1", height = "h-1" }: { pct: number; color?: string; height?: string }) {
  return (
    <div className={`w-full ${height} rounded-full bg-white/[0.06] overflow-hidden`}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LEARN MODE — expandable micro-lesson in Study View
   ══════════════════════════════════════════════════════════════ */

function LearnMode({ card, onStartTest }: { card: CognitiveCardData; onStartTest: () => void }) {
  const [open, setOpen] = useState(false);
  const learn = LEARN_CONTENT[card.id];
  if (!learn) return null;

  return (
    <div className="rounded-2xl overflow-hidden bg-[#13151c] border border-white/[0.06]"
      style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>

      {/* Toggle header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: card.accent + "18", border: `1px solid ${card.accent}35` }}>
            <BookOpen size={13} style={{ color: card.accent }} />
          </div>
          <div className="text-left">
            <p className="text-[12.5px] font-bold text-white leading-none">Learn This Concept</p>
            <p className="text-[9.5px] text-slate-500 mt-0.5">Structured micro-lesson before testing</p>
          </div>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          style={{ display: "block" }}
        >
          <ChevronDown size={15} className="text-slate-600" />
        </motion.span>
      </button>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-5 pb-6 flex flex-col gap-6 border-t border-white/[0.05]">

              {/* ── Summary ── */}
              <div className="pt-5">
                <SectionLabel>Summary</SectionLabel>
                <p className="text-[12px] text-slate-300 leading-[1.75]">{learn.summary}</p>
              </div>

              <div className="h-px bg-white/[0.04]" />

              {/* ── Key Definitions ── */}
              <div>
                <SectionLabel>Key Definitions</SectionLabel>
                <div className="flex flex-col gap-2">
                  {learn.definitions.map((d, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.035, ease: EASE }}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-[#0f1117] border border-white/[0.05]"
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: card.accent + "18", border: `1px solid ${card.accent}30` }}
                      >
                        <span className="text-[9px] font-black" style={{ color: card.accent }}>{i + 1}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11.5px] font-bold text-white">{d.term}</span>
                        <span className="text-[11.5px] text-slate-500"> — </span>
                        <span className="text-[11.5px] text-slate-400 leading-snug">{d.def}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-white/[0.04]" />

              {/* ── Core Principles ── */}
              <div>
                <SectionLabel>Core Principles</SectionLabel>
                <div className="flex flex-col gap-1.5">
                  {learn.principles.map((p, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-white/[0.04] border border-white/[0.07]">
                        <span className="text-[8px] font-bold text-slate-500">{i + 1}</span>
                      </div>
                      <p className="text-[11.5px] text-slate-300 leading-relaxed pt-0.5">{p}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-white/[0.04]" />

              {/* ── Examples ── */}
              <div>
                <SectionLabel>Examples</SectionLabel>
                <div className="flex flex-col gap-3">
                  {learn.examples.map((eg, i) => (
                    <div key={i}>
                      <p className="text-[9.5px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">{eg.label}</p>
                      <div
                        className="px-4 py-3 rounded-xl border border-white/[0.07] font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap"
                        style={{ background: "#0a0b10", borderLeft: `3px solid ${card.accent}60` }}
                      >
                        {eg.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-white/[0.04]" />

              {/* ── Common Mistakes ── */}
              <div>
                <SectionLabel>Common Mistakes</SectionLabel>
                <div className="flex flex-col gap-1.5">
                  {learn.mistakes.map((m, i) => (
                    <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-rose-500/[0.05] border border-rose-500/[0.12]">
                      <X size={11} className="text-rose-400 shrink-0 mt-0.5" />
                      <p className="text-[11.5px] text-slate-400 leading-snug">{m}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-white/[0.04]" />

              {/* ── Why This Matters ── */}
              <div>
                <SectionLabel>Why This Matters</SectionLabel>
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl border bg-indigo-600/8 border-indigo-500/15">
                  <Sparkles size={12} className="text-indigo-400/70 shrink-0 mt-0.5" />
                  <p className="text-[11.5px] text-slate-300 leading-relaxed">{learn.whyMatters}</p>
                </div>
              </div>

              {/* ── Connections ── */}
              <div>
                <SectionLabel>Connections</SectionLabel>
                <div className="flex flex-col gap-1.5">
                  {learn.connections.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Link2 size={10} className="text-slate-600 shrink-0" />
                      <p className="text-[11px] text-slate-500 leading-snug">{c}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Start Test CTA ── */}
              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.97 }}
                onClick={onStartTest}
                className="w-full py-3 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 transition-all"
                style={{ background: `linear-gradient(135deg, ${card.accent}cc, ${card.accent}88)` }}
              >
                <Play size={14} /> I'm Ready — Start Test
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   1. LIBRARY CARD
   ══════════════════════════════════════════════════════════════ */

function LibraryCard({ card, onStudy, onTest, onMultiplayer }: {
  card: CognitiveCardData;
  onStudy: () => void;
  onTest: () => void;
  onMultiplayer: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.22, ease: EASE }}
      onClick={onStudy}
      className={`relative flex flex-col rounded-2xl overflow-hidden cursor-pointer bg-gradient-to-br ${card.gradientBg} border border-white/[0.07]`}
      style={{
        boxShadow: "0 10px 36px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06) inset, 0 -1px 0 rgba(0,0,0,0.4) inset",
      }}
    >
      {/* Thin top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl" style={{ background: card.accent + "80" }} />

      <div className="flex flex-col flex-1 p-5 pt-6">
        {/* Category badge */}
        <div className="mb-3">
          <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${DIFF_COLOR[card.difficulty]}`}>
            <DifficultyDots n={card.difficulty} /> {DIFF_LABEL[card.difficulty]}
          </span>
        </div>

        {/* Title + mastery ring */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-white leading-snug">{card.title}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{card.subject}</p>
          </div>
          <MasteryRing pct={card.mastery.score} size={38} stroke={3} />
        </div>

        {/* Description */}
        <p className="text-[10.5px] text-slate-400 leading-relaxed line-clamp-2 flex-1 mb-4">
          {card.description}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1 text-[9.5px] text-slate-500">
            <BookOpen size={9} />
            <span>{card.concepts.length} concepts</span>
          </div>
          <div className="flex items-center gap-1 text-[9.5px] text-slate-500">
            <Clock size={9} />
            <span>{formatLastTested(card.mastery.lastTested)}</span>
          </div>
          {card.mastery.score >= 80 && (
            <span className="ml-auto flex items-center gap-0.5 text-[9px] font-bold text-amber-400">
              <Star size={8} /> Mastered
            </span>
          )}
        </div>

        {/* Progress bar */}
        <ProgressBar pct={card.mastery.score} color={card.accent + "cc"} height="h-0.5" />
      </div>

      {/* Action footer */}
      <div
        className="flex gap-1.5 px-4 pb-4 pt-2 border-t border-white/[0.05]"
        onClick={e => e.stopPropagation()}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onStudy}
          className="flex-1 text-[10px] font-semibold py-1.5 rounded-lg border border-white/[0.07] bg-white/[0.04] text-slate-300 hover:border-white/[0.14] hover:text-white transition-all"
        >
          Study
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onTest}
          className="flex-1 text-[10px] font-semibold py-1.5 rounded-lg border text-white transition-all"
          style={{ background: card.accent + "22", borderColor: card.accent + "40", color: card.accent }}
        >
          Test
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onMultiplayer}
          className="text-[10px] font-semibold py-1.5 px-2 rounded-lg border border-white/[0.07] bg-white/[0.03] text-slate-500 hover:text-slate-300 hover:border-white/[0.12] transition-all"
          title="Multiplayer"
        >
          <Users size={11} />
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   2. STUDY VIEW
   ══════════════════════════════════════════════════════════════ */

function StudyView({ card, onTest, onClose }: {
  card: CognitiveCardData;
  onTest: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      key="study"
      initial={{ opacity: 0, scale: 0.97, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 12 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="flex flex-col gap-4 w-full max-w-xl"
    >
      {/* Card hero */}
      <div
        className={`rounded-2xl overflow-hidden bg-gradient-to-br ${card.gradientBg} border border-white/[0.09]`}
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.07) inset" }}
      >
        <div className="h-[3px]" style={{ background: card.accent }} />
        <div className="px-6 py-6">
          {/* Badge row */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${DIFF_COLOR[card.difficulty]}`}>
              <DifficultyDots n={card.difficulty} /> {DIFF_LABEL[card.difficulty]}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600 px-1.5 py-0.5 rounded border border-white/[0.07] bg-white/[0.04]">
              {card.category}
            </span>
          </div>

          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className="text-[22px] font-bold text-white leading-tight">{card.title}</h2>
              <p className="text-[11px] text-slate-500 mt-1">{card.subject}</p>
            </div>
            <MasteryRing pct={card.mastery.score} size={56} stroke={4} />
          </div>

          <p className="text-[12.5px] text-slate-300 leading-relaxed">{card.description}</p>

          {/* Mastery bar */}
          <div className="mt-4">
            <div className="flex justify-between mb-1.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Mastery Level</span>
              <span className="text-[9px] font-bold" style={{ color: card.accent }}>{card.mastery.score}%</span>
            </div>
            <ProgressBar pct={card.mastery.score} color={card.accent} height="h-1" />
          </div>
        </div>
      </div>

      {/* Concepts panel */}
      <div
        className="rounded-2xl p-5 bg-[#13151c] border border-white/[0.06]"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>Concepts · {card.concepts.length} to recall</SectionLabel>
          <span className="text-[9px] text-slate-600">Revealed in Test Mode</span>
        </div>

        <div className="flex flex-col gap-2">
          {card.concepts.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, ease: EASE }}
              className="group flex items-start gap-3 p-3.5 rounded-xl border border-white/[0.06] bg-[#0f1117] hover:border-white/[0.10] transition-colors"
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: card.accent + "18", border: `1px solid ${card.accent}35` }}>
                <span className="text-[9px] font-bold" style={{ color: card.accent }}>{i + 1}</span>
              </div>
              <p
                className="text-[11.5px] text-slate-300 leading-relaxed transition-all duration-300"
                style={{ filter: "blur(5px)", userSelect: "none" }}
              >
                {c.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Learn Mode — expandable micro-lesson */}
      <LearnMode card={card} onStartTest={onTest} />

      {/* Agent callout */}
      <AgentInsight>
        Cover all {card.concepts.length} concepts in your own words. The test detects keywords in real-time.
        Difficulty multiplier ×{(0.8 + card.difficulty * 0.2).toFixed(1)} applies to your final score.
      </AgentInsight>

      {/* Actions */}
      <div className="flex gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl text-[12px] font-semibold text-slate-400 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:text-slate-300 transition-colors"
        >
          Back
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.015, boxShadow: `0 8px 24px rgba(0,0,0,0.5)` }}
          whileTap={{ scale: 0.98 }}
          onClick={onTest}
          className="flex-1 py-2.5 rounded-xl text-[12.5px] font-bold text-white flex items-center justify-center gap-2 transition-all"
          style={{ background: `linear-gradient(135deg, ${card.accent}cc, ${card.accent}88)` }}
        >
          <Play size={13} /> Start Test
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   3 + 4. TEST VIEW + REVEAL
   ══════════════════════════════════════════════════════════════ */

const DEMO_DELAY_MS = 28; // ms per character in demo typing

function TestView({ card, onScore }: {
  card: CognitiveCardData;
  onScore: (hits: string[], elapsed: number, misconceptions: number) => void;
}) {
  const limit = card.testConfig.timeLimitSeconds;
  const [inputMode, setInputMode] = useState<InputMode>(
    card.testConfig.allowTyping ? "typing" : card.testConfig.allowVoice ? "voice" : "video"
  );
  const [input, setInput] = useState("");
  const [hitIds, setHitIds] = useState<Set<string>>(new Set());
  const [partialIds, setPartialIds] = useState<Set<string>>(new Set());
  const [misconceptions, setMisconceptions] = useState<string[]>([]);
  const [newHit, setNewHit] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(limit);
  const [demoMode, setDemoMode] = useState(false);
  const [demoRunning, setDemoRunning] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const demoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(intervalRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
    if (inputMode === "typing") textareaRef.current?.focus();
    return () => clearInterval(intervalRef.current!);
  }, []);

  useEffect(() => {
    if (timeLeft === 0) {
      stopVoice();
      onScore(Array.from(hitIds), limit, misconceptions.length);
    }
  }, [timeLeft]);

  const runDetection = useCallback((text: string, currentHits: Set<string>) => {
    const { newHits, partialHits, misconceptions: newMisc } = detectConceptsEnhanced(text, card.concepts, currentHits);
    if (newHits.length > 0) {
      setHitIds(prev => {
        const next = new Set([...prev, ...newHits]);
        return next;
      });
      setNewHit(newHits[newHits.length - 1]);
      setTimeout(() => setNewHit(null), 1600);
    }
    if (partialHits.length > 0) {
      setPartialIds(prev => new Set([...prev, ...partialHits]));
    }
    if (newMisc.length > 0) {
      setMisconceptions(prev => {
        const merged = [...prev];
        newMisc.forEach(m => { if (!merged.includes(m)) merged.push(m); });
        return merged;
      });
    }
  }, [card.concepts]);

  const handleInput = (val: string) => {
    setInput(val);
    runDetection(val, hitIds);
  };

  // Voice input
  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition is not supported in this browser."); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results as SpeechRecognitionResultList)
        .map((r: SpeechRecognitionResult) => r[0].transcript)
        .join(" ");
      setInput(transcript);
      runDetection(transcript, hitIds);
    };
    rec.start();
    recognitionRef.current = rec;
    setVoiceActive(true);
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setVoiceActive(false);
  };

  // Demo mode: auto-type a passage containing concept keywords
  const runDemo = () => {
    if (demoRunning) return;
    setDemoMode(true);
    setDemoRunning(true);
    setInput("");
    setHitIds(new Set());
    setPartialIds(new Set());
    setMisconceptions([]);

    const demoText = card.concepts
      .map(c => c.text)
      .join(" ")
      .slice(0, 320);

    let i = 0;
    demoRef.current = setInterval(() => {
      i++;
      const current = demoText.slice(0, i);
      setInput(current);
      setHitIds(prev => {
        runDetection(current, prev);
        return prev;
      });
      if (i >= demoText.length) {
        clearInterval(demoRef.current!);
        setDemoRunning(false);
      }
    }, DEMO_DELAY_MS);
  };

  useEffect(() => () => { clearInterval(demoRef.current!); stopVoice(); }, []);

  const pct = (hitIds.size / card.concepts.length) * 100;
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const tColor = timerPressureColor(timeLeft, limit);
  const urgent = timeLeft / limit < 0.25;

  const modeBtn = (mode: InputMode, icon: React.ReactNode, label: string, allowed: boolean) => (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={() => {
        if (!allowed) return;
        if (mode === "voice" || mode === "video") { if (inputMode !== mode) { stopVoice(); startVoice(); } }
        if (mode === "typing") stopVoice();
        setInputMode(mode);
      }}
      title={!allowed ? "Disabled for this card" : label}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9.5px] font-semibold border transition-all ${
        inputMode === mode && allowed
          ? "bg-indigo-600/25 border-indigo-500/40 text-indigo-300"
          : allowed
          ? "bg-white/[0.03] border-white/[0.07] text-slate-500 hover:text-slate-300"
          : "opacity-30 cursor-not-allowed border-white/[0.04] text-slate-700"
      } ${(mode === "voice" || mode === "video") && voiceActive && inputMode === mode ? "ring-1 ring-rose-500/50" : ""}`}
    >
      {icon}
      {label}
      {(mode === "voice" || mode === "video") && voiceActive && inputMode === mode && (
        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full bg-rose-400" />
      )}
    </motion.button>
  );

  return (
    <motion.div
      key="test"
      initial={{ opacity: 0, scale: 0.97, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: -12 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="flex flex-col gap-4 w-full max-w-2xl"
    >
      {/* Demo pill */}
      <AnimatePresence>
        {demoMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="self-center flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border border-indigo-500/30 bg-indigo-600/12 text-indigo-300"
          >
            <Sparkles size={9} />
            {demoRunning ? "Demo — watch concept detection in action" : "Demo complete — try it yourself"}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer + score bar */}
      <div
        className="flex items-center gap-5 px-5 py-4 rounded-2xl bg-[#13151c] border border-white/[0.06]"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}
      >
        <motion.div
          animate={{ scale: urgent ? [1, 1.06, 1] : 1 }}
          transition={{ repeat: urgent ? Infinity : 0, duration: 0.7 }}
          className="flex items-center gap-2 shrink-0"
        >
          <Clock size={15} style={{ color: tColor }} />
          <span className="text-[22px] font-black tabular-nums leading-none" style={{ color: tColor }}>
            {mm}:{ss}
          </span>
        </motion.div>

        {/* Timer pressure arc */}
        <div className="relative shrink-0">
          <svg width={28} height={28} viewBox="0 0 28 28" className="-rotate-90">
            <circle cx={14} cy={14} r={11} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
            <motion.circle
              cx={14} cy={14} r={11}
              fill="none"
              stroke={tColor}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={69.1}
              strokeDashoffset={69.1 * (1 - timeLeft / limit)}
              transition={{ duration: 0.5 }}
            />
          </svg>
        </div>

        <div className="flex-1">
          <div className="flex justify-between mb-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Concepts Unlocked</span>
            <span className="text-[10px] font-bold" style={{ color: card.accent }}>{hitIds.size} / {card.concepts.length}</span>
          </div>
          <ProgressBar pct={pct} color={card.accent} height="h-1.5" />
        </div>
      </div>

      {/* Misconception warnings */}
      <AnimatePresence>
        {misconceptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex flex-col gap-1.5 p-3.5 rounded-xl border border-rose-500/20"
            style={{ background: "rgba(239,68,68,0.07)" }}
          >
            <p className="text-[9px] font-bold uppercase tracking-widest text-rose-400 mb-1">⚠ Misconception Detected — penalty applied</p>
            {misconceptions.map((m, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <X size={9} className="text-rose-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-rose-300/80">{m}</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-[1fr_260px] gap-4">
        {/* Input area */}
        <div
          className="flex flex-col rounded-2xl overflow-hidden bg-[#13151c] border border-white/[0.06]"
          style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}
        >
          {/* Mode switcher */}
          <div className="flex items-center gap-1.5 px-4 pt-4 pb-3 border-b border-white/[0.06]">
            {modeBtn("typing", <BarChart3 size={10} />, "Type", card.testConfig.allowTyping)}
            {modeBtn("voice",  <Mic size={10} />,      "Voice", card.testConfig.allowVoice)}
            {modeBtn("video",  <Video size={10} />,    "Video", card.testConfig.allowVideo)}
            <div className="flex-1" />
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={runDemo}
              disabled={demoRunning}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold text-indigo-400 border border-indigo-500/20 bg-indigo-500/8 hover:bg-indigo-500/14 transition-colors disabled:opacity-40"
            >
              <Sparkles size={9} /> Demo
            </motion.button>
          </div>

          <div className="px-5 pt-4 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-3">
              {inputMode === "typing" ? "Write" : inputMode === "voice" ? "Say" : "Explain on camera"}
              {" "}everything you know about <span style={{ color: card.accent }}>{card.title}</span>
            </p>

            {(inputMode === "typing" || demoMode) && (
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => handleInput(e.target.value)}
                readOnly={demoRunning}
                placeholder="Start writing… each concept you mention will unlock in real-time."
                rows={9}
                className="w-full resize-none bg-transparent text-[12.5px] text-slate-200 placeholder-slate-700 outline-none leading-relaxed"
                style={{ fontFamily: "inherit" }}
              />
            )}

            {(inputMode === "voice" || inputMode === "video") && !demoMode && (
              <div className="flex flex-col items-center justify-center h-[180px] gap-4">
                {voiceActive ? (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                      className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-rose-500/40 bg-rose-500/10"
                    >
                      <Mic size={22} className="text-rose-400" />
                    </motion.div>
                    <p className="text-[11px] text-slate-400">Listening — speak clearly</p>
                    <p className="text-[10px] text-slate-600 text-center leading-relaxed px-4">{input || "Waiting for speech…"}</p>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center border border-white/[0.1] bg-white/[0.04]">
                      {inputMode === "video" ? <Video size={22} className="text-slate-500" /> : <Mic size={22} className="text-slate-500" />}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {inputMode === "video" ? "Click Voice to activate (video scoring coming soon)" : "Click Voice to start recording"}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 px-4 py-3 border-t border-white/[0.06]">
            <span className="text-[9px] text-slate-700">
              {partialIds.size > 0 && `${partialIds.size} partial match${partialIds.size > 1 ? "es" : ""}`}
            </span>
            <div className="flex-1" />
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                stopVoice();
                onScore(Array.from(hitIds), limit - timeLeft, misconceptions.length);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-rose-400 border border-rose-500/20 bg-rose-500/6 hover:bg-rose-500/12 transition-colors"
            >
              <StopCircle size={11} /> Stop
            </motion.button>
          </div>
        </div>

        {/* Concept reveal panel */}
        <div
          className="rounded-2xl p-4 bg-[#13151c] border border-white/[0.06] flex flex-col gap-2 overflow-y-auto"
          style={{ maxHeight: 420, boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}
        >
          <SectionLabel>Concepts</SectionLabel>
          {card.concepts.map((c, i) => {
            const hit = hitIds.has(c.id);
            const partial = !hit && partialIds.has(c.id);
            const justHit = newHit === c.id;
            return (
              <motion.div
                key={c.id}
                animate={justHit ? { scale: [1, 1.04, 1], x: [0, 2, 0] } : {}}
                transition={{ duration: 0.45 }}
                className={`flex items-start gap-2 p-2.5 rounded-xl border transition-all duration-300 ${
                  hit     ? "bg-emerald-500/8 border-emerald-500/20"
                  : partial ? "bg-amber-500/6 border-amber-500/15"
                  :           "bg-[#0f1117] border-white/[0.05]"
                }`}
              >
                <div className={`w-5 h-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center transition-all duration-300 ${
                  hit ? "bg-emerald-500" : partial ? "bg-amber-500/40 border border-amber-500/40" : "bg-white/[0.06]"
                }`}>
                  {hit
                    ? <CheckCircle2 size={10} className="text-white" />
                    : <span className="text-[8px] font-bold text-slate-600">{i + 1}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[10.5px] leading-snug transition-all duration-500"
                    style={{
                      filter: hit ? "none" : partial ? "blur(2px)" : "blur(4px)",
                      color: hit ? "#86EFAC" : partial ? "#FCD34D" : "#475569",
                      userSelect: hit ? "auto" : "none",
                    }}
                  >
                    {c.text}
                  </p>
                  {hit && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[8px] text-slate-700">wt {c.weight.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Concept unlock toast */}
      <AnimatePresence>
        {newHit && (
          <motion.div
            key={newHit}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-2xl z-[60]"
            style={{
              background: "linear-gradient(135deg, #064E3B, #065F46)",
              border: "1px solid rgba(52,211,153,0.35)",
              boxShadow: "0 12px 32px rgba(0,0,0,0.55), 0 0 24px rgba(52,211,153,0.18)",
            }}
          >
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="text-[12px] font-bold text-emerald-300">Concept Unlocked</span>
            <span className="text-[10px] text-emerald-600 ml-1">
              {card.concepts.find(c => c.id === newHit)?.weight.toFixed(1)}× weight
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   5. SCORE VIEW — full breakdown + leaderboard
   ══════════════════════════════════════════════════════════════ */

type LBScope = "global" | "country" | "university" | "friends";

function ScoreView({ card, hitIds, elapsed, misconceptionCount, onRetry, onBack, onNext }: {
  card: CognitiveCardData;
  hitIds: string[];
  elapsed: number;
  misconceptionCount: number;
  onRetry: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [lbScope, setLbScope] = useState<LBScope>("global");
  const hitSet = new Set(hitIds);
  const bd = computeScore(hitIds, card.concepts, elapsed, card.testConfig.timeLimitSeconds, card.difficulty, misconceptionCount, card.mastery.streak);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const lbData = MOCK_LEADERBOARD[lbScope].map(row =>
    row.name === "You" ? { ...row, score: bd.finalScore } : row
  ).sort((a, b) => b.score - a.score);

  const myRank = lbData.findIndex(r => r.name === "You") + 1;
  const estimatedGlobal = Math.max(1, Math.round(1000 - bd.finalScore * 9.5));

  return (
    <motion.div
      key="score"
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: -12 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="flex flex-col gap-4 w-full max-w-xl"
    >
      {/* Score hero card */}
      <div
        className={`rounded-2xl overflow-hidden bg-gradient-to-br ${card.gradientBg} border border-white/[0.09]`}
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.07) inset" }}
      >
        <div className="h-[3px]" style={{ background: card.accent }} />
        <div className="px-6 py-7 flex flex-col items-center gap-5 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.08 }}
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-[34px] font-black"
            style={{ background: `${bd.gradeAccent}14`, border: `2px solid ${bd.gradeAccent}40`, color: bd.gradeAccent }}
          >
            {bd.grade}
          </motion.div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1">{card.title}</p>
            <motion.p
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-[40px] font-black text-white leading-none"
            >
              {bd.finalScore}<span className="text-[22px] text-slate-500">%</span>
            </motion.p>
            <p className="text-[11px] text-slate-500 mt-1.5">{bd.verdict}</p>
          </div>

          {/* Stats strip */}
          <div className="flex gap-0 w-full border-t border-white/[0.07] mt-1">
            {[
              { label: "Concepts Hit",  value: `${hitIds.length}/${card.concepts.length}`, color: "#34D399" },
              { label: "Time Used",     value: `${mm}:${ss}`, color: "#94A3B8" },
              { label: "Global Rank",   value: `#${estimatedGlobal}`, color: bd.gradeAccent },
            ].map((s, i) => (
              <div key={s.label} className={`flex-1 text-center py-3 ${i > 0 ? "border-l border-white/[0.07]" : ""}`}>
                <p className="text-[16px] font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[9px] text-slate-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div
        className="rounded-2xl p-4 bg-[#13151c] border border-white/[0.06]"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}
      >
        <SectionLabel>Score Breakdown</SectionLabel>
        <div className="space-y-2">
          {[
            { label: "Weighted Recall",       value: `${bd.rawPct.toFixed(1)}%`,                       note: `${bd.weightedHits.toFixed(2)} / ${bd.totalWeight.toFixed(2)} weight`, color: card.accent },
            { label: `Difficulty ×${bd.diffMultiplier}`, value: `${DIFF_LABEL[card.difficulty]}`,      note: `level ${card.difficulty}`,              color: "#94a3b8" },
            { label: "Speed Bonus",           value: bd.speedBonus >= 1.1 ? `×${bd.speedBonus.toFixed(2)}` : "—",  note: elapsed < card.testConfig.timeLimitSeconds * 0.6 ? "Fast finish" : "Standard pace", color: bd.speedBonus >= 1.1 ? "#10b981" : "#475569" },
            { label: "Accuracy Bonus",        value: bd.accuracyBonus > 1 ? `×${bd.accuracyBonus.toFixed(2)}` : "—", note: bd.accuracyBonus > 1 ? "All concepts hit!" : "Partial recall", color: bd.accuracyBonus > 1 ? "#10b981" : "#475569" },
            { label: "Streak Bonus",          value: bd.streakBonus > 1 ? `×${bd.streakBonus.toFixed(2)}` : "—",   note: `${card.mastery.streak}d streak`,       color: bd.streakBonus > 1 ? "#f59e0b" : "#475569" },
            ...(misconceptionCount > 0 ? [{ label: "Misconception Penalty", value: `-${bd.misconceptionPenalty}pts`, note: `${misconceptionCount} misconception${misconceptionCount > 1 ? "s" : ""}`, color: "#ef4444" }] : []),
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <span className="text-[10.5px] text-slate-500">{row.label}</span>
              <span className="text-[10px] text-slate-700">{row.note}</span>
              <span className="text-[11px] font-bold shrink-0" style={{ color: row.color }}>{row.value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04] mt-1">
            <span className="text-[11px] font-bold text-white">Final Score</span>
            <span className="text-[14px] font-black" style={{ color: bd.gradeAccent }}>{bd.finalScore}%</span>
          </div>
        </div>
      </div>

      {/* Concept breakdown */}
      <div
        className="rounded-2xl p-4 bg-[#13151c] border border-white/[0.06]"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}
      >
        <SectionLabel>Concept Breakdown</SectionLabel>
        <div className="flex flex-col gap-1.5">
          {card.concepts.map(c => {
            const hit = hitSet.has(c.id);
            return (
              <div key={c.id} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border ${
                hit ? "bg-emerald-500/7 border-emerald-500/15" : "bg-rose-500/5 border-rose-500/12"
              }`}>
                {hit
                  ? <CheckCircle2 size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                  : <X size={12} className="text-rose-400 shrink-0 mt-0.5" />}
                <p className={`text-[11px] leading-snug flex-1 ${hit ? "text-slate-300" : "text-slate-600"}`}>{c.text}</p>
                <span className="text-[8px] text-slate-700 shrink-0 mt-0.5">wt {c.weight.toFixed(1)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Streak + speed */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-amber-500/6 border-amber-500/15">
          <Flame size={14} className="text-amber-400 shrink-0" />
          <div>
            <p className="text-[12px] font-bold text-amber-300">{card.mastery.streak + (bd.finalScore >= 60 ? 1 : 0)}d</p>
            <p className="text-[9px] text-slate-600">{bd.finalScore >= 60 ? "Streak extended" : "Streak at risk"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-indigo-500/6 border-indigo-500/15">
          <BarChart3 size={14} className="text-indigo-400 shrink-0" />
          <div>
            <p className="text-[12px] font-bold text-indigo-300">{mm}:{ss}</p>
            <p className="text-[9px] text-slate-600">{card.mastery.attempts + 1} total attempts</p>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div
        className="rounded-2xl p-4 bg-[#13151c] border border-white/[0.06]"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Leaderboard</SectionLabel>
          <div className="flex gap-1">
            {(["global","country","university","friends"] as LBScope[]).map(s => (
              <button
                key={s}
                onClick={() => setLbScope(s)}
                className={`text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg border transition-all ${
                  lbScope === s ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white/[0.03] border-white/[0.07] text-slate-600 hover:text-slate-400"
                }`}
              >
                {s === "university" ? "Uni" : s}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          {lbData.map((row, i) => {
            const isYou = row.name === "You";
            return (
              <motion.div
                key={row.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, ease: EASE }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${
                  isYou ? "bg-indigo-600/12 border-indigo-500/25" : "bg-white/[0.02] border-white/[0.05]"
                }`}
              >
                <span className={`text-[10px] font-black w-5 text-center ${i === 0 ? "text-yellow-400" : "text-slate-600"}`}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </span>
                <span className="text-[9px] text-slate-500 shrink-0">{row.country}</span>
                <span className={`flex-1 text-[11px] font-semibold ${isYou ? "text-indigo-300" : "text-slate-300"}`}>
                  {row.name}{isYou ? " (you)" : ""}
                </span>
                <span className="text-[11px] font-bold" style={{ color: isYou ? bd.gradeAccent : "#64748b" }}>
                  {row.score}%
                </span>
              </motion.div>
            );
          })}
        </div>
        <p className="text-[9px] text-slate-700 mt-2 text-center">
          {lbScope === "global" ? `~${estimatedGlobal.toLocaleString()} global rank` : `#${myRank} in ${lbScope}`}
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-2.5">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onRetry}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11.5px] font-semibold text-slate-400 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:text-slate-300 transition-colors"
        >
          <RotateCcw size={12} /> Retry
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl text-[11.5px] font-semibold text-slate-500 border border-white/[0.06] bg-white/[0.02] hover:text-slate-300 transition-colors"
        >
          Library
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.97 }}
          onClick={onNext}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all"
          style={{ background: `linear-gradient(135deg, ${card.accent}cc, ${card.accent}88)` }}
        >
          Next Card <ChevronRight size={12} />
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   6. MULTIPLAYER ENGINE — room system, simulation, 5-phase flow
   ══════════════════════════════════════════════════════════════ */

type RoomMode   = "study" | "battle" | "exam" | "tournament";
type MatchPhase = "lobby" | "countdown" | "battle" | "results";

interface MPPlayer {
  id: string;
  name: string;
  initials: string;
  accent: string;
  you: boolean;
  speed: number;  // AI simulation speed factor (0 = human)
  ready: boolean;
}

interface MPPlayerState {
  id: string;
  score: number;
  conceptsHit: string[];
  accuracy: number;
  active: boolean;   // "speaking/typing" indicator
  lastHitLabel: string | null;
}

interface BroadcastEvent {
  uid: string;
  playerId: string;
  playerName: string;
  accent: string;
  conceptText: string;
  scoreDelta: number;
}

const ROOM_MODE_META: Record<RoomMode, { label: string; color: string; icon: React.ReactNode; desc: string }> = {
  study:      { label: "Study",      color: "text-sky-400 border-sky-500/25 bg-sky-500/8",      icon: <BookOpen size={10} />,  desc: "Cooperative — all players share notes" },
  battle:     { label: "Battle",     color: "text-rose-400 border-rose-500/25 bg-rose-500/8",    icon: <Zap size={10} />,       desc: "Competitive — first to recall all concepts wins" },
  exam:       { label: "Exam",       color: "text-amber-400 border-amber-500/25 bg-amber-500/8", icon: <Shield size={10} />,    desc: "No hints — graded on accuracy and speed" },
  tournament: { label: "Tournament", color: "text-yellow-400 border-yellow-500/25 bg-yellow-500/8", icon: <Trophy size={10} />, desc: "Bracket — winner advances to next round" },
};

const DEFAULT_MP_PLAYERS: MPPlayer[] = [
  { id: "p0", name: "Francis", initials: "FC", accent: "#6366F1", you: true,  speed: 0,    ready: true },
  { id: "p1", name: "Lena",    initials: "LM", accent: "#F59E0B", you: false, speed: 0.70, ready: true },
  { id: "p2", name: "Marcus",  initials: "MB", accent: "#34D399", you: false, speed: 0.88, ready: true },
];

const WAVEFORM_H = [4, 9, 13, 7, 15, 10, 5, 12, 8, 14, 6, 11];

function WaveformBars({ active, accent }: { active: boolean; accent: string }) {
  return (
    <div className="flex items-end gap-[2px] h-4">
      {WAVEFORM_H.map((h, i) => (
        <motion.div
          key={i}
          animate={active ? { height: [`${Math.max(2, h / 4)}px`, `${h}px`, `${Math.max(2, h / 4)}px`] } : { height: "2px" }}
          transition={{ duration: 0.35 + i * 0.04, repeat: Infinity, ease: "easeInOut" }}
          className="w-[2.5px] rounded-full shrink-0"
          style={{ background: active ? accent : "rgba(255,255,255,0.08)" }}
        />
      ))}
    </div>
  );
}

function MultiplayerView({ card, onClose }: { card: CognitiveCardData; onClose: () => void }) {
  const limit = card.testConfig.timeLimitSeconds;
  const [phase, setPhase] = useState<MatchPhase>("lobby");
  const [roomMode, setRoomMode] = useState<RoomMode>("battle");
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(limit);
  const [userInput, setUserInput] = useState("");
  const [events, setEvents] = useState<BroadcastEvent[]>([]);

  // Initialise per-player live state
  const initStates = (): MPPlayerState[] =>
    DEFAULT_MP_PLAYERS.map(p => ({ id: p.id, score: 0, conceptsHit: [], accuracy: 100, active: false, lastHitLabel: null }));
  const [pStates, setPStates] = useState<MPPlayerState[]>(initStates);

  const aiIntervals = useRef<ReturnType<typeof setInterval>[]>([]);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── countdown → battle ──
  useEffect(() => {
    if (phase !== "countdown") return;
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); setPhase("battle"); return 0; }
        return c - 1;
      });
    }, 900);
    return () => clearInterval(t);
  }, [phase]);

  // ── battle engine ──
  useEffect(() => {
    if (phase !== "battle") return;
    textareaRef.current?.focus();

    // master timer
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); endBattle(); return 0; }
        return t - 1;
      });
    }, 1000);

    // AI simulation per non-human player
    DEFAULT_MP_PLAYERS.forEach((p, pi) => {
      if (p.you) return;
      const unhitIds = () => card.concepts.map(c => c.id).filter(id => !pStates[pi].conceptsHit.includes(id));
      const id = setInterval(() => {
        const remaining = unhitIds();
        if (remaining.length === 0) return;
        // probability to hit a concept this tick, scaled by speed
        if (Math.random() > p.speed * 1.5 / card.concepts.length) return;
        const conceptId = remaining[Math.floor(Math.random() * remaining.length)];
        const concept   = card.concepts.find(c => c.id === conceptId)!;
        const delta     = Math.round(concept.weight * 10);

        setPStates(prev => prev.map((s, si) => {
          if (si !== pi) return s;
          const hits = [...s.conceptsHit, conceptId];
          return { ...s, score: s.score + delta, conceptsHit: hits, active: true, lastHitLabel: concept.text.slice(0, 28) + "…" };
        }));
        setTimeout(() => setPStates(prev => prev.map((s, si) => si === pi ? { ...s, active: false, lastHitLabel: null } : s)), 1200);

        const ev: BroadcastEvent = { uid: `${Date.now()}-${pi}`, playerId: p.id, playerName: p.name, accent: p.accent, conceptText: concept.text.slice(0, 34), scoreDelta: delta };
        setEvents(prev => [ev, ...prev].slice(0, 12));
      }, 1400 + Math.random() * 600);
      aiIntervals.current.push(id);
    });

    return () => {
      clearInterval(timerRef.current!);
      aiIntervals.current.forEach(clearInterval);
      aiIntervals.current = [];
    };
  }, [phase]);

  // ── user concept detection ──
  const userHitSet = useRef(new Set<string>());
  const handleUserInput = (val: string) => {
    setUserInput(val);
    const { newHits } = detectConceptsEnhanced(val, card.concepts, userHitSet.current);
    if (newHits.length === 0) return;
    newHits.forEach(id => userHitSet.current.add(id));
    const concept = card.concepts.find(c => c.id === newHits[0])!;
    const delta   = Math.round(concept.weight * 10);

    setPStates(prev => prev.map((s, si) => {
      if (si !== 0) return s;
      return { ...s, score: s.score + delta, conceptsHit: [...s.conceptsHit, ...newHits], active: true, lastHitLabel: concept.text.slice(0, 28) + "…" };
    }));
    setTimeout(() => setPStates(prev => prev.map((s, si) => si === 0 ? { ...s, active: false, lastHitLabel: null } : s)), 1200);

    const ev: BroadcastEvent = { uid: `${Date.now()}-u`, playerId: "p0", playerName: "Francis", accent: "#6366F1", conceptText: concept.text.slice(0, 34), scoreDelta: delta };
    setEvents(prev => [ev, ...prev].slice(0, 12));
  };

  const endBattle = () => {
    clearInterval(timerRef.current!);
    aiIntervals.current.forEach(clearInterval);
    setPhase("results");
  };

  const rematch = () => {
    userHitSet.current.clear();
    setPStates(initStates());
    setEvents([]);
    setUserInput("");
    setTimeLeft(limit);
    setCountdown(3);
    setPhase("lobby");
  };

  // ranked live leaderboard
  const ranked = DEFAULT_MP_PLAYERS.map((p, i) => ({ ...p, ...pStates[i] }))
    .sort((a, b) => b.score - a.score)
    .map((p, ri) => ({ ...p, rank: ri + 1 }));

  const winnerPlayer = ranked[0];
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const tColor = timerPressureColor(timeLeft, limit);
  const modeMeta = ROOM_MODE_META[roomMode];

  return (
    <motion.div
      key="multiplayer"
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="flex flex-col gap-4 w-full max-w-3xl"
    >
      <AnimatePresence mode="wait">

        {/* ── LOBBY ── */}
        {phase === "lobby" && (
          <motion.div key="lobby" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            {/* Room header */}
            <div className="rounded-2xl overflow-hidden bg-[#13151c] border border-white/[0.07]" style={{ boxShadow: "0 10px 36px rgba(0,0,0,0.55)" }}>
              <div className="h-[2px]" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }} />
              <div className="px-5 py-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-600/15 border border-indigo-500/25">
                  <Users size={13} className="text-indigo-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-white">{card.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Hash size={9} className="text-slate-600" />
                    <span className="text-[9px] font-bold text-slate-600 tracking-widest">P1-ROOM-{card.id.slice(0,4).toUpperCase()}</span>
                  </div>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg border ${modeMeta.color}`}>
                  {modeMeta.label}
                </span>
              </div>
            </div>

            {/* Mode selector */}
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Game Mode</p>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(ROOM_MODE_META) as RoomMode[]).map(m => {
                  const meta = ROOM_MODE_META[m];
                  return (
                    <motion.button
                      key={m}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setRoomMode(m)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                        roomMode === m ? `${meta.color} ring-1 ring-current/30` : "bg-white/[0.02] border-white/[0.07] text-slate-600 hover:text-slate-400"
                      }`}
                    >
                      {meta.icon}
                      <span className="text-[9px] font-bold uppercase tracking-widest">{meta.label}</span>
                    </motion.button>
                  );
                })}
              </div>
              <p className="text-[9px] text-slate-600 mt-2">{modeMeta.desc}</p>
            </div>

            {/* Players */}
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Players ({DEFAULT_MP_PLAYERS.length}/4)</p>
              <div className="space-y-1.5">
                {DEFAULT_MP_PLAYERS.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ background: `${p.accent}20`, border: `1px solid ${p.accent}35`, color: p.accent }}>
                      {p.initials}
                    </div>
                    <span className="flex-1 text-[11px] font-semibold text-slate-300">
                      {p.name}{p.you && " (You)"}
                    </span>
                    {!p.you && <span className="text-[8px] text-slate-600">AI · speed {Math.round(p.speed * 100)}%</span>}
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-[12px] font-semibold text-slate-500 border border-white/[0.07] bg-white/[0.02] hover:text-slate-300 transition-colors">Exit</button>
              <motion.button
                whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.97 }}
                onClick={() => { setCountdown(3); setPhase("countdown"); }}
                className="flex-1 py-2.5 rounded-xl text-[12.5px] font-bold text-white flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}
              >
                <Play size={13} /> Start {modeMeta.label}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── COUNTDOWN ── */}
        {phase === "countdown" && (
          <motion.div key="countdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20 gap-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{modeMeta.label} Mode · {card.title}</p>
            <motion.div
              key={countdown}
              initial={{ scale: 1.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-[80px] font-black leading-none"
              style={{ color: countdown > 1 ? "#6366f1" : "#10b981" }}
            >
              {countdown > 0 ? countdown : "GO!"}
            </motion.div>
            <p className="text-[12px] text-slate-500">Get ready to recall everything you know</p>
          </motion.div>
        )}

        {/* ── BATTLE ── */}
        {phase === "battle" && (
          <motion.div key="battle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">

            {/* Battle header */}
            <div className="flex items-center gap-4 px-5 py-3.5 rounded-2xl bg-[#13151c] border border-white/[0.06]" style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg border shrink-0 ${modeMeta.color}`}>{modeMeta.icon}{" "}{modeMeta.label}</span>
              <p className="flex-1 text-[12px] font-bold text-white truncate">{card.title}</p>
              <motion.div animate={{ scale: timeLeft / limit < 0.25 ? [1, 1.08, 1] : 1 }} transition={{ repeat: Infinity, duration: 0.7 }} className="flex items-center gap-1.5 shrink-0">
                <Clock size={13} style={{ color: tColor }} />
                <span className="text-[18px] font-black tabular-nums" style={{ color: tColor }}>{mm}:{ss}</span>
              </motion.div>
            </div>

            {/* Player cards */}
            <div className="grid grid-cols-3 gap-3">
              {DEFAULT_MP_PLAYERS.map((p, i) => {
                const ps = pStates[i];
                const conceptPct = (ps.conceptsHit.length / card.concepts.length) * 100;
                return (
                  <motion.div
                    key={p.id}
                    animate={ps.active ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ duration: 0.35 }}
                    className="rounded-2xl p-4 border flex flex-col gap-3"
                    style={{
                      background: `linear-gradient(135deg, ${p.accent}08, transparent)`,
                      border: `1px solid ${ps.active ? p.accent + "50" : "rgba(255,255,255,0.07)"}`,
                      boxShadow: ps.active ? `0 0 20px ${p.accent}20` : "0 6px 24px rgba(0,0,0,0.4)",
                      transition: "border 0.3s, box-shadow 0.3s",
                    }}
                  >
                    {/* Video bubble */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[13px] font-bold" style={{ background: `${p.accent}20`, border: `2px solid ${p.accent}${ps.active ? "80" : "35"}`, color: p.accent }}>
                          {p.initials}
                        </div>
                        {ps.active && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-[#0a0b10]" />
                        )}
                      </div>
                      <WaveformBars active={ps.active} accent={p.accent} />
                    </div>

                    {/* Name + score */}
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-white leading-none">{p.name}{p.you && <span className="text-slate-600 font-normal"> ·you</span>}</p>
                      <motion.p key={ps.score} initial={{ y: -4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-[18px] font-black mt-1" style={{ color: p.accent }}>
                        {ps.score}
                      </motion.p>
                    </div>

                    {/* Concept progress bar */}
                    <ProgressBar pct={conceptPct} color={p.accent} height="h-1" />
                    <p className="text-[8px] text-slate-700 text-center">{ps.conceptsHit.length}/{card.concepts.length} concepts</p>

                    {/* Last hit badge */}
                    <AnimatePresence>
                      {ps.lastHitLabel && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[8px] font-semibold truncate"
                          style={{ background: `${p.accent}12`, borderColor: `${p.accent}25`, color: p.accent }}
                        >
                          <CheckCircle2 size={7} /> {ps.lastHitLabel}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {/* User input */}
            <div className="rounded-2xl overflow-hidden bg-[#13151c] border border-white/[0.06]" style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
              <div className="px-4 pt-4 pb-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Your answer — <span style={{ color: "#6366f1" }}>Francis</span></p>
                <textarea
                  ref={textareaRef}
                  value={userInput}
                  onChange={e => handleUserInput(e.target.value)}
                  placeholder="Start typing — concept hits score points in real-time…"
                  rows={3}
                  className="w-full resize-none bg-transparent text-[12px] text-slate-200 placeholder-slate-700 outline-none leading-relaxed"
                />
              </div>
              <div className="flex items-center gap-3 px-4 py-2.5 border-t border-white/[0.06]">
                <span className="text-[9px] text-slate-700 flex-1">{pStates[0].conceptsHit.length} concepts hit · {pStates[0].score} pts</span>
                <motion.button whileTap={{ scale: 0.97 }} onClick={endBattle} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-rose-400 border border-rose-500/20 bg-rose-500/6 hover:bg-rose-500/12">
                  <StopCircle size={10} /> Finish
                </motion.button>
              </div>
            </div>

            {/* Live leaderboard */}
            <div className="rounded-2xl p-4 bg-[#13151c] border border-white/[0.06]" style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
              <SectionLabel>Live Leaderboard</SectionLabel>
              <div className="space-y-1.5">
                {ranked.map((p, ri) => (
                  <motion.div key={p.id} layout className="flex items-center gap-2.5 px-3 py-2 rounded-xl border" style={{ background: p.you ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)", borderColor: p.you ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.06)" }}>
                    <span className="text-[10px] font-black w-5 text-center" style={{ color: ri === 0 ? "#FBBF24" : "#475569" }}>{ri === 0 ? "🥇" : ri === 1 ? "🥈" : "🥉"}</span>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.accent }} />
                    <span className="flex-1 text-[11px] font-semibold text-slate-300">{p.name}</span>
                    <span className="text-[9px] text-slate-600">{p.conceptsHit.length}/{card.concepts.length}</span>
                    <span className="text-[11px] font-bold" style={{ color: p.accent }}>{p.score} pts</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Broadcast event ticker */}
            {events.length > 0 && (
              <div className="flex items-center gap-2 overflow-hidden">
                <Zap size={10} className="text-yellow-400 shrink-0" />
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {events.slice(0, 6).map(ev => (
                    <motion.div
                      key={ev.uid}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-semibold"
                      style={{ background: `${ev.accent}10`, borderColor: `${ev.accent}25`, color: ev.accent }}
                    >
                      {ev.playerName} +{ev.scoreDelta}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── RESULTS ── */}
        {phase === "results" && (
          <motion.div key="results" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">

            {/* Winner hero */}
            <div className="rounded-2xl overflow-hidden border border-white/[0.09]" style={{ background: `linear-gradient(135deg, ${winnerPlayer.accent}15, transparent)`, boxShadow: `0 20px 60px rgba(0,0,0,0.7), 0 0 40px ${winnerPlayer.accent}18` }}>
              <div className="h-[3px]" style={{ background: winnerPlayer.accent }} />
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 250, damping: 16, delay: 0.1 }}>
                  <Crown size={36} style={{ color: "#FBBF24" }} />
                </motion.div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{modeMeta.label} · {card.title}</p>
                  <p className="text-[26px] font-black text-white mt-1">{winnerPlayer.name} wins!</p>
                  <p className="text-[13px] font-bold mt-0.5" style={{ color: winnerPlayer.accent }}>{winnerPlayer.score} points · {winnerPlayer.conceptsHit.length}/{card.concepts.length} concepts</p>
                </div>
              </div>
            </div>

            {/* Final rankings */}
            <div className="rounded-2xl p-4 bg-[#13151c] border border-white/[0.06]" style={{ boxShadow: "0 10px 36px rgba(0,0,0,0.55)" }}>
              <SectionLabel>Final Rankings</SectionLabel>
              <div className="space-y-2">
                {ranked.map((p, ri) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ri * 0.07 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                    style={{ background: ri === 0 ? `${p.accent}10` : "rgba(255,255,255,0.02)", borderColor: ri === 0 ? `${p.accent}30` : "rgba(255,255,255,0.06)" }}
                  >
                    <span className="text-[14px] w-6 text-center">{["🥇","🥈","🥉"][ri] ?? `#${ri+1}`}</span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ background: `${p.accent}18`, border: `1px solid ${p.accent}35`, color: p.accent }}>{p.initials}</div>
                    <span className="flex-1 text-[12px] font-bold text-white">{p.name}{p.you && " (You)"}</span>
                    <div className="text-right">
                      <p className="text-[13px] font-black" style={{ color: p.accent }}>{p.score} pts</p>
                      <p className="text-[9px] text-slate-600">{p.conceptsHit.length}/{card.concepts.length} concepts</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-[12px] font-semibold text-slate-500 border border-white/[0.07] bg-white/[0.02] hover:text-slate-300 transition-colors">Exit</button>
              <motion.button whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.97 }} onClick={rematch} className="flex-1 py-2.5 rounded-xl text-[12.5px] font-bold text-white flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                <RotateCcw size={13} /> Rematch
              </motion.button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   OVERLAY — state machine wrapper
   ══════════════════════════════════════════════════════════════ */

function CardOverlay({ card, initialState, onClose, onNextCard }: {
  card: CognitiveCardData;
  initialState: CardState;
  onClose: () => void;
  onNextCard: () => void;
}) {
  const [view, setView] = useState<CardState>(initialState);
  const [scoreData, setScoreData] = useState<{ hits: string[]; elapsed: number; misconceptions: number } | null>(null);

  const handleScore = (hits: string[], elapsed: number, misconceptions: number) => {
    setScoreData({ hits, elapsed, misconceptions });
    setView("score");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)" }}
    >
      {/* Close */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        onClick={onClose}
        className="fixed top-5 right-5 w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.05] border border-white/[0.09] text-slate-500 hover:text-white hover:bg-white/[0.08] transition-colors z-10"
      >
        <X size={15} />
      </motion.button>

      {/* Card breadcrumb pill */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: card.accent }} />
        <span className="text-[10px] font-semibold text-slate-500">{card.title}</span>
        <span className="text-[10px] text-slate-700">·</span>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: card.accent + "bb" }}>{view}</span>
      </div>

      <div className="w-full flex items-start justify-center py-16">
        <AnimatePresence mode="wait">
          {view === "study" && (
            <StudyView key="study" card={card} onTest={() => setView("test")} onClose={onClose} />
          )}
          {view === "test" && (
            <TestView key="test" card={card} onScore={handleScore} />
          )}
          {view === "score" && scoreData && (
            <ScoreView
              key="score"
              card={card}
              hitIds={scoreData.hits}
              elapsed={scoreData.elapsed}
              misconceptionCount={scoreData.misconceptions}
              onRetry={() => { setScoreData(null); setView("test"); }}
              onBack={onClose}
              onNext={onNextCard}
            />
          )}
          {view === "multiplayer" && (
            <MultiplayerView key="multiplayer" card={card} onClose={onClose} />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CARD GRID — reusable, embedded in both CognitivePage and
   LearningCards inside the Learning Centre shell
   ══════════════════════════════════════════════════════════════ */

const CATEGORIES = ["All", ...Array.from(new Set(CARDS.map(c => c.category)))];

export function CognitiveCardGrid() {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [overlayState, setOverlayState] = useState<CardState>("study");
  const [filter, setFilter] = useState("All");

  const filtered = filter === "All" ? CARDS : CARDS.filter(c => c.category === filter);

  const openCard = (cardId: string, state: CardState) => {
    setSelectedIdx(CARDS.findIndex(c => c.id === cardId));
    setOverlayState(state);
  };

  const nextCard = () => {
    if (selectedIdx === null) return;
    setSelectedIdx((selectedIdx + 1) % CARDS.length);
    setOverlayState("study");
  };

  return (
    <>
      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <motion.button
            key={cat}
            whileTap={{ scale: 0.93 }}
            onClick={() => setFilter(cat)}
            className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all ${
              filter === cat
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-white/[0.03] border-white/[0.07] text-slate-500 hover:text-slate-300 hover:border-white/[0.14]"
            }`}
          >
            {cat}
          </motion.button>
        ))}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((card, i) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, ease: EASE }}
            >
              <LibraryCard
                card={card}
                onStudy={() => openCard(card.id, "study")}
                onTest={() => openCard(card.id, "test")}
                onMultiplayer={() => openCard(card.id, "multiplayer")}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Overlay */}
      <AnimatePresence>
        {selectedIdx !== null && (
          <CardOverlay
            key={selectedIdx}
            card={CARDS[selectedIdx]}
            initialState={overlayState}
            onClose={() => setSelectedIdx(null)}
            onNextCard={nextCard}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE — /cards standalone route
   ══════════════════════════════════════════════════════════════ */

export default function CognitivePage() {
  const totalMastery = Math.round(CARDS.reduce((s, c) => s + c.mastery.score, 0) / CARDS.length);

  return (
    <div className="min-h-screen bg-[#0a0b10] text-slate-200 flex flex-col font-sans">

      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0f1117]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <BackToCockpit />
          <div className="w-px h-4 bg-white/[0.08]" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.25)" }}>
              <BookOpen size={13} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-[13px] font-bold text-white leading-none">Cognitive Cards</h1>
              <p className="text-[9px] text-slate-600 mt-0.5">Recall, test, and master concepts</p>
            </div>
          </div>

          <div className="flex-1" />

          {/* Stats chips */}
          <div className="hidden sm:flex items-center gap-2">
            {[
              { icon: <BookOpen size={9} />, label: `${CARDS.length} Cards`, color: "text-indigo-400" },
              { icon: <Trophy size={9} />,   label: `${totalMastery}% Avg Mastery`, color: "text-emerald-400" },
              { icon: <Star size={9} />,     label: "7-day streak", color: "text-amber-400" },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[9.5px] text-slate-400">
                <span className={s.color}>{s.icon}</span>
                {s.label}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

          {/* Agent banner */}
          <div
            className="flex items-start gap-3 p-4 rounded-2xl border border-indigo-500/20"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.04))" }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.28)" }}>
              <Sparkles size={13} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-400/70 mb-1">P1 Agent · Learning Summary</p>
              <p className="text-[12px] text-slate-300 leading-relaxed">
                Your strongest card is <span className="text-sky-300 font-semibold">Tailwind CSS v4</span> at 83% mastery. Your greatest gap is{" "}
                <span className="text-amber-300 font-semibold">Vite Build System</span> — last tested 2 weeks ago and only 38% recalled.
                Agent recommends testing <span className="text-violet-300 font-semibold">React Hooks</span> next — it has never been tested.
              </p>
            </div>
          </div>

          <CognitiveCardGrid />
        </div>
      </div>
    </div>
  );
}
