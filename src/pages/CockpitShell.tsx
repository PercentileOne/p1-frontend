import React, { useState, useEffect, useRef } from "react";
import WisdomWall from "../components/WisdomWall";
import NewsTileCluster from "../components/NewsTileCluster";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  MessageSquare,
  MessageCircle,
  CalendarDays,
  Home,
  Wallet,
  ClipboardList,
  Heart,
  BookOpen,
  Users,
  Map,
  ChevronRight,
  Send,
  ChevronDown,
  Bell,
  Inbox,
  HelpCircle,
  Star,
  Briefcase,
  Settings,
  Sparkles,
  CheckCircle2,
  Clock,
  UtensilsCrossed,
  Droplets,
  Flame,
  Moon,
  Footprints,
  Target,
  Activity,
  BarChart3,
  ShoppingBag,
  Cpu,
  PlayCircle,
  Dumbbell,
  Rss,
  Trophy,
  TrendingUp,
  Smile,
  Compass,
  Shield,
  Zap,
  Timer,
  Layers,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════
   COCKPIT SHELL  v6
   ══════════════════════════════════════════════════════════════ */

const PROFILE_IMG = "/images/francis.jpg";
const SIDEBAR_W   = "w-52";   // slightly narrower left col
const RIGHT_W     = "w-72";   // wider right col for thumbnails

type CockpitView  = "home" | "chat";
type NotifType    = "red" | "amber" | "blue" | "star" | "pulse";

interface SubNode  { label: string }
interface AreaItem { icon: React.ReactNode; label: string; notif?: NotifType; children: SubNode[] }

const LIFE_AREAS: AreaItem[] = [
  {
    icon: <Heart size={14} />, label: "Health & Vitality", notif: "pulse",
    children: [
      { label: "Physical Health" }, { label: "Mental Wellbeing" },
      { label: "Sleep" }, { label: "Nutrition" }, { label: "Fitness & Movement" },
    ],
  },
  {
    icon: <Users size={14} />, label: "Friends & Family",
    children: [
      { label: "Family" }, { label: "Friends" },
      { label: "Partner / Relationship" }, { label: "Social Life" },
    ],
  },
  {
    icon: <Wallet size={14} />, label: "Wealth", notif: "amber",
    children: [
      { label: "Bills & Expenses" }, { label: "Property & Assets" },
      { label: "Savings & Investments" }, { label: "Income Streams" },
    ],
  },
  {
    icon: <Smile size={14} />, label: "Fun & Relaxation",
    children: [
      { label: "Hobbies" }, { label: "Travel & Short Breaks" },
      { label: "Entertainment" }, { label: "Rest & Recovery" },
    ],
  },
  {
    icon: <Sparkles size={14} />, label: "Spirituality & Meaning",
    children: [
      { label: "Faith / Religion" }, { label: "Spiritual Practice" },
      { label: "Meditation / Reflection" }, { label: "Values & Purpose" },
    ],
  },
  {
    icon: <ClipboardList size={14} />, label: "Life Admin",
    children: [
      { label: "Home Maintenance" }, { label: "Letters & Paperwork" },
      { label: "Renewals & Subscriptions" }, { label: "Shopping (General)" },
      { label: "Errands" },
    ],
  },
  {
    icon: <Map size={14} />, label: "Projects & Planning",
    children: [
      { label: "Personal Projects" }, { label: "Life Planning" },
      { label: "Milestones" }, { label: "Vision & Strategy" },
    ],
  },
  {
    icon: <BookOpen size={14} />, label: "Continuous Learning",
    children: [
      { label: "Courses" }, { label: "Reading" },
      { label: "Skills Development" }, { label: "Certifications" },
    ],
  },
];

const WORK_AREAS: AreaItem[] = [
  {
    icon: <BarChart3 size={14} />, label: "Workload & Projects", notif: "red",
    children: [
      { label: "Active Tasks" }, { label: "Deep Work" }, { label: "Project Backlog" },
      { label: "Deadlines" }, { label: "Focus & Flow" },
    ],
  },
  {
    icon: <Users size={14} />, label: "Team & Collaboration",
    children: [
      { label: "Team Members" }, { label: "Stakeholders" },
      { label: "Communication" }, { label: "Delegation" }, { label: "Feedback" },
    ],
  },
  {
    icon: <Cpu size={14} />, label: "Skills & Development",
    children: [
      { label: "Core Skills" }, { label: "Technical Skills" },
      { label: "Soft Skills" }, { label: "Certifications" }, { label: "Skill Gaps" },
    ],
  },
  {
    icon: <TrendingUp size={14} />, label: "Career Growth", notif: "blue",
    children: [
      { label: "Career Path" }, { label: "Promotions & Milestones" },
      { label: "Networking" }, { label: "Opportunities" }, { label: "Long-Term Vision" },
    ],
  },
  {
    icon: <Briefcase size={14} />, label: "Leadership & Management",
    children: [
      { label: "People Management" }, { label: "Stakeholder Management" },
      { label: "Decision Making" }, { label: "Influence & Authority" },
    ],
  },
  {
    icon: <ClipboardList size={14} />, label: "Work Admin",
    children: [
      { label: "Contracts & Documents" }, { label: "Expenses & Receipts" },
      { label: "Compliance" }, { label: "Subscriptions & Tools" },
    ],
  },
  {
    icon: <Star size={14} />, label: "Performance & Reviews",
    children: [
      { label: "Review Cycles" }, { label: "Self-Assessment" },
      { label: "Portfolio & Achievements" }, { label: "Reputation & Brand" },
    ],
  },
  {
    icon: <BookOpen size={14} />, label: "Continuous Learning",
    children: [
      { label: "Courses" }, { label: "Reading" },
      { label: "Certifications" }, { label: "Industry Trends" },
    ],
  },
];

interface YtVideo { id: string; title: string; channel: string; duration: string; category: string; categoryColor: string; }

