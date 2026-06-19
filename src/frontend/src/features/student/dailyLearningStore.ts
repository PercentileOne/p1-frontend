/* ══════════════════════════════════════════════════════════════
   DAILY LEARNING STORE — Phase 9 Student Edition
   "What I Learned Today" log entries
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import type { Concept } from "../cards/types";

// ── Types ──────────────────────────────────────────────────────────

export interface DailyLearningEntry {
  id:          string;
  date:        Date;
  subjectId:   string;
  subjectName: string;
  topicId:     string;
  topicTitle:  string;
  rawNotes:    string;
  summary:     string;
  concepts:    Concept[];
  cardId?:     string;
  mood:        "great" | "okay" | "hard";
}

// ── Mock seed ──────────────────────────────────────────────────────

const SEED: DailyLearningEntry[] = [
  {
    id:          "dl-001",
    date:        new Date(Date.now() - 1 * 86400000),
    subjectId:   "subj-cs",
    subjectName: "Computer Science",
    topicId:     "cs-t1",
    topicTitle:  "Programming Fundamentals",
    rawNotes:    "Today we looked at functions in Python. Functions use def keyword. They take parameters and return values. Learned about scope — local vs global variables.",
    summary:     "Introduction to functions in Python: definition with def, parameters, return values, and variable scope (local vs global). Functions allow code reuse and modular design.",
    concepts: [
      { id: "dl-001-c1", text: "Functions defined with def keyword accept parameters and return values", keywords: ["def","parameters","return","function"], difficulty: 2, weight: 1.0, aiGenerated: true, order: 1 },
      { id: "dl-001-c2", text: "Local variables exist only inside a function; global variables are accessible everywhere", keywords: ["local","global","scope","variable"], difficulty: 3, weight: 1.2, aiGenerated: true, order: 2 },
    ],
    cardId: "card-typescript-generics",
    mood:   "great",
  },
  {
    id:          "dl-002",
    date:        new Date(Date.now() - 2 * 86400000),
    subjectId:   "subj-biology",
    subjectName: "Biology",
    topicId:     "bio-t1",
    topicTitle:  "Cell Biology",
    rawNotes:    "Covered mitosis today. 4 stages: prophase, metaphase, anaphase, telophase. Chromosomes condense in prophase, line up in metaphase, separate in anaphase, cell divides in telophase.",
    summary:     "Mitosis is cell division producing two genetically identical daughter cells. Four stages: Prophase (condensation), Metaphase (alignment), Anaphase (separation), Telophase (division).",
    concepts: [
      { id: "dl-002-c1", text: "Mitosis produces two genetically identical daughter cells from one parent cell", keywords: ["mitosis","identical","daughter","division"], difficulty: 2, weight: 1.0, aiGenerated: true, order: 1 },
      { id: "dl-002-c2", text: "PMAT: Prophase, Metaphase, Anaphase, Telophase are the four stages of mitosis", keywords: ["PMAT","prophase","metaphase","anaphase","telophase"], difficulty: 3, weight: 1.3, aiGenerated: true, order: 2 },
    ],
    mood: "okay",
  },
  {
    id:          "dl-003",
    date:        new Date(Date.now() - 4 * 86400000),
    subjectId:   "subj-maths",
    subjectName: "Mathematics",
    topicId:     "maths-t1",
    topicTitle:  "Number & Algebra",
    rawNotes:    "Really struggled with surds today. Rationalising the denominator makes no sense to me. Will need to do more practice.",
    summary:     "Introduction to surds and rationalising the denominator. Multiply numerator and denominator by the surd to remove irrational numbers from the denominator.",
    concepts: [
      { id: "dl-003-c1", text: "Surds are irrational numbers expressed as roots that cannot be simplified", keywords: ["surd","irrational","root","simplify"], difficulty: 3, weight: 1.2, aiGenerated: true, order: 1 },
      { id: "dl-003-c2", text: "Rationalise the denominator by multiplying top and bottom by the conjugate surd", keywords: ["rationalise","denominator","conjugate","multiply"], difficulty: 4, weight: 1.4, aiGenerated: true, order: 2 },
    ],
    mood: "hard",
  },
];

// ── Store singleton ────────────────────────────────────────────────

let _entries: DailyLearningEntry[] = [...SEED];
const _listeners = new Set<() => void>();
function _notify() { _listeners.forEach(l => l()); }

export function addDailyEntry(entry: Omit<DailyLearningEntry, "id">): DailyLearningEntry {
  const next: DailyLearningEntry = { ...entry, id: `dl-${Date.now()}` };
  _entries = [next, ..._entries];
  _notify();
  return next;
}

export function useDailyLearningStore() {
  const [entries, setEntries] = useState(_entries);

  useEffect(() => {
    const sync = () => setEntries([..._entries]);
    _listeners.add(sync);
    return () => { _listeners.delete(sync); };
  }, []);

  return { entries, addDailyEntry };
}

export type DailyLearningStore = ReturnType<typeof useDailyLearningStore>;
