/* ══════════════════════════════════════════════════════════════
   UNIVERSITY DASHBOARD — Phase 11
   Programme overview · cohort analytics · admissions insights · benchmarks
   ══════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import {
  BookOpen, Users, BarChart2, TrendingUp, Brain,
  Flame, Clock, Star, AlertTriangle, ChevronRight, Globe,
} from "lucide-react";
import { getCognitiveProfile, SUBJECTS, SUBJECT_LABELS } from "../cognitiveProfileStore";
import { rankCohort, TIER_COLOR, TIER_BG } from "../admissionsEngine";
import type { UniversityProfile, Cohort, Programme } from "../universityStore";

interface Props {
  profile:        UniversityProfile;
  onSelectCohort: (cohort: Cohort) => void;
}

// ── Helpers ────────────────────────────────────────────────────────

function avg(nums: number[]) {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((s, n) => s + n, 0) / nums.length);
}

function cohortReadiness(cohort: Cohort): number {
  return avg(cohort.students.map(s => {
    const p = getCognitiveProfile(s.studentId);
    return avg(p.conceptMastery.map(m => m.mastery));
  }));
}

function cohortConsistency(cohort: Cohort): number {
  return avg(cohort.students.map(s => getCognitiveProfile(s.studentId).consistencyScore));
}

function cohortImprovement(cohort: Cohort): number {
  const rates = cohort.students.map(s => getCognitiveProfile(s.studentId).improvementRate);
  const val = rates.reduce((s, r) => s + r, 0) / rates.length;
  return Math.round(val * 10) / 10;
}

// ── Mini ring ──────────────────────────────────────────────────────

function MiniRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
      <motion.circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth="5"
        strokeLinecap="round" strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - score / 100) }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      <text x={size/2} y={size/2} textAnchor="middle" fill="white"
        fontSize="10" fontWeight="900" dy="0.35em">{score}%</text>
    </svg>
  );
}

// ── Sections ──────────────────────────────────────────────────────

function ProgrammeOverview({ programmes, allCohorts }: { programmes: Programme[]; allCohorts: Cohort[] }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={12} className="text-indigo-400" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Programmes</p>
      </div>
      <div className="flex flex-col gap-3">
        {programmes.map(prog => {
          const progCohorts = allCohorts.filter(c => prog.cohortIds.includes(c.id));
          const allStudents = progCohorts.flatMap(c => c.students);
          const avgReady = avg(allStudents.map(s => {
            const p = getCognitiveProfile(s.studentId);
            return avg(p.conceptMastery.map(m => m.mastery));
          }));
          const avgCons = avg(allStudents.map(s => getCognitiveProfile(s.studentId).consistencyScore));

          return (
            <div key={prog.id} className="flex items-start gap-4 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <BookOpen size={14} className="text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-white">{prog.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{prog.description}</p>
                <div className="flex gap-4 mt-2 text-[10px]">
                  <span className="text-slate-500">Cohorts: <strong className="text-slate-300">{progCohorts.length}</strong></span>
                  <span className="text-slate-500">Students: <strong className="text-slate-300">{allStudents.length}</strong></span>
                  <span className="text-slate-500">Avg readiness: <strong className="text-indigo-300">{avgReady}%</strong></span>
                  <span className="text-slate-500">Consistency: <strong className="text-sky-300">{avgCons}%</strong></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CohortSection({ cohorts, onSelectCohort }: { cohorts: Cohort[]; onSelectCohort: (c: Cohort) => void }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users size={12} className="text-violet-400" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Cohort Analytics</p>
      </div>
      <div className="flex flex-col gap-2">
        {cohorts.map(cohort => {
          const readiness   = cohortReadiness(cohort);
          const consistency = cohortConsistency(cohort);
          const improvement = cohortImprovement(cohort);
          const improvSign  = improvement >= 0 ? "+" : "";
          const improvColor = improvement >= 0.5 ? "text-emerald-400" : improvement >= 0 ? "text-sky-400" : "text-red-400";

          return (
            <motion.button
              key={cohort.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectCohort(cohort)}
              className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all text-left"
            >
              <MiniRing score={readiness} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-white">{cohort.name}</p>
                <div className="flex gap-3 mt-1 text-[11px] text-slate-400">
                  <span>{cohort.students.length} students</span>
                  <span>Consistency <strong className="text-sky-300">{consistency}%</strong></span>
                  <span className={improvColor}>{improvSign}{improvement.toFixed(1)}%/wk</span>
                </div>
              </div>
              <ChevronRight size={13} className="text-slate-600 shrink-0" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function AdmissionsInsights({ cohorts, programmes, universityId }: {
  cohorts: Cohort[]; programmes: Programme[]; universityId: string;
}) {
  const allPermitted = cohorts.flatMap(c => c.students.filter(s => s.permissionGranted));
  if (allPermitted.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Admissions Insights</p>
        <p className="text-[12px] text-slate-500 py-4 text-center">No students have granted permission yet</p>
      </div>
    );
  }

  const ranked = rankCohort(allPermitted.map(s => s.studentId), programmes).slice(0, 6);

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain size={12} className="text-emerald-400" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Top Applicants</p>
        <span className="ml-auto text-[11px] text-slate-400">permission-based</span>
      </div>
      <div className="flex flex-col gap-2">
        {ranked.map(r => {
          const student = allPermitted.find(s => s.studentId === r.studentId);
          if (!student) return null;
          const profile = getCognitiveProfile(r.studentId);
          return (
            <div key={r.studentId}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${TIER_BG[r.tier]}`}>
              <span className="text-[10px] font-bold text-slate-600 w-5">#{r.ranking}</span>
              <div className={`w-7 h-7 rounded-full ${student.accent} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                {student.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white">{student.name}</p>
                <p className={`text-[9px] font-bold uppercase tracking-wide ${TIER_COLOR[r.tier]}`}>{r.tier}</p>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><Flame size={9} className="text-orange-400" />{profile.studyStreak}d</span>
                <span className="flex items-center gap-1"><Brain size={9} className="text-violet-400" />{profile.deepWorkSessions} DW</span>
                <span className="flex items-center gap-1"><BarChart2 size={9} className="text-emerald-400" />{r.strengthScore}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GlobalBenchmarks({ cohorts }: { cohorts: Cohort[] }) {
  // Mock global averages
  const GLOBAL_READINESS   = 61;
  const GLOBAL_CONSISTENCY = 58;
  const GLOBAL_DEEP_WORK   = 24;

  const uniReadiness   = avg(cohorts.map(c => cohortReadiness(c)));
  const uniConsistency = avg(cohorts.map(c => cohortConsistency(c)));
  const uniDeepWork    = avg(cohorts.flatMap(c =>
    c.students.map(s => getCognitiveProfile(s.studentId).deepWorkSessions)
  ));

  const benchmarks = [
    { label: "Avg Readiness",    uni: uniReadiness,   global: GLOBAL_READINESS,   icon: <BarChart2 size={12} />,  unit: "%" },
    { label: "Consistency",      uni: uniConsistency, global: GLOBAL_CONSISTENCY, icon: <TrendingUp size={12} />, unit: "%" },
    { label: "Deep Work/student",uni: uniDeepWork,    global: GLOBAL_DEEP_WORK,   icon: <Brain size={12} />,      unit: " sessions" },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Globe size={12} className="text-sky-400" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">vs. Global Benchmarks</p>
      </div>
      <div className="flex flex-col gap-3">
        {benchmarks.map(b => {
          const diff     = b.uni - b.global;
          const diffSign = diff >= 0 ? "+" : "";
          const diffColor = diff >= 3 ? "text-emerald-400" : diff >= 0 ? "text-sky-400" : "text-red-400";
          const maxVal = Math.max(b.uni, b.global) * 1.15;
          return (
            <div key={b.label} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">{b.icon}</span>
                <p className="text-[11px] text-slate-300 flex-1">{b.label}</p>
                <span className={`text-[10px] font-bold ${diffColor}`}>{diffSign}{diff}{b.unit}</span>
              </div>
              {/* Dual bar */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 w-12">This uni</span>
                  <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(b.uni / maxVal) * 100}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-indigo-300 w-8 text-right">{b.uni}{b.unit}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 w-12">Global</span>
                  <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-slate-600" style={{ width: `${(b.global / maxVal) * 100}%` }} />
                  </div>
                  <span className="text-[11px] text-slate-400 w-8 text-right">{b.global}{b.unit}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────

