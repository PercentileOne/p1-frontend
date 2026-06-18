/* ══════════════════════════════════════════════════════════════
   PLANNING + TIME-BLOCKING ENGINE  v1.0
   ══════════════════════════════════════════════════════════════ */

/* ─── Block Types ───────────────────────────────────────────── */

export type BlockType = "strategic" | "buffer" | "breakout" | "custom";

export interface TimeBlock {
  id: string;
  title: string;
  type: BlockType;
  startMinute: number;    // minutes from midnight, e.g. 9:00 = 540
  durationMinutes: number;
  dayIndex: number;       // 0=Mon … 6=Sun
  color: string;
  icon: string;
  linkedGoalId?: string;
  linkedEventId?: string;
  note?: string;
}

export const BLOCK_COLORS: Record<BlockType, string> = {
  strategic: "#6366f1",
  buffer:    "#f59e0b",
  breakout:  "#10b981",
  custom:    "#8b5cf6",
};

export const BLOCK_LABELS: Record<BlockType, string> = {
  strategic: "Strategic",
  buffer:    "Buffer",
  breakout:  "Breakout",
  custom:    "Custom",
};

export const BLOCK_ICONS: Record<BlockType, string> = {
  strategic: "🎯",
  buffer:    "🛡️",
  breakout:  "⚡",
  custom:    "✏️",
};

export const BLOCK_DESCS: Record<BlockType, string> = {
  strategic: "Deep work on high-leverage goals",
  buffer:    "Admin, email, catch-up",
  breakout:  "Movement, rest, creative reset",
  custom:    "Your own block type",
};

/* ─── Events ────────────────────────────────────────────────── */

export type EventType =
  | "wedding" | "holiday" | "workout" | "study"
  | "project" | "business_launch" | "exam"
  | "birthday" | "renovation" | "custom";

export interface EventTask {
  id: string;
  title: string;
  subtasks: string[];
  deadline?: Date;
  done: boolean;
  hasProof: boolean;
  daysFromStart?: number;
}

export interface PlanningEvent {
  id: string;
  title: string;
  type: EventType;
  emoji: string;
  color: string;
  startDate: Date;
  endDate: Date;
  budget?: number;
  description: string;
  participants: string[];
  tasks: EventTask[];
  progress: number;
  blocksAllocated: number;
}

export const EVENT_TYPE_CONFIG: Record<EventType, { emoji: string; color: string; label: string }> = {
  wedding:          { emoji: "💍", color: "text-pink-400",   label: "Wedding"          },
  holiday:          { emoji: "✈️", color: "text-blue-400",   label: "Holiday"          },
  workout:          { emoji: "💪", color: "text-green-400",  label: "Workout Plan"     },
  study:            { emoji: "📚", color: "text-indigo-400", label: "Study Plan"       },
  project:          { emoji: "🏗️", color: "text-amber-400",  label: "Home Project"     },
  business_launch:  { emoji: "🚀", color: "text-violet-400", label: "Business Launch"  },
  exam:             { emoji: "📝", color: "text-red-400",    label: "Exam Prep"        },
  birthday:         { emoji: "🎂", color: "text-yellow-400", label: "Birthday"         },
  renovation:       { emoji: "🔨", color: "text-orange-400", label: "Renovation"       },
  custom:           { emoji: "📌", color: "text-teal-400",   label: "Custom Event"     },
};

/* ─── Weekly / Monthly Themes ───────────────────────────────── */

export interface WeeklyPlan {
  weekNumber: number;
  theme: string;
  wins: string[];
  lessons: string[];
  goals: string[];
  proofCollected: number;
  cycleProgress: number;
  highEnergyDays: number[];
  dangerZones: number[];
}

export interface MonthlyPlan {
  month: string;
  theme: string;
  identityAffirmation: string;
  focusAreas: string[];
  goals: string[];
  momentumScore: number;
  predictedBottlenecks: string[];
}

/* ─── Demo Time Blocks ──────────────────────────────────────── */

