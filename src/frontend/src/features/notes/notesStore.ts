/* ══════════════════════════════════════════════════════════════
   NOTES STORE — Phase 5
   Module-level singleton. Persists across route changes.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import type { Concept } from "../cards/types";

// ── Types ─────────────────────────────────────────────────────────

export type NoteSourceType = "typed" | "voice" | "scan" | "pdf" | "image" | "import" | "mixed";

export interface Note {
  id:                  string;
  title:               string;
  subject:             string | null;
  content:             string;
  sourceType:          NoteSourceType;
  createdAt:           Date;
  updatedAt:           Date;
  tags:                string[];
  // Voice fields (Phase 13)
  hasVoice?:           boolean;
  audioUrl?:           string;   // blob: URL created from MediaRecorder output
  duration?:           number;   // seconds
  voiceTranscript?:    string;   // cleaned transcript
  // Import / OCR fields
  ocrText?:            string;
  // AI-generated fields
  aiSummary?:          string;
  aiGeneratedContent?: string;
  aiConcepts?:         Concept[];
  aiCardId?:           string;
}

// ── Mock data ─────────────────────────────────────────────────────

const REACT_HOOKS_CONCEPTS: Concept[] = [
  { id: "nh-c1", text: "useState stores and updates local component state between renders", keywords: ["usestate", "state", "setter", "local"], difficulty: 2, weight: 1.5, aiGenerated: true, order: 1 },
  { id: "nh-c2", text: "useEffect runs after render; its cleanup function prevents memory leaks", keywords: ["useeffect", "side effect", "cleanup", "after render"], difficulty: 3, weight: 2, aiGenerated: true, order: 2 },
  { id: "nh-c3", text: "Custom hooks extract reusable stateful logic into named functions starting with 'use'", keywords: ["custom hook", "reusable", "stateful logic", "use prefix"], difficulty: 3, weight: 1.5, aiGenerated: true, order: 3 },
  { id: "nh-c4", text: "useRef persists a mutable value across renders without triggering re-renders", keywords: ["useref", "ref", "mutable", "persist", "no re-render"], difficulty: 2, weight: 1, aiGenerated: true, order: 4 },
  { id: "nh-c5", text: "Hooks must be called at the top level — never inside loops, conditions, or nested functions", keywords: ["rules of hooks", "top level", "not conditional", "order"], difficulty: 2, weight: 1, aiGenerated: true, order: 5 },
];

const FRAMER_CONCEPTS: Concept[] = [
  { id: "fm-c1", text: "motion.div wraps HTML elements to add declarative animation via props", keywords: ["motion", "motion div", "declarative", "animate prop"], difficulty: 2, weight: 1.5, aiGenerated: true, order: 1 },
  { id: "fm-c2", text: "AnimatePresence enables exit animations for components being removed from the DOM", keywords: ["animatepresence", "exit", "unmount", "leave animation"], difficulty: 3, weight: 2, aiGenerated: true, order: 2 },
  { id: "fm-c3", text: "Spring physics provide natural-feeling motion using stiffness and damping values", keywords: ["spring", "stiffness", "damping", "physics", "natural"], difficulty: 3, weight: 1.5, aiGenerated: true, order: 3 },
  { id: "fm-c4", text: "The layout prop animates automatic layout changes like width, height, and position", keywords: ["layout", "auto-animate", "layout animation", "reflow"], difficulty: 2, weight: 1, aiGenerated: true, order: 4 },
];

const MOCK_NOTES: Note[] = [
  {
    id: "note-react-hooks",
    title: "React Hooks — Study Notes",
    subject: "React / Frontend Engineering",
    sourceType: "typed",
    tags: ["React", "Hooks", "State"],
    createdAt: new Date("2026-06-12"),
    updatedAt: new Date("2026-06-14"),
    content: `# React Hooks

## useState
- Returns [value, setter] tuple
- Triggers re-render when setter is called
- Never mutate state directly — always use the setter
- Initialiser runs once (lazy init with function form)

## useEffect
- Runs AFTER every render by default
- Deps array = empty [] → run once on mount
- Deps array = [a, b] → run when a or b change
- Return a cleanup function to prevent memory leaks
- Common use: fetch data, set up subscriptions, timers

## useRef
- \`useRef(initial)\` → { current: initial }
- Mutations to .current don't trigger re-renders
- Best for: DOM references, mutable values safe in intervals
- Used to prevent stale closures in setInterval callbacks

## Custom Hooks
- Name must start with 'use' so React can lint rule violations
- Can call other hooks inside them
- Perfect for extracting logic shared across multiple components
- Examples: useDebounce, useLocalStorage, useOnClickOutside

## Rules of Hooks
1. Only call hooks at the top level
2. Only call hooks from React functions or custom hooks
3. Never call inside if statements, loops, or nested functions`,
    aiSummary: `React Hooks are functions that let you use state and other React features in function components. The core hooks are **useState** (local state), **useEffect** (side effects and lifecycle), **useRef** (mutable refs without re-renders), and **useMemo/useCallback** (performance memoization). The Rules of Hooks — always call at the top level, always call from React functions — exist because React relies on call order to associate state with each hook call. Custom hooks let you extract and reuse stateful logic across components without changing the component hierarchy.`,
    aiConcepts: REACT_HOOKS_CONCEPTS,
    aiCardId: undefined,
  },
  {
    id: "note-typescript-lecture",
    title: "Lecture Notes: Advanced TypeScript",
    subject: "TypeScript / Programming Languages",
    sourceType: "scan",
    tags: ["TypeScript", "Generics", "Types"],
    createdAt: new Date("2026-06-10"),
    updatedAt: new Date("2026-06-10"),
    content: `[Scanned from lecture slides — OCR extracted]

Typescr1pt Generics — Lecture 4

Generics a110w writing reusab1e, type-safe code.
Syntax: function identity<T>(arg: T): T { return arg; }

Constrained Generics:
  <T extends object> — must be an object
  <T extends Keyof U> — must be a key of U
  <T extends string | number> — union constraint

Utility Types (built-in):
  Partial<T>  — all props optional
  Required<T> — all props required
  Pick<T, K>  — subset of props
  Omit<T, K>  — exclude props
  Record<K,V> — key-value map type

Conditional Types:
  T extends U ? X : Y
  infer keyword extracts type within conditional

Mapped Types:
  { [K in keyof T]: T[K] }
  readonly, optional (+?), required (-?)

Note: check slides 12-18 for discriminated union example`,
    aiSummary: undefined,
    aiConcepts: undefined,
    aiCardId: undefined,
  },
  {
    id: "note-vite-pdf",
    title: "Vite Architecture Overview",
    subject: "Build Tools / Web Architecture",
    sourceType: "pdf",
    tags: ["Vite", "Build", "HMR"],
    createdAt: new Date("2026-06-08"),
    updatedAt: new Date("2026-06-09"),
    content: `Imported from: vite-architecture-overview.pdf

## Vite's Core Approach

Vite separates development and production into two distinct modes:

Development: Native ESM in the browser
- No bundling during development — browser loads modules directly via <script type="module">
- The dev server transforms and serves files on demand (lazy)
- HMR (Hot Module Replacement) updates only the changed module
- Dramatically faster cold starts than webpack

Production: Rollup (or Rolldown in v5+)
- Full bundle for production to optimise load time
- Tree-shaking removes dead code
- Code splitting for async routes
- CSS extraction and minification

## HMR Protocol
- Vite maintains a WebSocket connection between browser and server
- When a file changes, server sends an HMR update message
- React Fast Refresh uses HMR to hot-reload components without losing state
- Boundaries: HMR stops at module boundaries that can't accept updates

## Plugin System
- Vite plugins are Rollup plugins + Vite-specific hooks
- Hooks: config, configureServer, transform, buildStart, generateBundle
- CSS/PostCSS/Tailwind all run as transform plugins`,
    aiSummary: `Vite is a next-generation build tool that uses native ESM during development for near-instant cold starts, and Rollup (Rolldown in v5+) for optimised production builds. Its killer feature is HMR (Hot Module Replacement) — when a file changes, only that module is re-sent to the browser over a WebSocket connection, preserving application state. The plugin system extends Rollup's plugin API with Vite-specific lifecycle hooks, enabling tight integration with frameworks, CSS preprocessors, and transformers.`,
    aiConcepts: undefined,
    aiCardId: undefined,
  },
  {
    id: "note-framer-motion",
    title: "Framer Motion Cheat Sheet",
    subject: "Animation / React Libraries",
    sourceType: "typed",
    tags: ["Framer Motion", "Animation", "React"],
    createdAt: new Date("2026-06-06"),
    updatedAt: new Date("2026-06-07"),
    content: `# Framer Motion — Quick Reference

## Core Components
motion.div, motion.span, motion.button — any HTML element

## Key Props
animate  — target state
initial  — starting state
exit     — leaving state (needs AnimatePresence parent)
transition — { type, duration, ease, delay, stiffness, damping }
variants — named state presets, propagated to children

## AnimatePresence
Wrap components that may be removed from the DOM
mode="wait" — wait for exit before entering new child
mode="sync" — enter and exit simultaneously

## Spring Physics
type: "spring"
stiffness: 200-500 (higher = faster/bouncier)
damping: 20-40 (higher = less bounce)
mass: 0.5-2 (higher = more inertia)

## Gestures
whileHover, whileTap, whileDrag, whileFocus

## Layout Animation
layout prop — animates size/position changes automatically
layoutId — shared layout animation across different components
LayoutGroup — groups related layout animations

## Useful Patterns
- Stagger children: staggerChildren in parent variant
- Exit before enter: mode="wait" on AnimatePresence
- Shared element: layoutId matching between components`,
    aiSummary: `Framer Motion is a React animation library built on spring physics. Core components are \`motion.*\` wrappers for any HTML element. Animations are declared via \`initial\`, \`animate\`, and \`exit\` props. \`AnimatePresence\` is required for exit animations (components leaving the DOM). Spring physics make animations feel natural — tune \`stiffness\` and \`damping\` to control feel. The \`layout\` prop and \`layoutId\` enable automatic FLIP animations and shared element transitions between completely separate components.`,
    aiConcepts: FRAMER_CONCEPTS,
    aiCardId: "card-framer-motion",
  },
  {
    id: "note-tailwind-handwritten",
    title: "Quick Notes — Tailwind v4",
    subject: "CSS / Tailwind",
    sourceType: "image",
    tags: ["Tailwind", "CSS", "Utility"],
    createdAt: new Date("2026-06-04"),
    updatedAt: new Date("2026-06-04"),
    content: `[Handwritten note — OCR extracted, may contain errors]

tailwind v4 changes!!
- NO more tailwind.config.js - use css file now
- @import "tailwindcss" at top of main css
- css variables FIRST CLASS now (--color-primary etc)
- arbitrary values still work: pt-[20px] bg-[#0a0b10]
- container queries built-in @container

v4 upgrade notes:
- removed: bg-opacity-*, text-opacity-*
  → use bg-white/50 slash syntax instead
- @layer utilities still works same
- theme() function → use css var() instead in most cases

performance:
- oxide engine (lightning CSS)  → way faster builds
- no js config parse overhead
- css-first = better editor support??

TODO: test with vite plugin → @tailwindcss/vite`,
    aiSummary: undefined,
    aiConcepts: undefined,
    aiCardId: undefined,
  },
  {
    id: "note-react-patterns",
    title: "React Architecture Patterns",
    subject: "React / Software Architecture",
    sourceType: "import",
    tags: ["React", "Patterns", "Architecture"],
    createdAt: new Date("2026-06-02"),
    updatedAt: new Date("2026-06-03"),
    content: `## Compound Components
Parent controls shared state; children are exposed as static properties.
Example: <Tabs>, <Tabs.Tab>, <Tabs.Panel>
Use Context to share state without prop drilling through JSX nesting.

## Render Props
Pass a function as a prop that returns JSX.
Enables flexible UI injection into reusable logic containers.
Largely superseded by hooks but still used in some libraries.

## Higher-Order Components (HOCs)
Function that takes a component, returns an enhanced component.
withAuth(Component) → adds authentication check + redirect.
Good for cross-cutting concerns. Hooks are usually cleaner.

## Context + Reducer Pattern
Combine useReducer with Context for predictable state updates.
Action objects + dispatch → mimics Redux without the library.
Best for: global UI state (theme, auth, cart) shared widely.

## Suspense + Error Boundaries
Suspense: declarative loading state for async data/imports.
Error Boundaries: class components that catch rendering errors.
Together: wrap lazy-loaded routes for graceful loading UX.

## Module Pattern for Stores
Module-level variables + pub/sub listener set = singleton store.
No external state library needed for many use cases.
P1 uses this for cardsStore, groupsStore, notesStore.`,
    aiSummary: `React architecture patterns address state sharing, code reuse, and side-effect management at scale. Compound components use Context to share state among co-located children without prop drilling. Higher-Order Components and Render Props are older composition patterns largely replaced by hooks. The Context + Reducer pattern provides Redux-like predictability without dependencies. The module-level singleton pattern (used throughout P1) achieves shared state without React state libraries — a module variable persists across renders, and a listener set enables subscription-based re-renders.`,
    aiConcepts: undefined,
    aiCardId: undefined,
  },
];

// ── Singleton store ───────────────────────────────────────────────

let _notes: Note[] = [...MOCK_NOTES];
const _listeners = new Set<() => void>();
function _notify() { _listeners.forEach(l => l()); }

// ── Hook ─────────────────────────────────────────────────────────

export function useNotesStore() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const l = () => rerender(n => n + 1);
    _listeners.add(l);
    return () => { _listeners.delete(l); };
  }, []);

  function getNote(id: string): Note | undefined {
    return _notes.find(n => n.id === id);
  }

  function addNote(note: Omit<Note, "id" | "createdAt" | "updatedAt">): Note {
    const now = new Date();
    const newNote: Note = { ...note, id: `note-${Date.now()}`, createdAt: now, updatedAt: now };
    _notes = [newNote, ..._notes];
    _notify();
    return newNote;
  }

  function updateNote(id: string, patch: Partial<Note>): void {
    _notes = _notes.map(n => n.id !== id ? n : { ...n, ...patch, updatedAt: new Date() });
    _notify();
  }

  function deleteNote(id: string): void {
    _notes = _notes.filter(n => n.id !== id);
    _notify();
  }

  function setAISummary(id: string, summary: string): void {
    updateNote(id, { aiSummary: summary });
  }

  function setAIConcepts(id: string, concepts: Concept[]): void {
    updateNote(id, { aiConcepts: concepts });
  }

  function setAICardId(id: string, cardId: string): void {
    updateNote(id, { aiCardId: cardId });
  }

  function setAIGeneratedContent(id: string, content: string): void {
    updateNote(id, { aiGeneratedContent: content });
  }

  function setSubject(id: string, subject: string): void {
    updateNote(id, { subject });
  }

  function setVoiceTranscript(id: string, transcript: string): void {
    updateNote(id, { voiceTranscript: transcript, hasVoice: true, sourceType: "voice" });
  }

  function setAudioData(id: string, data: { audioUrl: string; duration: number }): void {
    updateNote(id, { audioUrl: data.audioUrl, duration: data.duration, hasVoice: true });
  }

  return {
    notes: _notes, getNote, addNote, updateNote, deleteNote,
    setAISummary, setAIConcepts, setAICardId,
    setAIGeneratedContent, setSubject, setVoiceTranscript, setAudioData,
  };
}

export type NotesStore = ReturnType<typeof useNotesStore>;
