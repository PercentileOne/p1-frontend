/* ══════════════════════════════════════════════════════════════
   HEATMAP ENGINE — Phase 10B
   Computes student × topic readiness matrix for classroom view.
   Mock scores — swap for live student data in Phase 11.
   ══════════════════════════════════════════════════════════════ */

import type { Class, StudentRef } from "./teacherStore";

// ── Types ──────────────────────────────────────────────────────────

export interface TopicEntry {
  topicId: string;
  title:   string;
}

export interface HeatmapCell {
  studentId: string;
  topicId:   string;
  score:     number; // 0–100
}

export interface HeatmapResult {
  topics:       TopicEntry[];
  students:     StudentRef[];
  cells:        HeatmapCell[];
  topicAverage: Record<string, number>;
  studentAvg:   Record<string, number>;
  classAverage: number;
}

// ── Topic definitions per subject ────────────────────────────────

const SUBJECT_TOPICS: Record<string, TopicEntry[]> = {
  "subj-cs": [
    { topicId: "cs-t1",  title: "Algorithms"         },
    { topicId: "cs-t2",  title: "Data Structures"    },
    { topicId: "cs-t3",  title: "Networks"            },
    { topicId: "cs-t4",  title: "Databases"           },
    { topicId: "cs-t5",  title: "Number Systems"     },
    { topicId: "cs-t6",  title: "Programming"        },
  ],
  "subj-maths": [
    { topicId: "maths-t1", title: "Algebra"           },
    { topicId: "maths-t2", title: "Quadratics"        },
    { topicId: "maths-t3", title: "Geometry"          },
    { topicId: "maths-t4", title: "Statistics"        },
    { topicId: "maths-t5", title: "Trigonometry"      },
  ],
  "subj-biology": [
    { topicId: "bio-t1",   title: "Cell Biology"      },
    { topicId: "bio-t2",   title: "Genetics"          },
    { topicId: "bio-t3",   title: "Ecology"           },
    { topicId: "bio-t4",   title: "Physiology"        },
  ],
  "subj-english": [
    { topicId: "eng-t1",   title: "Language Analysis" },
    { topicId: "eng-t2",   title: "Literature"        },
    { topicId: "eng-t3",   title: "Writing Skills"    },
    { topicId: "eng-t4",   title: "Poetry"            },
  ],
};

const DEFAULT_TOPICS: TopicEntry[] = [
  { topicId: "t1", title: "Topic 1" },
  { topicId: "t2", title: "Topic 2" },
  { topicId: "t3", title: "Topic 3" },
];

// ── Mock score generator (seeded from studentId + topicId) ───────
// Deterministic so the heatmap doesn't flicker on re-renders.

function seededScore(studentId: string, topicId: string): number {
  let h = 0;
  const str = studentId + topicId;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  // Map to 20–95 range with realistic spread
  return 20 + (h % 76);
}

// ── Main compute ─────────────────────────────────────────────────

export function computeClassHeatmap(cls: Class): HeatmapResult {
  const topics   = SUBJECT_TOPICS[cls.subjectId] ?? DEFAULT_TOPICS;
  const students = cls.students;

  const cells: HeatmapCell[] = [];
  for (const student of students) {
    for (const topic of topics) {
      cells.push({
        studentId: student.studentId,
        topicId:   topic.topicId,
        score:     seededScore(student.studentId, topic.topicId),
      });
    }
  }

  // Per-topic averages
  const topicAverage: Record<string, number> = {};
  for (const topic of topics) {
    const topicCells = cells.filter(c => c.topicId === topic.topicId);
    topicAverage[topic.topicId] = Math.round(
      topicCells.reduce((s, c) => s + c.score, 0) / topicCells.length
    );
  }

  // Per-student averages
  const studentAvg: Record<string, number> = {};
  for (const student of students) {
    const sCells = cells.filter(c => c.studentId === student.studentId);
    studentAvg[student.studentId] = Math.round(
      sCells.reduce((s, c) => s + c.score, 0) / sCells.length
    );
  }

  const classAverage = Math.round(
    cells.reduce((s, c) => s + c.score, 0) / cells.length
  );

  return { topics, students, cells, topicAverage, studentAvg, classAverage };
}

// ── Colour helper (used by heatmap UI) ────────────────────────────

export function heatColor(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 55) return "bg-amber-400";
  if (score >= 35) return "bg-orange-500";
  return "bg-red-500";
}

export function heatTextColor(score: number): string {
  if (score >= 75) return "text-emerald-400";
  if (score >= 55) return "text-amber-400";
  if (score >= 35) return "text-orange-400";
  return "text-red-400";
}