export const DEMO_BLOCKS: TimeBlock[] = [
  // Monday
  { id: "b1",  title: "P1 Product Strategy",    type: "strategic", startMinute: 540,  durationMinutes: 120, dayIndex: 0, color: BLOCK_COLORS.strategic, icon: "🎯", linkedGoalId: "g1" },
  { id: "b2",  title: "Email + Admin",           type: "buffer",    startMinute: 720,  durationMinutes: 60,  dayIndex: 0, color: BLOCK_COLORS.buffer,    icon: "📧" },
  { id: "b3",  title: "Gym – Strength",          type: "breakout",  startMinute: 420,  durationMinutes: 60,  dayIndex: 0, color: BLOCK_COLORS.breakout,   icon: "💪" },
  { id: "b4",  title: "Fundraising Outreach",    type: "strategic", startMinute: 840,  durationMinutes: 90,  dayIndex: 0, color: BLOCK_COLORS.strategic, icon: "🎯", linkedGoalId: "g2" },

  // Tuesday
  { id: "b5",  title: "Deep Work – Frontend",    type: "strategic", startMinute: 480,  durationMinutes: 180, dayIndex: 1, color: BLOCK_COLORS.strategic, icon: "🎯" },
  { id: "b6",  title: "Lunch + Walk",            type: "breakout",  startMinute: 720,  durationMinutes: 60,  dayIndex: 1, color: BLOCK_COLORS.breakout,   icon: "🚶" },
  { id: "b7",  title: "Admin buffer",            type: "buffer",    startMinute: 780,  durationMinutes: 45,  dayIndex: 1, color: BLOCK_COLORS.buffer,    icon: "🛡️" },
  { id: "b8",  title: "Investor Prep",           type: "strategic", startMinute: 840,  durationMinutes: 90,  dayIndex: 1, color: BLOCK_COLORS.strategic, icon: "📊", linkedGoalId: "g2" },

  // Wednesday
  { id: "b9",  title: "Content Creation",        type: "strategic", startMinute: 540,  durationMinutes: 90,  dayIndex: 2, color: BLOCK_COLORS.strategic, icon: "✍️" },
  { id: "b10", title: "Morning Run",             type: "breakout",  startMinute: 420,  durationMinutes: 45,  dayIndex: 2, color: BLOCK_COLORS.breakout,   icon: "🏃" },
  { id: "b11", title: "Team Syncs",              type: "buffer",    startMinute: 660,  durationMinutes: 60,  dayIndex: 2, color: BLOCK_COLORS.buffer,    icon: "👥" },

  // Thursday
  { id: "b12", title: "P1 Architecture Review",  type: "strategic", startMinute: 540,  durationMinutes: 120, dayIndex: 3, color: BLOCK_COLORS.strategic, icon: "🏗️", linkedGoalId: "g1" },
  { id: "b13", title: "Meditation + Journal",    type: "breakout",  startMinute: 420,  durationMinutes: 30,  dayIndex: 3, color: BLOCK_COLORS.breakout,   icon: "🧘" },
  { id: "b14", title: "Public Speaking Practice", type: "custom",   startMinute: 720,  durationMinutes: 60,  dayIndex: 3, color: BLOCK_COLORS.custom,    icon: "🎤", linkedGoalId: "g3" },

  // Friday
  { id: "b15", title: "Weekly Review",           type: "strategic", startMinute: 540,  durationMinutes: 90,  dayIndex: 4, color: BLOCK_COLORS.strategic, icon: "📋" },
  { id: "b16", title: "Free thinking",           type: "breakout",  startMinute: 660,  durationMinutes: 60,  dayIndex: 4, color: BLOCK_COLORS.breakout,   icon: "🌊" },
  { id: "b17", title: "Admin clear-down",        type: "buffer",    startMinute: 780,  durationMinutes: 60,  dayIndex: 4, color: BLOCK_COLORS.buffer,    icon: "✅" },

  // Saturday
  { id: "b18", title: "Gym – Cardio",            type: "breakout",  startMinute: 480,  durationMinutes: 60,  dayIndex: 5, color: BLOCK_COLORS.breakout,   icon: "🏋️" },
  { id: "b19", title: "Family time",             type: "custom",    startMinute: 600,  durationMinutes: 120, dayIndex: 5, color: BLOCK_COLORS.custom,    icon: "👨‍👩‍👦" },

  // Sunday
  { id: "b20", title: "Next week planning",      type: "strategic", startMinute: 540,  durationMinutes: 60,  dayIndex: 6, color: BLOCK_COLORS.strategic, icon: "📅" },
  { id: "b21", title: "Rest + recharge",         type: "breakout",  startMinute: 660,  durationMinutes: 120, dayIndex: 6, color: BLOCK_COLORS.breakout,   icon: "😴" },
];

