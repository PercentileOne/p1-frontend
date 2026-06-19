/* ══════════════════════════════════════════════════════════════
   FOCUS MODE ENGINE  v1.0
   ══════════════════════════════════════════════════════════════ */

export type SessionType = "strategic" | "buffer" | "breakout" | "study" | "work" | "custom";

export interface FocusSession {
  id: string;
  startTime: Date;
  endTime: Date;
  plannedMinutes: number;
  actualMinutes: number;
  type: SessionType;
  linkedGoalId?: string;
  linkedGoalTitle?: string;
  linkedEventId?: string;
  linkedEventTitle?: string;
  cycleWeek: number;
  whatWorkedOn: string;
  notes: string;
  proofSaved: boolean;
  completed: boolean;   // false = ended early
}

/* ─── Active session singleton ───────────────────────────────── */

export interface ActiveSession {
  plannedMinutes: number;
  type: SessionType;
  linkedGoalId?: string;
  linkedGoalTitle?: string;
  linkedEventId?: string;
  linkedEventTitle?: string;
  startTime: Date;
}

let _active: ActiveSession | null = null;
let _completed: { session: ActiveSession; actualMinutes: number } | null = null;

export const setActiveSession  = (s: ActiveSession | null) => { _active = s; };
export const getActiveSession  = () => _active;
export const setCompletedSession = (s: typeof _completed) => { _completed = s; };
export const getCompletedSession = () => _completed;

/* ─── Session type config ─────────────────────────────────────── */

export const SESSION_TYPE_CONFIG: Record<SessionType, { label: string; emoji: string; color: string; bg: string }> = {
  strategic: { label: "Strategic",  emoji: "🎯", color: "text-indigo-400",  bg: "bg-indigo-500/15 border-indigo-500/25" },
  buffer:    { label: "Buffer",     emoji: "🛡️", color: "text-amber-400",   bg: "bg-amber-500/15 border-amber-500/25"  },
  breakout:  { label: "Breakout",   emoji: "⚡", color: "text-green-400",   bg: "bg-green-500/15 border-green-500/25"  },
  study:     { label: "Study",      emoji: "📚", color: "text-blue-400",    bg: "bg-blue-500/15 border-blue-500/25"    },
  work:      { label: "Work",       emoji: "💼", color: "text-violet-400",  bg: "bg-violet-500/15 border-violet-500/25"},
  custom:    { label: "Custom",     emoji: "✏️", color: "text-teal-400",    bg: "bg-teal-500/15 border-teal-500/25"   },
};

export const SESSION_RING_COLOR: Record<SessionType, string> = {
  strategic: "#6366f1",
  buffer:    "#f59e0b",
  breakout:  "#10b981",
  study:     "#3b82f6",
  work:      "#8b5cf6",
  custom:    "#14b8a6",
};

/* ─── Duration presets ────────────────────────────────────────── */

export interface DurationPreset {
  minutes: number;
  label: string;
  badge: string;
  color: string;
}

export const DURATION_PRESETS: DurationPreset[] = [
  { minutes: 25, label: "25 min", badge: "Beginner",  color: "text-green-400"  },
  { minutes: 45, label: "45 min", badge: "Standard",  color: "text-blue-400"   },
  { minutes: 60, label: "60 min", badge: "Deep",      color: "text-indigo-400" },
  { minutes: 90, label: "90 min", badge: "Intense",   color: "text-violet-400" },
];

/* ─── Linkable items ─────────────────────────────────────────── */

export interface LinkOption {
  id: string;
  title: string;
  category: "goal" | "event" | "cycle" | "block";
  emoji: string;
}

