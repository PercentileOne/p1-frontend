/* ══════════════════════════════════════════════════════════════
   StudentHome — Today's focus, exam countdowns, quick actions
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Upload, BookOpen, Zap, Clock, Flame, AlertTriangle,
  CheckCircle2, GraduationCap, Calendar, Star, Brain,
} from "lucide-react";
import type { Subject, Subtopic } from "../subjectsStore";
import { computeStudentReadiness } from "../subjectsStore";
import SectionLabel from "../../cards/components/shared/SectionLabel";

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

function gradeColor(grade: string) {
  const g = parseInt(grade);
  if (g >= 8) return "text-emerald-400";
  if (g >= 6) return "text-amber-400";
  if (g >= 4) return "text-orange-400";
  return "text-red-400";
}

// ── Exam countdown card ───────────────────────────────────────────

function ExamCountdown({ subject }: { subject: Subject }) {
  if (!subject.examDate) return null;
  const days    = daysUntil(subject.examDate);
  const urgent  = days <= 14;
  const result  = computeStudentReadiness(subject.id);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`relative flex items-center gap-3 p-3.5 rounded-2xl border ${
        urgent ? "border-orange-500/20 bg-orange-950/20" : "border-white/[0.06] bg-[#0f1117]"
      }`}
    >
      <div className="absolute top-0 left-3 right-3 h-[2px] rounded-b-full"
        style={{ background: subject.color + "60" }} />

      <div className="text-[20px] shrink-0">{subject.emoji}</div>

      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-white/85">{subject.name}</p>
        <p className="text-[9px] text-white/30">{subject.examBoard} · {subject.level}</p>
      </div>

      <div className="text-right shrink-0">
        <p className={`text-[15px] font-black ${urgent ? "text-orange-400" : "text-white/70"}`}>{days}d</p>
        <p className="text-[8px] text-white/25">to exam</p>
      </div>

      <div className="text-right shrink-0">
        <p className={`text-[13px] font-black ${gradeColor(result.predictedGrade)}`}>{result.predictedGrade}</p>
        <p className="text-[8px] text-white/25">predicted</p>
      </div>
    </motion.div>
  );
}

// ── Subtopic focus card ───────────────────────────────────────────

function FocusCard({
  subtopic, subjectName, emoji, color, onStudy,
}: {
  subtopic: Subtopic; subjectName: string; emoji: string; color: string; onStudy: () => void;
}) {
  const score = subtopic.readinessScore;

  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="flex items-center gap-3 p-3 rounded-2xl border border-white/[0.06] bg-[#0f1117]"
    >
      <span className="text-[16px]">{emoji}</span>

      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-white/80 truncate">{subtopic.title}</p>
        <p className="text-[9px] text-white/30">{subjectName}</p>
        <div className="mt-1.5 h-1 rounded-full bg-white/[0.06] overflow-hidden w-full">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${score}%`, background: score < 55 ? "#ef4444" : score < 75 ? "#f59e0b" : "#10b981" }} />
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5">
        <span className="text-[11px] font-bold text-white/60">{score}%</span>
        <button
          onClick={onStudy}
          className="px-2 py-0.5 rounded-lg text-[8px] font-bold transition-colors"
          style={{ background: color + "25", color: color, border: `1px solid ${color}40` }}
        >
          Study
        </button>
      </div>
    </motion.div>
  );
}

// ── Main StudentHome ──────────────────────────────────────────────

interface Props {
  subjects:        Subject[];
  onImportHomework: () => void;
  onDailyLearning:  () => void;
  onStartRevision:  () => void;
  onSelectSubject:  (s: Subject) => void;
}

export default function StudentHome({
  subjects, onImportHomework, onDailyLearning, onStartRevision, onSelectSubject,
}: Props) {
  const [_] = useState(0); // force re-render hook

  // Collect all weak subtopics across all subjects
  const allSubtopics: Array<{ subtopic: Subtopic; subject: Subject }> = subjects.flatMap(subj =>
    subj.topics.flatMap(t => t.subtopics.map(st => ({ subtopic: st, subject: subj })))
  );

  const weakItems   = allSubtopics.filter(i => i.subtopic.readinessScore < 55)
    .sort((a, b) => a.subtopic.readinessScore - b.subtopic.readinessScore).slice(0, 3);
  const strongItems = allSubtopics.filter(i => i.subtopic.readinessScore >= 80)
    .sort((a, b) => b.subtopic.readinessScore - a.subtopic.readinessScore).slice(0, 3);

  // Today's focus = weakest not studied recently
  const todayFocus = allSubtopics
    .filter(i => i.subtopic.readinessScore < 70)
    .sort((a, b) => {
      const aLast = a.subtopic.lastStudied?.getTime() ?? 0;
      const bLast = b.subtopic.lastStudied?.getTime() ?? 0;
      return aLast - bLast;
    }).slice(0, 3);

  const subjectsWithExam = subjects.filter(s => s.examDate).sort((a, b) =>
    (a.examDate!.getTime()) - (b.examDate!.getTime())
  );

  const overallReadiness = subjects.length === 0 ? 0 : Math.round(
    subjects.reduce((s, subj) => s + computeStudentReadiness(subj.id).readinessScore, 0) / subjects.length
  );

  return (
    <div className="flex flex-col gap-5 px-1 py-2">

      {/* Header */}
      <div
        className="relative p-4 rounded-2xl border border-white/[0.06] overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.10) 0%, rgba(0,0,0,0) 70%)" }}
      >
        <div className="absolute top-0 left-4 right-4 h-[2px] rounded-b-full bg-gradient-to-r from-indigo-500 to-violet-500 opacity-60" />
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/25 flex items-center justify-center shrink-0">
            <GraduationCap size={18} className="text-indigo-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-[15px] font-bold text-white/90">Good morning! 👋</h2>
            <p className="text-[10px] text-white/40 mt-0.5">Your overall readiness: <span className="font-bold text-indigo-400">{overallReadiness}%</span> across {subjects.length} subjects</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: <Upload       size={16} />, label: "Import\nHomework",   color: "text-amber-400  bg-amber-500/15  border-amber-500/25",  action: onImportHomework },
          { icon: <BookOpen     size={16} />, label: "What I\nLearned",    color: "text-indigo-400 bg-indigo-500/15 border-indigo-500/25", action: onDailyLearning  },
          { icon: <Zap          size={16} />, label: "Start\nRevision",    color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/25", action: onStartRevision },
        ].map(a => (
          <motion.button
            key={a.label}
            whileTap={{ scale: 0.95 }}
            onClick={a.action}
            className={`flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all ${a.color}`}
          >
            {a.icon}
            <span className="text-[9px] font-bold uppercase tracking-wide leading-tight text-center whitespace-pre-line">{a.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Today's focus */}
      {todayFocus.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Brain size={11} className="text-indigo-400" />
            <SectionLabel>Today's Focus</SectionLabel>
          </div>
          <div className="flex flex-col gap-2">
            {todayFocus.map(({ subtopic, subject }) => (
              <FocusCard
                key={subtopic.id}
                subtopic={subtopic}
                subjectName={subject.name}
                emoji={subject.emoji}
                color={subject.color}
                onStudy={() => onSelectSubject(subject)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Exam countdowns */}
      {subjectsWithExam.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Calendar size={11} className="text-white/40" />
            <SectionLabel>Exam Countdowns</SectionLabel>
          </div>
          <div className="flex flex-col gap-2">
            {subjectsWithExam.map(s => <ExamCountdown key={s.id} subject={s} />)}
          </div>
        </div>
      )}

      {/* Weak areas */}
      {weakItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={11} className="text-red-400" />
            <SectionLabel className="text-red-400/80">Needs Work</SectionLabel>
          </div>
          <div className="flex flex-col gap-1.5">
            {weakItems.map(({ subtopic, subject }) => (
              <button
                key={subtopic.id}
                onClick={() => onSelectSubject(subject)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-red-500/05 border border-red-500/10 text-left hover:bg-red-500/10 transition-colors"
              >
                <span className="text-[14px]">{subject.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-white/70 truncate">{subtopic.title}</p>
                  <p className="text-[9px] text-white/30">{subject.name}</p>
                </div>
                <span className="text-[11px] font-bold text-red-400">{subtopic.readinessScore}%</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Strong areas */}
      {strongItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Star size={11} className="text-emerald-400" />
            <SectionLabel className="text-emerald-400/80">Strong Areas</SectionLabel>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {strongItems.map(({ subtopic, subject }) => (
              <span key={subtopic.id}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/08 border border-emerald-500/15 text-[10px] text-emerald-300/70">
                <span>{subject.emoji}</span>
                <span className="truncate max-w-[140px]">{subtopic.title}</span>
                <CheckCircle2 size={9} className="text-emerald-400" />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Streak strip */}
      <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-white/[0.05] bg-white/[0.02]">
        <Flame size={14} className="text-amber-400" />
        <div>
          <p className="text-[12px] font-bold text-white/80">7 day streak 🔥</p>
          <p className="text-[9px] text-white/30">Keep logging daily to maintain your streak</p>
        </div>
        <Clock size={12} className="text-white/20 ml-auto" />
      </div>
    </div>
  );
}
