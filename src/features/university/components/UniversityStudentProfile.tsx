/* ══════════════════════════════════════════════════════════════
   UNIVERSITY STUDENT PROFILE — Phase 11
   Full cognitive profile view for university admissions
   ══════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import {
  ArrowLeft, Flame, Brain, TrendingUp, Clock, BarChart2,
  Star, AlertTriangle, Calendar, Download,
} from "lucide-react";
import { getCognitiveProfile, SUBJECT_LABELS } from "../cognitiveProfileStore";
import type { UniversityStudentRef } from "../universityStore";
import type { PermissionLevel }      from "../permissionsStore";

interface Props {
  student:    UniversityStudentRef;
  permission: PermissionLevel;
  onBack:     () => void;
}

// ── Sub-components ────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <span className={color}>{icon}</span>
      <div>
        <p className="text-[18px] font-black text-white leading-none">{value}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function MasteryRing({ mastery, label }: { mastery: number; label: string }) {
  const r  = 32;
  const c  = 2 * Math.PI * r;
  const color = mastery >= 70 ? "#10b981" : mastery >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="74" height="74" viewBox="0 0 74 74">
        <circle cx="37" cy="37" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <motion.circle
          cx="37" cy="37" r={r}
          fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - mastery / 100) }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          transform="rotate(-90 37 37)"
        />
        <text x="37" y="37" textAnchor="middle" fill="white" fontSize="13" fontWeight="900" dy="0.35em">
          {mastery}%
        </text>
      </svg>
      <p className="text-[11px] text-slate-400 text-center max-w-[72px] leading-tight">{label}</p>
    </div>
  );
}

// Semester timeline — mini sparkline per week
function SemesterSparkline({ entries }: { entries: { date: string; type: string; score?: number }[] }) {
  // Bucket into 16 weeks
  const WEEKS = 16;
  const buckets: { study: number; mock: number; maxScore?: number }[] = Array.from({ length: WEEKS }, () => ({ study: 0, mock: 0 }));
  const now = Date.now();
  for (const e of entries) {
    const daysAgo = (now - new Date(e.date).getTime()) / 86400000;
    if (daysAgo < 0 || daysAgo > WEEKS * 7) continue;
    const week = WEEKS - 1 - Math.floor(daysAgo / 7);
    if (week < 0 || week >= WEEKS) continue;
    if (e.type === "study" || e.type === "homework" || e.type === "lesson") {
      buckets[week].study++;
    }
    if (e.type === "mock" && e.score !== undefined) {
      buckets[week].mock++;
      if (!buckets[week].maxScore || e.score > buckets[week].maxScore!) {
        buckets[week].maxScore = e.score;
      }
    }
  }

  const maxStudy = Math.max(1, ...buckets.map(b => b.study));
  const W = 400;
  const H = 60;
  const bw = W / WEEKS;

  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        {buckets.map((b, i) => {
          const barH = (b.study / maxStudy) * (H - 12);
          const x = i * bw + 1;
          return (
            <g key={i}>
              <rect x={x} y={H - barH - 4} width={bw - 2} height={barH}
                fill="rgba(99,102,241,0.25)" rx="1" />
              {b.mock > 0 && (
                <circle cx={x + bw / 2} cy={H - barH - 10}
                  r="3" fill={b.maxScore && b.maxScore >= 70 ? "#10b981" : "#f59e0b"} />
              )}
            </g>
          );
        })}
        {/* Axis labels */}
        <text x="0"    y={H - 0} fontSize="7" fill="rgba(255,255,255,0.25)">16wk ago</text>
        <text x={W - 28} y={H - 0} fontSize="7" fill="rgba(255,255,255,0.25)">Today</text>
      </svg>
      <div className="flex gap-3 mt-1">
        <div className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-indigo-500/40 inline-block" /><span className="text-[11px] text-slate-400">Study sessions</span></div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /><span className="text-[11px] text-slate-400">Mock exam (pass)</span></div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /><span className="text-[11px] text-slate-400">Mock exam (developing)</span></div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────

