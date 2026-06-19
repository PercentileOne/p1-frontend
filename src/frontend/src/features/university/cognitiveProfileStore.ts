/* ══════════════════════════════════════════════════════════════
   COGNITIVE PROFILE STORE — Phase 11
   Per-student academic intelligence metrics.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────

export interface TimelineEntry {
  date:      string; // ISO
  type:      "study" | "mock" | "lesson" | "homework";
  subjectId: string;
  topicId:   string;
  score?:    number;
  timeUsed?: number; // seconds
}

export interface CognitiveProfile {
  studentId:            string;
  studyStreak:          number;
  deepWorkSessions:     number;    // sessions > 25 min
  averageSessionLength: number;    // minutes
  totalStudyHours:      number;
  mockExamScores:       { subjectId: string; score: number; date: string }[];
  conceptMastery:       { subjectId: string; mastery: number }[];
  weakAreas:            { subjectId: string; topicId: string; title: string }[];
  strongAreas:          { subjectId: string; topicId: string; title: string }[];
  semesterTimeline:     TimelineEntry[];
  consistencyScore:     number;   // 0–100
  improvementRate:      number;   // percentage points per week, e.g. +2.3
}

// ── Deterministic mock generator ────────────────────────────────
// Produces stable profiles keyed on studentId so they don't flicker.

function seedNum(studentId: string, salt: string, min: number, max: number): number {
  let h = 0;
  const str = studentId + salt;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return min + (h % (max - min + 1));
}

const SUBJECTS = ["subj-cs", "subj-maths", "subj-biology", "subj-english"];
const SUBJECT_LABELS: Record<string, string> = {
  "subj-cs":      "Computer Science",
  "subj-maths":   "Mathematics",
  "subj-biology": "Biology",
  "subj-english": "English",
};
const TOPICS: Record<string, { id: string; title: string }[]> = {
  "subj-cs":      [{ id: "cs-t1", title: "Algorithms" }, { id: "cs-t2", title: "Data Structures" }, { id: "cs-t5", title: "Number Systems" }],
  "subj-maths":   [{ id: "mt-t1", title: "Algebra" }, { id: "mt-t2", title: "Quadratics" }, { id: "mt-t3", title: "Geometry" }],
  "subj-biology": [{ id: "bi-t1", title: "Cell Biology" }, { id: "bi-t2", title: "Genetics" }],
  "subj-english": [{ id: "en-t1", title: "Language Analysis" }, { id: "en-t2", title: "Literature" }],
};

function generateTimeline(studentId: string): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const types: TimelineEntry["type"][] = ["study", "mock", "lesson", "homework"];
  const now = Date.now();
  for (let i = 0; i < 60; i++) {
    const daysAgo = seedNum(studentId, `day${i}`, 0, 120);
    const type    = types[seedNum(studentId, `type${i}`, 0, 3)];
    const subjIdx = seedNum(studentId, `subj${i}`, 0, SUBJECTS.length - 1);
    const subjId  = SUBJECTS[subjIdx];
    const topicArr = TOPICS[subjId] ?? [];
    const topicIdx = seedNum(studentId, `topic${i}`, 0, Math.max(0, topicArr.length - 1));
    entries.push({
      date:      new Date(now - daysAgo * 86400000).toISOString(),
      type,
      subjectId: subjId,
      topicId:   topicArr[topicIdx]?.id ?? "t0",
      score:     type === "mock" ? seedNum(studentId, `score${i}`, 40, 97) : undefined,
      timeUsed:  type === "study" ? seedNum(studentId, `time${i}`, 600, 3600) : undefined,
    });
  }
  return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function generateProfile(studentId: string): CognitiveProfile {
  const s = (salt: string, min: number, max: number) => seedNum(studentId, salt, min, max);

  const mockExamScores = SUBJECTS.map((subjectId, i) => ({
    subjectId,
    score: s(`mock${i}`, 42, 98),
    date:  new Date(Date.now() - s(`mockd${i}`, 3, 30) * 86400000).toISOString(),
  }));

  const conceptMastery = SUBJECTS.map((subjectId, i) => ({
    subjectId,
    mastery: s(`mast${i}`, 35, 95),
  }));

  const weakAreas: CognitiveProfile["weakAreas"] = [];
  const strongAreas: CognitiveProfile["strongAreas"] = [];
  for (const subjectId of SUBJECTS) {
    const mastery = conceptMastery.find(m => m.subjectId === subjectId)?.mastery ?? 50;
    const topics  = TOPICS[subjectId] ?? [];
    if (mastery < 55 && topics.length > 0) {
      weakAreas.push({ subjectId, topicId: topics[0].id, title: topics[0].title });
    } else if (mastery >= 70 && topics.length > 0) {
      strongAreas.push({ subjectId, topicId: topics[0].id, title: topics[0].title });
    }
  }

  return {
    studentId,
    studyStreak:          s("streak",  3,  42),
    deepWorkSessions:     s("deep",    8,  80),
    averageSessionLength: s("sesslen", 18, 52),
    totalStudyHours:      s("hours",   40, 280),
    mockExamScores,
    conceptMastery,
    weakAreas,
    strongAreas,
    semesterTimeline:     generateTimeline(studentId),
    consistencyScore:     s("cons",    48, 97),
    improvementRate:      (s("imp", 0, 40) - 5) / 10, // -0.5 to +3.5 %/week
  };
}

// ── Singleton ──────────────────────────────────────────────────────

const _cache = new Map<string, CognitiveProfile>();
const _listeners = new Set<() => void>();

export function getCognitiveProfile(studentId: string): CognitiveProfile {
  if (!_cache.has(studentId)) _cache.set(studentId, generateProfile(studentId));
  return _cache.get(studentId)!;
}

export function useCognitiveProfileStore() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const sync = () => rerender(n => n + 1);
    _listeners.add(sync);
    return () => { _listeners.delete(sync); };
  }, []);
  return { getCognitiveProfile };
}

export { SUBJECT_LABELS, SUBJECTS, TOPICS };
export type CognitiveProfileStore = ReturnType<typeof useCognitiveProfileStore>;
