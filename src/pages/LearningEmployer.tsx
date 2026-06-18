/* ══════════════════════════════════════════════════════════════
   LearningEmployer — Employer Mode orchestrator
   Employer picker → Dashboard → Assessment / Results
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, ChevronRight, Briefcase } from "lucide-react";
import { useEmployerStore, addResult } from "../features/employer/employerStore";
import type { Employer, Assessment, AssessmentResult } from "../features/employer/employerStore";
import { useGroupsStore } from "../features/groups/groupsStore";
import EmployerDashboard   from "../features/employer/components/EmployerDashboard";
import AssessmentView      from "../features/employer/components/AssessmentView";
import AssessmentResults   from "../features/employer/components/AssessmentResults";
import CreateAssessmentModal from "../features/employer/components/CreateAssessmentModal";
import SectionLabel from "../features/cards/components/shared/SectionLabel";

type View =
  | { type: "picker"     }
  | { type: "dashboard"; employer: Employer }
  | { type: "assessment"; employer: Employer; assessment: Assessment }
  | { type: "results";    employer: Employer; assessment: Assessment };

export default function LearningEmployer() {
  const store       = useEmployerStore();
  const groupsStore = useGroupsStore();

  const [view,     setView]     = useState<View>({ type: "picker" });
  const [creating, setCreating] = useState<Employer | null>(null);

  // ── Helpers ──
  const go = (v: View) => setView(v);

  const handleAssessmentComplete = (
    employer:    Employer,
    assessment:  Assessment,
    partial: Omit<AssessmentResult, "userId" | "userName" | "userInitials" | "userAccent" | "date">,
  ) => {
    const result: AssessmentResult = {
      ...partial,
      userId:       "u-francis",
      userName:     "Francis",
      userInitials: "FR",
      userAccent:   "bg-indigo-500",
      date:         new Date(),
    };

    addResult(employer.id, assessment.id, result);

    // Post to all joined groups
    groupsStore.groups
      .filter(g => g.localUserRole !== null)
      .forEach(group => {
        groupsStore.addActivity(group.id, {
          type:         "milestone",
          userId:       "u-francis",
          userName:     "Francis",
          userInitials: "FR",
          userAccent:   "bg-indigo-500",
          message:      `Francis completed employer assessment "${assessment.title}" — ${result.score}%`,
          timestamp:    new Date(),
          meta:         { score: result.score, cardTitle: assessment.title },
        });
      });

    go({ type: "results", employer, assessment });
  };

  // ── Picker view ──
  if (view.type === "picker") {
    return (
      <div className="flex flex-col gap-5 px-1 py-2">
        <div>
          <h2 className="text-[16px] font-bold text-white/90">Employer Mode</h2>
          <p className="text-[11px] text-white/35 mt-0.5">Create assessments, hire smarter, verify mastery</p>
        </div>

        <div className="flex flex-col gap-2.5">
          {store.employers.map((emp, i) => {
            const totalResults = emp.assessments.reduce((s, a) => s + a.results.length, 0);
            const avgScore = totalResults === 0 ? null : Math.round(
              emp.assessments.flatMap(a => a.results).reduce((s, r) => s + r.score, 0) / totalResults
            );

            return (
              <motion.button
                key={emp.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => go({ type: "dashboard", employer: emp })}
                className="w-full text-left flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-[#0f1117]"
                style={{ boxShadow: "0 10px 36px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06) inset" }}
              >
                <div
                  className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center"
                  style={{ background: emp.logo ?? "linear-gradient(135deg,#1e293b,#0f172a)" }}
                >
                  <Building2 size={18} className="text-white/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-white/88">{emp.name}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{emp.industry}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <SectionLabel>{emp.assessments.length} assessments</SectionLabel>
                    <SectionLabel className="text-white/20">·</SectionLabel>
                    <SectionLabel>{emp.teams.reduce((s, t) => s + t.members.length, 0)} members</SectionLabel>
                    {avgScore !== null && (
                      <>
                        <SectionLabel className="text-white/20">·</SectionLabel>
                        <SectionLabel className="text-amber-400/70">{avgScore}% avg</SectionLabel>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight size={13} className="text-white/15 shrink-0" />
              </motion.button>
            );
          })}
        </div>

        {/* Placeholder CTA */}
        <button
          disabled
          className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-white/[0.08] text-white/20 text-[11px] cursor-not-allowed"
        >
          <Briefcase size={12} /> Connect your company — Phase 9
        </button>
      </div>
    );
  }

  // ── Dashboard ──
  if (view.type === "dashboard") {
    const emp = store.employers.find(e => e.id === view.employer.id) ?? view.employer;
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="dashboard"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.2 }}
        >
          <EmployerDashboard
            employer={emp}
            onCreateAssessment={() => setCreating(emp)}
            onViewResults={a => go({ type: "results", employer: emp, assessment: a })}
            onTakeAssessment={a => go({ type: "assessment", employer: emp, assessment: a })}
          />
          {creating && (
            <CreateAssessmentModal
              employer={creating}
              onClose={() => setCreating(null)}
              onConfirm={draft => {
                store.addAssessment(creating.id, {
                  ...draft,
                  createdBy: "u-francis",
                });
                setCreating(null);
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── Assessment ──
  if (view.type === "assessment") {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="assessment"
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 32 }}
          transition={{ duration: 0.2 }}
        >
          <AssessmentView
            assessment={view.assessment}
            onBack={() => go({ type: "dashboard", employer: view.employer })}
            onComplete={result =>
              handleAssessmentComplete(view.employer, view.assessment, result)
            }
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── Results ──
  if (view.type === "results") {
    // Re-read assessment from store for freshest data
    const freshEmployer    = store.employers.find(e => e.id === view.employer.id) ?? view.employer;
    const freshAssessment  = freshEmployer.assessments.find(a => a.id === view.assessment.id) ?? view.assessment;
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="results"
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 32 }}
          transition={{ duration: 0.2 }}
        >
          <AssessmentResults
            assessment={freshAssessment}
            onBack={() => go({ type: "dashboard", employer: view.employer })}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
}