export default function UniversityStudentProfile({ student, permission, onBack }: Props) {
  const profile = getCognitiveProfile(student.studentId);

  const canSeeFull    = permission === "full";
  const canSeePartial = permission === "full" || permission === "partial";
  const canSeeAny     = permission !== "none";

  if (!canSeeAny) {
    return (
      <div className="flex flex-col gap-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors w-fit">
          <ArrowLeft size={12} /> Back
        </button>
        <div className="flex flex-col items-center py-16 gap-4">
          <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
            <Brain size={24} className="text-slate-600" />
          </div>
          <p className="text-[14px] font-bold text-white">{student.name}</p>
          <p className="text-[12px] text-slate-500 text-center max-w-xs">
            This student has not granted permission for you to view their profile.
          </p>
        </div>
      </div>
    );
  }

  const improvSign = profile.improvementRate >= 0 ? "+" : "";
  const improvColor = profile.improvementRate >= 1 ? "text-emerald-400" : profile.improvementRate >= 0 ? "text-sky-400" : "text-red-400";

  return (
    <div className="flex flex-col gap-5">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors w-fit">
        <ArrowLeft size={12} /> Back to cohort
      </button>

      {/* Student badge */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
        <div className={`w-12 h-12 rounded-full ${student.accent} flex items-center justify-center text-[15px] font-black text-white shrink-0`}>
          {student.avatar}
        </div>
        <div className="flex-1">
          <p className="text-[16px] font-black text-white">{student.name}</p>
          <p className="text-[11px] text-slate-500">
            Permission: <span className="text-indigo-300 font-semibold capitalize">{permission}</span>
          </p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-[11px] text-slate-400 hover:text-white transition-colors">
          <Download size={11} />
          Export PDF
        </button>
      </div>

      {/* A) Cognitive summary */}
      {canSeeFull && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Cognitive Summary</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCard label="Study Streak"        value={`${profile.studyStreak}d`}           sub="consecutive"         icon={<Flame size={14} />}    color="text-orange-400" />
            <StatCard label="Deep Work"           value={profile.deepWorkSessions}             sub="sessions ≥25min"     icon={<Brain size={14} />}    color="text-violet-400" />
            <StatCard label="Avg Session"         value={`${profile.averageSessionLength}min`} sub="per session"         icon={<Clock size={14} />}    color="text-sky-400"    />
            <StatCard label="Total Study"         value={`${profile.totalStudyHours}h`}        sub="this semester"       icon={<Calendar size={14} />} color="text-indigo-400" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <StatCard label="Consistency Score"   value={`${profile.consistencyScore}%`}       icon={<BarChart2 size={14} />} color="text-emerald-400" />
            <StatCard
              label="Improvement Rate"
              value={`${improvSign}${profile.improvementRate.toFixed(1)}%/wk`}
              icon={<TrendingUp size={14} />}
              color={improvColor}
            />
          </div>
        </div>
      )}

      {/* B) Mastery overview */}
      {canSeePartial && (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Concept Mastery</p>
          <div className="flex flex-wrap gap-4 justify-around">
            {profile.conceptMastery.map(m => (
              <MasteryRing
                key={m.subjectId}
                mastery={m.mastery}
                label={SUBJECT_LABELS[m.subjectId] ?? m.subjectId}
              />
            ))}
          </div>
          {canSeeFull && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle size={10} className="text-amber-400" />
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Weak areas</p>
                </div>
                <div className="flex flex-col gap-1">
                  {profile.weakAreas.map(w => (
                    <div key={w.topicId} className="text-[10px] text-slate-400 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                      {w.title} <span className="text-slate-600">({SUBJECT_LABELS[w.subjectId]?.split(" ")[0]})</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Star size={10} className="text-emerald-400" />
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Strong areas</p>
                </div>
                <div className="flex flex-col gap-1">
                  {profile.strongAreas.map(s => (
                    <div key={s.topicId} className="text-[10px] text-slate-400 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                      {s.title} <span className="text-slate-600">({SUBJECT_LABELS[s.subjectId]?.split(" ")[0]})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* C) Mock exam performance */}
      {canSeePartial && (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Mock Exam Performance</p>
          <div className="flex flex-col gap-2">
            {profile.mockExamScores.map(m => (
              <div key={m.subjectId} className="flex items-center gap-3">
                <span className="text-[11px] text-slate-300 flex-1">{SUBJECT_LABELS[m.subjectId] ?? m.subjectId}</span>
                <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${m.score >= 70 ? "bg-emerald-500" : m.score >= 55 ? "bg-amber-500" : "bg-red-500"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${m.score}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <span className={`text-[12px] font-bold w-8 text-right ${m.score >= 70 ? "text-emerald-400" : m.score >= 55 ? "text-amber-400" : "text-red-400"}`}>
                  {m.score}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* D) Semester timeline */}
      {canSeeFull && (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={12} className="text-indigo-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Semester Timeline</p>
          </div>
          <SemesterSparkline entries={profile.semesterTimeline} />
        </div>
      )}

      {/* E) Portfolio export stub */}
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/05 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-bold text-white">Portfolio Export</p>
            <p className="text-[11px] text-slate-400 mt-0.5">PDF summary with mastery graph, streak, and deep work metrics</p>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[11px] font-semibold text-white transition-colors">
            <Download size={11} />
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