export const LINK_OPTIONS: LinkOption[] = [
  { id: "g1",  title: "Launch P1 MVP",                 category: "goal",  emoji: "🚀" },
  { id: "g2",  title: "Build fundraising pipeline",    category: "goal",  emoji: "💰" },
  { id: "g3",  title: "Improve public speaking",       category: "goal",  emoji: "🎤" },
  { id: "g4",  title: "Train 4x per week",             category: "goal",  emoji: "💪" },
  { id: "e1",  title: "P1 MVP Launch (event)",         category: "event", emoji: "🚀" },
  { id: "e2",  title: "Seed Fundraising Round",        category: "event", emoji: "💰" },
  { id: "e3",  title: "Public Speaking Mastery",       category: "event", emoji: "🎤" },
  { id: "e4",  title: "Gym Transformation",            category: "event", emoji: "💪" },
  { id: "c6",  title: "Cycle 3 — Week 6 milestone",   category: "cycle", emoji: "🔄" },
  { id: "b1",  title: "Strategic Block — Mon 9am",     category: "block", emoji: "🎯" },
];

/* ─── Demo historical sessions (14 sessions, last 2 weeks) ───── */

const d = (daysAgo: number, h: number, m = 0) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  dt.setHours(h, m, 0, 0);
  return dt;
};

