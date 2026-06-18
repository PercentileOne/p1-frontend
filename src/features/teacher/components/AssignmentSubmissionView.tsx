/* ══════════════════════════════════════════════════════════════
   ASSIGNMENT SUBMISSION VIEW — Phase 10B
   Teacher reviews individual student submission
   ══════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Clock, Brain, TrendingUp, TrendingDown, Star } from "lucide-react";
import { markSubmissionReviewed } from "../teacherStore";
import type { Assignment, Submission, StudentRef, Class } from "../teacherStore";

interface Props {
  cls:        Class;
  assignment: Assignment;
  submission: Submission;
  student:    StudentRef;
  onBack:     () => void;
}

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function ScoreRing({ score }: { score: number }) {
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const pct = score / 100;
  const color = score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <svg width="108" height="108" viewBox="0 0 108 108">
      <circle cx="54" cy="54" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
      <motion.circle
        cx="54" cy="54" r={r}
        fill="none" stroke={color} strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference * (1 - pct) }}
        transition={{ duration: 1, ease: "easeOut" }}
        transform="rotate(-90 54 54)"
      />
      <text x="54" y="52" textAnchor="middle" fill="white" fontSize="18" fontWeight="900" dy="0.35em">
        {score}%
      </text>
    </svg>
  );
}

// Mock weak/strong areas derived from score
function mockAreas(submission: Submission): { weak: string[]; strong: string[] } {
  const score = submission.score ?? 50;
  if (score >= 75) return {
    strong: ["Core concepts", "Problem-solving approach", "Exam technique"],
    weak:   ["Edge cases", "Extended application"],
  };
  if (score >= 50) return {
    strong: ["Basic recall", "Definitions"],
    weak:   ["Application", "Multi-step problems", "Extended writing"],
  };
  return {
    strong: ["Attempt made", "Some correct definitions"],
    weak:   ["Conceptual understanding", "Procedure", "Application", "Problem-solving"],
  };
}

export default function AssignmentSubmissionView({ cls, assignment, submission, student, onBack }: Props) {
  const score = submission.score ?? 0;
  const { weak, strong } = mockAreas(submission);
  const isReviewed = submission.reviewed;

  function handleMarkReviewed() {
    markSubmissionReviewed(cls.id, assignment.id, student.studentId);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors w-fit"
      >
        <ArrowLeft size={12} />
        Back to submissions
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
        <div className={`w-11 h-11 rounded-full ${student.accent} flex items-center justify-center text-[14px] font-bold text-white shrink-0`}>
          {student.avatar}
        </div>
        <div className="flex-1">
          <p className="text-[14px] font-bold text-white">{student.name}</p>
          <p className="text-[11px] text-slate-500">{assignment.title} · {cls.name}</p>
        </div>
        {isReviewed ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400">
            <CheckCircle size={10} />
            Reviewed
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleMarkReviewed}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[11px] font-semibold text-white transition-colors"
          >
            <CheckCircle size={11} />
            Mark as reviewed
          </motion.button>
        )}
      </div>

      {/* Score ring + stats */}
      <div className="flex items-center gap-6 p-5 rounded-2xl bg-[#0f1117] border border-white/[0.07]">
        <ScoreRing score={score} />
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Brain size={13} className="text-indigo-400" />
            <span className="text-[11px]">{submission.conceptsHit ?? "?"} concepts hit</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Clock size={13} className="text-sky-400" />
            <span className="text-[11px]">{submission.timeUsed ? fmtTime(submission.timeUsed) : "—"} time used</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Star size={13} className="text-amber-400" />
            <span className="text-[11px]">
              Submitted {new Date(submission.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          </div>
        </div>
      </div>

      {/* Weak / strong */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={12} className="text-red-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Weak Areas</p>
          </div>
          <div className="flex flex-col gap-1.5">
            {weak.map(w => (
              <div key={w} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/08 border border-red-500/15">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <p className="text-[11px] text-slate-300">{w}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={12} className="text-emerald-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Strong Areas</p>
          </div>
          <div className="flex flex-col gap-1.5">
            {strong.map(s => (
              <div key={s} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/08 border border-emerald-500/15">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-[11px] text-slate-300">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Teacher notes placeholder */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Teacher notes</p>
        <textarea
          rows={3}
          placeholder="Add private notes about this submission…"
          className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-3 py-2.5 text-[12px] text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500/40"
        />
        <p className="text-[10px] text-slate-600 mt-1">Notes are private to the teacher (local only in this phase)</p>
      </div>
    </div>
  );
}