/* ─── Demo Events ───────────────────────────────────────────── */

export const DEMO_EVENTS: PlanningEvent[] = [
  {
    id: "e1",
    title: "P1 MVP Launch",
    type: "business_launch",
    emoji: "🚀",
    color: "text-violet-400",
    startDate: new Date("2026-06-15"),
    endDate:   new Date("2026-08-01"),
    description: "Full launch of Percentile.One MVP — features complete, tested, and announced publicly.",
    participants: ["Francis", "Design Partner", "Beta Users"],
    budget: 5000,
    progress: 38,
    blocksAllocated: 24,
    tasks: [
      { id: "t1", title: "Complete all core modules",  subtasks: ["Jobs", "Contacts", "Planning"], deadline: new Date("2026-07-01"), done: false, hasProof: false, daysFromStart: 16 },
      { id: "t2", title: "QA and bug bashing",         subtasks: ["Mobile review", "Desktop review"], deadline: new Date("2026-07-15"), done: false, hasProof: false, daysFromStart: 30 },
      { id: "t3", title: "Landing page live",          subtasks: ["Copy", "Design", "Deploy"], deadline: new Date("2026-07-20"), done: false, hasProof: false, daysFromStart: 35 },
      { id: "t4", title: "Beta invites sent",          subtasks: ["Email list", "Personalised notes"], deadline: new Date("2026-07-25"), done: false, hasProof: false, daysFromStart: 40 },
      { id: "t5", title: "MVP architecture done",      subtasks: [], deadline: new Date("2026-06-20"), done: true, hasProof: true, daysFromStart: 5 },
    ],
  },
  {
    id: "e2",
    title: "Seed Fundraising Round",
    type: "project",
    emoji: "💰",
    color: "text-amber-400",
    startDate: new Date("2026-07-01"),
    endDate:   new Date("2026-10-01"),
    description: "Raise seed round from angels and early-stage VCs for Percentile.One.",
    participants: ["Francis", "Legal Advisor", "Investors"],
    budget: undefined,
    progress: 12,
    blocksAllocated: 18,
    tasks: [
      { id: "t6",  title: "Build pitch deck v1",       subtasks: ["Problem", "Solution", "Traction", "Ask"], deadline: new Date("2026-07-15"), done: false, hasProof: false, daysFromStart: 14 },
      { id: "t7",  title: "Create investor list",      subtasks: ["Angels", "Pre-seed VCs", "EIS funds"], deadline: new Date("2026-07-20"), done: false, hasProof: false, daysFromStart: 19 },
      { id: "t8",  title: "First 10 intro meetings",   subtasks: [], deadline: new Date("2026-08-15"), done: false, hasProof: false, daysFromStart: 45 },
      { id: "t9",  title: "Term sheet received",       subtasks: [], deadline: new Date("2026-09-15"), done: false, hasProof: false, daysFromStart: 76 },
      { id: "t10", title: "Financial model complete",  subtasks: [], deadline: new Date("2026-07-10"), done: true, hasProof: true, daysFromStart: 9 },
    ],
  },
  {
    id: "e3",
    title: "Public Speaking Mastery",
    type: "study",
    emoji: "🎤",
    color: "text-indigo-400",
    startDate: new Date("2026-06-01"),
    endDate:   new Date("2026-09-01"),
    description: "Master public speaking to pitch investors, speak at events, and lead teams with presence.",
    participants: ["Francis"],
    budget: 500,
    progress: 22,
    blocksAllocated: 12,
    tasks: [
      { id: "t11", title: "Join Toastmasters",         subtasks: [], deadline: new Date("2026-06-20"), done: true,  hasProof: true,  daysFromStart: 19 },
      { id: "t12", title: "Weekly practice sessions",  subtasks: ["Record & review", "Feedback from peers"], deadline: new Date("2026-08-01"), done: false, hasProof: false, daysFromStart: 61 },
      { id: "t13", title: "First live speech (50+)",   subtasks: [], deadline: new Date("2026-07-15"), done: false, hasProof: false, daysFromStart: 44 },
      { id: "t14", title: "TEDx application",          subtasks: [], deadline: new Date("2026-08-20"), done: false, hasProof: false, daysFromStart: 80 },
    ],
  },
  {
    id: "e4",
    title: "Gym Transformation",
    type: "workout",
    emoji: "💪",
    color: "text-green-400",
    startDate: new Date("2026-05-01"),
    endDate:   new Date("2026-09-01"),
    description: "12-week body recomposition — strength training 4x/week + nutrition protocol.",
    participants: ["Francis"],
    budget: 200,
    progress: 55,
    blocksAllocated: 48,
    tasks: [
      { id: "t15", title: "Baseline measurements",     subtasks: [], deadline: new Date("2026-05-05"), done: true,  hasProof: true, daysFromStart: 4  },
      { id: "t16", title: "4 training sessions/week",  subtasks: ["Monday", "Tuesday", "Thursday", "Saturday"], deadline: new Date("2026-09-01"), done: false, hasProof: false, daysFromStart: 123 },
      { id: "t17", title: "Nutrition plan followed",   subtasks: [], deadline: new Date("2026-06-01"), done: true, hasProof: true, daysFromStart: 31 },
      { id: "t18", title: "6-week progress photo",     subtasks: [], deadline: new Date("2026-06-15"), done: false, hasProof: false, daysFromStart: 45 },
    ],
  },
];