export default function UniversityDashboard({ profile, onSelectCohort }: Props) {
  const totalStudents = profile.cohorts.reduce((s, c) => s + c.students.length, 0);
  const totalPermitted = profile.cohorts.reduce((s, c) => s + c.students.filter(x => x.permissionGranted).length, 0);
  const overallReadiness = avg(profile.cohorts.map(cohortReadiness));

  return (
    <div className="flex flex-col gap-5">
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Programmes",  value: profile.programmes.length.toString(), icon: <BookOpen size={14} className="text-indigo-400" />  },
          { label: "Cohorts",     value: profile.cohorts.length.toString(),    icon: <Users size={14} className="text-violet-400" />     },
          { label: "Students",    value: totalStudents.toString(),             icon: <Users size={14} className="text-sky-400" />        },
          { label: "Avg Readiness", value: `${overallReadiness}%`,            icon: <BarChart2 size={14} className="text-emerald-400" />},
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

      <div className="px-3 py-2 rounded-xl bg-indigo-500/08 border border-indigo-500/15 text-[11px] text-indigo-300">
        {totalPermitted} of {totalStudents} students have shared profiles ·
        <span className="text-slate-400"> Permission managed per student</span>
      </div>

      <ProgrammeOverview  programmes={profile.programmes} allCohorts={profile.cohorts} />
      <CohortSection      cohorts={profile.cohorts} onSelectCohort={onSelectCohort} />
      <AdmissionsInsights cohorts={profile.cohorts} programmes={profile.programmes} universityId={profile.id} />
      <GlobalBenchmarks   cohorts={profile.cohorts} />
    </div>
  );
}