export const DEMO_SESSIONS: FocusSession[] = [
  {
    id: "fs1",
    startTime: d(0, 9, 0), endTime: d(0, 10, 30),
    plannedMinutes: 90, actualMinutes: 90, type: "strategic",
    linkedGoalId: "g1", linkedGoalTitle: "Launch P1 MVP",
    cycleWeek: 6,
    whatWorkedOn: "Built the full Planning + Time-Blocking module — 8 files, engine + 7 pages",
    notes: "Key insight: build engine first, then pages. Parallel file writes save 60% time.",
    proofSaved: true, completed: true,
  },
  {
    id: "fs2",
    startTime: d(0, 14, 0), endTime: d(0, 14, 45),
    plannedMinutes: 45, actualMinutes: 45, type: "strategic",
    linkedGoalId: "g2", linkedGoalTitle: "Build fundraising pipeline",
    cycleWeek: 6,
    whatWorkedOn: "Drafted investor one-pager and updated financial model",
    notes: "Need to tighten the market size slide.",
    proofSaved: true, completed: true,
  },
  {
    id: "fs3",
    startTime: d(1, 8, 30), endTime: d(1, 9, 55),
    plannedMinutes: 90, actualMinutes: 85, type: "strategic",
    linkedGoalId: "g1", linkedGoalTitle: "Launch P1 MVP",
    cycleWeek: 6,
    whatWorkedOn: "Contacts + Discovery module — contactsEngine.ts + 8 pages",
    notes: "DiscoveryMatchingEngine patterns are reusable across all engines.",
    proofSaved: true, completed: false,
  },
  {
    id: "fs4",
    startTime: d(1, 14, 30), endTime: d(1, 15, 15),
    plannedMinutes: 45, actualMinutes: 45, type: "work",
    linkedGoalId: "g3", linkedGoalTitle: "Improve public speaking",
    cycleWeek: 6,
    whatWorkedOn: "Recorded and reviewed first 5-minute talk on P1",
    notes: "Speaking too fast at start. Need strong opening hook.",
    proofSaved: false, completed: true,
  },
  {
    id: "fs5",
    startTime: d(2, 9, 0), endTime: d(2, 9, 25),
    plannedMinutes: 25, actualMinutes: 25, type: "study",
    cycleWeek: 6,
    whatWorkedOn: "Read 3 chapters of 'Zero to One' — notes on contrarian thinking",
    notes: "The secret question is the key framing tool for startup strategy.",
    proofSaved: false, completed: true,
  },
  {
    id: "fs6",
    startTime: d(2, 11, 0), endTime: d(2, 12, 30),
    plannedMinutes: 90, actualMinutes: 90, type: "strategic",
    linkedGoalId: "g1", linkedGoalTitle: "Launch P1 MVP",
    cycleWeek: 6,
    whatWorkedOn: "Jobs Module — JobMatchingEngine + 7 pages end-to-end",
    notes: "",
    proofSaved: true, completed: true,
  },
  {
    id: "fs7",
    startTime: d(3, 9, 30), endTime: d(3, 10, 15),
    plannedMinutes: 60, actualMinutes: 45, type: "strategic",
    linkedEventId: "e2", linkedEventTitle: "Seed Fundraising Round",
    cycleWeek: 6,
    whatWorkedOn: "Researched 12 target angels and added to Notion CRM",
    notes: "Focus on EdTech angels first — strongest product fit.",
    proofSaved: false, completed: false,
  },
  {
    id: "fs8",
    startTime: d(3, 15, 0), endTime: d(3, 15, 45),
    plannedMinutes: 45, actualMinutes: 45, type: "breakout",
    cycleWeek: 6,
    whatWorkedOn: "Gym — strength session (deadlifts + squats)",
    notes: "New PB on deadlift: 120kg × 3",
    proofSaved: true, completed: true,
  },
  {
    id: "fs9",
    startTime: d(4, 9, 0), endTime: d(4, 10, 30),
    plannedMinutes: 90, actualMinutes: 90, type: "strategic",
    linkedGoalId: "g1", linkedGoalTitle: "Launch P1 MVP",
    cycleWeek: 5,
    whatWorkedOn: "Built CockpitShell top nav updates and vision screen",
    notes: "Light mode toggle + enterprise neutral palette unlocked the right feel.",
    proofSaved: true, completed: true,
  },
  {
    id: "fs10",
    startTime: d(5, 10, 0), endTime: d(5, 10, 45),
    plannedMinutes: 45, actualMinutes: 45, type: "study",
    cycleWeek: 5,
    whatWorkedOn: "Studied Atomic Habits — habit loops, identity-based change",
    notes: "Vote for the identity you want to become. Every session is a vote.",
    proofSaved: false, completed: true,
  },
  {
    id: "fs11",
    startTime: d(6, 8, 0), endTime: d(6, 9, 0),
    plannedMinutes: 60, actualMinutes: 60, type: "strategic",
    linkedGoalId: "g2", linkedGoalTitle: "Build fundraising pipeline",
    cycleWeek: 5,
    whatWorkedOn: "Pitch deck v2 — rewrote problem + solution slides",
    notes: "",
    proofSaved: true, completed: true,
  },
  {
    id: "fs12",
    startTime: d(8, 9, 30), endTime: d(8, 10, 0),
    plannedMinutes: 60, actualMinutes: 30, type: "work",
    cycleWeek: 5,
    whatWorkedOn: "Email outreach to 5 potential beta users",
    notes: "Got interrupted by call. Need better distraction blocking.",
    proofSaved: false, completed: false,
  },
  {
    id: "fs13",
    startTime: d(10, 9, 0), endTime: d(10, 10, 30),
    plannedMinutes: 90, actualMinutes: 90, type: "strategic",
    linkedGoalId: "g1", linkedGoalTitle: "Launch P1 MVP",
    cycleWeek: 5,
    whatWorkedOn: "Goals + Vision modules — full end-to-end build",
    notes: "The vision board 6-dimension layout is the strongest page in the app.",
    proofSaved: true, completed: true,
  },
  {
    id: "fs14",
    startTime: d(12, 14, 0), endTime: d(12, 14, 25),
    plannedMinutes: 25, actualMinutes: 25, type: "breakout",
    cycleWeek: 4,
    whatWorkedOn: "Meditation + journalling — clarity on P1 strategy",
    notes: "P1 is not a productivity app. It's an identity transformation engine.",
    proofSaved: false, completed: true,
  },
];

/* ─── Analytics ─────────────────────────────────────────────── */

export class FocusEngine {
  static totalMinutes(sessions: FocusSession[]): number {
    return sessions.reduce((s, f) => s + f.actualMinutes, 0);
  }

