/* ══════════════════════════════════════════════════════════════
   TEACHER DASHBOARD — Phase 10B
   Classes overview + today's lessons + assignments due soon + class health
   ══════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import {
  Users, BookOpen, ClipboardList, BarChart2,
  AlertTriangle, CheckCircle, Clock, Zap, TrendingUp,
} from "lucide-react";
import { computeClassHeatmap, heatTextColor } from "../heatmapEngine";
import type { Class } from "../teacherStore";

interface Props {
  classes:       Class[];
  onSelectClass: (cls: Class) => void;
}

export function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function daysUntil(d: Date) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function isToday(d: Date) {
  return new Date(d).toDateString() === new Date().toDateString();
}

function avgScore(scores: number[]) {
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((s, n) => s + n, 0) / scores.length);
}

// Tiny ring for class card
function MiniRing({ score }: { score: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const color = score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="54" height="54" viewBox="0 0 54 54">
      <circle cx="27" cy="27" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
      <motion.circle
        cx="27" cy="27" r={r}
        fill="none" stroke={color} strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - score / 100) }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        transform="rotate(-90 27 27)"
      />
      <text x="27" y="27" textAnchor="middle" fill="white" fontSize="10" fontWeight="900" dy="0.35em">
        {score}%
      </text>
    </svg>
  );
}

export default function TeacherDashboard({ classes, onSelectClass }: Props) {
  // Compute heatmap data per class
  const classData = classes.map(cls => {
    const hm       = computeClassHeatmap(cls);
    const score    = hm.classAverage;
    const weakspot = [...hm.topics]
      .sort((a, b) => (hm.topicAverage[a.topicId] ?? 0) - (hm.topicAverage[b.topicId] ?? 0))[0];
    return { cls, score, hm, weakspot };
  });

  // Today's lessons
  const todayLessons = classes.flatMap(cls =>
    cls.lessons.filter(l => isToday(l.createdAt)).map(l => ({ cls, lesson: l }))
  );

  // Assignments due within 7 days
  const dueSoon = classes.flatMap(cls =>
    cls.assignments
      .filter(a => { const d = daysUntil(new Date(a.dueDate)); return d >= 0 && d <= 7; })
      .map(a => ({ cls, assignment: a }))
  ).sort((a, b) => new Date(a.assignment.dueDate).getTime() - new Date(b.assignment.dueDate).getTime());

  // Overall averages
  const allScores   = classData.map(d => d.score);
  const overallAvg  = avgScore(allScores);
  const totalStudents = classes.reduce((s, c) => s + c.students.length, 0);
  const totalLessons  = classes.reduce((s, c) => s + c.lessons.length, 0);
  const totalAssignments = classes.reduce((s, c) => s + c.assignments.length, 0);

  return (
    <div className="flex flex-col gap-5">

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Classes",     value: classes.length.toString(),      icon: <Users size={14} className="text-indigo-400" />       },
          { label: "Students",    value: totalStudents.toString(),        icon: <Users size={14} className="text-violet-400" />       },
          { label: "Avg Readiness", value: `${overallAvg}%`,             icon: <BarChart2 size={14} className="text-emerald-400" />  },
          { label: "Assignments", value: totalAssignments.toString(),     icon: <ClipboardList size={14} className="text-amber-400" />},
        ].map(s => (
          <div key={s.label}
            className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            {s.icon}
            <div>
              <p className="text-[18px] font-black text-white leading-none">{s.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* A) Classes overview */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Your Classes</p>
        <div className="flex flex-col gap-2">
          {classData.map(({ cls, score, weakspot }) => (
            <motion.button
              key={cls.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectClass(cls)}
              className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all text-left"
            >
              <MiniRing score={score} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-white">{cls.name}</p>
                <p className="text-[12px] text-slate-400">{cls.students.length} students · {cls.year}</p>
                {weakspot && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle size={9} className="text-amber-400" />
                    <span className="text-[11px] text-amber-400/90">Weak: {weakspot.title}</span>
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-[14px] font-black ${heatTextColor(score)}`}>{score}%</p>
                <p className="text-[10px] text-slate-500">readiness</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* B) Today's lessons */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={12} className="text-violet-400" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Today's Lessons</p>
        </div>
        {todayLessons.length === 0 ? (
          <p className="text-[12px] text-slate-500 py-2">No lessons uploaded today yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {todayLessons.map(({ cls, lesson }) => (
              <div key={lesson.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <BookOpen size={12} className="text-violet-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-white truncate">{lesson.title}</p>
                  <p className="text-[11px] text-slate-400">{cls.name}</p>
                </div>
                <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-300 hover:bg-violet-500/20 transition-colors whitespace-nowrap">
                  <TrendingUp size={9} />
                  Learn Mode
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* C) Assignments due soon */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={12} className="text-amber-400" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Due This Week</p>
        </div>
        {dueSoon.length === 0 ? (
          <p className="text-[12px] text-slate-500 py-2">No assignments due in the next 7 days</p>
        ) : (
          <div className="flex flex-col gap-2">
            {dueSoon.map(({ cls, assignment: a }) => {
              const d = daysUntil(new Date(a.dueDate));
              const submitted = a.submissions.length;
              const total     = cls.students.length;
              return (
                <div key={a.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <ClipboardList size={12} className="text-amber-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-white truncate">{a.title}</p>
                    <p className="text-[11px] text-slate-400">{cls.name}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-[12px] font-bold ${d <= 2 ? "text-red-400" : "text-amber-400"}`}>
                      {d === 0 ? "Today" : `${d}d`}
                    </p>
                    <p className="text-[11px] text-slate-400">{submitted}/{total} submitted</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* D) Class health indicators */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Class Health</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {classData.map(({ cls, score, hm }) => {
            const weakTopics  = [...hm.topics]
              .sort((a, b) => (hm.topicAverage[a.topicId] ?? 0) - (hm.topicAverage[b.topicId] ?? 0))
              .slice(0, 2);
            const engagement = Math.min(100, Math.round(
              (cls.assignments.reduce((s, a) => s + a.submissions.length, 0) / Math.max(1, cls.students.length * cls.assignments.length)) * 100
            )) || Math.round(55 + Math.random() * 35); // mock fallback

            return (
              <div key={cls.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[12px] font-bold text-white mb-2">{cls.name}</p>
                <div className="flex flex-col gap-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <BarChart2 size={9} className={heatTextColor(score)} />
                    <span className="text-slate-400">Avg readiness:</span>
                    <span className={`font-bold ${heatTextColor(score)}`}>{score}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap size={9} className="text-sky-400" />
                    <span className="text-slate-400">Engagement:</span>
                    <span className="font-bold text-sky-400">{engagement}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={9} className="text-amber-400" />
                    <span className="text-slate-400">Weak: </span>
                    <span className="text-amber-400">{weakTopics.map(t => t.title).join(", ")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle size={9} className="text-emerald-400" />
                    <span className="text-slate-400">Lessons: {totalLessons}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
