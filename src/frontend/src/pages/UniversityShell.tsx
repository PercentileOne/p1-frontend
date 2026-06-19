/* ══════════════════════════════════════════════════════════════
   UNIVERSITY SHELL — /university
   Standalone shell: dashboard · cohort analytics · student profiles
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, LayoutDashboard, Users, Shield,
  ChevronRight,
} from "lucide-react";
import BackToCockpit       from "../components/BackToCockpit";
import { useUniversityStore } from "../features/university/universityStore";
import UniversityDashboard    from "../features/university/components/UniversityDashboard";
import CohortAnalytics        from "../features/university/components/CohortAnalytics";
import StudentPermissionModal  from "../features/university/components/StudentPermissionModal";
import type { Cohort }         from "../features/university/universityStore";

// ── View ──────────────────────────────────────────────────────────

type View =
  | { type: "dashboard" }
  | { type: "cohort"; cohort: Cohort }
  | { type: "permissions" };

// ── Shell ──────────────────────────────────────────────────────────

export default function UniversityShell() {
  const { profile }     = useUniversityStore();
  const [view,          setView]      = useState<View>({ type: "dashboard" });
  const [collapsed,     setCollapsed] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0b10] text-slate-200 flex flex-col font-sans">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0f1117]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="px-4 h-13 flex items-center gap-3">
          <BackToCockpit />
          <div className="w-px h-4 bg-white/[0.08]" />
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.28)" }}
            >
              <GraduationCap size={11} className="text-indigo-400" />
            </div>
            <span className="text-[13px] font-bold text-white">University Mode</span>
          </div>

          {view.type === "cohort" && (
            <>
              <span className="text-slate-600">/</span>
              <span className="text-[12px] text-slate-400 truncate max-w-[160px]">{view.cohort.name}</span>
            </>
          )}

          <div className="flex-1" />

          <div className="hidden sm:flex items-center gap-2 text-[9.5px]">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-slate-400">
              <span className="text-slate-500">{profile.name}</span>
            </div>
          </div>

          <button
            onClick={() => setShowPermModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[10px] text-slate-400 hover:text-white transition-colors"
          >
            <Shield size={10} />
            Permissions
          </button>

          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ChevronRight
              size={11}
              className="transition-transform"
              style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)" }}
            />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <motion.aside
          animate={{ width: collapsed ? 0 : 200 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="shrink-0 overflow-hidden border-r border-white/[0.06] bg-[#0f1117]"
        >
          <div className="w-[200px] flex flex-col pt-4 pb-6 px-3 gap-1">

            {/* Dashboard */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setView({ type: "dashboard" })}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                view.type === "dashboard"
                  ? "bg-indigo-600/20 border border-indigo-500/30 text-white"
                  : "hover:bg-white/[0.04] border border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className={view.type === "dashboard" ? "text-indigo-400" : "text-slate-600"}>
                <LayoutDashboard size={13} />
              </span>
              <div>
                <p className="text-[11px] font-semibold leading-none">Dashboard</p>
                <p className="text-[9px] text-slate-600 mt-0.5">Overview</p>
              </div>
            </motion.button>

            {/* Cohorts */}
            <div className="mt-3 px-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Cohorts</p>
            </div>
            {profile.cohorts.map(cohort => {
              const active = view.type === "cohort" && view.cohort.id === cohort.id;
              return (
                <motion.button
                  key={cohort.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setView({ type: "cohort", cohort })}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                    active
                      ? "bg-indigo-600/20 border border-indigo-500/30 text-white"
                      : "hover:bg-white/[0.04] border border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className={active ? "text-indigo-400" : "text-slate-600"}>
                    <Users size={13} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold leading-none truncate">{cohort.name.split(" ").slice(0, 2).join(" ")}</p>
                    <p className="text-[9px] text-slate-600 mt-0.5">{cohort.students.length} students · {cohort.year}</p>
                  </div>
                </motion.button>
              );
            })}

            {/* Permissions shortcut */}
            <div className="mt-auto pt-4 border-t border-white/[0.06]">
              <button
                onClick={() => setShowPermModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-colors border border-transparent w-full"
              >
                <Shield size={11} />
                Data permissions
              </button>
            </div>
          </div>
        </motion.aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={view.type + (view.type === "cohort" ? view.cohort.id : "")}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{   opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="p-6 max-w-3xl"
            >
              {view.type === "dashboard" ? (
                <>
                  <div className="mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">University Mode</p>
                    <p className="text-[20px] font-black text-white mt-0.5">{profile.name}</p>
                    <p className="text-[12px] text-slate-500">
                      {profile.programmes.length} programmes · {profile.cohorts.length} cohorts ·{" "}
                      {profile.cohorts.reduce((s, c) => s + c.students.length, 0)} students
                    </p>
                  </div>
                  <UniversityDashboard
                    profile={profile}
                    onSelectCohort={cohort => setView({ type: "cohort", cohort })}
                  />
                </>
              ) : view.type === "cohort" ? (
                <CohortAnalytics
                  cohort={view.cohort}
                  programmes={profile.programmes}
                  universityId={profile.id}
                  onBack={() => setView({ type: "dashboard" })}
                />
              ) : (
                <div />

              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Permission modal — uses demo student */}
      <AnimatePresence>
        {showPermModal && (
          <StudentPermissionModal
            studentId="u-francis"
            universityId={profile.id}
            universityName={profile.name}
            onClose={() => setShowPermModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