  static avgDuration(sessions: FocusSession[]): number {
    if (!sessions.length) return 0;
    return Math.round(this.totalMinutes(sessions) / sessions.length);
  }

  static sessionsToday(sessions: FocusSession[]): FocusSession[] {
    const today = new Date();
    return sessions.filter(s => s.startTime.toDateString() === today.toDateString());
  }

  static byType(sessions: FocusSession[]): Record<SessionType, number> {
    const out = { strategic: 0, buffer: 0, breakout: 0, study: 0, work: 0, custom: 0 } as Record<SessionType, number>;
    sessions.forEach(s => { out[s.type] += s.actualMinutes; });
    return out;
  }

  static minutesPerDay(sessions: FocusSession[], days = 7): { label: string; minutes: number; count: number }[] {
    return Array.from({ length: days }, (_, i) => {
      const dt = new Date();
      dt.setDate(dt.getDate() - (days - 1 - i));
      const label = dt.toLocaleDateString("en-GB", { weekday: "short" });
      const daySessions = sessions.filter(s => s.startTime.toDateString() === dt.toDateString());
      return { label, minutes: daySessions.reduce((s, f) => s + f.actualMinutes, 0), count: daySessions.length };
    });
  }

  static minutesPerGoal(sessions: FocusSession[]): { title: string; minutes: number; count: number }[] {
    const map = new Map<string, { minutes: number; count: number }>();
    sessions.forEach(s => {
      if (!s.linkedGoalTitle) return;
      const cur = map.get(s.linkedGoalTitle) ?? { minutes: 0, count: 0 };
      map.set(s.linkedGoalTitle, { minutes: cur.minutes + s.actualMinutes, count: cur.count + 1 });
    });
    return [...map.entries()].map(([title, v]) => ({ title, ...v })).sort((a, b) => b.minutes - a.minutes);
  }

  static currentStreak(sessions: FocusSession[]): number {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i <= 30; i++) {
      const dt = new Date(today);
      dt.setDate(dt.getDate() - i);
      if (sessions.some(s => s.startTime.toDateString() === dt.toDateString())) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  static groupByDate(sessions: FocusSession[]): { date: string; sessions: FocusSession[] }[] {
    const map = new Map<string, FocusSession[]>();
    [...sessions].sort((a, b) => b.startTime.getTime() - a.startTime.getTime()).forEach(s => {
      const key = s.startTime.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    });
    return [...map.entries()].map(([date, sessions]) => ({ date, sessions }));
  }

  static bestHour(sessions: FocusSession[]): string {
    const counts = new Array(24).fill(0);
    sessions.forEach(s => counts[s.startTime.getHours()]++);
    const best = counts.indexOf(Math.max(...counts));
    return best === 0 ? "N/A" : `${best}:00${best < 12 ? "am" : "pm"}`;
  }

  static consistencyPct(sessions: FocusSession[], days = 14): number {
    let active = 0;
    for (let i = 0; i < days; i++) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      if (sessions.some(s => s.startTime.toDateString() === dt.toDateString())) active++;
    }
    return Math.round((active / days) * 100);
  }
}

/* ─── Agent suggestions ─────────────────────────────────────── */

export interface FocusSuggestion {
  minutes: number;
  type: SessionType;
  reason: string;
  linkId?: string;
  linkTitle?: string;
}

export const AGENT_SUGGESTIONS: FocusSuggestion[] = [
  {
    minutes: 90, type: "strategic",
    reason: "You're in a high-output cycle week — ride the momentum with a deep session.",
    linkId: "g1", linkTitle: "Launch P1 MVP",
  },
  {
    minutes: 45, type: "strategic",
    reason: "Your fundraising goal has 0 focus minutes today. Start a sprint now.",
    linkId: "g2", linkTitle: "Build fundraising pipeline",
  },
  {
    minutes: 25, type: "study",
    reason: "Your energy dipped after the last session — a lighter study block is optimal.",
  },
];
