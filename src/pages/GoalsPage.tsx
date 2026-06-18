import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Search, ChevronDown, Star, Sparkles, Trophy,
  Calendar, CheckCircle2, TrendingUp, Clock, ChevronRight, Flame,
  Target, Activity, BarChart3, Zap,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════ */
type AgentSignal   = "momentum" | "at_risk" | "suggestion" | "deadline" | "achievement";
type Difficulty    = "easy" | "medium" | "hard" | "epic";
type GoalMode      = "life" | "work";
type MilestoneGroup = "today" | "this_week" | "overdue" | "slip_risk";

interface Goal {
  id: string; title: string; category: string; subCategory: string;
  mode: GoalMode; progress: number; milestonesComplete: number; milestonesTotal: number;
  nextAction: string; deadline: string; points: number;
  signal: AgentSignal; streak?: number; difficulty: Difficulty;
}
interface CompletedGoal {
  title: string; completedDate: string; points: number;
  streakBonus?: number; agentMessage: string; category: string;
}
interface PlannedGoal {
  title: string; category: string; mode: GoalMode;
  estimatedDuration: string; difficulty: Difficulty;
  estimatedPoints: number; agentNote: string; agentSuggested?: boolean;
}
interface Milestone {
  goalTitle: string; title: string; dueDate: string;
  points: number; agentNote: string; group: MilestoneGroup;
}

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════ */
const SIGNAL_CFG: Record<AgentSignal, { icon: string; label: string; cls: string }> = {
  momentum:    { icon: "🔥", label: "Momentum",    cls: "text-orange-400 bg-orange-400/10 border-orange-400/25" },
  at_risk:     { icon: "⚠️",  label: "At Risk",     cls: "text-red-400 bg-red-400/10 border-red-400/25" },
  suggestion:  { icon: "💡", label: "Suggestion",  cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/25" },
  deadline:    { icon: "⏳", label: "Deadline",    cls: "text-amber-400 bg-amber-400/10 border-amber-400/25" },
  achievement: { icon: "⭐", label: "Achievement", cls: "text-violet-300 bg-violet-400/10 border-violet-400/25" },
};
const DIFF_CFG: Record<Difficulty, { label: string; cls: string }> = {
  easy:   { label: "EASY", cls: "text-green-400 bg-green-400/10" },
  medium: { label: "MED",  cls: "text-blue-400 bg-blue-400/10" },
  hard:   { label: "HARD", cls: "text-orange-400 bg-orange-400/10" },
  epic:   { label: "EPIC", cls: "text-purple-400 bg-purple-400/10" },
};

/* ══════════════════════════════════════════════════════════════
   SYNTHETIC DATA
   ══════════════════════════════════════════════════════════════ */
const ACTIVE_GOALS: Goal[] = [
  { id:"g1", title:"Launch P1 MVP", category:"Projects & Delivery", subCategory:"Active Projects",
    mode:"work", progress:68, milestonesComplete:5, milestonesTotal:8,
    nextAction:"Deploy to staging environment", deadline:"30 Jun 2026",
    points:500, signal:"momentum", difficulty:"epic" },
  { id:"g2", title:"Daily 10,000 Steps", category:"Health & Vitality", subCategory:"Fitness & Movement",
    mode:"life", progress:45, milestonesComplete:2, milestonesTotal:6,
    nextAction:"Evening walk after dinner", deadline:"15 Jul 2026",
    points:200, signal:"at_risk", difficulty:"medium" },
  { id:"g3", title:"Read 24 Books This Year", category:"Continuous Learning", subCategory:"Reading",
    mode:"life", progress:62, milestonesComplete:12, milestonesTotal:24,
    nextAction:"Start 'Atomic Habits'", deadline:"31 Dec 2026",
    points:300, signal:"suggestion", difficulty:"medium" },
  { id:"g4", title:"Build Investor Deck", category:"Career & Direction", subCategory:"Long-Term Vision",
    mode:"work", progress:30, milestonesComplete:1, milestonesTotal:5,
    nextAction:"Research comparable companies", deadline:"25 Jun 2026",
    points:400, signal:"deadline", difficulty:"hard" },
  { id:"g5", title:"£20k Emergency Fund", category:"Wealth", subCategory:"Savings & Investments",
    mode:"life", progress:75, milestonesComplete:3, milestonesTotal:4,
    nextAction:"Transfer £500 this week", deadline:"1 Sep 2026",
    points:350, signal:"achievement", streak:8, difficulty:"hard" },
  { id:"g6", title:"AWS Solutions Architect", category:"Skills & Mastery", subCategory:"Certifications",
    mode:"work", progress:20, milestonesComplete:1, milestonesTotal:8,
    nextAction:"Complete IAM module", deadline:"30 Jul 2026",
    points:450, signal:"suggestion", difficulty:"hard" },
  { id:"g7", title:"30-Day Meditation Streak", category:"Spirituality & Meaning", subCategory:"Meditation / Reflection",
    mode:"life", progress:83, milestonesComplete:25, milestonesTotal:30,
    nextAction:"10-min session before bed", deadline:"20 Jun 2026",
    points:250, signal:"momentum", streak:25, difficulty:"easy" },
  { id:"g8", title:"Hire 2 Senior Engineers", category:"Team & Collaboration", subCategory:"Team Members",
    mode:"work", progress:15, milestonesComplete:0, milestonesTotal:4,
    nextAction:"Post JD on LinkedIn", deadline:"15 Jul 2026",
    points:400, signal:"at_risk", difficulty:"hard" },
];

const COMPLETED_GOALS: CompletedGoal[] = [
  { title:"P1 Cockpit UI — v1.0", completedDate:"28 May 2026", points:500, streakBonus:75,
    agentMessage:"Outstanding execution. Complex multi-week project shipped on time and at quality. ⭐",
    category:"Projects & Delivery" },
  { title:"Run a 5k Non-Stop", completedDate:"15 May 2026", points:200,
    agentMessage:"First 5k complete. Your cardiovascular baseline is improving — great foundation for what's next.",
    category:"Health & Vitality" },
  { title:"Set Up Pension Contributions", completedDate:"30 Apr 2026", points:300,
    agentMessage:"Pension now active. Compound interest starts working for you today — a quiet but powerful win.",
    category:"Wealth" },
  { title:"Launch Company LinkedIn Page", completedDate:"12 Apr 2026", points:150,
    agentMessage:"Brand presence established. I'll track follower growth and engagement trends from here.",
    category:"Reputation & Influence" },
  { title:"Read 'Zero to One'", completedDate:"20 Mar 2026", points:100,
    agentMessage:"Key frameworks absorbed. Thiel's contrarian questions added to your strategic thinking toolkit.",
    category:"Continuous Learning" },
];

const PLANNED_GOALS: PlannedGoal[] = [
  { title:"Build P1 Mobile App", category:"Projects & Delivery", mode:"work",
    estimatedDuration:"6 months", difficulty:"epic", estimatedPoints:800,
    agentNote:"Suggested start: post-MVP launch in July. React Native + existing API layer.", agentSuggested:false },
  { title:"Learn Spanish to A2 Level", category:"Continuous Learning", mode:"life",
    estimatedDuration:"12 months", difficulty:"hard", estimatedPoints:600,
    agentNote:"30 mins daily + weekly italki session. Achievable alongside current workload.", agentSuggested:true },
  { title:"Buy Investment Property", category:"Wealth", mode:"life",
    estimatedDuration:"24 months", difficulty:"epic", estimatedPoints:1000,
    agentNote:"Prerequisite: emergency fund complete (75% there). I'll flag when the time is right.", agentSuggested:false },
  { title:"Speak at a Tech Conference", category:"Reputation & Influence", mode:"work",
    estimatedDuration:"18 months", difficulty:"hard", estimatedPoints:500,
    agentNote:"Your P1 build narrative is compelling. I suggest targeting a productivity or fintech event.", agentSuggested:true },
];

const MILESTONES: Milestone[] = [
  { goalTitle:"30-Day Meditation Streak", title:"Complete day 25 session", dueDate:"Today",
    points:10, agentNote:"Only 5 days remaining — you're on track for the streak bonus.", group:"today" },
  { goalTitle:"Build Investor Deck", title:"Research comparables document", dueDate:"Today",
    points:50, agentNote:"Deadline is in 11 days — this is on the critical path.", group:"today" },
  { goalTitle:"£20k Emergency Fund", title:"Transfer £500 to savings", dueDate:"16 Jun 2026",
    points:30, agentNote:"One transfer away from milestone 4.", group:"this_week" },
  { goalTitle:"Daily 10,000 Steps", title:"7-day consistent streak", dueDate:"17 Jun 2026",
    points:40, agentNote:"You hit 8,200 steps yesterday — a small push is needed.", group:"this_week" },
  { goalTitle:"AWS Solutions Architect", title:"Complete IAM module", dueDate:"18 Jun 2026",
    points:60, agentNote:"2.5 hours of content remaining. Block Friday morning.", group:"this_week" },
  { goalTitle:"Read 24 Books This Year", title:"Finish 'Clear Thinking'", dueDate:"19 Jun 2026",
    points:25, agentNote:"62 pages remaining at your average pace — about 2 sessions.", group:"this_week" },
  { goalTitle:"Hire 2 Senior Engineers", title:"Draft job description", dueDate:"10 Jun 2026",
    points:80, agentNote:"3 days overdue. Blocking the entire hiring pipeline.", group:"overdue" },
  { goalTitle:"Launch P1 MVP", title:"Complete API integration tests", dueDate:"8 Jun 2026",
    points:100, agentNote:"5 days overdue — now on the critical path.", group:"overdue" },
  { goalTitle:"Daily 10,000 Steps", title:"Hit 10k steps 5 days in a row", dueDate:"7 Jun 2026",
    points:50, agentNote:"Missed last week's target. Streak tracker has been reset.", group:"overdue" },
  { goalTitle:"Build Investor Deck", title:"First slide draft complete", dueDate:"22 Jun 2026",
    points:75, agentNote:"Based on current pace, likely to slip 3–5 days unless you block time now.", group:"slip_risk" },
  { goalTitle:"AWS Solutions Architect", title:"Pass practice exam 1", dueDate:"25 Jun 2026",
    points:90, agentNote:"Study velocity is below target — need 4 more hours per week to stay on track.", group:"slip_risk" },
];

const MOMENTUM_DATA   = [42, 55, 48, 61, 58, 70, 65, 72, 68, 80, 75, 83];
const MOMENTUM_WEEKS  = ["W1","W2","W3","W4","W5","W6","W7","W8","W9","W10","W11","W12"];
const VELOCITY_DATA   = [3, 5, 2, 6, 4, 7];
const VELOCITY_LABELS = ["Jan","Feb","Mar","Apr","May","Jun"];
const POINTS_DATA     = [120, 250, 180, 410, 320, 580, 490, 720, 650, 890, 810, 1050];
const STREAK_DAYS     = [true, true, true, false, true, true, true];
const DIFF_DIST       = { easy: 4, medium: 8, hard: 9, epic: 3 };

const INSIGHTS = [
  "Your completion rate has improved 18% over 6 weeks — strongest in Health and Career categories.",
  "Goals set on Mondays are abandoned at 2× the rate of mid-week goals. Consider planning new goals on Wednesdays.",
  "Goals with a defined 'next action' are 3× more likely to reach 50% completion than those without one.",
  "Your P1 Score has increased +8 points this month — driven by the meditation streak and savings progress.",
  "2 goals are predicted to slip this week. Blocking 3 hours on Friday would put both back on track.",
];

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */
export default function GoalsPage() {
  const navigate = useNavigate();
  const [mode, setMode]         = useState<GoalMode>("life");
  const [searchQuery, setSearch] = useState("");
  const [filterDiff, setFilterDiff]     = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterHorizon, setHorizon]     = useState("all");
  const [collapsed, setCollapsed]       = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) =>
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  const filteredGoals = ACTIVE_GOALS.filter(g => {
    if (g.mode !== mode) return false;
    if (filterDiff !== "all" && g.difficulty !== filterDiff) return false;
    if (searchQuery && !g.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 font-sans">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-20 bg-[#13151c]/95 backdrop-blur-md border-b border-white/[0.06] flex items-center gap-3 px-6 h-14">
        <button
          onClick={() => navigate("/cockpit")}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-xs font-medium"
        >
          <ArrowLeft size={14} /> Cockpit
        </button>
        <div className="w-px h-4 bg-white/10" />
        <h1 className="text-sm font-semibold text-white">Goals Dashboard</h1>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-white/[0.04] border border-white/[0.06] rounded-lg p-1 ml-2">
          <ModeTab label="My Life" active={mode === "life"} onClick={() => setMode("life")} />
          <ModeTab label="My Work" active={mode === "work"} onClick={() => setMode("work")} />
        </div>

        {/* Filters */}
        <div className="flex gap-2 ml-1">
          <GSelect value={filterDiff} onChange={setFilterDiff} options={[
            { value:"all", label:"All Difficulty" },
            { value:"easy", label:"Easy" },
            { value:"medium", label:"Medium" },
            { value:"hard", label:"Hard" },
            { value:"epic", label:"Epic" },
          ]} />
          <GSelect value={filterStatus} onChange={setFilterStatus} options={[
            { value:"all", label:"All Status" },
            { value:"active", label:"Active" },
            { value:"completed", label:"Completed" },
            { value:"planned", label:"Planned" },
          ]} />
          <GSelect value={filterHorizon} onChange={setHorizon} options={[
            { value:"all", label:"All Horizons" },
            { value:"12w", label:"12-Week Cycle" },
            { value:"1y", label:"1 Year" },
            { value:"3y", label:"3 Years" },
            { value:"5y", label:"5 Years" },
          ]} />
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-3">
          <button onClick={() => navigate("/vision")}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-300 transition-colors font-medium">
            Vision
          </button>
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5">
            <Search size={12} className="text-slate-500" />
            <input
              value={searchQuery}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search goals…"
              className="bg-transparent outline-none text-xs text-slate-300 placeholder-slate-600 w-28"
            />
          </div>
          <button className="relative w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 hover:bg-indigo-600/30 transition-colors">
            <Sparkles size={13} />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          </button>
          <button onClick={() => navigate("/goals/create")} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shadow-lg shadow-indigo-900/40">
            <Plus size={13} /> New Goal
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-5 space-y-3">

        {/* ── Section 1: Active Goals ── */}
        <Section id="active" title="Active Goals" badge={String(filteredGoals.length)}
          collapsed={collapsed} toggle={toggleSection} accent="#6366f1">
          {filteredGoals.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No goals match the current filter.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredGoals.map(g => <GoalCard key={g.id} goal={g} />)}
            </div>
          )}
        </Section>

        {/* ── Section 2: Goal Momentum ── */}
        <Section id="momentum" title="Goal Momentum" collapsed={collapsed} toggle={toggleSection}>
          <div className="space-y-4">
            {/* Line chart */}
            <DCard label="12-Week Momentum Index">
              <div className="mt-2">
                <LineChart data={MOMENTUM_DATA} labels={MOMENTUM_WEEKS} gradId="momGrad" color="#6366f1" />
              </div>
            </DCard>

            <div className="grid grid-cols-3 gap-3">
              {/* Streak tracker */}
              <DCard label="Current Streak">
                <div className="mt-3">
                  <p className="text-2xl font-bold text-orange-400 flex items-center gap-1.5">
                    <Flame size={20} className="animate-pulse" /> 7 days
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Best: 25 days · This month: 18 active days</p>
                  <div className="flex gap-1 mt-3">
                    {STREAK_DAYS.map((hit, i) => (
                      <div key={i} title={hit ? "Hit" : "Missed"}
                        className={`flex-1 h-2 rounded-full ${hit ? "bg-orange-400" : "bg-white/[0.06]"}`} />
                    ))}
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                    <span>Mon</span><span>Sun</span>
                  </div>
                </div>
              </DCard>

              {/* Velocity */}
              <DCard label="Completion Velocity">
                <p className="text-[10px] text-slate-500 mb-2">Goals completed per month</p>
                <BarChartSVG data={VELOCITY_DATA} labels={VELOCITY_LABELS} color="#4ade80" gradId="velGrad" />
              </DCard>

              {/* Life vs Work donut */}
              <DCard label="Life vs Work Split">
                <div className="flex items-center justify-center gap-6 mt-2">
                  <DonutChart lifeCount={5} workCount={3} />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                      <span className="text-slate-400">Life Goals</span>
                      <span className="text-indigo-300 font-bold ml-auto">63%</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shrink-0" />
                      <span className="text-slate-400">Work Goals</span>
                      <span className="text-violet-300 font-bold ml-auto">37%</span>
                    </div>
                  </div>
                </div>
              </DCard>
            </div>

            {/* Points earned */}
            <DCard label="Points Earned — 12-Week Trend">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-2xl font-bold text-indigo-300">1,050 <span className="text-sm font-normal text-slate-500">this week</span></p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Total this cycle: <span className="text-slate-300 font-medium">6,470 pts</span></p>
                </div>
                <div className="flex items-center gap-1 text-green-400 text-xs font-semibold">
                  <TrendingUp size={13} /> +29% vs last cycle
                </div>
              </div>
              <LineChart data={POINTS_DATA} gradId="ptsGrad" color="#a78bfa" />
            </DCard>
          </div>
        </Section>

        {/* ── Section 3: Upcoming Milestones ── */}
        <Section id="milestones" title="Upcoming Milestones"
          badge={String(MILESTONES.filter(m => m.group === "today").length + " due today")}
          collapsed={collapsed} toggle={toggleSection}>
          <div className="space-y-4">
            {(["today","this_week","overdue","slip_risk"] as MilestoneGroup[]).map(grp => {
              const items = MILESTONES.filter(m => m.group === grp);
              if (!items.length) return null;
              const cfg: Record<MilestoneGroup, { label: string; cls: string; dot: string }> = {
                today:     { label:"Due Today",            cls:"text-red-400",    dot:"bg-red-500" },
                this_week: { label:"Due This Week",        cls:"text-amber-400",  dot:"bg-amber-400" },
                overdue:   { label:"Overdue",              cls:"text-red-500",    dot:"bg-red-600 animate-pulse" },
                slip_risk: { label:"Predicted to Slip",    cls:"text-violet-400", dot:"bg-violet-400 animate-pulse" },
              };
              const c = cfg[grp];
              return (
                <div key={grp}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
                    <span className={`text-[11px] font-bold uppercase tracking-widest ${c.cls}`}>{c.label}</span>
                    <span className="text-[10px] text-slate-600">({items.length})</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((m, i) => (
                      <motion.div key={i} whileHover={{ x: 2 }} transition={{ duration: 0.12 }}
                        className="flex items-start gap-3 bg-[#1c1f2e] border border-white/[0.05] rounded-xl px-4 py-3 cursor-pointer group">
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-slate-200 group-hover:text-white transition-colors">{m.title}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{m.goalTitle}</p>
                          <p className="text-[10px] text-slate-600 mt-1 italic">{m.agentNote}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Calendar size={9} /> {m.dueDate}
                          </div>
                          <div className="flex items-center gap-0.5 text-[10px] text-indigo-300 font-semibold">
                            <Star size={9} /> {m.points} pts
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── Section 4: Completed Goals ── */}
        <Section id="completed" title="Completed Goals" badge="5" collapsed={collapsed} toggle={toggleSection}>
          <div className="space-y-2">
            {COMPLETED_GOALS.map((g, i) => (
              <motion.div key={i} whileHover={{ x: 2 }} transition={{ duration: 0.12 }}
                className="flex items-start gap-4 bg-[#1c1f2e] border border-white/[0.05] rounded-xl px-4 py-3 group cursor-pointer">
                <div className="w-8 h-8 rounded-xl bg-green-400/10 border border-green-400/20 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 size={14} className="text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{g.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{g.category} · Completed {g.completedDate}</p>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">{g.agentMessage}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-0.5 text-sm font-bold text-indigo-300">
                    <Star size={10} /> {g.points}
                  </div>
                  {g.streakBonus && (
                    <div className="flex items-center gap-0.5 text-[10px] text-orange-400 font-semibold">
                      <Flame size={9} /> +{g.streakBonus} bonus
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          <button className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
            View All Completed Goals →
          </button>
        </Section>

        {/* ── Section 5: Future / Planned Goals ── */}
        <Section id="planned" title="Future & Planned Goals" badge={String(PLANNED_GOALS.length)}
          collapsed={collapsed} toggle={toggleSection}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PLANNED_GOALS.map((g, i) => {
              const diff = DIFF_CFG[g.difficulty];
              return (
                <motion.div key={i} whileHover={{ y: -2 }} transition={{ duration: 0.15 }}
                  className="bg-[#1c1f2e] border border-white/[0.05] rounded-2xl p-4 flex flex-col gap-3 cursor-pointer group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {g.agentSuggested && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 uppercase tracking-wide">
                            Agent Suggested
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{g.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{g.category}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${diff.cls}`}>{diff.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug italic">{g.agentNote}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Clock size={9} /> Est. {g.estimatedDuration}
                    </div>
                    <div className="flex items-center gap-0.5 text-[11px] text-indigo-300 font-bold">
                      <Star size={9} /> {g.estimatedPoints} pts
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Section>

        {/* ── Section 6: Analytics ── */}
        <Section id="analytics" title="Analytics" collapsed={collapsed} toggle={toggleSection}>
          <div className="space-y-4">
            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { icon:<Target size={15}/>, label:"Completion Rate", value:"68%", sub:"↑ 18% vs last cycle", color:"text-green-400 bg-green-400/10" },
                { icon:<Activity size={15}/>, label:"Abandonment Rate", value:"12%", sub:"↓ 5% improvement", color:"text-amber-400 bg-amber-400/10" },
                { icon:<Clock size={15}/>, label:"Avg Goal Duration", value:"8.5 wks", sub:"across all categories", color:"text-blue-400 bg-blue-400/10" },
                { icon:<Zap size={15}/>, label:"P1 Score Impact", value:"+8 pts", sub:"this month", color:"text-violet-400 bg-violet-400/10" },
              ].map(s => (
                <div key={s.label} className="bg-[#1c1f2e] border border-white/[0.05] rounded-xl p-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>{s.icon}</div>
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
                  <p className="text-[10px] text-slate-600 mt-1">{s.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Difficulty distribution */}
              <DCard label="Difficulty Distribution">
                <div className="mt-3 space-y-2.5">
                  {(Object.entries(DIFF_DIST) as [Difficulty, number][]).map(([diff, count]) => {
                    const total = Object.values(DIFF_DIST).reduce((a,b) => a+b, 0);
                    const colors: Record<Difficulty, string> = {
                      easy:"#4ade80", medium:"#60a5fa", hard:"#fb923c", epic:"#c084fc"
                    };
                    return (
                      <div key={diff} className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-500 capitalize w-12 shrink-0">{diff}</span>
                        <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${(count/total)*100}%` }}
                            transition={{ duration: 0.8, ease:"easeOut" }}
                            className="h-full rounded-full"
                            style={{ background: colors[diff] }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 w-4 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </DCard>

              {/* Points over time */}
              <DCard label="Points Earned Over Time">
                <p className="text-[10px] text-slate-500 mb-2">12-week rolling total</p>
                <BarChartSVG data={POINTS_DATA.slice(6)} labels={MOMENTUM_WEEKS.slice(6)} color="#6366f1" gradId="aPtsGrad" />
              </DCard>
            </div>

            {/* Agent insights */}
            <DCard label="Agent Insights">
              <div className="mt-3 space-y-3">
                {INSIGHTS.map((insight, i) => (
                  <motion.div key={i} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                    transition={{ delay: i * 0.08, duration: 0.2 }}
                    className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600/20 border border-indigo-500/25 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={11} className="text-indigo-400" />
                    </div>
                    <p className="text-[12px] text-slate-400 leading-[1.6]">{insight}</p>
                  </motion.div>
                ))}
              </div>
            </DCard>
          </div>
        </Section>

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SECTION WRAPPER
   ══════════════════════════════════════════════════════════════ */
function Section({
  id, title, badge, children, collapsed, toggle,
}: {
  id: string; title: string; badge?: string; children: React.ReactNode;
  collapsed: Record<string,boolean>; toggle: (id:string)=>void;
}) {
  const isCollapsed = collapsed[id] ?? false;
  return (
    <div className="bg-[#13151c] border border-white/[0.06] rounded-2xl overflow-hidden">
      <button
        onClick={() => toggle(id)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-sm font-semibold text-slate-100">{title}</span>
        {badge && (
          <span className="bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
        <motion.span animate={{ rotate: isCollapsed ? -90 : 0 }} transition={{ duration: 0.18 }}
          className="ml-auto text-slate-600">
          <ChevronDown size={15} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height:"auto", opacity:1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease:"easeInOut" }}
            style={{ overflow:"hidden" }}
          >
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   GOAL CARD
   ══════════════════════════════════════════════════════════════ */
function GoalCard({ goal }: { goal: Goal }) {
  const sig  = SIGNAL_CFG[goal.signal];
  const diff = DIFF_CFG[goal.difficulty];
  return (
    <motion.div
      whileHover={{ y:-2, boxShadow:"0 12px 40px rgba(0,0,0,0.35)" }}
      transition={{ duration: 0.15 }}
      className="bg-[#1c1f2e] border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-3 cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100 group-hover:text-white transition-colors leading-snug">{goal.title}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">{goal.category} · {goal.subCategory}</p>
        </div>
        <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0 ${sig.cls}`}>
          <span>{sig.icon}</span><span className="hidden xl:inline">{sig.label}</span>
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-[10px] text-slate-500">Progress</span>
          <span className="text-[11px] font-bold text-indigo-300">{goal.progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width:`${goal.progress}%` }}
            transition={{ duration:0.9, ease:"easeOut", delay:0.1 }}
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
          />
        </div>
        <p className="text-[10px] text-slate-600 mt-1">{goal.milestonesComplete} / {goal.milestonesTotal} milestones</p>
      </div>

      {/* Next action */}
      <div className="flex items-start gap-2 bg-white/[0.03] border border-white/[0.04] rounded-lg px-2.5 py-2">
        <ChevronRight size={10} className="text-indigo-400 mt-0.5 shrink-0" />
        <p className="text-[11px] text-slate-400 leading-snug">{goal.nextAction}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] text-slate-500">
            <Calendar size={9} /> {goal.deadline}
          </span>
          {goal.streak && (
            <span className="flex items-center gap-1 text-[10px] text-orange-400 font-semibold">
              <Flame size={9} /> {goal.streak}d
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${diff.cls}`}>{diff.label}</span>
          <span className="flex items-center gap-0.5 text-[10px] text-indigo-300 font-bold">
            <Star size={9} /> {goal.points}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CHART COMPONENTS
   ══════════════════════════════════════════════════════════════ */
function LineChart({ data, labels, color="#6366f1", gradId }: {
  data: number[]; labels?: string[]; color?: string; gradId: string;
}) {
  const W=600, H=110, pX=20, pY=14;
  const min = Math.min(...data) - 5;
  const max = Math.max(...data) + 5;
  const pts = data.map((v, i) => ({
    x: pX + (i / (data.length - 1)) * (W - 2*pX),
    y: H - pY - ((v - min) / (max - min)) * (H - 2*pY),
  }));
  const line = pts.map((p,i) => `${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length-1].x},${H} L${pts[0].x},${H}Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" height={H} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />)}
      {labels && pts.map((p,i) => (
        i % 2 === 0
          ? <text key={i} x={p.x} y={H-1} textAnchor="middle" fill="#475569" fontSize="8">{labels[i]}</text>
          : null
      ))}
    </svg>
  );
}

function BarChartSVG({ data, labels, color="#4ade80", gradId }: {
  data: number[]; labels: string[]; color?: string; gradId: string;
}) {
  const W=500, H=80, pX=10, pY=10;
  const max = Math.max(...data);
  const slotW = (W - 2*pX) / data.length;
  const barW  = slotW * 0.55;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" height={H} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.3" />
        </linearGradient>
      </defs>
      {data.map((v, i) => {
        const bH = ((v / max) * (H - pY - 16));
        const x  = pX + i * slotW + (slotW - barW) / 2;
        const y  = H - 16 - bH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bH} rx="3" fill={`url(#${gradId})`} />
            <text x={x + barW/2} y={H-2} textAnchor="middle" fill="#475569" fontSize="8">{labels[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ lifeCount, workCount }: { lifeCount: number; workCount: number }) {
  const total = lifeCount + workCount;
  const r=36, cx=50, cy=50;
  const C = 2 * Math.PI * r;
  const lifeLen = (lifeCount / total) * C;
  const workLen = C - lifeLen;
  const offset  = C / 4;

  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1c1f2e" strokeWidth="12" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#6366f1" strokeWidth="12"
        strokeDasharray={`${lifeLen} ${workLen}`} strokeDashoffset={offset} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#8b5cf6" strokeWidth="12"
        strokeDasharray={`${workLen} ${lifeLen}`} strokeDashoffset={-(lifeLen - offset)} />
      <text x={50} y={47} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
        {Math.round((lifeCount/total)*100)}%
      </text>
      <text x={50} y={58} textAnchor="middle" fill="#64748b" fontSize="7">Life</text>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */
function DCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1c1f2e] border border-white/[0.05] rounded-xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{label}</p>
      {children}
    </div>
  );
}

function ModeTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all duration-150 ${
        active
          ? "bg-indigo-600/20 text-indigo-200 shadow-[0_0_8px_rgba(99,102,241,0.2)]"
          : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
      }`}>
      {label}
    </button>
  );
}

function GSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="text-[11px] text-slate-300 bg-[#1a1d28] border border-white/[0.08] rounded-lg px-2.5 py-1.5 outline-none cursor-pointer hover:border-white/20 transition-colors">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
