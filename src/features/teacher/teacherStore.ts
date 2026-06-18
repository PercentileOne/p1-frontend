/* ══════════════════════════════════════════════════════════════
   TEACHER STORE — Phase 10B
   Class management, assignments, submissions. Local simulation.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────

export interface StudentRef {
  studentId: string;
  name:      string;
  avatar:    string; // initials fallback
  accent:    string; // tailwind bg class
}

export interface Submission {
  studentId:    string;
  submittedAt:  Date;
  score?:       number;
  conceptsHit?: number;
  timeUsed?:    number; // seconds
  reviewed:     boolean;
}

export interface Assignment {
  id:          string;
  title:       string;
  description: string;
  cardId?:     string;
  sourceType:  "card" | "topic" | "subtopic" | "lesson" | "custom";
  dueDate:     Date;
  createdAt:   Date;
  submissions: Submission[];
}

export interface Lesson {
  id:          string;
  title:       string;
  rawText:     string;
  summary?:    string;
  concepts?:   string[];
  cardId?:     string;
  createdAt:   Date;
}

export interface Class {
  id:          string;
  name:        string;
  subjectId:   string;
  year:        string;
  students:    StudentRef[];
  assignments: Assignment[];
  lessons:     Lesson[];
}

export interface TeacherProfile {
  id:      string;
  name:    string;
  school:  string;
  classes: Class[];
}

// ── Mock seed ──────────────────────────────────────────────────────

const MOCK_STUDENTS_10A: StudentRef[] = [
  { studentId: "s-001", name: "Aisha Patel",    avatar: "AP", accent: "bg-violet-500" },
  { studentId: "s-002", name: "Ben Clarke",     avatar: "BC", accent: "bg-indigo-500" },
  { studentId: "s-003", name: "Chloe Davies",   avatar: "CD", accent: "bg-sky-500"    },
  { studentId: "s-004", name: "Daniel Osei",    avatar: "DO", accent: "bg-emerald-500"},
  { studentId: "s-005", name: "Emma Thompson",  avatar: "ET", accent: "bg-rose-500"   },
  { studentId: "s-006", name: "Femi Adeyemi",   avatar: "FA", accent: "bg-amber-500"  },
  { studentId: "s-007", name: "Grace Li",       avatar: "GL", accent: "bg-teal-500"   },
  { studentId: "s-008", name: "Hassan Al-Farouk", avatar: "HA", accent: "bg-orange-500" },
];

const MOCK_STUDENTS_11B: StudentRef[] = [
  { studentId: "s-009", name: "Isla Stewart",   avatar: "IS", accent: "bg-pink-500"   },
  { studentId: "s-010", name: "Jake Morris",    avatar: "JM", accent: "bg-indigo-500" },
  { studentId: "s-011", name: "Kira Novak",     avatar: "KN", accent: "bg-cyan-500"   },
  { studentId: "s-012", name: "Liam Walker",    avatar: "LW", accent: "bg-lime-500"   },
  { studentId: "s-013", name: "Maya Singh",     avatar: "MS", accent: "bg-fuchsia-500"},
  { studentId: "s-014", name: "Noah Kim",       avatar: "NK", accent: "bg-blue-500"   },
];

function makeSubmissions(students: StudentRef[], _cutDays = 2): Submission[] {
  return students.slice(0, Math.ceil(students.length * 0.65)).map((s, i) => ({
    studentId:   s.studentId,
    submittedAt: new Date(Date.now() - (i + 1) * 3600000),
    score:       Math.round(50 + Math.random() * 45),
    conceptsHit: Math.round(2 + Math.random() * 5),
    timeUsed:    Math.round(600 + Math.random() * 1200),
    reviewed:    i < 2,
  }));
}

const SEED_PROFILE: TeacherProfile = {
  id:     "teacher-001",
  name:   "Mr. Reeves",
  school: "Westfield Academy",
  classes: [
    {
      id:        "class-10a",
      name:      "10A — Computer Science",
      subjectId: "subj-cs",
      year:      "Year 10",
      students:  MOCK_STUDENTS_10A,
      assignments: [
        {
          id:          "asgn-001",
          title:       "Binary & Hexadecimal",
          description: "Convert between number systems. Show working.",
          sourceType:  "topic",
          dueDate:     new Date(Date.now() + 3 * 86400000),
          createdAt:   new Date(Date.now() - 7 * 86400000),
          submissions: makeSubmissions(MOCK_STUDENTS_10A),
        },
        {
          id:          "asgn-002",
          title:       "Algorithms Practice",
          description: "Trace through bubble sort and merge sort.",
          sourceType:  "subtopic",
          dueDate:     new Date(Date.now() + 10 * 86400000),
          createdAt:   new Date(Date.now() - 2 * 86400000),
          submissions: [],
        },
      ],
      lessons: [
        {
          id:       "lesson-001",
          title:    "Intro to Algorithms",
          rawText:  "Today we covered sorting algorithms: bubble sort O(n²), merge sort O(n log n), insertion sort. Students traced through examples on the board.",
          summary:  "Introduction to sorting algorithms — complexity, comparison, trace-throughs.",
          concepts: ["bubble sort", "merge sort", "time complexity", "O(n²)", "O(n log n)"],
          createdAt: new Date(Date.now() - 86400000),
        },
        {
          id:       "lesson-002",
          title:    "Binary Number Systems",
          rawText:  "Covered binary, denary, hexadecimal conversions. Students completed worksheet on converting 8-bit numbers.",
          summary:  "Binary, denary and hexadecimal number system conversions.",
          concepts: ["binary", "hexadecimal", "denary", "8-bit", "conversion"],
          createdAt: new Date(Date.now() - 2 * 86400000),
        },
      ],
    },
    {
      id:        "class-11b",
      name:      "11B — Mathematics",
      subjectId: "subj-maths",
      year:      "Year 11",
      students:  MOCK_STUDENTS_11B,
      assignments: [
        {
          id:          "asgn-003",
          title:       "Quadratic Equations Exam Prep",
          description: "Complete past paper Q1–Q5. Show all working.",
          sourceType:  "custom",
          dueDate:     new Date(Date.now() + 5 * 86400000),
          createdAt:   new Date(Date.now() - 3 * 86400000),
          submissions: makeSubmissions(MOCK_STUDENTS_11B),
        },
      ],
      lessons: [
        {
          id:       "lesson-003",
          title:    "Completing the Square",
          rawText:  "Covered completing the square method for solving quadratics. ax² + bx + c form. Students practised with 6 examples.",
          summary:  "Completing the square — derivation, method, and exam technique.",
          concepts: ["completing the square", "quadratic formula", "vertex form", "discriminant"],
          createdAt: new Date(),
        },
      ],
    },
  ],
};

// ── Singleton ──────────────────────────────────────────────────────

let _profile: TeacherProfile = JSON.parse(JSON.stringify(SEED_PROFILE, (_k, v) =>
  v instanceof Date ? v.toISOString() : v
));

// Re-hydrate dates
function hydrate(p: TeacherProfile): TeacherProfile {
  return {
    ...p,
    classes: p.classes.map(c => ({
      ...c,
      lessons: c.lessons.map(l => ({ ...l, createdAt: new Date(l.createdAt) })),
      assignments: c.assignments.map(a => ({
        ...a,
        dueDate:   new Date(a.dueDate),
        createdAt: new Date(a.createdAt),
        submissions: a.submissions.map(s => ({ ...s, submittedAt: new Date(s.submittedAt) })),
      })),
    })),
  };
}

_profile = hydrate(_profile);

const _listeners = new Set<() => void>();
function _notify() { _listeners.forEach(l => l()); }

// ── Mutations ──────────────────────────────────────────────────────

export function addClass(cls: Omit<Class, "id" | "assignments" | "lessons">): Class {
  const next: Class = { ...cls, id: `class-${Date.now()}`, assignments: [], lessons: [] };
  _profile = { ..._profile, classes: [..._profile.classes, next] };
  _notify();
  return next;
}

export function addAssignment(classId: string, asgn: Omit<Assignment, "id" | "createdAt" | "submissions">): Assignment {
  const next: Assignment = { ...asgn, id: `asgn-${Date.now()}`, createdAt: new Date(), submissions: [] };
  _profile = {
    ..._profile,
    classes: _profile.classes.map(c =>
      c.id === classId ? { ...c, assignments: [...c.assignments, next] } : c
    ),
  };
  _notify();
  return next;
}

export function addLesson(classId: string, lesson: Omit<Lesson, "id" | "createdAt">): Lesson {
  const next: Lesson = { ...lesson, id: `lesson-${Date.now()}`, createdAt: new Date() };
  _profile = {
    ..._profile,
    classes: _profile.classes.map(c =>
      c.id === classId ? { ...c, lessons: [...c.lessons, next] } : c
    ),
  };
  _notify();
  return next;
}

export function markSubmissionReviewed(classId: string, assignmentId: string, studentId: string): void {
  _profile = {
    ..._profile,
    classes: _profile.classes.map(c =>
      c.id !== classId ? c : {
        ...c,
        assignments: c.assignments.map(a =>
          a.id !== assignmentId ? a : {
            ...a,
            submissions: a.submissions.map(s =>
              s.studentId === studentId ? { ...s, reviewed: true } : s
            ),
          }
        ),
      }
    ),
  };
  _notify();
}

// ── Hook ──────────────────────────────────────────────────────────

export function useTeacherStore() {
  const [profile, setProfile] = useState(_profile);
  useEffect(() => {
    const sync = () => setProfile({ ..._profile });
    _listeners.add(sync);
    return () => { _listeners.delete(sync); };
  }, []);
  return { profile, addClass, addAssignment, addLesson, markSubmissionReviewed };
}

export type TeacherStore = ReturnType<typeof useTeacherStore>;