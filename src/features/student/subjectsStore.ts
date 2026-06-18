/* ══════════════════════════════════════════════════════════════
   SUBJECTS STORE — Phase 9 Student Edition
   GCSE / A-Level subject packs with topics, subtopics, readiness
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────

export type ExamBoard = "AQA" | "Edexcel" | "OCR" | "WJEC" | "None";

export interface Subtopic {
  id:             string;
  title:          string;
  cardIds:        string[];
  readinessScore: number;   // 0–100
  lastStudied:    Date | null;
}

export interface Topic {
  id:        string;
  title:     string;
  subtopics: Subtopic[];
}

export interface Subject {
  id:          string;
  name:        string;
  examBoard:   ExamBoard;
  color:       string;
  emoji:       string;
  level:       "GCSE" | "A-Level";
  examDate:    Date | null;
  topics:      Topic[];
}

// ── Mock seed ──────────────────────────────────────────────────────

const SEED: Subject[] = [
  {
    id:        "subj-maths",
    name:      "Mathematics",
    examBoard: "AQA",
    color:     "#6366f1",
    emoji:     "📐",
    level:     "GCSE",
    examDate:  new Date("2026-06-05"),
    topics: [
      {
        id:    "maths-t1",
        title: "Number & Algebra",
        subtopics: [
          { id: "maths-t1-s1", title: "Indices & Surds",          cardIds: ["card-typescript-generics"], readinessScore: 78, lastStudied: new Date(Date.now() - 2 * 86400000) },
          { id: "maths-t1-s2", title: "Quadratic Equations",      cardIds: ["card-react-hooks"],         readinessScore: 55, lastStudied: new Date(Date.now() - 5 * 86400000) },
          { id: "maths-t1-s3", title: "Sequences & Series",       cardIds: [],                           readinessScore: 30, lastStudied: null },
        ],
      },
      {
        id:    "maths-t2",
        title: "Statistics & Probability",
        subtopics: [
          { id: "maths-t2-s1", title: "Data Representation",      cardIds: ["card-vite-hmr"],            readinessScore: 82, lastStudied: new Date(Date.now() - 1 * 86400000) },
          { id: "maths-t2-s2", title: "Probability Trees",        cardIds: [],                           readinessScore: 44, lastStudied: new Date(Date.now() - 8 * 86400000) },
          { id: "maths-t2-s3", title: "Normal Distribution",      cardIds: [],                           readinessScore: 20, lastStudied: null },
        ],
      },
      {
        id:    "maths-t3",
        title: "Geometry & Measures",
        subtopics: [
          { id: "maths-t3-s1", title: "Trigonometry",             cardIds: ["card-tailwind-v4"],         readinessScore: 67, lastStudied: new Date(Date.now() - 3 * 86400000) },
          { id: "maths-t3-s2", title: "Circle Theorems",          cardIds: [],                           readinessScore: 38, lastStudied: new Date(Date.now() - 10 * 86400000) },
          { id: "maths-t3-s3", title: "Vectors",                  cardIds: [],                           readinessScore: 25, lastStudied: null },
        ],
      },
    ],
  },

  {
    id:        "subj-english",
    name:      "English Literature",
    examBoard: "AQA",
    color:     "#f59e0b",
    emoji:     "📚",
    level:     "GCSE",
    examDate:  new Date("2026-06-10"),
    topics: [
      {
        id:    "eng-t1",
        title: "Macbeth",
        subtopics: [
          { id: "eng-t1-s1", title: "Themes of Ambition & Power", cardIds: ["card-react-components"],   readinessScore: 72, lastStudied: new Date(Date.now() - 4 * 86400000) },
          { id: "eng-t1-s2", title: "Key Quotes & Analysis",      cardIds: ["card-framer-motion"],      readinessScore: 60, lastStudied: new Date(Date.now() - 6 * 86400000) },
          { id: "eng-t1-s3", title: "Context & Jacobean Society", cardIds: [],                          readinessScore: 40, lastStudied: null },
        ],
      },
      {
        id:    "eng-t2",
        title: "Poetry Anthology",
        subtopics: [
          { id: "eng-t2-s1", title: "Power & Conflict Cluster",   cardIds: [],                          readinessScore: 55, lastStudied: new Date(Date.now() - 7 * 86400000) },
          { id: "eng-t2-s2", title: "Comparison Techniques",      cardIds: [],                          readinessScore: 48, lastStudied: new Date(Date.now() - 9 * 86400000) },
        ],
      },
      {
        id:    "eng-t3",
        title: "An Inspector Calls",
        subtopics: [
          { id: "eng-t3-s1", title: "Characters & Motivations",   cardIds: [],                          readinessScore: 65, lastStudied: new Date(Date.now() - 3 * 86400000) },
          { id: "eng-t3-s2", title: "Social & Political Context", cardIds: [],                          readinessScore: 35, lastStudied: null },
        ],
      },
    ],
  },

  {
    id:        "subj-biology",
    name:      "Biology",
    examBoard: "Edexcel",
    color:     "#10b981",
    emoji:     "🧬",
    level:     "GCSE",
    examDate:  new Date("2026-06-18"),
    topics: [
      {
        id:    "bio-t1",
        title: "Cell Biology",
        subtopics: [
          { id: "bio-t1-s1", title: "Cell Structure & Function",  cardIds: ["card-react-hooks"],        readinessScore: 85, lastStudied: new Date(Date.now() - 1 * 86400000) },
          { id: "bio-t1-s2", title: "Transport in Cells",         cardIds: [],                          readinessScore: 62, lastStudied: new Date(Date.now() - 4 * 86400000) },
          { id: "bio-t1-s3", title: "Cell Division & Mitosis",    cardIds: [],                          readinessScore: 45, lastStudied: new Date(Date.now() - 11 * 86400000) },
        ],
      },
      {
        id:    "bio-t2",
        title: "Genetics & Evolution",
        subtopics: [
          { id: "bio-t2-s1", title: "DNA Structure & Inheritance", cardIds: [],                         readinessScore: 50, lastStudied: new Date(Date.now() - 6 * 86400000) },
          { id: "bio-t2-s2", title: "Natural Selection",          cardIds: [],                          readinessScore: 70, lastStudied: new Date(Date.now() - 2 * 86400000) },
          { id: "bio-t2-s3", title: "Genetic Engineering",        cardIds: [],                          readinessScore: 28, lastStudied: null },
        ],
      },
      {
        id:    "bio-t3",
        title: "Ecology",
        subtopics: [
          { id: "bio-t3-s1", title: "Food Chains & Ecosystems",   cardIds: [],                          readinessScore: 75, lastStudied: new Date(Date.now() - 3 * 86400000) },
          { id: "bio-t3-s2", title: "Human Impact on Environment", cardIds: [],                         readinessScore: 58, lastStudied: new Date(Date.now() - 5 * 86400000) },
        ],
      },
    ],
  },

  {
    id:        "subj-cs",
    name:      "Computer Science",
    examBoard: "OCR",
    color:     "#8b5cf6",
    emoji:     "💻",
    level:     "GCSE",
    examDate:  new Date("2026-06-22"),
    topics: [
      {
        id:    "cs-t1",
        title: "Programming Fundamentals",
        subtopics: [
          { id: "cs-t1-s1", title: "Variables, Data Types & I/O", cardIds: ["card-typescript-generics"], readinessScore: 90, lastStudied: new Date(Date.now() - 1 * 86400000) },
          { id: "cs-t1-s2", title: "Selection & Iteration",       cardIds: ["card-react-hooks"],         readinessScore: 82, lastStudied: new Date(Date.now() - 2 * 86400000) },
          { id: "cs-t1-s3", title: "Functions & Subroutines",     cardIds: [],                           readinessScore: 70, lastStudied: new Date(Date.now() - 4 * 86400000) },
        ],
      },
      {
        id:    "cs-t2",
        title: "Algorithms & Data Structures",
        subtopics: [
          { id: "cs-t2-s1", title: "Sorting Algorithms",          cardIds: [],                           readinessScore: 65, lastStudied: new Date(Date.now() - 3 * 86400000) },
          { id: "cs-t2-s2", title: "Searching Algorithms",        cardIds: [],                           readinessScore: 55, lastStudied: new Date(Date.now() - 7 * 86400000) },
          { id: "cs-t2-s3", title: "Arrays & Lists",              cardIds: [],                           readinessScore: 78, lastStudied: new Date(Date.now() - 5 * 86400000) },
        ],
      },
      {
        id:    "cs-t3",
        title: "Computer Systems",
        subtopics: [
          { id: "cs-t3-s1", title: "Binary & Hexadecimal",        cardIds: ["card-vite-hmr"],            readinessScore: 88, lastStudied: new Date(Date.now() - 1 * 86400000) },
          { id: "cs-t3-s2", title: "Logic Gates & Boolean Algebra", cardIds: [],                         readinessScore: 42, lastStudied: new Date(Date.now() - 9 * 86400000) },
          { id: "cs-t3-s3", title: "Networks & The Internet",     cardIds: [],                           readinessScore: 60, lastStudied: new Date(Date.now() - 6 * 86400000) },
        ],
      },
    ],
  },
];

// ── Store singleton ────────────────────────────────────────────────

let _subjects: Subject[] = [...SEED];
const _listeners = new Set<() => void>();

function _notify() { _listeners.forEach(l => l()); }

export function getSubject(id: string): Subject | undefined {
  return _subjects.find(s => s.id === id);
}

export function updateSubtopicReadiness(subjectId: string, subtopicId: string, score: number): void {
  _subjects = _subjects.map(subj => {
    if (subj.id !== subjectId) return subj;
    return {
      ...subj,
      topics: subj.topics.map(topic => ({
        ...topic,
        subtopics: topic.subtopics.map(st =>
          st.id !== subtopicId
            ? st
            : { ...st, readinessScore: Math.min(100, Math.max(0, score)), lastStudied: new Date() }
        ),
      })),
    };
  });
  _notify();
}

export function addCardToSubtopic(subjectId: string, subtopicId: string, cardId: string): void {
  _subjects = _subjects.map(subj => {
    if (subj.id !== subjectId) return subj;
    return {
      ...subj,
      topics: subj.topics.map(topic => ({
        ...topic,
        subtopics: topic.subtopics.map(st =>
          st.id !== subtopicId || st.cardIds.includes(cardId)
            ? st
            : { ...st, cardIds: [...st.cardIds, cardId] }
        ),
      })),
    };
  });
  _notify();
}

// ── Student readiness engine ───────────────────────────────────────

export type PredictedGrade = "9" | "8" | "7" | "6" | "5" | "4" | "3" | "2" | "1" | "U";

export interface StudentReadinessResult {
  readinessScore:   number;
  predictedGrade:   PredictedGrade;
  weakSubtopics:    Subtopic[];
  strongSubtopics:  Subtopic[];
  recommendedPlan:  { subtopicId: string; title: string; priority: number }[];
  topicScores:      { topicId: string; title: string; score: number }[];
}

function scoreToGrade(score: number): PredictedGrade {
  if (score >= 93) return "9";
  if (score >= 85) return "8";
  if (score >= 76) return "7";
  if (score >= 67) return "6";
  if (score >= 58) return "5";
  if (score >= 48) return "4";
  if (score >= 38) return "3";
  if (score >= 28) return "2";
  if (score >= 18) return "1";
  return "U";
}

export function computeStudentReadiness(subjectId: string): StudentReadinessResult {
  const subject = getSubject(subjectId);
  if (!subject) return {
    readinessScore: 0, predictedGrade: "U",
    weakSubtopics: [], strongSubtopics: [], recommendedPlan: [], topicScores: [],
  };

  const allSubtopics = subject.topics.flatMap(t => t.subtopics);

  // Weight by recency
  function effectiveScore(st: Subtopic): number {
    const raw = st.readinessScore;
    if (!st.lastStudied) return raw * 0.7;
    const days = (Date.now() - st.lastStudied.getTime()) / 86400000;
    const decay = days < 1 ? 1 : days < 7 ? 0.9 : days < 14 ? 0.75 : 0.6;
    return raw * decay;
  }

  const topicScores = subject.topics.map(topic => {
    const avg = topic.subtopics.length === 0
      ? 0
      : Math.round(topic.subtopics.reduce((s, st) => s + effectiveScore(st), 0) / topic.subtopics.length);
    return { topicId: topic.id, title: topic.title, score: avg };
  });

  const readinessScore = topicScores.length === 0
    ? 0
    : Math.round(topicScores.reduce((s, t) => s + t.score, 0) / topicScores.length);

  const weakSubtopics   = allSubtopics.filter(st => effectiveScore(st) < 55).sort((a, b) => effectiveScore(a) - effectiveScore(b)).slice(0, 5);
  const strongSubtopics = allSubtopics.filter(st => effectiveScore(st) >= 75).sort((a, b) => effectiveScore(b) - effectiveScore(a)).slice(0, 4);

  const recommendedPlan = weakSubtopics.map((st, i) => ({
    subtopicId: st.id,
    title:      st.title,
    priority:   i + 1,
  }));

  return {
    readinessScore,
    predictedGrade: scoreToGrade(readinessScore),
    weakSubtopics,
    strongSubtopics,
    recommendedPlan,
    topicScores,
  };
}

// ── React hook ────────────────────────────────────────────────────

export function useSubjectsStore() {
  const [subjects, setSubjects] = useState(_subjects);

  useEffect(() => {
    const sync = () => setSubjects([..._subjects]);
    _listeners.add(sync);
    return () => { _listeners.delete(sync); };
  }, []);

  return {
    subjects,
    getSubject,
    updateSubtopicReadiness,
    addCardToSubtopic,
    computeStudentReadiness,
  };
}

export type SubjectsStore = ReturnType<typeof useSubjectsStore>;
