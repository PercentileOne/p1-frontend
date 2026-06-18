/* ══════════════════════════════════════════════════════════════
   StudentShell — /student
   P1 Student Edition: GCSE / A-Level learning environment
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, Home, BookOpen, ClipboardList,
  Zap, ChevronRight, ArrowLeft,
} from "lucide-react";
import { useSubjectsStore } from "../features/student/subjectsStore";
import { useHomeworkStore }  from "../features/student/homeworkStore";
import { useDailyLearningStore } from "../features/student/dailyLearningStore";
import type { Subject, Subtopic } from "../features/student/subjectsStore";

import StudentHome         from "../features/student/components/StudentHome";
import SubjectDetail       from "../features/student/components/SubjectDetail";
import StudyModes          from "../features/student/components/StudyModes";
import ImportHomeworkModal from "../features/student/components/ImportHomeworkModal";
import DailyLearningModal  from "../features/student/components/DailyLearningModal";
import { addHomework }     from "../features/student/homeworkStore";
import { addDailyEntry }   from "../features/student/dailyLearningStore";
import BackToCockpit from "../components/BackToCockpit";

type View =
  | { type: "home"     }
  | { type: "subject"; subject: Subject }
  | { type: "study"    }
  | { type: "subjects" };

const NAV_ITEMS = [
  { view: "home"     as const, icon: <Home         size={13} />, label: "Home"     },
  { view: "subjects" as const, icon: <BookOpen     size={13} />, label: "Subjects" },
  { view: "study"    as const, icon: <Zap          size={13} />, label: "Revision" },
];

export default function StudentShell() {
  const subjectsStore = useSubjectsStore();
  const hwStore       = useHomeworkStore();
  const dlStore       = useDailyLearningStore();

  const [view,       setView]       = useState<View>({ type: "home" });
  const [showHW,     setShowHW]     = useState(false);
  const [showDL,     setShowDL]     = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);

  const activeNav =
    view.type === "home"    ? "home"     :
    view.type === "subjects" || view.type === "subject" ? "subjects" :
    view.type === "study"   ? "study"    : "home";

  const handleNavClick = (v: View["type"]) => {
    if (v === "home")     setView({ type: "home" });
    if (v === "subjects") setView({ type: "subjects" });
    if (v === "study")    setView({ type: "study" });
  };

  return (
    <div className="min-h-screen bg-[#0a0b10] text-slate-200 flex flex-col font-sans">

      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-[#0f1117]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="px-4 h-13 flex items-center gap-3">
          <BackToCockpit />
          <div className="w-px h-4 bg-white/[0.08]" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/15 border border-emerald-500/25">
              <GraduationCap size={12} className="text-emerald-400" />
            </div>
            <span className="text-[13px] font-bold text-white">Student Edition</span>
            <span className="text-[8px] font-bold text-emerald-400/60 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/15">GCSE</span>
          </div>

          <div className="flex-1" />

          <div className="hidden sm:flex items-center gap-2">
            {[
              { label: "Subjects", value: String(subjectsStore.subjects.length) },
              { label: "Streak",   value: "7d 🔥" },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[9.5px] text-slate-400">
                <span className="text-slate-500">{s.label}</span>
                <span className="font-bold text-slate-200">{s.value}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ChevronRight size={11} className="transition-transform" style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)" }} />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <motion.aside
          animate={{ width: collapsed ? 0 : 200 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="shrink-0 overflow-hidden border-r border-white/[0.06] bg-[#0f1117]"
        >
          <div className="w-[200px] flex flex-col pt-4 pb-6 px-3 gap-1">
            {NAV_ITEMS.map(item => {
              const active = activeNav === item.view;
              return (
                <motion.button
                  key={item.view}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleNavClick(item.view)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                    active
                      ? "bg-emerald-600/20 border border-emerald-500/30 text-white"
                      : "hover:bg-white/[0.04] border border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className={active ? "text-emerald-400" : "text-slate-600"}>{item.icon}</span>
                  <p className="text-[11px] font-semibold leading-none">{item.label}</p>
                </motion.button>
              );
            })}

            <div className="mt-2 px-3 py-1.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/20">Subjects</p>
            </div>
            {subjectsStore.subjects.map(s => (
              <motion.button
                key={s.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setView({ type: "subject", subject: s })}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all ${
                  view.type === "subject" && view.subject.id === s.id
                    ? "bg-white/[0.08] border border-white/[0.12] text-white/90"
                    : "hover:bg-white/[0.04] border border-transparent text-slate-400"
                }`}
              >
                <span className="text-[14px]">{s.emoji}</span>
                <span className="text-[10px] font-medium truncate">{s.name}</span>
              </motion.button>
            ))}
          </div>
        </motion.aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto px-4 py-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={view.type + (view.type === "subject" ? view.subject.id : "")}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
              >
                {view.type === "home" && (
                  <StudentHome
                    subjects={subjectsStore.subjects}
                    onImportHomework={() => setShowHW(true)}
                    onDailyLearning={()  => setShowDL(true)}
                    onStartRevision={()  => setView({ type: "study" })}
                    onSelectSubject={s   => setView({ type: "subject", subject: s })}
                  />
                )}

                {view.type === "subjects" && (
                  <SubjectsList
                    subjects={subjectsStore.subjects}
                    onSelect={s => setView({ type: "subject", subject: s })}
                  />
                )}

                {view.type === "subject" && (
                  <SubjectDetail
                    subject={subjectsStore.subjects.find(s => s.id === view.subject.id) ?? view.subject}
                    homework={hwStore.homework}
                    dailyEntries={dlStore.entries}
                    onBack={() => setView({ type: "home" })}
                    onStudySubtopic={(_st: Subtopic) => setView({ type: "study" })}
                    onToggleHW={hwStore.toggleComplete}
                  />
                )}

                {view.type === "study" && (
                  <StudyModes
                    subjects={subjectsStore.subjects}
                    onBack={() => setView({ type: "home" })}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Modals */}
      {showHW && (
        <ImportHomeworkModal
          onClose={() => setShowHW(false)}
          onConfirm={data => {
            addHomework({
              ...data,
              completed: false,
            });
            setShowHW(false);
          }}
        />
      )}

      {showDL && (
        <DailyLearningModal
          onClose={() => setShowDL(false)}
          onConfirm={data => {
            addDailyEntry(data);
            setShowDL(false);
          }}
        />
      )}
    </div>
  );
}