export default function CockpitShell() {
  const [mode,           setMode]           = useState<"life" | "profession">("life");
  const [view,           setView]           = useState<CockpitView>("home");
  const [showP1Score,    setShowP1Score]    = useState(false);
  const [ytModal,        setYtModal]        = useState<YtVideo | null>(null);
  const [leftCollapsed,  setLeftCollapsed]  = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  return (
    <div className="h-screen flex bg-[#0f1117] text-slate-200 font-sans overflow-hidden">
      {/* Left column: sidebar spans full viewport height, including the row level with TopNav */}
      <div className="flex shrink-0 h-full">
        <AnimatePresence initial={false}>
          {!leftCollapsed && (
            <motion.div key="left"
              initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{ overflowX: "hidden", height: "100%" }}>
              <LeftSidebar view={view} setView={setView} mode={mode} setMode={setMode} />
            </motion.div>
          )}
        </AnimatePresence>
        {/* Collapse toggle tab */}
        <button onClick={() => setLeftCollapsed(v => !v)}
          className="w-4 flex items-center justify-center bg-[#13151c] border-r border-white/[0.06] hover:bg-white/[0.04] transition-colors group shrink-0"
          title={leftCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <svg width="10" height="10" viewBox="0 0 10 10" className={`text-slate-600 group-hover:text-slate-400 transition-all ${leftCollapsed ? "rotate-180" : ""}`}>
            <path d="M6 2L3 5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </button>
      </div>

      {/* Right column: TopNav header row + content row, starting flush with the sidebar's top */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TopNav onP1ScoreClick={() => setShowP1Score(true)} />
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {view === "chat" ? <ChatContent /> : <MainContent mode={mode} />}

          {/* Right column with collapse tab */}
          <div className="flex shrink-0">
            <button onClick={() => setRightCollapsed(v => !v)}
              className="w-4 flex items-center justify-center bg-[#13151c] border-l border-white/[0.06] hover:bg-white/[0.04] transition-colors group shrink-0"
              title={rightCollapsed ? "Expand panel" : "Collapse panel"}>
              <svg width="10" height="10" viewBox="0 0 10 10" className={`text-slate-600 group-hover:text-slate-400 transition-all ${rightCollapsed ? "" : "rotate-180"}`}>
                <path d="M6 2L3 5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </button>
            <AnimatePresence initial={false}>
              {!rightCollapsed && (
                <motion.div key="right"
                  initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  style={{ overflowX: "hidden", height: "100%" }}>
                  <RightSidebar onP1ScoreClick={() => setShowP1Score(true)} onYtClick={setYtModal} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {showP1Score && <P1ScoreModal onClose={() => setShowP1Score(false)} />}
        {ytModal && <YouTubeModal video={ytModal} onClose={() => setYtModal(null)} />}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   TOP NAV
   ──────────────────────────────────────────────────────────── */
function TopNav({
  onP1ScoreClick,
}: {
  onP1ScoreClick: () => void;
}) {
  return (
    <header className="shrink-0 flex items-stretch h-12 bg-[#13151c] border-b border-white/[0.06] z-10">
      <nav className="flex-1 flex items-center gap-0.5 px-4">
        <NavLink label="Jobs"      icon={<Briefcase      size={12} />} href="/jobs"      />
        <NavLink label="Focus"     icon={<Timer          size={12} />} href="/focus"     />
        <NavLink label="Planning"  icon={<CalendarDays   size={12} />} href="/planning"  />
        <NavLink label="Shop"      icon={<ShoppingBag    size={12} />} href="/shop"     />
        <NavLink label="Contacts"  icon={<Users          size={12} />} href="/contacts"  />
        <NavLink label="Messages"  icon={<MessageCircle  size={12} />} href="/messages"  />
        <NavLink label="Feed"      icon={<Rss            size={12} />} href="/feed"      />
        <NavLink label="Walls"     icon={<Layers         size={12} />} href="/walls"     />
        <NavLink label="Stories"   icon={<BookOpen       size={12} />} href="/stories"   />
        <NavLink label="Awards"    icon={<Trophy         size={12} />} href="/awards"    />
        <NavLink label="Profile"   icon={<Users          size={12} />} href="/profile"   />
        <NavLink label="Interests" icon={<Sparkles      size={12} />} href="/interests" />
        <NavLink label="My Home"   icon={<Sparkles      size={12} />} href="/home"      />
      </nav>
      <div className="flex items-center gap-2 px-4 border-l border-white/[0.06]">
        <button
          onClick={onP1ScoreClick}
          className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-indigo-900/40 hover:brightness-110 hover:scale-105 transition-all duration-150 cursor-pointer"
        >
          <Star size={10} className="opacity-80" />
          <span className="opacity-70 text-[10px]">P1</span>
          <span>72</span>
        </button>
        <button className="w-7 h-7 rounded-full border border-white/10 text-slate-400 hover:bg-white/5 flex items-center justify-center transition-colors">
          <HelpCircle size={13} />
        </button>
        <button className="w-7 h-7 rounded-full border border-white/10 text-slate-400 hover:bg-white/5 flex items-center justify-center relative transition-colors">
          <Bell size={13} />
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}


function NavLink({ label, icon, href }: { label: string; icon?: React.ReactNode; href?: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => href && navigate(href)}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-colors font-medium"
    >
      {icon}{label}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────
   LEFT SIDEBAR
   ──────────────────────────────────────────────────────────── */
function LeftSidebar({
  view, setView, mode, setMode,
}: {
  view: CockpitView;
  setView: (v: CockpitView) => void;
  mode: "life" | "profession";
  setMode: (m: "life" | "profession") => void;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onCockpit = pathname === "/cockpit";

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [visited, setVisited]   = useState<Set<string>>(new Set());

  const areas = mode === "life" ? LIFE_AREAS : WORK_AREAS;

  const toggle = (label: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
    setVisited(prev => new Set(prev).add(label));
  };

  const switchMode = (m: "life" | "profession") => {
    setMode(m);
    setExpanded(new Set());
    setActiveSub(null);
  };

  return (
    <aside className={`${SIDEBAR_W} shrink-0 bg-[#13151c] border-r border-white/[0.06] flex flex-col h-full overflow-hidden pt-[20px]`}>

      {/* ── Brand ── */}
      <BrandFlipCard />

      {/* ── 1. GLOBAL NAVIGATION ── */}
      <div className="px-2 pt-3 pb-2 shrink-0">
        <SidebarSectionLabel label="Navigation" />
        <div className="space-y-0.5 mt-1">
          <SidebarPrimaryItem
            icon={<Home size={14} />} label="Home"
            active={onCockpit && view === "home"}
            onClick={() => { setView("home"); if (!onCockpit) navigate("/cockpit"); }}
          />
          <SidebarPrimaryItem
            icon={<CalendarDays size={14} />} label="Today"
            active={pathname === "/today"}
            onClick={() => navigate("/today")}
          />
          <SidebarPrimaryItem
            icon={<MessageSquare size={14} />} label="Chat" badge="3"
            active={onCockpit && view === "chat"}
            onClick={() => { setView("chat"); if (!onCockpit) navigate("/cockpit"); }}
          />
          <SidebarPrimaryItem
            icon={<Trophy size={14} />} label="Goals"
            active={pathname === "/goals"}
            onClick={() => navigate("/goals")}
          />
          <SidebarPrimaryItem
            icon={<Zap size={14} />} label="Cycle"
            active={pathname.startsWith("/cycle") || pathname === "/cycles"}
            onClick={() => navigate("/cycle")}
          />
          <SidebarPrimaryItem
            icon={<Compass size={14} />} label="Vision"
            active={pathname === "/vision"}
            onClick={() => navigate("/vision")}
          />
          <SidebarPrimaryItem
            icon={<BookOpen size={14} />} label="Learning"
            active={pathname.startsWith("/learning")}
            onClick={() => navigate("/learning")}
          />
        </div>
      </div>

      {/* ── 2. YOUR WALLS ── */}
      <div className="px-2 pt-2 pb-3 border-t border-white/[0.05] shrink-0 mt-[5px]">
        <div className="flex items-center justify-between px-1 mb-1.5">
          <SidebarSectionLabel label="Your Walls" />
          <button
            onClick={() => navigate("/walls")}
            className="text-[9px] text-indigo-400 hover:text-indigo-300 transition-colors font-semibold"
          >
            Explore
          </button>
        </div>
        {[
          { emoji: "🚀", label: "Founders' Wall", accent: "#f59e0b" },
          { emoji: "🤖", label: "AI Builders UK", accent: "#6366f1" },
        ].map(({ emoji, label, accent }) => (
          <motion.button
            key={label}
            whileHover={{ x: 2 }}
            transition={{ duration: 0.15 }}
            onClick={() => navigate("/walls")}
            className="w-full flex items-center gap-2 px-2 py-[6px] rounded-lg hover:bg-white/[0.04] transition-colors group text-left"
          >
            <span className="text-[13px] leading-none shrink-0">{emoji}</span>
            <span className="flex-1 text-[11px] text-slate-400 group-hover:text-slate-200 transition-colors truncate leading-snug">
              {label}
            </span>
            <div className="w-1.5 h-1.5 rounded-full shrink-0 opacity-70" style={{ background: accent }} />
          </motion.button>
        ))}
      </div>

      {/* ── 3. LIFE / WORK SWITCHER ── */}
      <div className="px-2 py-2.5 border-t border-white/[0.07] shrink-0 mt-[5px]"
        style={{ background: "linear-gradient(180deg, rgba(99,102,241,0.04) 0%, transparent 100%)" }}>
        <div className="flex rounded-xl overflow-hidden border border-white/[0.07] p-0.5 gap-0.5"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.04) inset" }}>
          <SidebarModeTab label="My Life" active={mode === "life"}       onClick={() => switchMode("life")} />
          <SidebarModeTab label="My Work" active={mode === "profession"} onClick={() => switchMode("profession")} />
        </div>
      </div>

      {/* ── 4. DYNAMIC LIFE / WORK AREAS ── */}
      <div className="flex-1 overflow-y-auto min-h-0 border-t border-white/[0.05]">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="py-2"
          >
            <div className="px-3 mb-1">
              <SidebarSectionLabel label={mode === "life" ? "Life Areas" : "Work Areas"} />
            </div>
            {areas.map((area, aIdx) => {
              const isOpen    = expanded.has(area.label);
              const isVisited = visited.has(area.label);
              return (
                <motion.div
                  key={area.label}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18, delay: aIdx * 0.03, ease: [0.4, 0, 0.2, 1] }}
                >
                  <button
                    onClick={() => toggle(area.label)}
                    className="w-full flex items-center gap-2 px-3 py-[7px] text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] transition-all duration-200 group"
                  >
                    <span className="text-slate-500 group-hover:text-slate-300 transition-colors shrink-0">
                      {area.icon}
                    </span>
                    <span className="flex-1 text-left leading-snug">{area.label}</span>
                    {area.notif && !isVisited && <NotifIndicator type={area.notif} />}
                    <motion.span
                      animate={{ rotate: isOpen ? 90 : 0 }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      className="text-slate-600 group-hover:text-slate-400 shrink-0 flex items-center"
                    >
                      <ChevronRight size={11} />
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="sub"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        style={{ overflow: "hidden" }}
                      >
                        {area.children.map((child, ci) => {
                          const subKey   = `${area.label}::${child.label}`;
                          const isActive = activeSub === subKey;
                          return (
                            <motion.button
                              key={child.label}
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: ci * 0.025, duration: 0.14 }}
                              onClick={() => setActiveSub(subKey)}
                              className={`w-full flex items-center text-left text-[11px] py-[6px] pr-3 transition-all duration-150 ${
                                isActive
                                  ? "pl-[25px] border-l-[3px] border-indigo-400/60 text-white bg-indigo-500/[0.08]"
                                  : "pl-[26px] border-l-2 border-transparent text-slate-500 hover:text-slate-200 hover:bg-white/[0.03] hover:border-slate-500/30"
                              }`}
                            >
                              {child.label}
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── 5. SYSTEM ── */}
      <div className="px-2 pt-2 pb-3 border-t border-white/[0.07] shrink-0"
        style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.2) 0%, transparent 100%)" }}>
        <div className="px-1 mb-1.5">
          <SidebarSectionLabel label="System" />
        </div>
        <button onClick={() => navigate("/admin")}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.05] cursor-pointer transition-all duration-150 group">
          <div className="w-6 h-6 rounded-lg bg-indigo-900/40 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:border-indigo-500/40 transition-colors">
            <Shield size={11} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[11px] font-semibold text-indigo-300">Admin</p>
            <p className="text-[9px] text-slate-600">Proof integrity</p>
          </div>
          <ChevronRight size={11} className="text-slate-700 group-hover:text-slate-500 shrink-0 transition-colors" />
        </button>
        <button onClick={() => navigate("/proof")}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.05] cursor-pointer transition-all duration-150 group">
          <div className="w-6 h-6 rounded-lg bg-slate-700/60 border border-white/[0.08] flex items-center justify-center shrink-0 group-hover:border-white/[0.15] transition-colors">
            <CheckCircle2 size={11} className="text-slate-400" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[11px] font-semibold text-slate-300">My Proofs</p>
            <p className="text-[9px] text-slate-600">Proof history</p>
          </div>
          <ChevronRight size={11} className="text-slate-700 group-hover:text-slate-500 shrink-0 transition-colors" />
        </button>
        <button onClick={() => navigate("/settings")}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.05] cursor-pointer transition-all duration-150 group">
          <div className="w-6 h-6 rounded-lg bg-slate-700/60 border border-white/[0.08] flex items-center justify-center shrink-0 group-hover:border-white/[0.15] transition-colors">
            <Settings size={11} className="text-slate-400" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[11px] font-semibold text-slate-300">Settings</p>
            <p className="text-[9px] text-slate-600">Account &amp; preferences</p>
          </div>
          <ChevronRight size={11} className="text-slate-700 group-hover:text-slate-500 shrink-0 transition-colors" />
        </button>
      </div>
    </aside>
  );
}

function BrandFlipCard() {
  const [flipped, setFlipped] = useState(false);

  return (
    <motion.div
      onClick={() => setFlipped(v => !v)}
      className="shrink-0 border-b border-white/[0.06] cursor-pointer select-none"
      style={{ perspective: "1000px", fontFamily: "'Inter Tight', 'Satoshi', inherit" }}
      whileHover={{
        y: -2,
        boxShadow:
          "0 10px 26px rgba(0,0,0,0.45), 0 0 0 1px rgba(99,102,241,0.18), 0 0 28px rgba(99,102,241,0.2)",
      }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <motion.div
        className="relative w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{
          rotateY: flipped ? 180 : 0,
          boxShadow: flipped ? "0 14px 32px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.22)",
        }}
        transition={{ duration: 0.6, delay: 0.12, ease: "easeInOut" }}
      >
        {/* Front face */}
        <div
          className="flex flex-col items-center justify-center gap-2 pt-[5px] pb-4 px-3"
          style={{ backfaceVisibility: "hidden" }}
        >
          <P1LogoBadge size={68} />
          <p style={{ fontSize: "0.74rem", fontWeight: 500, letterSpacing: "0.08em", color: "#c4c8d6" }}>
            Percentile.One
          </p>
        </div>

        {/* Back face */}
        <div
          className="absolute inset-0 flex items-center justify-center px-4"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", paddingTop: 22, paddingBottom: 22 }}
        >
          <p className="text-center" style={{ lineHeight: 1.45 }}>
            <span
              className="block text-indigo-300"
              style={{ fontWeight: 600, fontSize: "0.8rem", letterSpacing: "0.4px", marginBottom: "8px" }}
            >
              Percentile.One
            </span>
            <span className="text-slate-300" style={{ fontWeight: 400, fontSize: "0.68rem", letterSpacing: "0.2px" }}>
              The world&rsquo;s first <span style={{ fontWeight: 600, color: "#c7d2fe" }}>Life Management OS</span> &mdash;<br />
              built to help you organise your mind,<br />
              master your habits,<br />
              and design the life you were meant to live.
            </span>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SidebarSectionLabel({ label }: { label: string }) {
  return (
    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-700 select-none">
      {label}
    </span>
  );
}

function SidebarModeTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-250 ${
        active
          ? "bg-indigo-600/25 text-indigo-200 shadow-[0_2px_8px_rgba(99,102,241,0.25),0_1px_0_rgba(255,255,255,0.06)_inset]"
          : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
      }`}
    >
      {label}
    </button>
  );
}

function SidebarPrimaryItem({ icon, label, badge, active, onClick }: {
  icon: React.ReactNode; label: string; badge?: string; active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-xs font-medium transition-all duration-150 group ${
        active ? "bg-indigo-600/15 text-indigo-300" : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
      }`}
    >
      <span className={active ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300 transition-colors"}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge && <span className="bg-indigo-600/30 text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
    </button>
  );
}

function NotifIndicator({ type }: { type: NotifType }) {
  if (type === "star") return <Star size={9} className="text-yellow-400 shrink-0" />;
  const cls: Record<NotifType, string> = {
    red:   "bg-red-500",
    amber: "bg-amber-400",
    blue:  "bg-blue-400",
    pulse: "bg-indigo-400 animate-pulse",
    star:  "",
  };
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cls[type]}`} />;
}

/* ────────────────────────────────────────────────────────────
   HOME — MAIN CONTENT (no prompt bar)
   ──────────────────────────────────────────────────────────── */
function MainContent({ mode }: { mode: "life" | "profession" }) {
  const overviewLabel = mode === "life" ? "My Life Overview" : "My Work Overview";

  return (
    <main className="flex-1 flex flex-col bg-[#0f1117] overflow-y-auto min-h-0">
      <div className="px-6 py-5 flex flex-col gap-4">

        {/* Hero greeting */}
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            How do you feel this morning, Francis, after your early gym session?
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Thursday, 12 June 2026</p>
        </div>

        {/* §1 Overview — 4 compact cards */}
        <DarkCard>
          <CardLabel label={overviewLabel} />
          <div className="flex gap-2 mt-2">

            {/* ── TASKS TILE ─────────────────────────────── */}
            <LiveOverviewTile
              icon={<CheckCircle2 size={13} className="text-blue-400" />}
              label="Top 3 Tasks"
              accent="from-blue-900/40 to-blue-800/20"
              accentText="text-blue-300"
              faces={[
                /* F0 — task list */
                <div className="flex flex-col gap-1">
                  <OverviewTask text="Finalise P1 cockpit spec" done />
                  <OverviewTask text="Review DevOps backlog" />
                  <OverviewTask text="Send investor update" />
                </div>,
                /* F1 — big count */
                <div className="flex flex-col items-center justify-center h-full gap-0.5">
                  <span className="text-3xl font-black text-blue-300 leading-none">2</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400/70">tasks remaining</span>
                  <span className="text-[9px] text-slate-500 mt-0.5">Investor update is urgent</span>
                </div>,
                /* F2 — progress bar */
                <div className="flex flex-col gap-2 justify-center h-full">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[9px] font-bold text-blue-300">Progress</span>
                    <span className="text-[9px] text-slate-500">1 of 3 done</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-400" style={{ width: "33%" }} />
                  </div>
                  <span className="text-[9px] text-slate-500">33% complete · Est. 2h 30m left</span>
                </div>,
                /* F3 — priority labels */
                <div className="flex flex-col gap-1.5 justify-center h-full">
                  {[
                    { text: "Finalise cockpit spec", p: "Done",   c: "text-green-400 bg-green-500/10"   },
                    { text: "Review DevOps backlog", p: "High",   c: "text-orange-400 bg-orange-500/10" },
                    { text: "Send investor update",  p: "Urgent", c: "text-red-400 bg-red-500/10"       },
                  ].map(t => (
                    <div key={t.text} className="flex items-center gap-1.5">
                      <span className={`text-[8px] font-bold px-1 py-0.5 rounded shrink-0 ${t.c}`}>{t.p}</span>
                      <span className="text-[10px] text-slate-300 truncate">{t.text}</span>
                    </div>
                  ))}
                </div>,
                /* F4 — motivational */
                <div className="flex flex-col items-center justify-center h-full gap-1">
                  <span className="text-xl">⚡</span>
                  <span className="text-[11px] font-bold text-blue-300">2 left. Finish strong.</span>
                  <span className="text-[9px] text-slate-500">Start with the investor update.</span>
                </div>,
              ]}
            />

            {/* ── SCHEDULE TILE ──────────────────────────── */}
            <LiveOverviewTile
              icon={<Clock size={13} className="text-purple-400" />}
              label="This Week"
              accent="from-purple-900/40 to-purple-800/20"
              accentText="text-purple-300"
              faces={[
                /* F0 — appointment list */
                <div className="flex flex-col gap-1">
                  <OverviewAppt day="Thu" time="10:00" title="GP check-up" />
                  <OverviewAppt day="Thu" time="14:30" title="P1 design review" />
                  <OverviewAppt day="Fri" time="09:00" title="Investor call" />
                </div>,
                /* F1 — next up spotlight */
                <div className="flex flex-col items-center justify-center h-full gap-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-purple-400/70">Next Up</span>
                  <span className="text-base font-black text-purple-300 leading-snug text-center">GP Check-up</span>
                  <span className="text-[9px] text-slate-500 mt-0.5">Today · 10:00 · in 2h</span>
                </div>,
                /* F2 — week column dots */
                <div className="flex flex-col gap-1.5 justify-center h-full">
                  <div className="flex gap-1 items-end">
                    {[
                      { d: "M", h: 0 }, { d: "T", h: 0 }, { d: "W", h: 0 },
                      { d: "T", h: 2, today: true }, { d: "F", h: 1 }, { d: "S", h: 0 }, { d: "S", h: 0 },
                    ].map((day, i) => (
                      <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
                        <div className={`w-full rounded-sm ${day.h ? (day.today ? "bg-purple-500/70 border border-purple-400/40" : "bg-purple-500/30") : "bg-white/[0.05]"}`}
                          style={{ height: day.h ? `${day.h * 14 + 10}px` : "10px" }} />
                        <span className={`text-[8px] font-bold ${day.today ? "text-purple-300" : "text-slate-600"}`}>{day.d}</span>
                      </div>
                    ))}
                  </div>
                  <span className="text-[9px] text-slate-500">3 events this week</span>
                </div>,
                /* F3 — count */
                <div className="flex flex-col items-center justify-center h-full gap-0.5">
                  <span className="text-3xl font-black text-purple-300 leading-none">3</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-purple-400/70">events this week</span>
                  <span className="text-[9px] text-slate-500 mt-0.5">Thu · Thu · Fri</span>
                </div>,
              ]}
            />

            {/* ── MEAL PLAN TILE ─────────────────────────── */}
            <LiveOverviewTile
              icon={<UtensilsCrossed size={13} className="text-indigo-400" />}
              label="Meal Plan"
              accent="from-indigo-900/40 to-indigo-800/20"
              accentText="text-indigo-300"
              faces={[
                /* F0 — meal list */
                <div className="flex flex-col gap-1">
                  <MealRow slot="🌅" label="Breakfast" meal="Oats, banana, green tea" />
                  <MealRow slot="☀️" label="Lunch"     meal="Grilled chicken salad" />
                  <MealRow slot="🌙" label="Dinner"    meal="Salmon, rice, broccoli" />
                  <MealRow slot="💧" label="Water"     meal="2.5 L · 1.2 L so far" muted />
                </div>,
                /* F1 — water progress */
                <div className="flex flex-col gap-2 justify-center h-full">
                  <div className="flex items-end gap-1.5">
                    <span className="text-2xl font-black text-indigo-300 leading-none">1.2</span>
                    <span className="text-[10px] text-slate-500 mb-0.5">/ 2.5 L</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-400" style={{ width: "48%" }} />
                  </div>
                  <span className="text-[9px] text-slate-500">💧 1.3 L to go · keep sipping</span>
                </div>,
                /* F2 — calorie target */
                <div className="flex flex-col items-center justify-center h-full gap-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400/70">Calorie Target</span>
                  <span className="text-3xl font-black text-indigo-300 leading-none">2,100</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">kcal · balanced macros</span>
                </div>,
                /* F3 — lunch spotlight */
                <div className="flex flex-col items-center justify-center h-full gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400/70">☀️ Lunch</span>
                  <span className="text-sm font-bold text-white text-center leading-snug">Grilled Chicken Salad</span>
                  <span className="text-[9px] text-slate-500">High protein · ~520 kcal</span>
                </div>,
                /* F4 — on track */
                <div className="flex flex-col items-center justify-center h-full gap-1">
                  <span className="text-xl">🥗</span>
                  <span className="text-[11px] font-bold text-indigo-300">Today's plan is on track.</span>
                  <span className="text-[9px] text-slate-500">Prep dinner before your session.</span>
                </div>,
              ]}
            />

            {/* ── EXERCISE TILE ──────────────────────────── */}
            <LiveOverviewTile
              icon={<Dumbbell size={13} className="text-green-400" />}
              label="Exercise"
              accent="from-green-900/40 to-green-800/20"
              accentText="text-green-300"
              faces={[
                /* F0 — workout summary */
                <div className="flex flex-col gap-1">
                  <ExerciseRow label="Workout"  value="Upper body + core" />
                  <ExerciseRow label="Duration" value="50 min" />
                  <ExerciseRow label="Calories" value="480 kcal burned" />
                  <ExerciseRow label="Steps"    value="7,420 / 10,000" />
                </div>,
                /* F1 — steps progress */
                <div className="flex flex-col gap-2 justify-center h-full">
                  <div className="flex items-end gap-1.5">
                    <span className="text-2xl font-black text-green-300 leading-none">7,420</span>
                    <span className="text-[10px] text-slate-500 mb-0.5">/ 10,000</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-green-400" style={{ width: "74%" }} />
                  </div>
                  <span className="text-[9px] text-slate-500">👟 2,580 steps to go</span>
                </div>,
                /* F2 — calories big */
                <div className="flex flex-col items-center justify-center h-full gap-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-green-400/70">Calories Burned</span>
                  <span className="text-3xl font-black text-green-300 leading-none">480</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">kcal · upper body + core</span>
                </div>,
                /* F3 — session done */
                <div className="flex flex-col items-center justify-center h-full gap-1">
                  <span className="text-xl">💪</span>
                  <span className="text-[11px] font-bold text-green-300">Session Complete!</span>
                  <span className="text-[9px] text-slate-500">50 min · 480 kcal</span>
                </div>,
                /* F4 — streak */
                <div className="flex flex-col items-center justify-center h-full gap-0.5">
                  <span className="text-3xl font-black text-green-300 leading-none">12</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-green-400/70">day streak 🔥</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Don't break it. Keep pushing.</span>
                </div>,
              ]}
            />

          </div>
        </DarkCard>

        {/* §2 Wisdom Wall */}
        <WisdomWall />

        {/* §3 Stats grid */}
        <StatsGrid />

        {/* §4 Charts */}
        <ChartsSection />

        {/* §5 News Tile Cluster */}
        <NewsTileCluster />

        <div className="h-4" />
      </div>
    </main>
  );
}

/* ────────────────────────────────────────────────────────────
   CHAT CONTENT — replaces middle column when Chat is active
   ──────────────────────────────────────────────────────────── */
const CHAT_HISTORY = [
  { role: "assistant" as const, text: "Good morning, Francis. You've got a GP check-up at 10:00 today and a design review at 14:30. Your habit streak is at 9 days — keep it going. What would you like to focus on first?" },
  { role: "user"      as const, text: "Can you summarise my top goals for this week?" },
  { role: "assistant" as const, text: "Absolutely. This week your three priority goals are:\n1. Finalise the P1 Cockpit Spec — in progress\n2. Send the investor update email — due Friday\n3. Hit 10,000 steps daily — you're averaging 7,420 so far\n\nWould you like me to draft the investor update?" },
  { role: "user"      as const, text: "Yes please, draft a short one." },
  { role: "assistant" as const, text: "Here's a draft:\n\n---\nSubject: P1 Update — June 2026\n\nHi [Name],\n\nQuick update on Percentile.One:\n• Cockpit v1 UI complete — fully dark-mode, agent-ready\n• 1,043 Azure DevOps work items structured and backlogged\n• Persona & tenant systems in design phase\n\nNext milestone: MVP demo build by August.\n\nHappy to jump on a call — let me know.\n\nFrancis\n---\n\nWant me to adjust the tone or add anything?" },
  { role: "user"      as const, text: "Perfect. Save that as a draft." },
  { role: "assistant" as const, text: "Draft saved. I'll remind you to send it on Friday morning. Is there anything else you'd like to work through?" },
];

function ChatContent() {
  const [input, setInput] = useState("");

  return (
    <main className="flex-1 flex flex-col bg-[#0f1117] overflow-y-auto min-h-0">
      {/* Chat header */}
      <div className="shrink-0 px-6 py-3 border-b border-white/[0.06] flex items-center gap-3 bg-[#13151c]">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
          <Sparkles size={13} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-200 leading-none">P1 Assistant</p>
          <p className="text-[10px] text-indigo-400 mt-0.5">AI-powered · always learning</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-slate-500">Online</span>
        </div>
      </div>

      {/* Message history */}
      <div className="px-6 py-5 flex flex-col gap-4">
        {CHAT_HISTORY.map((msg, i) => (
          <ChatBubble key={i} role={msg.role} text={msg.text} />
        ))}
        <div className="h-2" />
      </div>

      {/* Prompt bar */}
      <div className="shrink-0 px-6 pb-4">
        <div className="relative flex flex-col bg-[#1c1f2e] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 ring-1 ring-inset ring-white/[0.04] hover:border-indigo-500/30 transition-colors group">
          <div className="absolute inset-0 rounded-2xl bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="flex items-center gap-2 px-5 pt-2 pb-1 relative">
            <span className="text-xs text-indigo-400/70 font-medium">Message P1</span>
            <div className="w-px h-3 bg-white/10" />
            <span className="text-[11px] text-slate-600">AI-powered · always learning</span>
          </div>
          <div className="px-5 pb-1 relative">
            <textarea
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything, plan your day, reflect on your goals…"
              className="w-full bg-transparent outline-none resize-none text-sm text-slate-300 placeholder-slate-600 leading-relaxed"
            />
          </div>
          <div className="flex items-center justify-between px-4 pb-2 pt-1 border-t border-white/[0.05] relative">
            <span className="text-[11px] text-slate-600">Shift+Enter for new line</span>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 text-xs bg-indigo-600/20 text-indigo-300 border border-indigo-500/25 hover:bg-indigo-600/30 px-3 py-1.5 rounded-lg font-medium transition-colors">
                Smart <ChevronDown size={11} />
              </button>
              <button className="w-8 h-8 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-900/50 transition-colors">
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function ChatBubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      {isUser ? (
        <Avatar src={PROFILE_IMG} size={28} initials="FC" ring />
      ) : (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={12} className="text-white" />
        </div>
      )}
      {/* Bubble */}
      <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-line ${
        isUser
          ? "bg-indigo-600/25 text-slate-200 border border-indigo-500/20 rounded-tr-sm"
          : "bg-[#1c1f2e] text-slate-300 border border-white/[0.06] rounded-tl-sm"
      }`}>
        {text}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   CHARTS SECTION
   ──────────────────────────────────────────────────────────── */

/* ── Line chart — Goal Progress Trajectory ── */
// All 6 x-axis positions shared by both lines
const TRAJ_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const TRAJ_TARGET = [20, 35, 50, 65, 80, 95];
// Actual data runs Jan–May only; Jun is in progress ("Now" = May = index 4)
const TRAJ_ACTUAL = [18, 32, 48, 59, 71];
const NOW_IDX     = TRAJ_ACTUAL.length - 1; // 4 = May

function GoalTrajectoryChart() {
  const W = 480, H = 120;
  const PAD = { l: 38, r: 16, t: 14, b: 28 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const xStep = cW / (TRAJ_MONTHS.length - 1);
  const toX = (i: number) => PAD.l + i * xStep;
  const toY = (v: number) => PAD.t + cH - (v / 100) * cH;

  // Target spans all 6 months; actual spans only the completed months
  const polyTarget = TRAJ_TARGET.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const polyActual = TRAJ_ACTUAL.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const fillActual = `M${toX(0)},${PAD.t + cH} ${TRAJ_ACTUAL.map((v, i) => `L${toX(i)},${toY(v)}`).join(" ")} L${toX(NOW_IDX)},${PAD.t + cH} Z`;

  const yGridVals = [0, 25, 50, 75, 100];

  // Derived coordinates
  const nowX = toX(NOW_IDX);
  const nowY = toY(TRAJ_ACTUAL[NOW_IDX]);
  const goalX = toX(TRAJ_TARGET.length - 1);
  const goalY = toY(TRAJ_TARGET[TRAJ_TARGET.length - 1]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
      <defs>
        <linearGradient id="traj-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Y grid lines */}
      {yGridVals.map(v => (
        <g key={v}>
          <line x1={PAD.l} y1={toY(v)} x2={W - PAD.r} y2={toY(v)} stroke="white" strokeOpacity="0.04" strokeWidth="1" />
          <text x={PAD.l - 5} y={toY(v) + 3.5} textAnchor="end" fontSize="8" fill="#475569">{v}%</text>
        </g>
      ))}

      {/* X labels */}
      {TRAJ_MONTHS.map((m, i) => (
        <text key={m} x={toX(i)} y={H - 6} textAnchor="middle" fontSize="8" fill="#475569">{m}</text>
      ))}

      {/* Actual gradient fill (Jan → Now) */}
      <path d={fillActual} fill="url(#traj-fill)" />

      {/* Target line — full span, dashed */}
      <polyline points={polyTarget} fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="4 3" strokeOpacity="0.55" />

      {/* Actual line — Jan → Now (solid) */}
      <polyline points={polyActual} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Breadcrumb trail — past positions only (Jan–Apr, i.e. all before Now) */}
      {TRAJ_ACTUAL.slice(0, NOW_IDX).map((v, i) => (
        <circle key={i} cx={toX(i)} cy={toY(v)} r="2.5"
          fill="#6366f1" fillOpacity="0.28" stroke="#0f1117" strokeWidth="1" />
      ))}

      {/* Green goal marker — final target point (Jun / 95%) */}
      <g>
        <circle cx={goalX} cy={goalY} r="6.5" fill="none" stroke="#4ade80" strokeWidth="1" strokeOpacity="0.18" />
        <circle cx={goalX} cy={goalY} r="4.5" fill="#052e16" stroke="#4ade80" strokeWidth="1.5" />
        <circle cx={goalX} cy={goalY} r="2"   fill="#4ade80" />
      </g>

      {/* Now marker — pulsing silver dot at May (current position) */}
      <g>
        {/* Expanding pulse ring, every 3 s */}
        <circle cx={nowX} cy={nowY} r="5" fill="none" stroke="#cbd5e1" strokeWidth="1.2" strokeOpacity="0">
          <animate attributeName="r"              values="5;13;5"    dur="3s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.65;0;0.65" dur="3s" repeatCount="indefinite" />
        </circle>
        {/* Static marker: dark fill → silver ring → white pip */}
        <circle cx={nowX} cy={nowY} r="5"   fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.5" />
        <circle cx={nowX} cy={nowY} r="2.8" fill="#e2e8f0" />
        <circle cx={nowX} cy={nowY} r="1.1" fill="white" />
      </g>

      {/* Legend */}
      <g transform={`translate(${W - PAD.r - 208}, ${PAD.t})`}>
        <line x1="0" y1="5" x2="14" y2="5" stroke="#6366f1" strokeWidth="2" />
        <circle cx="7" cy="5" r="2" fill="#6366f1" fillOpacity="0.40" />
        <text x="18" y="8.5" fontSize="8" fill="#94a3b8">Actual</text>
        <line x1="52" y1="5" x2="66" y2="5" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="4 3" strokeOpacity="0.7" />
        <text x="70" y="8.5" fontSize="8" fill="#94a3b8">Target</text>
        <circle cx="116" cy="5" r="3.5" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.2" />
        <circle cx="116" cy="5" r="1.6" fill="#e2e8f0" />
        <text x="124" y="8.5" fontSize="8" fill="#94a3b8">Now</text>
        <circle cx="158" cy="5" r="3.5" fill="#052e16" stroke="#4ade80" strokeWidth="1.2" />
        <circle cx="158" cy="5" r="1.6" fill="#4ade80" />
        <text x="166" y="8.5" fontSize="8" fill="#94a3b8">Goal</text>
      </g>
    </svg>
  );
}

/* ── Tabbed bar chart ── */
const BAR_TABS = ["Life Balance", "Weekly Activity", "Goal Categories"] as const;
type BarTab = typeof BAR_TABS[number];

const BAR_DATA: Record<BarTab, { label: string; value: number; max: number; color: string }[]> = {
  "Life Balance": [
    { label: "Health",   value: 78, max: 100, color: "#22d3ee" },
    { label: "Career",   value: 85, max: 100, color: "#818cf8" },
    { label: "Family",   value: 62, max: 100, color: "#fb923c" },
    { label: "Finance",  value: 55, max: 100, color: "#4ade80" },
    { label: "Learning", value: 70, max: 100, color: "#a78bfa" },
    { label: "Social",   value: 45, max: 100, color: "#f472b6" },
  ],
  "Weekly Activity": [
    { label: "Mon", value: 6.5, max: 8, color: "#818cf8" },
    { label: "Tue", value: 7.2, max: 8, color: "#818cf8" },
    { label: "Wed", value: 5.8, max: 8, color: "#818cf8" },
    { label: "Thu", value: 6.0, max: 8, color: "#6366f1" },
    { label: "Fri", value: 4.5, max: 8, color: "#818cf8" },
    { label: "Sat", value: 3.2, max: 8, color: "#475569" },
    { label: "Sun", value: 2.8, max: 8, color: "#475569" },
  ],
  "Goal Categories": [
    { label: "Professional", value: 65, max: 100, color: "#818cf8" },
    { label: "Health",       value: 78, max: 100, color: "#22d3ee" },
    { label: "Personal",     value: 45, max: 100, color: "#a78bfa" },
    { label: "Finance",      value: 52, max: 100, color: "#4ade80" },
  ],
};

const BAR_UNITS: Record<BarTab, string> = {
  "Life Balance":    "%",
  "Weekly Activity": "h",
  "Goal Categories": "%",
};

function TabbedBarChart() {
  const [tab, setTab] = useState<BarTab>("Life Balance");
  const data = BAR_DATA[tab];
  const unit = BAR_UNITS[tab];

  const W = 480, H = 120;
  const PAD = { l: 10, r: 10, t: 10, b: 28 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const n = data.length;
  const gap = n <= 4 ? 24 : n <= 6 ? 16 : 12;
  const barW = Math.floor((cW - gap * (n - 1)) / n);
  const startX = PAD.l + (cW - (barW * n + gap * (n - 1))) / 2;

  return (
    <div>
      {/* Tab pills */}
      <div className="flex gap-1 mb-3">
        {BAR_TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
              tab === t
                ? "bg-indigo-600/25 text-indigo-300 border border-indigo-500/30"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* SVG bar chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
        {data.map((d, i) => {
          const bH = (d.value / d.max) * cH;
          const x  = startX + i * (barW + gap);
          const y  = PAD.t + cH - bH;
          return (
            <g key={d.label}>
              {/* Bar background */}
              <rect x={x} y={PAD.t} width={barW} height={cH} rx="4" fill="white" fillOpacity="0.03" />
              {/* Bar fill */}
              <rect x={x} y={y} width={barW} height={bH} rx="4" fill={d.color} fillOpacity="0.75" />
              {/* Value label */}
              <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize="8" fill={d.color} fontWeight="600">
                {d.value}{unit}
              </text>
              {/* Category label */}
              <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="8" fill="#64748b">
                {d.label.length > 6 ? d.label.slice(0, 5) + "…" : d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ChartsSection() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Chart 1 — Goal Progress Trajectory */}
      <div className="bg-[#1c1f2e] border border-white/[0.06] rounded-2xl p-4 shadow-lg shadow-black/20">
        <div className="flex items-center gap-1.5 mb-3">
          <TrendingUp size={13} className="text-indigo-400" />
          <CardLabel label="Goal Progress Trajectory" />
        </div>
        <GoalTrajectoryChart />
      </div>

      {/* Chart 2 — Tabbed bar chart */}
      <div className="bg-[#1c1f2e] border border-white/[0.06] rounded-2xl p-4 shadow-lg shadow-black/20">
        <div className="flex items-center gap-1.5 mb-3">
          <BarChart3 size={13} className="text-indigo-400" />
          <CardLabel label="Activity Breakdown" />
        </div>
        <TabbedBarChart />
      </div>
    </div>
  );
}

/* ── P1 Logo badge ── */
function P1LogoBadge({ size = 44 }: { size?: number }) {
  return (
    <div className="shrink-0 mr-1 flex items-center">
      <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="badge-steps" x1="22" y1="32" x2="22" y2="10" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#3730a3" stopOpacity="0.65"/>
            <stop offset="50%"  stopColor="#6366f1"/>
            <stop offset="100%" stopColor="#a5b4fc"/>
          </linearGradient>
          <linearGradient id="badge-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#4f46e5"/>
            <stop offset="60%"  stopColor="#7c3aed"/>
            <stop offset="100%" stopColor="#a855f7"/>
          </linearGradient>
          <clipPath id="badge-clip"><circle cx="22" cy="22" r="18"/></clipPath>
        </defs>
        <circle cx="22" cy="22" r="21" fill="none" stroke="#4f46e5" strokeWidth="0.5" strokeOpacity="0.15"/>
        <circle cx="22" cy="22" r="19" fill="#0a0818"/>
        <circle cx="22" cy="22" r="19" fill="none" stroke="url(#badge-ring)" strokeWidth="1.4"/>
        <g clipPath="url(#badge-clip)">
          <path d="M8,31 L8,27 L17,27 L17,22 L26,22 L26,16 L35,16 L35,31 Z" fill="url(#badge-steps)"/>
          <line x1="8"  y1="27" x2="17" y2="27" stroke="#6366f1" strokeWidth="0.7" strokeOpacity="0.6"/>
          <line x1="17" y1="22" x2="26" y2="22" stroke="#a5b4fc" strokeWidth="0.7" strokeOpacity="0.8"/>
          <line x1="26" y1="16" x2="35" y2="16" stroke="#c7d2fe" strokeWidth="0.7"/>
        </g>
        <circle cx="31" cy="14" r="3"   fill="#1e1b4b"/>
        <circle cx="31" cy="14" r="2.2" fill="#a5b4fc"/>
        <circle cx="31" cy="14" r="1.1" fill="#e0e7ff"/>
      </svg>
    </div>
  );
}

/* ── Live Tile System ── */
const TILE_ANIMS = [
  { initial: { x: "100%",  opacity: 0 },              exit: { x: "-60%",  opacity: 0 } },              // slide from right
  { initial: { x: "-100%", opacity: 0 },              exit: { x: "60%",   opacity: 0 } },              // slide from left
  { initial: { y: "100%",  opacity: 0 },              exit: { y: "-60%",  opacity: 0 } },              // slide up
  { initial: { y: "-100%", opacity: 0 },              exit: { y: "60%",   opacity: 0 } },              // slide down
  { initial: { opacity: 0 },                          exit: { opacity: 0 } },                          // fade
  { initial: { opacity: 0, scale: 0.93 },             exit: { opacity: 0, scale: 1.06 } },             // cross-dissolve
  { initial: { opacity: 0, x: 28 },                   exit: { opacity: 0, x: -28 } },                  // pan + fade
];

function LiveTile({ faces }: { faces: React.ReactNode[] }) {
  const [faceIdx, setFaceIdx] = useState(0);
  const animRef  = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const schedule = () => {
      const delay = 5000 + Math.random() * 7000; // 5–12 s
      timerRef.current = setTimeout(() => {
        animRef.current = Math.floor(Math.random() * TILE_ANIMS.length);
        setFaceIdx(prev => {
          let next = Math.floor(Math.random() * faces.length);
          while (next === prev && faces.length > 1) next = Math.floor(Math.random() * faces.length);
          return next;
        });
        schedule();
      }, delay);
    };
    // Random per-tile jitter — tiles NEVER sync
    timerRef.current = setTimeout(schedule, Math.random() * 4000 + 800);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const anim = TILE_ANIMS[animRef.current];
  return (
    <div className="relative overflow-hidden" style={{ height: "70px" }}>
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={faceIdx}
          initial={anim.initial}
          animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          exit={anim.exit}
          transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          {faces[faceIdx]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function LiveOverviewTile({ icon, label, accent, accentText, faces }: {
  icon: React.ReactNode; label: string; accent: string; accentText: string; faces: React.ReactNode[];
}) {
  return (
    <div
      className={`flex flex-col px-2.5 py-2 rounded-xl bg-gradient-to-br ${accent} border border-white/[0.05] flex-1 min-w-0`}
      style={{ boxShadow: "0 8px 28px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.07) inset, 0 -1px 0 rgba(0,0,0,0.35) inset" }}
    >
      <div className="flex items-center gap-1 mb-1.5 shrink-0">
        {icon}
        <span className={`text-[9px] font-bold uppercase tracking-wider ${accentText}`}>{label}</span>
      </div>
      <LiveTile faces={faces} />
    </div>
  );
}

/* ── Overview box ── */
export function OverviewBox({ icon, label, accent, accentText, children }: {
  icon: React.ReactNode; label: string; accent: string; accentText: string; children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 px-2.5 py-2 rounded-xl bg-gradient-to-br ${accent} border border-white/[0.05] flex-1 min-w-0`}>
      <div className="flex items-center gap-1">
        {icon}
        <span className={`text-[9px] font-bold uppercase tracking-wider ${accentText}`}>{label}</span>
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function OverviewTask({ text, done }: { text: string; done?: boolean }) {
  return (
    <div className="flex items-start gap-1">
      <span className={`mt-0.5 shrink-0 ${done ? "text-green-500" : "text-slate-600"}`}>
        {done
          ? <CheckCircle2 size={10} />
          : <div className="w-2 h-2 rounded-full border border-slate-600 mt-0.5" />}
      </span>
      <span className={`text-[10px] leading-snug ${done ? "text-slate-500 line-through" : "text-slate-300"}`}>{text}</span>
    </div>
  );
}

function OverviewAppt({ day, time, title }: { day: string; time: string; title: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[8px] font-bold text-purple-400 w-5 shrink-0">{day}</span>
      <span className="text-[9px] text-slate-500 w-7 shrink-0">{time}</span>
      <span className="text-[10px] text-slate-300 truncate">{title}</span>
    </div>
  );
}

function MealRow({ slot, label, meal, muted }: { slot: string; label: string; meal: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-[10px] shrink-0">{slot}</span>
      <span className="text-[9px] font-semibold text-indigo-400/70 shrink-0 w-10">{label}</span>
      <span className={`text-[10px] leading-snug truncate ${muted ? "text-slate-600" : "text-slate-300"}`}>{meal}</span>
    </div>
  );
}

function ExerciseRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[9px] font-bold text-green-400/70 uppercase tracking-wide w-12 shrink-0">{label}</span>
      <span className="text-[10px] text-slate-300 truncate">{value}</span>
    </div>
  );
}

/* ── Stats grid ── */
const STATS = [
  { icon: <CheckCircle2 size={13} />, label: "Tasks Done",       value: "12",    sub: "this week",     color: "text-green-400"  },
  { icon: <Flame        size={13} />, label: "Habit Streak",     value: "9 days",sub: "current",       color: "text-orange-400" },
  { icon: <Target       size={13} />, label: "Deep Work",        value: "6.5 h", sub: "this week",     color: "text-blue-400"   },
  { icon: <Footprints   size={13} />, label: "Steps",            value: "7,420", sub: "today",         color: "text-teal-400"   },
  { icon: <Droplets     size={13} />, label: "Water Intake",     value: "1.2 L", sub: "of 2.5 L",      color: "text-cyan-400"   },
  { icon: <Moon         size={13} />, label: "Sleep Avg",        value: "7.2 h", sub: "last 7 nights", color: "text-violet-400" },
  { icon: <BarChart3    size={13} />, label: "Goals Progressed", value: "5 / 8", sub: "active goals",  color: "text-pink-400"   },
  { icon: <Activity     size={13} />, label: "Health Metrics",   value: "8",     sub: "updated today", color: "text-red-400"    },
];

function StatsGrid() {
  return (
    <div className="bg-[#1c1f2e] border border-white/[0.06] rounded-2xl p-4 shadow-lg shadow-black/20">
      <CardLabel label="P1 Activity — This Week" />
      <div className="grid grid-cols-4 gap-2 mt-3">
        {STATS.map((s) => (
          <div key={s.label} className="flex items-start gap-2 bg-[#0f1117]/60 border border-white/[0.04] rounded-xl px-3 py-2">
            <span className={`mt-0.5 shrink-0 ${s.color}`}>{s.icon}</span>
            <div className="min-w-0">
              <p className={`text-sm font-bold leading-none ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-slate-400 leading-snug mt-0.5 truncate">{s.label}</p>
              <p className="text-[9px] text-slate-600 leading-none mt-0.5">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── News panel ── */
const NEWS_TABS = ["Industry", "World", "Local (Colchester)", "Sport", "Weather"] as const;
type NewsTab = typeof NEWS_TABS[number];

const NEWS_CONTENT: Record<NewsTab, string[]> = {
  "Industry": [
    "AI productivity tools see 40% enterprise adoption surge in Q2 2026",
    "SaaS consolidation continues as three major mergers announced this week",
    "Developer hiring rebounds — junior roles up 22% YoY across UK tech",
  ],
  "World": [
    "G7 leaders agree on new digital trade framework in Rome summit",
    "IMF upgrades global growth forecast to 3.4% for 2026",
    "UN climate report: renewable energy now cheaper than fossil fuels in 94 countries",
  ],
  "Local (Colchester)": [
    "Colchester Council approves new tech hub at the Northern Gateway development",
    "University of Essex opens AI & Data Science Research Centre this autumn",
    "Local broadband rollout reaches 98% gigabit coverage — among UK's fastest",
  ],
  "Sport": [
    "England beat France 2–1 in Nations League quarter-final at Wembley",
    "Anthony Joshua confirms comeback bout scheduled for September",
    "Premier League announces record £7.8bn broadcast rights deal for 2027–30",
  ],
  "Weather": [
    "☀️  Today: Sunny spells, 21°C — warm and dry all day",
    "🌤  Tomorrow: Partly cloudy, 18°C — light breeze from the south-west",
    "🌧  Weekend: Rain expected Saturday, clearing Sunday — 14°C low",
  ],
};

export function NewsPanel() {
  const [active, setActive] = useState<NewsTab>("Industry");
  return (
    <DismissableCard>
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {NEWS_TABS.map((t) => (
          <NewsTabPill key={t} label={t} active={active === t} onClick={() => setActive(t)} />
        ))}
      </div>
      <ul className="space-y-2">
        {NEWS_CONTENT[active].map((item) => (
          <NewsItem key={item} text={item} />
        ))}
      </ul>
    </DismissableCard>
  );
}

/* ────────────────────────────────────────────────────────────
   RIGHT SIDEBAR
   ──────────────────────────────────────────────────────────── */
const RECO_MODES = ["Amazon Deals", "Books", "Gadgets", "For Your Goals"] as const;
type RecoMode = typeof RECO_MODES[number];

const RECO_CONTENT: Record<RecoMode, { icon: React.ReactNode; text: string; sub: string }[]> = {
  "Amazon Deals": [
    { icon: <ShoppingBag size={11} className="text-orange-400" />, text: "Sony WH-1000XM6 Headphones", sub: "£279 · was £349"      },
    { icon: <ShoppingBag size={11} className="text-orange-400" />, text: "Kindle Paperwhite 2026",      sub: "£119 · 30% off"       },
    { icon: <ShoppingBag size={11} className="text-orange-400" />, text: "Standing Desk Converter",     sub: "£89 · Deal of the Day" },
  ],
  "Books": [
    { icon: <BookOpen size={11} className="text-blue-400" />, text: "The Lean Startup — Ries",  sub: "Entrepreneurship" },
    { icon: <BookOpen size={11} className="text-blue-400" />, text: "Deep Work — Cal Newport",   sub: "Productivity"     },
    { icon: <BookOpen size={11} className="text-blue-400" />, text: "Zero to One — Thiel",       sub: "Strategy"         },
  ],
  "Gadgets": [
    { icon: <Cpu size={11} className="text-teal-400" />, text: 'Apple M4 iPad Pro 13"',    sub: "New · from £1,099" },
    { icon: <Cpu size={11} className="text-teal-400" />, text: "Garmin Forerunner 965",    sub: "GPS · £499"         },
    { icon: <Cpu size={11} className="text-teal-400" />, text: "Anker 140W USB-C Charger", sub: "Travel · £49"       },
  ],
  "For Your Goals": [
    { icon: <Target size={11} className="text-pink-400" />, text: "P1 Goal: Launch MVP by Aug", sub: "3 tasks open"       },
    { icon: <Target size={11} className="text-pink-400" />, text: "Habit: Daily deep work 2 h", sub: "9-day streak 🔥"    },
    { icon: <Target size={11} className="text-pink-400" />, text: "Health: Drink 2.5 L water",  sub: "1.2 L logged today" },
  ],
};

// ── YouTube Shorts — @theschoolofhardknocks ──────────────────
// Real video IDs from the channel. Shorts embed via /embed/<ID>.
const YT_VIDEOS = [
  {
    id: "V0gfStE9mf4",
    title: "He Became a Millionaire at 23 👀",
    channel: "School of Hard Knocks",
    duration: "Short",
    category: "Millionaire",
    categoryColor: "text-indigo-400 bg-indigo-500/10",
  },
  {
    id: "Kn_hZ4kw-N8",
    title: "He Became a BILLIONAIRE Doing This..?",
    channel: "School of Hard Knocks",
    duration: "Short",
    category: "Billionaire",
    categoryColor: "text-amber-400 bg-amber-500/10",
  },
  {
    id: "ZkAALnnnrr8",
    title: "He Got RICH Off WHAT 🤯",
    channel: "School of Hard Knocks",
    duration: "Short",
    category: "Wealth",
    categoryColor: "text-green-400 bg-green-500/10",
  },
];

function RightSidebar({ onP1ScoreClick, onYtClick }: {
  onP1ScoreClick: () => void;
  onYtClick: (v: YtVideo) => void;
}) {
  const [recoMode, setRecoMode] = useState<RecoMode>("Amazon Deals");

  return (
    <aside className={`${RIGHT_W} shrink-0 bg-[#13151c] border-l border-white/[0.06] overflow-y-auto h-full p-3 flex flex-col gap-3`}>
      <ProfileCard onP1ScoreClick={onP1ScoreClick} />

      <RightCard icon={<PlayCircle size={13} />} title="YouTube for You">
        <div className="flex flex-col gap-2.5">
          {YT_VIDEOS.map((v) => (
            <motion.button key={v.id} onClick={() => onYtClick(v)}
              whileHover={{ scale: 1.02 }} transition={{ duration: 0.12 }}
              className="w-full text-left group">
              {/* Thumbnail */}
              <div className="relative w-full rounded-xl overflow-hidden mb-1.5" style={{ height: "80px" }}>
                <img
                  src={`https://img.youtube.com/vi/${v.id}/hqdefault.jpg`}
                  alt={v.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    t.style.display = "none";
                    const fb = t.parentElement?.querySelector(".yt-fallback") as HTMLElement | null;
                    if (fb) fb.style.display = "flex";
                  }}
                />
                {/* Fallback */}
                <div className="yt-fallback absolute inset-0 bg-gradient-to-br from-indigo-900/60 to-violet-900/60 items-center justify-center hidden">
                  <PlayCircle size={20} className="text-white/40" />
                </div>
                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-black/50 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="white"><path d="M3 2l7 4-7 4V2z"/></svg>
                  </div>
                </div>
                {/* Duration badge */}
                <div className="absolute bottom-1.5 right-1.5 px-1 py-0.5 rounded bg-black/70 text-[9px] font-bold text-white">
                  {v.duration}
                </div>
                {/* Category tag */}
                <div className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold border ${v.categoryColor} border-white/10`}>
                  {v.category}
                </div>
              </div>
              <p className="text-[11px] font-semibold text-slate-300 group-hover:text-white transition-colors leading-snug line-clamp-2">{v.title}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">{v.channel}</p>
            </motion.button>
          ))}
        </div>
      </RightCard>

      <RightCard icon={<Sparkles size={13} />} title="Smart Picks">
        <div className="flex flex-wrap gap-1 mb-2.5">
          {RECO_MODES.map((m) => (
            <button
              key={m}
              onClick={() => setRecoMode(m)}
              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md transition-colors ${
                recoMode === m
                  ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/25"
                  : "text-slate-600 hover:text-slate-400 hover:bg-white/5"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <ul className="space-y-2.5">
          {RECO_CONTENT[recoMode].map((r) => (
            <li key={r.text} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0">{r.icon}</span>
              <div className="min-w-0">
                <p className="text-[11px] text-slate-300 leading-snug truncate">{r.text}</p>
                <p className="text-[10px] text-slate-600">{r.sub}</p>
              </div>
            </li>
          ))}
        </ul>
      </RightCard>

      <RightCard icon={<Inbox size={13} />} title="Messages" badge="3">
        <ul className="space-y-3 mt-1">
          <MessagePreview sender="Alex"    preview="Hey, are we still on for Friday?" />
          <MessagePreview sender="Team P1" preview="Sprint review moved to 3pm" />
          <MessagePreview sender="Sarah"   preview="Can you review the proposal?" />
        </ul>
      </RightCard>
    </aside>
  );
}

/* ────────────────────────────────────────────────────────────
   P1 SCORE MODAL
   ──────────────────────────────────────────────────────────── */
function P1ScoreModal({ onClose }: { onClose: () => void }) {
  // Close on ESC
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      key="p1-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.52)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-[460px] max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.08] shadow-2xl shadow-black/60"
        style={{
          background:   "rgba(18,20,30,0.96)",
          backdropFilter: "blur(24px)",
          boxShadow:    "0 0 0 1px rgba(255,255,255,0.05), 0 32px 64px rgba(0,0,0,0.6), 0 0 40px rgba(99,102,241,0.07)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.07] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="p-7">
          {/* Score badge + title */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold px-3.5 py-2 rounded-xl shadow-lg shadow-indigo-900/40 shrink-0">
              <Star size={12} className="opacity-80" />
              <span className="text-[11px] opacity-70">P1</span>
              <span className="text-lg leading-none">72</span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-white leading-snug">What is the P1 Score?</h2>
              <p className="text-[11px] text-indigo-400 mt-0.5">Your personal operating index</p>
            </div>
          </div>

          <div className="w-full h-px bg-white/[0.06] mb-5" />

          {/* Intro */}
          <p className="text-[13px] text-slate-300 leading-[1.65] mb-6">
            Your P1 Score is a single number that reflects the overall health, balance, and momentum of your Life + Work system. It is not a measure of intelligence or ability. It is a reflection of how aligned your habits, energy, workload, wellbeing, and goals are at this moment.
          </p>

          {/* Section: What influences it? */}
          <ModalSection title="What influences it?">
            <p className="text-[13px] text-slate-400 leading-[1.65] mb-3">Your P1 Score is shaped by patterns across:</p>
            <ul className="space-y-1.5">
              {[
                "Sleep & recovery", "Stress & workload balance", "Consistency of habits",
                "Progress on goals", "Deep work & focus", "Physical health & vitality",
                "Financial stability", "Learning & growth", "Social connection", "Life admin stability",
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-[12px] text-slate-400 leading-snug">
                  <span className="mt-[5px] w-1 h-1 rounded-full bg-indigo-400/60 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-[12px] text-slate-500 leading-[1.6] mt-3 italic">
              No single metric can raise or lower your score on its own — it's the overall pattern that matters.
            </p>
          </ModalSection>

          {/* Section: What does it mean? */}
          <ModalSection title="What does it mean?">
            <p className="text-[13px] text-slate-400 leading-[1.65] mb-2">
              A <span className="text-green-400 font-medium">higher score</span> means your systems are aligned and supporting your goals.
            </p>
            <p className="text-[13px] text-slate-400 leading-[1.65] mb-3">
              A <span className="text-amber-400 font-medium">lower score</span> means something in your life or work ecosystem needs attention.
            </p>
            <p className="text-[12px] text-slate-500 leading-[1.6] italic">
              It's not about perfection. It's about awareness, balance, and momentum.
            </p>
          </ModalSection>

          {/* Section: How can I improve it? */}
          <ModalSection title="How can I improve it?" last>
            <p className="text-[13px] text-slate-400 leading-[1.65] mb-3">Small, consistent actions have the biggest impact:</p>
            <ul className="space-y-1.5 mb-4">
              {[
                "Completing meaningful tasks", "Improving sleep", "Reducing overload",
                "Taking breaks", "Progressing goals", "Managing stress",
                "Staying active", "Learning something new",
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-[12px] text-slate-400 leading-snug">
                  <span className="mt-[5px] w-1 h-1 rounded-full bg-violet-400/60 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-[12px] text-slate-500 leading-[1.65] italic">
              Your P1 Score improves when you improve — gently, steadily, sustainably.
            </p>
          </ModalSection>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ModalSection({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={last ? "" : "mb-5"}>
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-indigo-400/80 mb-2.5">{title}</h3>
      {children}
      {!last && <div className="w-full h-px bg-white/[0.04] mt-5" />}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   SHARED PRIMITIVES
   ──────────────────────────────────────────────────────────── */
const WORKING_ON = [
  "P1 Cockpit v1 UI",
  "MVP demo build",
  "Investor update",
];

function ProfileCard({ onP1ScoreClick }: { onP1ScoreClick: () => void }) {
  return (
    <div className="bg-[#1c1f2e] border border-white/[0.06] rounded-2xl overflow-hidden shadow-lg shadow-black/20">
      {/* Side-by-side: photo left, info right */}
      <div className="flex gap-2.5 p-3">
        {/* 4:5 portrait photo — left-aligned, compact */}
        <div className="relative overflow-hidden rounded-xl shrink-0 bg-[#1c1f2e]" style={{ width: "72px", height: "90px" }}>
          <img
            src={PROFILE_IMG}
            alt="Francis Cobbinah"
            className="absolute inset-0 w-full h-full object-cover object-top"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = "none";
              const fb = img.nextElementSibling as HTMLElement | null;
              if (fb) fb.classList.remove("hidden");
            }}
          />
          {/* Fallback — hidden until image fails */}
          <div className="hidden absolute inset-0 bg-[#252840] flex items-center justify-center">
            <span className="text-lg font-bold text-slate-500">FC</span>
          </div>
        </div>

        {/* Right: name + dynamic block */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-white leading-tight">Francis Cobbinah</p>
            <p className="text-[10px] text-indigo-400 font-semibold mt-0.5">Founder · Percentile.One</p>
            <p className="text-[9px] text-slate-500 mt-0.5">Colchester, UK</p>
          </div>
          <div className="mt-2">
            <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600 mb-1">Working On</p>
            <div className="space-y-0.5">
              {WORKING_ON.map(t => (
                <div key={t} className="flex items-start gap-1">
                  <span className="w-1 h-1 rounded-full bg-indigo-400/50 mt-1.5 shrink-0" />
                  <p className="text-[9px] text-slate-400 leading-snug">{t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-2 px-3 pb-2.5 pt-2 border-t border-white/[0.05]">
        <MiniStat value="72"  label="P1 Score" clickable onClick={onP1ScoreClick} />
        <MiniStat value="147" label="Tasks"    />
        <MiniStat value="21"  label="Epics"    />
      </div>
    </div>
  );
}

function MiniStat({ value, label, clickable, onClick }: {
  value: string; label: string; clickable?: boolean; onClick?: () => void;
}) {
  if (clickable) {
    return (
      <button
        onClick={onClick}
        className="flex flex-col items-center flex-1 group cursor-pointer rounded-lg px-1 py-0.5 hover:bg-indigo-600/10 transition-colors duration-150"
        title="What is the P1 Score?"
      >
        <span className="text-sm font-bold text-indigo-300 group-hover:text-indigo-200 transition-colors">{value}</span>
        <span className="text-[9px] text-slate-600 uppercase tracking-wider group-hover:text-slate-500 transition-colors">{label}</span>
      </button>
    );
  }
  return (
    <div className="flex flex-col items-center flex-1">
      <span className="text-sm font-bold text-indigo-300">{value}</span>
      <span className="text-[9px] text-slate-600 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function Avatar({ src, size, initials, ring }: {
  src: string; size: number; initials: string; ring?: boolean;
}) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center ${
        ring ? "ring-2 ring-indigo-500/40 ring-offset-1 ring-offset-[#13151c]" : ""
      }`}
    >
      <img
        src={src}
        alt={initials}
        className="w-full h-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <span className="absolute text-white font-bold select-none" style={{ fontSize: size * 0.36 }} aria-hidden>
        {initials}
      </span>
    </div>
  );
}

function DarkCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#1c1f2e] border border-white/[0.06] rounded-2xl p-4 shadow-lg shadow-black/20">
      {children}
    </div>
  );
}

function DismissableCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative bg-[#1c1f2e] border border-white/[0.06] rounded-2xl p-4 shadow-lg shadow-black/20">
      <button className="absolute top-3.5 right-3.5 text-slate-600 hover:text-slate-400 transition-colors text-sm leading-none">✕</button>
      {children}
    </div>
  );
}

function CardLabel({ label }: { label: string }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>;
}

function NewsTabPill({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-colors ${
        active ? "bg-slate-200/10 text-slate-200 border border-white/10" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
      }`}
    >
      {label}
    </button>
  );
}

function NewsItem({ text }: { text: string }) {
  return (
    <li className="flex gap-2.5 items-start">
      <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-600 shrink-0" />
      <span className="text-xs text-slate-400 leading-snug">{text}</span>
    </li>
  );
}

function RightCard({ icon, title, badge, children }: {
  icon: React.ReactNode; title: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-[#1c1f2e] border border-white/[0.06] rounded-2xl p-3 shadow-lg shadow-black/20">
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="text-slate-500">{icon}</span>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex-1">{title}</p>
        {badge && <span className="bg-indigo-600/25 text-indigo-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function MessagePreview({ sender, preview }: { sender: string; preview: string }) {
  return (
    <li className="flex items-start gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-300 truncate">{sender}</p>
        <p className="text-[11px] text-slate-600 truncate">{preview}</p>
      </div>
    </li>
  );
}

/* ────────────────────────────────────────────────────────────
   CINEMATIC YOUTUBE MODAL (B1 animation)
   ──────────────────────────────────────────────────────────── */
function YouTubeModal({ video, onClose }: { video: YtVideo; onClose: () => void }) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      key="yt-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1.0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.26, ease: "easeOut" }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden border border-white/[0.08]"
        style={{
          background: "#0a0b10",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 40px 80px rgba(0,0,0,0.8), 0 0 60px rgba(99,102,241,0.10)",
        }}
      >
        {/* Video embed */}
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          />
        </div>

        {/* Metadata bar */}
        <div className="px-5 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${video.categoryColor} border border-white/10`}>
                {video.category}
              </span>
              <span className="text-[10px] text-slate-600">{video.duration}</span>
            </div>
            <p className="text-sm font-bold text-white leading-snug">{video.title}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{video.channel}</p>
            {/* Agent integration placeholder */}
            <div className="flex items-center gap-1.5 mt-2">
              <Sparkles size={10} className="text-indigo-400 shrink-0" />
              <p className="text-[11px] text-indigo-300">This video aligns with your Entrepreneurship goal.</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
