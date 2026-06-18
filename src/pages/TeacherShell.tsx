/* ══════════════════════════════════════════════════════════════
   TEACHER SHELL — /teacher
   Standalone shell: dashboard + classroom detail + modals
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, LayoutDashboard, Users, ChevronRight,
  Plus,
} from "lucide-react";
import BackToCockpit      from "../components/BackToCockpit";
import { useTeacherStore } from "../features/teacher/teacherStore";
import TeacherDashboard   from "../features/teacher/components/TeacherDashboard";
import ClassroomDetail    from "../features/teacher/components/ClassroomDetail";
import type { Class }     from "../features/teacher/teacherStore";

// ── View ──────────────────────────────────────────────────────────

type View =
  | { type: "dashboard" }
  | { type: "classroom"; cls: Class };

// ── Shell ──────────────────────────────────────────────────────────

export default function TeacherShell() {
  const { profile }  = useTeacherStore();
  const [view,       setView]     = useState<View>({ type: "dashboard" });
  const [collapsed,  setCollapsed] = useState(false);

  function navLabel(): string {
    if (view.type === "classroom") return view.cls.name;
    return "Dashboard";
  }

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
            <span className="text-[13px] font-bold text-white">Teacher Tools</span>
          </div>

          {view.type === "classroom" && (
            <>
              <span className="text-slate-600">/</span>
              <span className="text-[12px] text-slate-400 truncate max-w-[160px]">{view.cls.name}</span>
            </>
          )}

          <div className="flex-1" />

          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[9.5px] text-slate-400">
              <span className="text-slate-500">{profile.name}</span>
              <span className="font-bold text-slate-200">{profile.school}</span>
            </div>
          </div>

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

            {/* Dashboard link */}
            {[
              {
                id:    "dashboard",
                icon:  <LayoutDashboard size={13} />,
                label: "Dashboard",
                sub:   "Overview",
                onClick: () => setView({ type: "dashboard" }),
                active: view.type === "dashboard",
              },
            ].map(item => (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.97 }}
                onClick={item.onClick}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                  item.active
                    ? "bg-indigo-600/20 border border-indigo-500/30 text-white"
                    : "hover:bg-white/[0.04] border border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className={item.active ? "text-indigo-400" : "text-slate-600"}>{item.icon}</span>
                <div>
                  <p className="text-[11px] font-semibold leading-none">{item.label}</p>
                  <p className="text-[9px] text-slate-600 mt-0.5">{item.sub}</p>
                </div>
              </motion.button>
            ))}

            {/* Classes */}
            <div className="mt-3 px-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Classes</p>
            </div>
            {profile.classes.map(cls => {
              const active = view.type === "classroom" && view.cls.id === cls.id;
              return (
                <motion.button
                  key={cls.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setView({ type: "classroom", cls })}
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
                    <p className="text-[11px] font-semibold leading-none truncate">{cls.name.split("—")[0].trim()}</p>
                    <p className="text-[9px] text-slate-600 mt-0.5">{cls.students.length} students</p>
                  </div>
                </motion.button>
              );
            })}

            <button className="flex items-center gap-2 px-3 py-2 mt-1 rounded-xl text-[11px] text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-colors border border-transparent">
              <Plus size={11} />
              Add class
            </button>
          </div>
        </motion.aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={view.type + (view.type === "classroom" ? view.cls.id : "")}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{   opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="p-6 max-w-3xl"
            >
              {view.type === "dashboard" ? (
                <>
                  <div className="mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Teacher Tools</p>
                    <p className="text-[20px] font-black text-white mt-0.5">Good morning, {profile.name.split(" ").pop()}</p>
                    <p className="text-[12px] text-slate-500">{profile.school} · {profile.classes.length} active classes</p>
                  </div>
                  <TeacherDashboard
                    classes={profile.classes}
                    onSelectClass={cls => setView({ type: "classroom", cls })}
                  />
                </>
              ) : (
                <ClassroomDetail
                  cls={view.cls}
                  onBack={() => setView({ type: "dashboard" })}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
