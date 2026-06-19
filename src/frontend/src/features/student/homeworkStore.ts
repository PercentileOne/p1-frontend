/* ══════════════════════════════════════════════════════════════
   HOMEWORK STORE — Phase 9 Student Edition
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import type { Concept } from "../cards/types";

// ── Types ──────────────────────────────────────────────────────────

export interface HomeworkItem {
  id:          string;
  subjectId:   string;
  topicId:     string;
  subtopicId:  string;
  title:       string;
  rawText:     string;
  aiSummary?:  string;
  aiConcepts?: Concept[];
  cardId?:     string;
  completed:   boolean;
  dueDate:     Date | null;
  createdAt:   Date;
}

// ── Mock seed ──────────────────────────────────────────────────────

const SEED: HomeworkItem[] = [
  {
    id:         "hw-001",
    subjectId:  "subj-maths",
    topicId:    "maths-t1",
    subtopicId: "maths-t1-s2",
    title:      "Quadratic Equations — Ex 3.4 Q1–10",
    rawText:    "Solve each of the following quadratic equations by factorisation, completing the square, and the quadratic formula. Show all working. Q1: x² + 5x + 6 = 0. Q2: 2x² - 7x + 3 = 0. Q3: x² - 9 = 0...",
    aiSummary:  "Practice solving quadratic equations using three methods: factorisation, completing the square, and the quadratic formula. Key skill: recognising which method is most efficient for each form.",
    aiConcepts: [
      { id: "hw-001-c1", text: "Factorisation finds roots by writing quadratic as product of two brackets", keywords: ["factorisation","roots","brackets","product"], difficulty: 2, weight: 1.2, aiGenerated: true, order: 1 },
      { id: "hw-001-c2", text: "Completing the square reveals vertex form and solves non-factorisable quadratics", keywords: ["completing","square","vertex","form"], difficulty: 3, weight: 1.4, aiGenerated: true, order: 2 },
      { id: "hw-001-c3", text: "Quadratic formula x = (−b ± √(b²−4ac)) / 2a always works", keywords: ["quadratic","formula","discriminant","b squared"], difficulty: 2, weight: 1.0, aiGenerated: true, order: 3 },
    ],
    cardId:    "card-react-hooks",
    completed:  false,
    dueDate:   new Date(Date.now() + 2 * 86400000),
    createdAt: new Date(Date.now() - 1 * 86400000),
  },
  {
    id:         "hw-002",
    subjectId:  "subj-english",
    topicId:    "eng-t1",
    subtopicId: "eng-t1-s2",
    title:      "Macbeth Act 1 Scene 7 — Close Reading",
    rawText:    "Read Act 1 Scene 7 and annotate for: 1) Language techniques Shakespeare uses to show Macbeth's ambivalence. 2) How Lady Macbeth manipulates Macbeth. 3) Key quotes with effect analysis.",
    aiSummary:  "Close reading exercise on Macbeth's soliloquy and Lady Macbeth's manipulation in Act 1 Sc 7. Focus on dramatic irony, persuasive language, and characterisation.",
    aiConcepts: [
      { id: "hw-002-c1", text: "Macbeth's soliloquy reveals his moral conflict through extended metaphor", keywords: ["soliloquy","moral","conflict","extended metaphor"], difficulty: 3, weight: 1.2, aiGenerated: true, order: 1 },
      { id: "hw-002-c2", text: "Lady Macbeth questions Macbeth's masculinity to override his conscience", keywords: ["Lady Macbeth","masculinity","conscience","manipulation"], difficulty: 3, weight: 1.3, aiGenerated: true, order: 2 },
    ],
    completed:  true,
    dueDate:   new Date(Date.now() - 1 * 86400000),
    createdAt: new Date(Date.now() - 3 * 86400000),
  },
  {
    id:         "hw-003",
    subjectId:  "subj-biology",
    topicId:    "bio-t1",
    subtopicId: "bio-t1-s2",
    title:      "Transport in Cells — Revision Questions",
    rawText:    "Answer the following: 1) Define osmosis. 2) Explain the difference between active transport and diffusion. 3) Draw and label a diagram showing the movement of water molecules across a partially permeable membrane.",
    completed:  false,
    dueDate:   new Date(Date.now() + 4 * 86400000),
    createdAt: new Date(Date.now() - 2 * 86400000),
  },
];

// ── Store singleton ────────────────────────────────────────────────

let _homework: HomeworkItem[] = [...SEED];
const _listeners = new Set<() => void>();
function _notify() { _listeners.forEach(l => l()); }

export function addHomework(item: Omit<HomeworkItem, "id" | "createdAt">): HomeworkItem {
  const next: HomeworkItem = {
    ...item,
    id:        `hw-${Date.now()}`,
    createdAt: new Date(),
  };
  _homework = [next, ..._homework];
  _notify();
  return next;
}

export function toggleComplete(id: string): void {
  _homework = _homework.map(h => h.id === id ? { ...h, completed: !h.completed } : h);
  _notify();
}

export function useHomeworkStore() {
  const [homework, setHomework] = useState(_homework);

  useEffect(() => {
    const sync = () => setHomework([..._homework]);
    _listeners.add(sync);
    return () => { _listeners.delete(sync); };
  }, []);

  return { homework, addHomework, toggleComplete };
}

export type HomeworkStore = ReturnType<typeof useHomeworkStore>;