/* ─── Weekly Plan ───────────────────────────────────────────── */

export const CURRENT_WEEKLY_PLAN: WeeklyPlan = {
  weekNumber: 24,
  theme: "Shipping Week — Execute & Close Loops",
  wins: [
    "Completed Contacts + Discovery module",
    "Ran 3 investor warm-up calls",
    "Hit gym 4 times",
  ],
  lessons: [
    "Context switching kills flow — protect AM blocks",
    "Daily journalling adds 20% clarity to decisions",
  ],
  goals: [
    "Ship Planning module end-to-end",
    "Send 5 investor update emails",
    "Complete 4 training sessions",
    "Record first public speaking video",
  ],
  proofCollected: 3,
  cycleProgress: 64,
  highEnergyDays: [0, 1, 3],   // Mon, Tue, Thu
  dangerZones: [2, 4],          // Wed, Fri
};

/* ─── Monthly Plan ──────────────────────────────────────────── */

export const CURRENT_MONTHLY_PLAN: MonthlyPlan = {
  month: "June 2026",
  theme: "The Builder Month — Foundation Before Scale",
  identityAffirmation: "I am a focused founder who ships, proves, and compounds.",
  focusAreas: ["Product execution", "Fundraising groundwork", "Personal performance"],
  goals: [
    "Ship 3 major P1 modules",
    "Complete 12-week cycle",
    "Build fundraising pipeline to 20 prospects",
    "Train 4x/week consistently",
  ],
  momentumScore: 72,
  predictedBottlenecks: [
    "Week 3 — context overload risk (switch from build to pitch)",
    "End of month — energy dip from sustained output",
  ],
};

/* ─── Agent Suggestions ─────────────────────────────────────── */

export interface AgentSuggestion {
  id: string;
  type: "warning" | "info" | "success" | "action";
  message: string;
  action?: string;
  actionRoute?: string;
}

export const DAILY_AGENT_SUGGESTIONS: AgentSuggestion[] = [
  { id: "a1", type: "action",  message: "You have 2 unblocked strategic goals — add time blocks now.",        action: "Add blocks",       actionRoute: "/planning/timeblocks" },
  { id: "a2", type: "warning", message: "No buffer block scheduled — email admin will fragment your flow.",  action: "Add buffer",       actionRoute: "/planning/daily"      },
  { id: "a3", type: "info",    message: "You're in Week 6 — historically your most productive cycle week.",  action: "View cycle",       actionRoute: "/cycle"               },
  { id: "a4", type: "success", message: "3 strategic blocks scheduled. That's your optimal load for today."                                                                   },
];

