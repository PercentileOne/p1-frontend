import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, Users, Trophy, Briefcase, Clock, LayoutGrid,
  ChevronRight, Globe, Book, GraduationCap, Heart,
} from "lucide-react";
import BackToCockpit from "../components/BackToCockpit";

/* ══════════════════════════════════════════════════════════════
   LEARNING CENTRE SHELL — /learning/*
   Left sidebar + sticky header + <Outlet> main panel
   ══════════════════════════════════════════════════════════════ */

const NAV = [
  { path: "/learning/cards",          icon: <LayoutGrid size={13} />,  label: "Cards",           sub: "Study & test" },
  { path: "/learning/notes",          icon: <BookOpen size={13} />,    label: "Study Notes",     sub: "Write & scan" },
  { path: "/learning/books",          icon: <Book size={13} />,        label: "Books",           sub: "Ingest & extract" },
  { path: "/learning/queue",          icon: <Clock size={13} />,       label: "Study Queue",     sub: "Priority order" },
  { path: "/learning/groups",         icon: <Globe size={13} />,       label: "Groups",          sub: "Study together" },
  { path: "/learning/multiplayer",    icon: <Users size={13} />,       label: "Multiplayer",     sub: "Race to learn" },
  { path: "/learning/certifications", icon: <Trophy size={13} />,      label: "Certifications",  sub: "Readiness score" },
  { path: "/learning/employer",       icon: <Briefcase size={13} />,   label: "Employer Mode",   sub: "Assessments" },
  { path: "/student",                 icon: <GraduationCap size={13} />, label: "Student Edition", sub: "GCSE · A-Level" },
  { path: "/parent",                  icon: <Heart size={13} />,          label: "Parent Dashboard", sub: "Track & support"  },
  { path: "/teacher",                 icon: <GraduationCap size={13} />,  label: "Teacher Tools",    sub: "Classrooms & marks"    },
  { path: "/university",              icon: <GraduationCap size={13} />,  label: "University Mode",  sub: "Cohorts & admissions"  },
];

const GLOBAL_STATS = [
  { label: "Cards", value: "6" },
  { label: "Avg Mastery", value: "64%" },
  { label: "Streak", value: "7d" },
];

export default function LearningShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0b10] text-slate-200 flex flex-col font-sans">

      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-[#0f1117]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="px-4 h-13 flex items-center gap-3">
          <BackToCockpit />
          <div className="w-px h-4 bg-white/[0.08]" />
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.25)" }}
            >
              <BookOpen size={11} className="text-indigo-400" />
            </div>
            <span className="text-[13px] font-bold text-white">Learning Centre</span>
          </div>

          <div className="flex-1" />

          {/* Global stats */}
          <div className="hidden sm:flex items-center gap-2">
            {GLOBAL_STATS.map(s => (
              <div
                key={s.label}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[11px] text-slate-400"
              >
                <span className="text-slate-500">{s.label}</span>
                <span className="font-bold text-slate-200">{s.value}</span>
              </div>
            ))}
          </div>

          {/* Collapse toggle */}
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

      {/* Body = sidebar + main */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar */}
        <motion.aside
          animate={{ width: collapsed ? 0 : 200 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="shrink-0 overflow-hidden border-r border-white/[0.06] bg-[#0f1117]"
        >
          <div className="w-[200px] flex flex-col pt-4 pb-6 px-3 gap-1">
            {NAV.map(item => {
              const active = pathname === item.path || pathname.startsWith(item.path + "/");
              return (
                <motion.button
                  key={item.path}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                    active
                      ? "bg-indigo-600/20 border border-indigo-500/30 text-white"
                      : "hover:bg-white/[0.04] border border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className={active ? "text-indigo-400" : "text-slate-600"}>{item.icon}</span>
                  <div>
                    <p className="text-[11px] font-semibold leading-none">{item.label}</p>
                    <p className="text-[9px] text-slate-600 mt-0.5">{item.sub}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
