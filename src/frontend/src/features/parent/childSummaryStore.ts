/* ══════════════════════════════════════════════════════════════
   CHILD SUMMARY STORE — Phase 10
   Aggregates student data into a parent-readable summary.
   Reads live from student stores — no duplication.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import { computeStudentReadiness } from "../student/subjectsStore";
import type { Subject, StudentReadinessResult } from "../student/subjectsStore";
import type { DailyLearningEntry } from "../student/dailyLearningStore";
import type { HomeworkItem }       from "../student/homeworkStore";

// ── Types ──────────────────────────────────────────────────────────

export type ActivityType = "study" | "homework" | "mock" | "lesson";

export interface ActivityEntry {
  id:        string;
  date:      Date;
  type:      ActivityType;
  subjectId: string;
  topicId:   string;
  score?:    number;
  timeUsed?: number;       // seconds
  mood?:     "great" | "okay" | "hard";
}

export interface WeeklyPlan {
  focusSubjects:        string[];
  recommendedSessions:  number;
  mockExams:            number;
  weakAreas:            { subjectId: string; topicId: string; title: string }[];
  estimatedHours:       number;
}

export interface ChildSummary {
  studentId:          string;
  readinessBySubject: { subjectId: string; score: number; trend: "up" | "down" | "stable" }[];
  predictedGrades:    { subjectId: string; grade: string }[];
  weakTopics:         { subjectId: string; topicId: string; title: string; score: number }[];
  strongTopics:       { subjectId: string; topicId: string; title: string; score: number }[];
  dailyActivity:      ActivityEntry[];
  weeklyPlan:         WeeklyPlan;
  totalStudyTime:     number;   // seconds this week
  homeworkPending:    number;
  homeworkCompleted:  number;
  streak:             number;
}

// ── Mock activity seed ──────────────────────────────────────────────

const MOCK_ACTIVITY: ActivityEntry[] = [
  {
    id: "act-001", date: new Date(), type: "study",
    subjectId: "subj-cs",    topicId: "cs-t1",    score: 82, timeUsed: 900, mood: "great",
  },
  {
    id: "act-002", date: new Date(), type: "homework",
    subjectId: "subj-maths", topicId: "maths-t1", timeUsed: 1200, mood: "okay",
  },
  {
    id: "act-003", date: new Date(Date.now() - 86400000), type: "lesson",
    subjectId: "subj-biology", topicId: "bio-t1", timeUsed: 2700,
  },
  {
    id: "act-004", date: new Date(Date.now() - 86400000), type: "study",
    subjectId: "subj-english", topicId: "eng-t1", score: 61, timeUsed: 720, mood: "okay",
  },
  {
    id: "act-005", date: new Date(Date.now() - 2 * 86400000), type: "mock",
    subjectId: "subj-cs",    topicId: "cs-t2",   score: 74, timeUsed: 1800, mood: "great",
  },
  {
    id: "act-006", date: new Date(Date.now() - 2 * 86400000), type: "study",
    subjectId: "subj-maths", topicId: "maths-t2", score: 45, timeUsed: 600, mood: "hard",
  },
  {
    id: "act-007", date: new Date(Date.now() - 3 * 86400000), type: "homework",
    subjectId: "subj-english", topicId: "eng-t2", timeUsed: 900, mood: "okay",
  },
];

// ── Mock trend (simplified — in prod derived from history) ────────

const MOCK_TRENDS: Record<string, "up" | "down" | "stable"> = {
  "subj-maths":   "up",
  "subj-english": "stable",
  "subj-biology": "up",
  "subj-cs":      "up",
};

// ── Compute summary from live student data ─────────────────────────

export function computeChildSummary(
  studentId: string,
  subjects:  Subject[],
  homework:  HomeworkItem[],
  _daily:    DailyLearningEntry[],  // available for future enrichment
): ChildSummary {
  const readinessBySubject = subjects.map(subj => {
    const r = computeStudentReadiness(subj.id);
    return {
      subjectId: subj.id,
      score:     r.readinessScore,
      trend:     MOCK_TRENDS[subj.id] ?? "stable" as "up" | "down" | "stable",
    };
  });

  const predictedGrades = subjects.map(subj => {
    const r = computeStudentReadiness(subj.id);
    return { subjectId: subj.id, grade: r.predictedGrade };
  });

  // Collect weak and strong subtopics across all subjects
  const weakTopics: ChildSummary["weakTopics"]   = [];
  const strongTopics: ChildSummary["strongTopics"] = [];

  for (const subj of subjects) {
    const r: StudentReadinessResult = computeStudentReadiness(subj.id);
    for (const st of r.weakSubtopics) {
      weakTopics.push({ subjectId: subj.id, topicId: st.id, title: st.title, score: st.readinessScore });
    }
    for (const st of r.strongSubtopics) {
      strongTopics.push({ subjectId: subj.id, topicId: st.id, title: st.title, score: st.readinessScore });
    }
  }

  // Weekly plan
  const lowestSubjects = [...readinessBySubject]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(r => r.subjectId);

  const weeklyPlan: WeeklyPlan = {
    focusSubjects:       lowestSubjects,
    recommendedSessions: 5,
    mockExams:           1,
    weakAreas:           weakTopics.slice(0, 4).map(wt => ({
      subjectId: wt.subjectId,
      topicId:   wt.topicId,
      title:     wt.title,
    })),
    estimatedHours: Math.round(weakTopics.slice(0, 4).length * 1.5),
  };

  // This-week activity (last 7 days)
  const weekCutoff = Date.now() - 7 * 86400000;
  const weekActivity = MOCK_ACTIVITY.filter(a => a.date.getTime() > weekCutoff);
  const totalStudyTime = weekActivity.reduce((s, a) => s + (a.timeUsed ?? 0), 0);

  return {
    studentId,
    readinessBySubject,
    predictedGrades,
    weakTopics:       weakTopics.slice(0, 6),
    strongTopics:     strongTopics.slice(0, 5),
    dailyActivity:    MOCK_ACTIVITY,
    weeklyPlan,
    totalStudyTime,
    homeworkPending:  homework.filter(h => !h.completed).length,
    homeworkCompleted: homework.filter(h => h.completed).length,
    streak:           7,
  };
}

// ── React hook — re-derives on demand ─────────────────────────────

export function useChildSummary(
  studentId: string,
  subjects:  Subject[],
  homework:  HomeworkItem[],
  daily:     DailyLearningEntry[],
): ChildSummary {
  const [summary, setSummary] = useState<ChildSummary>(() =>
    computeChildSummary(studentId, subjects, homework, daily)
  );

  // Re-derive whenever inputs change (subjects store notifies)
  useEffect(() => {
    setSummary(computeChildSummary(studentId, subjects, homework, daily));
  }, [studentId, subjects, homework, daily]);

  return summary;
}