export const WEEKLY_AGENT_SUGGESTIONS: AgentSuggestion[] = [
  { id: "w1", type: "action",  message: "Mon & Tue are your high-energy days — front-load strategic blocks.", action: "Auto-place",      actionRoute: "/planning/timeblocks" },
  { id: "w2", type: "warning", message: "Wednesday looks overloaded — 5 tasks, no buffer. Rebalance.",       action: "Rebalance",       actionRoute: "/planning/timeblocks" },
  { id: "w3", type: "info",    message: "Your fundraising goal has 0 blocks this week. Schedule outreach.",   action: "Add blocks",       actionRoute: "/planning/timeblocks" },
  { id: "w4", type: "success", message: "Training consistency is up — 4 breakout blocks scheduled correctly."                                                                 },
];

/* ─── Planning Engine ───────────────────────────────────────── */

export class PlanningEngine {
  static minuteToTime(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const ampm = h >= 12 ? "pm" : "am";
    const h12  = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${h12}:${m.toString().padStart(2, "0")}${ampm}`;
  }

  static blockEndMinute(b: TimeBlock): number {
    return b.startMinute + b.durationMinutes;
  }

  static blocksForDay(blocks: TimeBlock[], dayIndex: number): TimeBlock[] {
    return blocks.filter(b => b.dayIndex === dayIndex).sort((a, b) => a.startMinute - b.startMinute);
  }

  static detectOverlap(blocks: TimeBlock[], dayIndex: number): string[] {
    const day = this.blocksForDay(blocks, dayIndex);
    const overlapping: string[] = [];
    for (let i = 0; i < day.length - 1; i++) {
      if (this.blockEndMinute(day[i]) > day[i + 1].startMinute) {
        overlapping.push(day[i].id, day[i + 1].id);
      }
    }
    return [...new Set(overlapping)];
  }

  static strategicMinutes(blocks: TimeBlock[], dayIndex: number): number {
    return this.blocksForDay(blocks, dayIndex)
      .filter(b => b.type === "strategic")
      .reduce((s, b) => s + b.durationMinutes, 0);
  }

  static detectOverload(blocks: TimeBlock[], dayIndex: number): boolean {
    const total = this.blocksForDay(blocks, dayIndex).reduce((s, b) => s + b.durationMinutes, 0);
    return total > 600; // >10h
  }

  static autoPlace(_blocks: TimeBlock[], dayIndex: number): TimeBlock[] {
    const types: BlockType[] = ["breakout", "strategic", "strategic", "buffer", "strategic", "breakout"];
    const titles = ["Morning Breakout", "Deep Work Block 1", "Deep Work Block 2", "Admin Buffer", "Evening Strategic", "Wind Down"];
    const durations = [45, 120, 90, 45, 90, 30];
    const starts = [390, 480, 660, 780, 840, 990]; // 6:30, 8:00, 11:00, 1:00, 2:00, 4:30

    return types.map((type, i) => ({
      id: `auto-${dayIndex}-${i}-${Date.now()}`,
      title: titles[i],
      type,
      startMinute: starts[i],
      durationMinutes: durations[i],
      dayIndex,
      color: BLOCK_COLORS[type],
      icon: BLOCK_ICONS[type],
    }));
  }

  static getEnergyLabel(hour: number): string {
    if (hour >= 5  && hour < 9)  return "🌅 Morning Peak";
    if (hour >= 9  && hour < 12) return "🔥 High Energy";
    if (hour >= 12 && hour < 14) return "🍽️ Midday Reset";
    if (hour >= 14 && hour < 17) return "⚡ Afternoon Flow";
    if (hour >= 17 && hour < 20) return "🌆 Evening Wind";
    return "🌙 Rest Zone";
  }

  static eventDaysRemaining(event: PlanningEvent): number {
    return Math.max(0, Math.ceil((event.endDate.getTime() - Date.now()) / 86400000));
  }

  static eventProgress(event: PlanningEvent): number {
    const done = event.tasks.filter(t => t.done).length;
    return Math.round((done / Math.max(event.tasks.length, 1)) * 100);
  }
}

/* ─── Day labels ────────────────────────────────────────────── */
export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_FULL   = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];