// ── Subjects list view ─────────────────────────────────────────────

function SubjectsList({ subjects, onSelect }: { subjects: Subject[]; onSelect: (s: Subject) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[16px] font-bold text-white/90">Subjects</h2>
        <p className="text-[11px] text-white/35 mt-0.5">{subjects.length} subjects · GCSE revision</p>
      </div>
      <div className="flex flex-col gap-3">
        {subjects.map((s, i) => {
          const allST = s.topics.flatMap(t => t.subtopics);
          const avg   = allST.length === 0 ? 0 : Math.round(allST.reduce((sum, st) => sum + st.readinessScore, 0) / allST.length);
          const daysLeft = s.examDate ? Math.ceil((s.examDate.getTime() - Date.now()) / 86400000) : null;

          return (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(s)}
              className="w-full text-left flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-[#0f1117]"
              style={{ boxShadow: "0 8px 28px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05) inset" }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-[24px]"
                style={{ background: s.color + "15", border: `1px solid ${s.color}25` }}
              >
                {s.emoji}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[13px] font-bold text-white/88">{s.name}</p>
                  <span className="text-[8px] text-white/30 border border-white/[0.08] rounded px-1 py-0.5">{s.examBoard}</span>
                </div>
                <div className="flex items-center gap-3 text-[9px] text-white/30">
                  <span><BookOpen size={8} className="inline mr-1" />{s.topics.length} topics</span>
                  {daysLeft !== null && <span><ClipboardList size={8} className="inline mr-1" />{daysLeft}d to exam</span>}
                </div>
                <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${avg}%`, background: s.color }} />
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-[15px] font-black" style={{ color: s.color }}>{avg}%</p>
                <p className="text-[8px] text-white/25">readiness</p>
              </div>

              <ChevronRight size={13} className="text-white/15 shrink-0" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
