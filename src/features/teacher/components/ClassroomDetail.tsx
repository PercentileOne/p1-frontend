/* ══════════════════════════════════════════════════════════════
   CLASSROOM DETAIL — Phase 10B
   Tabs: Students · Readiness · Heatmap · Assignments · Lessons
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, BarChart2, Grid3x3, ClipboardList, BookOpen,
  Plus, Upload, CheckCircle, Clock, ChevronRight,
  AlertTriangle, Star,
} from "lucide-react";
import { computeClassHeatmap, heatColor, heatTextColor } from "../heatmapEngine";
import CreateAssignmentModal      from "./CreateAssignmentModal";
import TeacherHomeworkUploadModal from "./TeacherHomeworkUploadModal";
import LessonIngestionModal       from "./LessonIngestionModal";
import AssignmentSubmissionView   from "./AssignmentSubmissionView";
import type { Class, Assignment, Submission, StudentRef } from "../teacherStore";

type Tab = "students" | "readiness" | "heatmap" | "assignments" | "lessons";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "students",    label: "Students",    icon: <Users size={11} />        },
  { id: "readiness",   label: "Readiness",   icon: <BarChart2 size={11} />    },
  { id: "heatmap",     label: "Heatmap",     icon: <Grid3x3 size={11} />      },
  { id: "assignments", label: "Assignments", icon: <ClipboardList size={11} />},
  { id: "lessons",     label: "Lessons",     icon: <BookOpen size={11} />     },
];

// ── Helpers ────────────────────────────────────────────────────────

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function avgScore(subs: Submission[]): number | null {
  const scored = subs.filter(s => s.score !== undefined);
  if (scored.length === 0) return null;
  return Math.round(scored.reduce((s, c) => s + (c.score ?? 0), 0) / scored.length);
}

// ── Readiness ring (class-level mock) ─────────────────────────────

function ReadinessRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
      <motion.circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - score / 100) }}
        transition={{ duration: 1, ease: "easeOut" }}
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      <text x={size/2} y={size/2} textAnchor="middle" fill="white"
        fontSize={size < 90 ? "14" : "18"} fontWeight="900" dy="0.35em">
        {score}%
      </text>
    </svg>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────

function StudentsTab({ cls }: { cls: Class }) {
  const heatmap = computeClassHeatmap(cls);
  return (
    <div className="flex flex-col gap-2">
      {cls.students.map(s => {
        const score = heatmap.studentAvg[s.studentId] ?? 0;
        return (
          <div key={s.studentId}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className={`w-8 h-8 rounded-full ${s.accent} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
              {s.avatar}
            </div>
            <p className="flex-1 text-[12px] font-medium text-slate-200">{s.name}</p>
            <span className={`text-[11px] font-bold ${heatTextColor(score)}`}>{score}%</span>
            <div className="w-20 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${heatColor(score)}`}
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.7 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReadinessTab({ cls }: { cls: Class }) {
  const heatmap = computeClassHeatmap(cls);
  const classScore = heatmap.classAverage;

  const gradeMap: Record<string, number> = {};
  for (const s of cls.students) {
    const avg = heatmap.studentAvg[s.studentId] ?? 0;
    const grade = avg >= 85 ? "9/A*" : avg >= 70 ? "7/A" : avg >= 55 ? "5/B" : avg >= 40 ? "4/C" : "3/D";
    gradeMap[grade] = (gradeMap[grade] ?? 0) + 1;
  }

  const weakTopics = [...heatmap.topics]
    .sort((a, b) => (heatmap.topicAverage[a.topicId] ?? 0) - (heatmap.topicAverage[b.topicId] ?? 0))
    .slice(0, 4);
  const strongTopics = [...heatmap.topics]
    .sort((a, b) => (heatmap.topicAverage[b.topicId] ?? 0) - (heatmap.topicAverage[a.topicId] ?? 0))
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-5">
      {/* Ring + summary */}
      <div className="flex items-center gap-6 p-5 rounded-2xl bg-[#0f1117] border border-white/[0.07]">
        <ReadinessRing score={classScore} size={100} />
        <div>
          <p className="text-[13px] font-bold text-white">Class average: {classScore}%</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{cls.students.length} students · {heatmap.topics.length} topics tracked</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(gradeMap).map(([g, n]) => (
              <span key={g} className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-[10px] text-slate-300">
                {g}: <strong>{n}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Weak topics */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={12} className="text-amber-400" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Class weak spots</p>
        </div>
        <div className="flex flex-col gap-1.5">
          {weakTopics.map(t => (
            <div key={t.topicId} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span className="flex-1 text-[11px] text-slate-300">{t.title}</span>
              <span className={`text-[11px] font-bold ${heatTextColor(heatmap.topicAverage[t.topicId] ?? 0)}`}>
                {heatmap.topicAverage[t.topicId]}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Strong topics */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Star size={12} className="text-emerald-400" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Class strengths</p>
        </div>
        <div className="flex flex-col gap-1.5">
          {strongTopics.map(t => (
            <div key={t.topicId} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span className="flex-1 text-[11px] text-slate-300">{t.title}</span>
              <span className="text-[11px] font-bold text-emerald-400">{heatmap.topicAverage[t.topicId]}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeatmapTab({ cls }: { cls: Class }) {
  const heatmap = computeClassHeatmap(cls);
  const [tooltip, setTooltip] = useState<{ studentId: string; topicId: string } | null>(null);

  function getCell(studentId: string, topicId: string) {
    return heatmap.cells.find(c => c.studentId === studentId && c.topicId === topicId);
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        {/* Topic header */}
        <div className="flex gap-1 mb-1 ml-24">
          {heatmap.topics.map(t => (
            <div key={t.topicId}
              className="w-14 text-[8px] text-slate-500 font-semibold text-center leading-tight truncate px-0.5">
              {t.title}
            </div>
          ))}
        </div>

        {/* Rows */}
        {heatmap.students.map(s => (
          <div key={s.studentId} className="flex items-center gap-1 mb-1">
            {/* Student name */}
            <div className="w-24 flex items-center gap-1.5 shrink-0">
              <div className={`w-5 h-5 rounded-full ${s.accent} flex items-center justify-center text-[8px] font-bold text-white shrink-0`}>
                {s.avatar.slice(0, 1)}
              </div>
              <span className="text-[10px] text-slate-300 truncate">{s.name.split(" ")[0]}</span>
            </div>
            {/* Cells */}
            {heatmap.topics.map(t => {
              const cell = getCell(s.studentId, t.topicId);
              const score = cell?.score ?? 0;
              const isHovered = tooltip?.studentId === s.studentId && tooltip?.topicId === t.topicId;
              return (
                <div
                  key={t.topicId}
                  onMouseEnter={() => setTooltip({ studentId: s.studentId, topicId: t.topicId })}
                  onMouseLeave={() => setTooltip(null)}
                  className={`relative w-14 h-7 rounded flex items-center justify-center text-[10px] font-bold text-white cursor-default ${heatColor(score)} transition-all ${isHovered ? "scale-110 z-10" : ""}`}
                  style={{ opacity: 0.5 + (score / 100) * 0.5 }}
                >
                  {score}
                  {isHovered && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-lg bg-[#1e2030] border border-white/[0.12] text-[10px] text-white whitespace-nowrap z-20 shadow-lg">
                      {s.name.split(" ")[0]} · {t.title}: {score}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Topic averages */}
        <div className="flex gap-1 mt-2 ml-24 pt-2 border-t border-white/[0.06]">
          {heatmap.topics.map(t => {
            const avg = heatmap.topicAverage[t.topicId] ?? 0;
            return (
              <div key={t.topicId}
                className={`w-14 text-center text-[10px] font-bold ${heatTextColor(avg)}`}>
                {avg}%
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-500 ml-24 mt-0.5">class avg</p>
      </div>
    </div>
  );
}

function AssignmentsTab({
  cls, onViewSubmission,
}: {
  cls: Class;
  onViewSubmission: (asgn: Assignment, sub: Submission, student: StudentRef) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[11px] font-semibold text-white transition-colors"
        >
          <Plus size={11} />
          Create Assignment
        </button>
      </div>

      {cls.assignments.length === 0 && (
        <p className="text-[12px] text-slate-500 py-6 text-center">No assignments yet. Create one above.</p>
      )}

      {cls.assignments.map(asgn => {
        const avg = avgScore(asgn.submissions);
        const dueIn = Math.ceil((new Date(asgn.dueDate).getTime() - Date.now()) / 86400000);
        return (
          <div key={asgn.id} className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
            <div className="flex items-start gap-2 mb-3">
              <div>
                <p className="text-[13px] font-bold text-white">{asgn.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{asgn.description}</p>
              </div>
              <div className="ml-auto text-right shrink-0">
                <p className={`text-[11px] font-semibold ${dueIn <= 2 ? "text-red-400" : dueIn <= 7 ? "text-amber-400" : "text-slate-400"}`}>
                  {dueIn > 0 ? `Due in ${dueIn}d` : "Overdue"}
                </p>
                <p className="text-[10px] text-slate-600">{fmtDate(asgn.dueDate)}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-[11px] text-slate-500 mb-3">
              <span className="flex items-center gap-1"><CheckCircle size={10} className="text-emerald-400" />
                {asgn.submissions.length}/{cls.students.length} submitted
              </span>
              {avg !== null && <span className="flex items-center gap-1"><BarChart2 size={10} className="text-indigo-400" />Avg {avg}%</span>}
              <span className="flex items-center gap-1"><Clock size={10} />
                {asgn.submissions.filter(s => !s.reviewed).length} unreviewed
              </span>
            </div>

            {/* Submission list */}
            {asgn.submissions.length > 0 && (
              <div className="flex flex-col gap-1">
                {asgn.submissions.map(sub => {
                  const student = cls.students.find(s => s.studentId === sub.studentId);
                  if (!student) return null;
                  return (
                    <button
                      key={sub.studentId}
                      onClick={() => onViewSubmission(asgn, sub, student)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors text-left"
                    >
                      <div className={`w-6 h-6 rounded-full ${student.accent} flex items-center justify-center text-[9px] font-bold text-white shrink-0`}>
                        {student.avatar}
                      </div>
                      <span className="flex-1 text-[11px] text-slate-300">{student.name}</span>
                      {sub.score !== undefined && (
                        <span className={`text-[11px] font-bold ${sub.score >= 70 ? "text-emerald-400" : sub.score >= 50 ? "text-amber-400" : "text-red-400"}`}>
                          {sub.score}%
                        </span>
                      )}
                      {sub.reviewed && <CheckCircle size={10} className="text-emerald-500" />}
                      <ChevronRight size={10} className="text-slate-600" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <AnimatePresence>
        {showCreate && <CreateAssignmentModal cls={cls} onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  );
}

function LessonsTab({ cls }: { cls: Class }) {
  const [showUploadHw,     setShowUploadHw]     = useState(false);
  const [showIngestLesson, setShowIngestLesson] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setShowUploadHw(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[11px] font-semibold text-black transition-colors"
        >
          <Upload size={11} />
          Upload Homework
        </button>
        <button
          onClick={() => setShowIngestLesson(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-[11px] font-semibold text-white transition-colors"
        >
          <Plus size={11} />
          Ingest Lesson
        </button>
      </div>

      {cls.lessons.length === 0 && (
        <p className="text-[12px] text-slate-500 py-6 text-center">No lessons ingested yet.</p>
      )}

      {[...cls.lessons].reverse().map(lesson => (
        <div key={lesson.id} className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-[13px] font-bold text-white">{lesson.title}</p>
            <p className="text-[10px] text-slate-500 shrink-0">{fmtDate(lesson.createdAt)}</p>
          </div>
          {lesson.summary && (
            <p className="text-[11px] text-slate-400 leading-relaxed mb-2">{lesson.summary}</p>
          )}
          {lesson.concepts && lesson.concepts.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {lesson.concepts.map(c => (
                <span key={c} className="px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-300">{c}</span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[10px] text-slate-400 hover:text-white transition-colors">
              <BookOpen size={10} />
              Convert to Learn Mode
            </button>
            <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[10px] text-slate-400 hover:text-white transition-colors">
              <Plus size={10} />
              Generate Cards
            </button>
            <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[10px] text-slate-400 hover:text-white transition-colors">
              <ClipboardList size={10} />
              Add to Revision Pack
            </button>
          </div>
        </div>
      ))}

      <AnimatePresence>
        {showUploadHw     && <TeacherHomeworkUploadModal cls={cls} onClose={() => setShowUploadHw(false)} />}
        {showIngestLesson && <LessonIngestionModal       cls={cls} onClose={() => setShowIngestLesson(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────

interface Props {
  cls:    Class;
  onBack: () => void;
}

export default function ClassroomDetail({ cls, onBack }: Props) {
  const [tab, setTab]               = useState<Tab>("students");
  const [submission, setSubmission] = useState<{
    asgn: Assignment; sub: Submission; student: StudentRef
  } | null>(null);

  if (submission) {
    return (
      <AssignmentSubmissionView
        cls={cls}
        assignment={submission.asgn}
        submission={submission.sub}
        student={submission.student}
        onBack={() => setSubmission(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Back + header */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors w-fit">
        ← All classes
      </button>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}>
          <Users size={16} className="text-indigo-400" />
        </div>
        <div>
          <p className="text-[16px] font-black text-white">{cls.name}</p>
          <p className="text-[11px] text-slate-500">{cls.year} · {cls.students.length} students</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-semibold transition-all ${
              tab === t.id
                ? "bg-indigo-600 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{   opacity: 0, y: -6 }}
          transition={{ duration: 0.16 }}
        >
          {tab === "students"    && <StudentsTab    cls={cls} />}
          {tab === "readiness"   && <ReadinessTab   cls={cls} />}
          {tab === "heatmap"     && <HeatmapTab     cls={cls} />}
          {tab === "assignments" && (
            <AssignmentsTab
              cls={cls}
              onViewSubmission={(asgn, sub, student) => setSubmission({ asgn, sub, student })}
            />
          )}
          {tab === "lessons"     && <LessonsTab     cls={cls} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
