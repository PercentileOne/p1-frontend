/* ══════════════════════════════════════════════════════════════
   EmployerDashboard — overview + assessments + team members
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Users, ClipboardList, BarChart3, Trophy,
  ChevronRight, CheckCircle2, Clock, UserPlus,
  Building2, Briefcase,
} from "lucide-react";
import type { Employer, Assessment, Team } from "../employerStore";
import SectionLabel from "../../cards/components/shared/SectionLabel";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function scoreColor(n: number) {
  return n >= 80 ? "text-emerald-400" : n >= 60 ? "text-amber-400" : "text-red-400";
}

// ── Avatar stack ──────────────────────────────────────────────────

function AvatarStack({ accents, max = 4 }: { accents: string[]; max?: number }) {
  const shown = accents.slice(0, max);
  const extra = accents.length - max;
  return (
    <div className="flex items-center">
      {shown.map((a, i) => (
        <div
          key={i}
          className={`w-5 h-5 rounded-full ${a} border-2 border-[#0f1117] -ml-1.5 first:ml-0`}
        />
      ))}
      {extra > 0 && (
        <div className="w-5 h-5 rounded-full bg-white/[0.08] border-2 border-[#0f1117] -ml-1.5 flex items-center justify-center">
          <span className="text-[7px] font-bold text-white/50">+{extra}</span>
        </div>
      )}
    </div>
  );
}

// ── Assessment card ───────────────────────────────────────────────

function AssessmentCard({
  assessment, onView, onTake,
}: {
  assessment: Assessment;
  onView:     () => void;
  onTake:     () => void;
}) {
  const avg    = assessment.results.length
    ? Math.round(assessment.results.reduce((s, r) => s + r.score, 0) / assessment.results.length)
    : null;
  const passed = assessment.results.filter(r => r.score >= 70).length;

  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="flex flex-col gap-0 rounded-2xl border border-white/[0.06] bg-[#0f1117] overflow-hidden"
      style={{ boxShadow: "0 8px 28px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05) inset" }}
    >
      <div className="h-[2px] bg-gradient-to-r from-indigo-500/60 to-violet-500/40" />

      <div className="p-3.5 flex flex-col gap-2.5">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-white/85 leading-snug">{assessment.title}</p>
            <p className="text-[10px] text-white/35 mt-0.5 line-clamp-1">{assessment.description}</p>
          </div>
          {avg !== null && (
            <span className={`text-[12px] font-black shrink-0 ${scoreColor(avg)}`}>{avg}%</span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[9px] text-white/30">
          <span className="flex items-center gap-1"><ClipboardList size={8} /> {assessment.sections.length} sections</span>
          <span className="flex items-center gap-1"><Users size={8} /> {assessment.assignedTo.length} assigned</span>
          {assessment.results.length > 0 && (
            <span className="flex items-center gap-1"><CheckCircle2 size={8} className="text-emerald-400/60" /> {passed} passed</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-0.5">
          <button
            onClick={onTake}
            className="flex-1 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/25 text-indigo-400 text-[10px] font-bold hover:bg-indigo-600/30 transition-colors"
          >
            Take Assessment
          </button>
          <button
            onClick={onView}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white/35 text-[10px] font-bold hover:text-white/60 transition-colors"
          >
            <BarChart3 size={10} /> Results
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Team section ──────────────────────────────────────────────────

function TeamCard({ team }: { team: Team }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <Users size={12} className="text-indigo-400 shrink-0" />
        <span className="flex-1 text-[12px] font-semibold text-white/75">{team.name}</span>
        <AvatarStack accents={team.members.map(m => m.accent)} />
        <SectionLabel className="ml-2">{team.members.length}</SectionLabel>
        <ChevronRight size={11} className={`text-white/20 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 flex flex-col gap-1 border-t border-white/[0.05]">
              {team.members.map(m => (
                <div key={m.userId} className="flex items-center gap-2.5 py-1.5">
                  <div className={`w-7 h-7 rounded-lg ${m.accent} flex items-center justify-center shrink-0`}>
                    <span className="text-[9px] font-bold text-white">{m.initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-white/70">{m.name}</p>
                    <p className="text-[9px] text-white/25 capitalize">{m.role}</p>
                  </div>
                  <span className="text-[8px] text-white/20">
                    {m.joinedAt.toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main EmployerDashboard ────────────────────────────────────────

interface Props {
  employer:          Employer;
  onCreateAssessment: () => void;
  onViewResults:     (assessment: Assessment) => void;
  onTakeAssessment:  (assessment: Assessment) => void;
}

export default function EmployerDashboard({
  employer, onCreateAssessment, onViewResults, onTakeAssessment,
}: Props) {
  const totalCandidates = employer.teams.flatMap(t => t.members).filter(m => m.role === "candidate").length;
  const totalResults    = employer.assessments.reduce((s, a) => s + a.results.length, 0);
  const avgScore        = totalResults === 0 ? null : Math.round(
    employer.assessments.flatMap(a => a.results).reduce((s, r) => s + r.score, 0) / totalResults
  );

  return (
    <div className="flex flex-col gap-5 px-1 py-2">

      {/* Header */}
      <div
        className="relative flex items-center gap-4 p-4 rounded-2xl border border-white/[0.07]"
        style={{ background: employer.logo ?? "linear-gradient(135deg, #1e293b, #0f172a)" }}
      >
        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <Building2 size={20} className="text-white/60" />
        </div>
        <div>
          <h2 className="text-[16px] font-bold text-white/90">{employer.name}</h2>
          <p className="text-[10px] text-white/40">{employer.industry} · Employer Mode</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: <ClipboardList size={12} className="text-indigo-400" />, label: "Assessments", value: String(employer.assessments.length) },
          { icon: <Users         size={12} className="text-sky-400"    />, label: "Teams",       value: String(employer.teams.length)       },
          { icon: <Briefcase     size={12} className="text-violet-400" />, label: "Candidates",  value: String(totalCandidates)             },
          { icon: <Trophy        size={12} className="text-amber-400"  />, label: "Avg score",   value: avgScore !== null ? `${avgScore}%` : "—" },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            {s.icon}
            <span className="text-[14px] font-black text-white/85">{s.value}</span>
            <SectionLabel>{s.label}</SectionLabel>
          </div>
        ))}
      </div>

      {/* Assessments */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <SectionLabel>Assessments</SectionLabel>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onCreateAssessment}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-bold transition-colors"
          >
            <Plus size={10} /> Create
          </motion.button>
        </div>
        {employer.assessments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 rounded-2xl border border-white/[0.05] bg-white/[0.02]">
            <ClipboardList size={18} className="text-white/20" />
            <p className="text-[12px] text-white/30">No assessments yet</p>
            <button onClick={onCreateAssessment} className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors">
              Create your first assessment →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {employer.assessments.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <AssessmentCard
                  assessment={a}
                  onView={() => onViewResults(a)}
                  onTake={() => onTakeAssessment(a)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Teams */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <SectionLabel>Teams</SectionLabel>
          <button className="flex items-center gap-1 text-[9px] text-white/25 hover:text-white/50 transition-colors">
            <UserPlus size={10} /> Add member
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {employer.teams.map(team => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      </div>

      {/* Recent results strip */}
      {totalResults > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Recent results</SectionLabel>
          <div className="flex flex-col gap-1.5">
            {employer.assessments
              .flatMap(a => a.results.map(r => ({ ...r, assessmentTitle: a.title })))
              .sort((a, b) => b.date.getTime() - a.date.getTime())
              .slice(0, 5)
              .map((r, i) => (
                <motion.div
                  key={`${r.userId}-${i}`}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]"
                >
                  <div className={`w-7 h-7 rounded-lg ${r.userAccent} flex items-center justify-center shrink-0`}>
                    <span className="text-[9px] font-bold text-white">{r.userInitials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-white/70">{r.userName}</p>
                    <p className="text-[9px] text-white/30 truncate">{r.assessmentTitle}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-white/30">
                    <Clock size={8} />
                    <span>{fmt(r.timeUsed)}</span>
                  </div>
                  <span className={`text-[12px] font-black ${scoreColor(r.score)}`}>{r.score}%</span>
                </motion.div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
