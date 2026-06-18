/* ══════════════════════════════════════════════════════════════
   PARENT DASHBOARD — Phase 10
   Child overview + today's activity + weak/strong areas + weekly plan
   ══════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, BookOpen, ClipboardList,
  Flame, Clock, Target, CheckCircle2, AlertTriangle, Calendar,
} from "lucide-react";
import { useChildSummary }  from "../childSummaryStore";
import { useSubjectsStore } from "../../student/subjectsStore";
import { useHomeworkStore }  from "../../student/homeworkStore";
import { useDailyLearningStore } from "../../student/dailyLearningStore";
import type { ChildProfile }  from "../parentStore";

const SUBJECT_LABELS: Record<string, string> = {
  "subj-maths":   "Maths",
  "subj-english": "English",
  "subj-biology": "Biology",
  "subj-cs":      "Computer Science",
};
const SUBJECT_EMOJI: Record<string, string> = {
  "subj-maths":   "📐",
  "subj-english": "📚",
  "subj-biology": "🧬",
  "subj-cs":      "💻",
};

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up")     return <TrendingUp size={10} className="text-emerald-400" />;
  if (trend === "down")   return <TrendingDown size={10} className="text-red-400" />;
  return <Minus size={10} className="text-slate-500" />;
}

function ReadinessBar({ score, color = "bg-indigo-500" }: { score: number; color?: string }) {
  return (
    <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

function fmtTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface Props {
  child: ChildProfile;
}

export default function ParentDashboard({ child }: Props) {
  const { subjects }   = useSubjectsStore();
  const { homework }   = useHomeworkStore();
  const { entries }    = useDailyLearningStore();
  const summary        = useChildSummary(child.linkedStudentId, subjects, homework, entries);

  const todayActivity = summary.dailyActivity.filter(a => {
    const d = new Date(a.date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  return (
    <div className="flex flex-col gap-5">

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Study Streak",     value: `${summary.streak}d`,           icon: <Flame size={14} className="text-orange-400" /> },
          { label: "This-Week Study",  value: fmtTime(summary.totalStudyTime), icon: <Clock size={14} className="text-indigo-400" /> },
          { label: "Homework Done",    value: `${summary.homeworkCompleted}/${summary.homeworkCompleted + summary.homeworkPending}`, icon: <CheckCircle2 size={14} className="text-emerald-400" /> },
          { label: "Subjects",         value: subjects.length.toString(),       icon: <BookOpen size={14} className="text-violet-400" /> },
        ].map(stat => (
          <div
            key={stat.label}
            className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
          >
            {stat.icon}
            <div>
              <p className="text-[16px] font-bold text-white leading-none">{stat.value}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Subject readiness ── */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Subject Readiness</p>
        <div className="flex flex-col gap-2.5">
          {summary.readinessBySubject.map(r => (
            <div key={r.subjectId} className="flex items-center gap-2">
              <span className="text-[13px] w-5 text-center">{SUBJECT_EMOJI[r.subjectId] ?? "📖"}</span>
              <span className="text-[11px] text-slate-300 w-28 shrink-0">{SUBJECT_LABELS[r.subjectId] ?? r.subjectId}</span>
              <ReadinessBar
                score={r.score}
                color={r.score >= 70 ? "bg-emerald-500" : r.score >= 50 ? "bg-amber-500" : "bg-red-500"}
              />
              <span className="text-[11px] font-bold text-white w-8 text-right">{r.score}%</span>
              <TrendIcon trend={r.trend} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Predicted grades ── */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Predicted Grades</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {summary.predictedGrades.map(pg => (
            <div key={pg.subjectId} className="flex flex-col items-center py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] gap-1">
              <span className="text-[20px]">{SUBJECT_EMOJI[pg.subjectId] ?? "📖"}</span>
              <span className="text-[24px] font-black text-white leading-none">{pg.grade}</span>
              <span className="text-[9px] text-slate-500">{SUBJECT_LABELS[pg.subjectId] ?? pg.subjectId}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Today's activity ── */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Today's Activity</p>
        {todayActivity.length === 0 ? (
          <p className="text-[12px] text-slate-500 py-4 text-center">No activity recorded today yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {todayActivity.map(a => (
              <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[13px]">{SUBJECT_EMOJI[a.subjectId] ?? "📖"}</span>
                <div className="flex-1">
                  <p className="text-[11px] font-medium text-slate-200 capitalize">{a.type}</p>
                  <p className="text-[10px] text-slate-500">{SUBJECT_LABELS[a.subjectId] ?? a.subjectId}</p>
                </div>
                {a.score !== undefined && (
                  <span className={`text-[11px] font-bold ${a.score >= 70 ? "text-emerald-400" : a.score >= 50 ? "text-amber-400" : "text-red-400"}`}>
                    {a.score}%
                  </span>
                )}
                {a.timeUsed && (
                  <span className="text-[10px] text-slate-500">{fmtTime(a.timeUsed)}</span>
                )}
                {a.mood && (
                  <span className="text-[13px]">
                    {a.mood === "great" ? "😄" : a.mood === "okay" ? "😐" : "😓"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Weak / strong areas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={12} className="text-amber-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Needs Work</p>
          </div>
          <div className="flex flex-col gap-1.5">
            {summary.weakTopics.slice(0, 5).map(t => (
              <div key={t.topicId} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[11px]">{SUBJECT_EMOJI[t.subjectId] ?? "📖"}</span>
                <span className="flex-1 text-[11px] text-slate-300">{t.title}</span>
                <span className="text-[10px] font-bold text-amber-400">{t.score}%</span>
              </div>
            ))}
            {summary.weakTopics.length === 0 && (
              <p className="text-[11px] text-slate-500 py-2">No weak areas — great work!</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target size={12} className="text-emerald-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Strong Areas</p>
          </div>
          <div className="flex flex-col gap-1.5">
            {summary.strongTopics.slice(0, 5).map(t => (
              <div key={t.topicId} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[11px]">{SUBJECT_EMOJI[t.subjectId] ?? "📖"}</span>
                <span className="flex-1 text-[11px] text-slate-300">{t.title}</span>
                <span className="text-[10px] font-bold text-emerald-400">{t.score}%</span>
              </div>
            ))}
            {summary.strongTopics.length === 0 && (
              <p className="text-[11px] text-slate-500 py-2">Keep studying to unlock strong areas!</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Weekly plan ── */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={12} className="text-indigo-400" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Recommended This Week</p>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Sessions",    value: summary.weeklyPlan.recommendedSessions.toString() },
            { label: "Mock Exams",  value: summary.weeklyPlan.mockExams.toString() },
            { label: "Est. Hours",  value: `${summary.weeklyPlan.estimatedHours}h` },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[18px] font-black text-white">{s.value}</span>
              <span className="text-[9px] text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>

        {summary.weeklyPlan.focusSubjects.length > 0 && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">Focus subjects</p>
            <div className="flex flex-wrap gap-2">
              {summary.weeklyPlan.focusSubjects.map(sid => (
                <span key={sid} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300">
                  {SUBJECT_EMOJI[sid] ?? "📖"} {SUBJECT_LABELS[sid] ?? sid}
                </span>
              ))}
            </div>
          </>
        )}

        {summary.weeklyPlan.weakAreas.length > 0 && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mt-3 mb-2">Weak areas to target</p>
            <div className="flex flex-col gap-1">
              {summary.weeklyPlan.weakAreas.map(wa => (
                <div key={wa.topicId} className="flex items-center gap-2 text-[11px] text-slate-400">
                  <ClipboardList size={10} className="text-amber-400 shrink-0" />
                  {SUBJECT_EMOJI[wa.subjectId] ?? "📖"} {wa.title}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
