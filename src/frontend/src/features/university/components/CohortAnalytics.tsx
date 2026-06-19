/* ══════════════════════════════════════════════════════════════
   COHORT ANALYTICS — Phase 11
   Tabs: Overview · Heatmap · Trends · Applicants
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2, Grid3x3, TrendingUp, Users,
  ChevronRight, AlertTriangle, Star, Lock,
} from "lucide-react";
import { getCognitiveProfile, SUBJECTS, SUBJECT_LABELS } from "../cognitiveProfileStore";
import { getPermission }   from "../permissionsStore";
import { rankCohort, TIER_COLOR, TIER_BG } from "../admissionsEngine";
import UniversityStudentProfile from "./UniversityStudentProfile";
import type { Cohort, UniversityStudentRef, Programme } from "../universityStore";

// ── Types ──────────────────────────────────────────────────────────

type Tab = "overview" | "heatmap" | "trends" | "applicants";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview",   label: "Overview",   icon: <BarChart2 size={11} />  },
  { id: "heatmap",    label: "Heatmap",    icon: <Grid3x3 size={11} />    },
  { id: "trends",     label: "Trends",     icon: <TrendingUp size={11} /> },
  { id: "applicants", label: "Applicants", icon: <Users size={11} />      },
];

// ── Helpers ────────────────────────────────────────────────────────

const HEAT_COLOR = (s: number) =>
  s >= 75 ? "bg-emerald-500" : s >= 55 ? "bg-amber-400" : s >= 35 ? "bg-orange-500" : "bg-red-500";
const HEAT_TEXT  = (s: number) =>
  s >= 75 ? "text-emerald-400" : s >= 55 ? "text-amber-400" : s >= 35 ? "text-orange-400" : "text-red-400";

function avg(nums: number[]) {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((s, n) => s + n, 0) / nums.length);
}

function cohortAvgReadiness(students: UniversityStudentRef[]): number {
  const scores = students.map(s => {
    const p = getCognitiveProfile(s.studentId);
    return avg(p.conceptMastery.map(m => m.mastery));
  });
  return avg(scores);
}

// ── Readiness ring ─────────────────────────────────────────────────

function ReadinessRing({ score, size = 90 }: { score: number; size?: number }) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
      <motion.circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth="7"
        strokeLinecap="round" strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - score / 100) }}
        transition={{ duration: 1, ease: "easeOut" }}
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      <text x={size/2} y={size/2} textAnchor="middle" fill="white"
        fontSize="15" fontWeight="900" dy="0.35em">{score}%
      </text>
    </svg>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────

function OverviewTab({ cohort }: { cohort: Cohort }) {
  const classScore = cohortAvgReadiness(cohort.students);

  // Grade distribution from mastery
  const gradeDist: Record<string, number> = {};
  cohort.students.forEach(s => {
    const p = getCognitiveProfile(s.studentId);
    const m = avg(p.conceptMastery.map(x => x.mastery));
    const grade = m >= 85 ? "A*" : m >= 70 ? "A" : m >= 55 ? "B" : m >= 40 ? "C" : "D";
    gradeDist[grade] = (gradeDist[grade] ?? 0) + 1;
  });

  // Weak/strong by subject
  const subjectAvgs = SUBJECTS.map(subjId => {
    const scores = cohort.students.map(s => {
      const p = getCognitiveProfile(s.studentId);
      return p.conceptMastery.find(m => m.subjectId === subjId)?.mastery ?? 0;
    });
    return { subjId, avg: avg(scores) };
  });
  const weakSubjects   = [...subjectAvgs].sort((a, b) => a.avg - b.avg).slice(0, 3);
  const strongSubjects = [...subjectAvgs].sort((a, b) => b.avg - a.avg).slice(0, 3);

  const engagementScore = avg(cohort.students.map(s => getCognitiveProfile(s.studentId).consistencyScore));

  return (
    <div className="flex flex-col gap-5">
      {/* Ring + stats */}
      <div className="flex items-center gap-6 p-5 rounded-2xl bg-[#0f1117] border border-white/[0.07]">
        <ReadinessRing score={classScore} size={100} />
        <div>
          <p className="text-[14px] font-bold text-white">Cohort average: {classScore}%</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{cohort.students.length} students · {cohort.year}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(gradeDist).map(([g, n]) => (
              <span key={g} className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-[10px] text-slate-300">
                {g}: <strong>{n}</strong>
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Engagement: <span className="text-sky-400 font-bold">{engagementScore}%</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
          <div className="flex items-center gap-1.5 mb-2"><AlertTriangle size={10} className="text-amber-400" />
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Weak subjects</p>
          </div>
          {weakSubjects.map(w => (
            <div key={w.subjId} className="flex items-center gap-2 py-1 border-b border-white/[0.04] last:border-0">
              <span className="flex-1 text-[11px] text-slate-300">{SUBJECT_LABELS[w.subjId] ?? w.subjId}</span>
              <span className={`text-[11px] font-bold ${HEAT_TEXT(w.avg)}`}>{w.avg}%</span>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
          <div className="flex items-center gap-1.5 mb-2"><Star size={10} className="text-emerald-400" />
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Strong subjects</p>
          </div>
          {strongSubjects.map(s => (
            <div key={s.subjId} className="flex items-center gap-2 py-1 border-b border-white/[0.04] last:border-0">
              <span className="flex-1 text-[11px] text-slate-300">{SUBJECT_LABELS[s.subjId] ?? s.subjId}</span>
              <span className="text-[11px] font-bold text-emerald-400">{s.avg}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeatmapTab({ cohort }: { cohort: Cohort }) {
  const [tooltip, setTooltip] = useState<{ studentId: string; subjId: string } | null>(null);

  function getScore(studentId: string, subjId: string): number {
    const p = getCognitiveProfile(studentId);
    return p.conceptMastery.find(m => m.subjectId === subjId)?.mastery ?? 0;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        {/* Headers */}
        <div className="flex gap-1 mb-1 ml-24">
          {SUBJECTS.map(s => (
            <div key={s} className="w-20 text-[8px] text-slate-500 text-center truncate px-0.5">
              {SUBJECT_LABELS[s]?.split(" ")[0]}
            </div>
          ))}
          <div className="w-12 text-[8px] text-slate-500 text-center">Avg</div>
        </div>

        {cohort.students.map(student => {
          const studentAvg = avg(SUBJECTS.map(s => getScore(student.studentId, s)));
          return (
            <div key={student.studentId} className="flex items-center gap-1 mb-1">
              <div className="w-24 flex items-center gap-1.5 shrink-0">
                <div className={`w-5 h-5 rounded-full ${student.accent} flex items-center justify-center text-[8px] font-bold text-white`}>
                  {student.avatar.slice(0, 1)}
                </div>
                <span className="text-[9px] text-slate-400 truncate">{student.name.split(" ")[0]}</span>
              </div>
              {SUBJECTS.map(subjId => {
                const score = getScore(student.studentId, subjId);
                const isHovered = tooltip?.studentId === student.studentId && tooltip?.subjId === subjId;
                return (
                  <div
                    key={subjId}
                    onMouseEnter={() => setTooltip({ studentId: student.studentId, subjId })}
                    onMouseLeave={() => setTooltip(null)}
                    className={`relative w-20 h-7 rounded flex items-center justify-center text-[10px] font-bold text-white cursor-default ${HEAT_COLOR(score)} transition-all ${isHovered ? "scale-110 z-10" : ""}`}
                    style={{ opacity: 0.4 + (score / 100) * 0.6 }}
                  >
                    {score}
                    {isHovered && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-lg bg-[#1e2030] border border-white/[0.12] text-[9px] text-white whitespace-nowrap z-20 shadow-lg">
                        {student.name.split(" ")[0]} · {SUBJECT_LABELS[subjId]?.split(" ")[0]}: {score}%
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Student avg */}
              <div className={`w-12 text-center text-[11px] font-bold ${HEAT_TEXT(studentAvg)}`}>{studentAvg}%</div>
            </div>
          );
        })}

        {/* Column averages */}
        <div className="flex gap-1 mt-2 ml-24 pt-2 border-t border-white/[0.06]">
          {SUBJECTS.map(subjId => {
            const colAvg = avg(cohort.students.map(s => getScore(s.studentId, subjId)));
            return (
              <div key={subjId} className={`w-20 text-center text-[10px] font-bold ${HEAT_TEXT(colAvg)}`}>
                {colAvg}%
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400 ml-24 mt-0.5">cohort avg</p>
      </div>
    </div>
  );
}

function TrendsTab({ cohort }: { cohort: Cohort }) {
  // Weekly consistency + improvement bucket for past 12 weeks
  const WEEKS = 12;
  const weeklyConsistency = Array.from({ length: WEEKS }, (_, wi) => {
    const scores = cohort.students.map(s => {
      const p = getCognitiveProfile(s.studentId);
      // Simulated: use consistency score weighted by week position
      return Math.max(0, p.consistencyScore - (WEEKS - 1 - wi) * 2 + Math.round(Math.sin(wi) * 5));
    });
    return avg(scores);
  });

  const weeklyImprovement = Array.from({ length: WEEKS }, (_, wi) => {
    const rates = cohort.students.map(s => {
      const p = getCognitiveProfile(s.studentId);
      return p.improvementRate + Math.sin(wi + s.studentId.charCodeAt(0)) * 0.3;
    });
    return rates.reduce((s, r) => s + r, 0) / rates.length;
  });

  const maxC = Math.max(...weeklyConsistency, 1);
  const W = 380; const H = 90;

  const consistencyPath = weeklyConsistency.map((v, i) => {
    const x = (i / (WEEKS - 1)) * W;
    const y = H - (v / maxC) * (H - 10) - 5;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Consistency Trend (12 weeks)</p>
        <svg width="100%" height={H + 20} viewBox={`0 0 ${W} ${H + 20}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={consistencyPath + ` L ${W} ${H} L 0 ${H} Z`} fill="url(#cg)" />
          <path d={consistencyPath} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
          {weeklyConsistency.map((v, i) => (
            <circle key={i} cx={(i / (WEEKS - 1)) * W} cy={H - (v / maxC) * (H - 10) - 5}
              r="3" fill="#6366f1" />
          ))}
          <text x="0" y={H + 16} fontSize="8" fill="rgba(255,255,255,0.25)">12 weeks ago</text>
          <text x={W - 30} y={H + 16} fontSize="8" fill="rgba(255,255,255,0.25)">Today</text>
        </svg>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Improvement Rate Trend</p>
        <div className="flex gap-2 items-end h-16">
          {weeklyImprovement.map((v, i) => {
            const h = Math.max(4, Math.abs(v) / 3.5 * 48);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className={`w-full rounded-sm ${v >= 0 ? "bg-emerald-500/50" : "bg-red-500/50"}`}
                  style={{ height: h }}
                />
                {i % 3 === 0 && (
                  <span className="text-[7px] text-slate-600">{WEEKS - i}w</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 mt-2">
          <div className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-emerald-500/50 inline-block" /><span className="text-[11px] text-slate-400">Improving</span></div>
          <div className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-red-500/50 inline-block" /><span className="text-[11px] text-slate-400">Declining</span></div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Deep Work Trend</p>
        <p className="text-[11px] text-slate-400">
          Avg deep-work sessions: <strong className="text-violet-400">
            {avg(cohort.students.map(s => getCognitiveProfile(s.studentId).deepWorkSessions))}
          </strong> this semester
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          Avg total study hours: <strong className="text-indigo-400">
            {avg(cohort.students.map(s => getCognitiveProfile(s.studentId).totalStudyHours))}h
          </strong>
        </p>
      </div>
    </div>
  );
}

function ApplicantsTab({
  cohort, programmes, universityId, onSelectStudent,
}: {
  cohort: Cohort;
  programmes: Programme[];
  universityId: string;
  onSelectStudent: (s: UniversityStudentRef) => void;
}) {
  const ranked = rankCohort(
    cohort.students.filter(s => s.permissionGranted).map(s => s.studentId),
    programmes,
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-slate-500">
        {cohort.students.filter(s => s.permissionGranted).length} of {cohort.students.length} students have granted access
      </p>

      {cohort.students.filter(s => !s.permissionGranted).length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <Lock size={11} className="text-slate-600" />
          <p className="text-[11px] text-slate-500">
            {cohort.students.filter(s => !s.permissionGranted).length} students have not shared their profiles
          </p>
        </div>
      )}

      {ranked.map(r => {
        const student = cohort.students.find(s => s.studentId === r.studentId);
        if (!student) return null;
        void getPermission(student.studentId, universityId);
        return (
          <motion.button
            key={r.studentId}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectStudent(student)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${TIER_BG[r.tier]}`}
          >
            <span className="text-[11px] font-bold text-slate-600 w-5 shrink-0">#{r.ranking}</span>
            <div className={`w-8 h-8 rounded-full ${student.accent} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
              {student.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-white">{student.name}</p>
              <p className={`text-[9px] font-bold uppercase tracking-wide mt-0.5 ${TIER_COLOR[r.tier]}`}>
                {r.tier}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[14px] font-black text-white">{r.strengthScore}</p>
              <p className="text-[11px] text-slate-400">strength</p>
            </div>
            <ChevronRight size={12} className="text-slate-600 shrink-0" />
          </motion.button>
        );
      })}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────

interface Props {
  cohort:       Cohort;
  programmes:   Programme[];
  universityId: string;
  onBack:       () => void;
}

export default function CohortAnalytics({ cohort, programmes, universityId, onBack }: Props) {
  const [tab,            setTab]            = useState<Tab>("overview");
  const [selectedStudent, setSelectedStudent] = useState<UniversityStudentRef | null>(null);

  if (selectedStudent) {
    const perm = getPermission(selectedStudent.studentId, universityId);
    return (
      <UniversityStudentProfile
        student={selectedStudent}
        permission={perm}
        onBack={() => setSelectedStudent(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors w-fit">
        ← All cohorts
      </button>

      <div>
        <p className="text-[16px] font-black text-white">{cohort.name}</p>
        <p className="text-[11px] text-slate-500">{cohort.students.length} students · Year {cohort.year}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-semibold transition-all ${
              tab === t.id ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{   opacity: 0, y: -6 }}
          transition={{ duration: 0.16 }}
        >
          {tab === "overview"   && <OverviewTab   cohort={cohort} />}
          {tab === "heatmap"    && <HeatmapTab    cohort={cohort} />}
          {tab === "trends"     && <TrendsTab      cohort={cohort} />}
          {tab === "applicants" && (
            <ApplicantsTab
              cohort={cohort}
              programmes={programmes}
              universityId={universityId}
              onSelectStudent={setSelectedStudent}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}