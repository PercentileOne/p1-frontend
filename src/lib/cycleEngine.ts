/* ══════════════════════════════════════════════════════════════
   P1 CYCLE ENGINE  —  12-Week Cycle data model + CycleAgent
   ══════════════════════════════════════════════════════════════ */

/* ── Types ───────────────────────────────────────────────── */

export type CycleDifficulty = "easy" | "medium" | "hard" | "epic";
export type CycleStatus     = "active" | "completed" | "paused" | "upcoming";
export type MilestoneStatus = "upcoming" | "in_progress" | "completed" | "missed" | "at_risk";
export type RiskLevel       = "low" | "medium" | "high" | "critical";

export interface CycleMilestone {
  id: string;
  goalId: string;
  title: string;
  dueWeek: number;          // 1–12
  status: MilestoneStatus;
  proofRequired: boolean;
  proofSubmitted: boolean;
  points: number;
  description?: string;
}

export interface CycleGoal {
  id: string;
  title: string;
  area: string;
  difficulty: CycleDifficulty;
  progress: number;           // 0–100
  weeklyTarget: string;       // What they aim to achieve this week
  streak: number;
  proofCount: number;
  proofVerified: number;
  milestones: CycleMilestone[];
  linkedVision: string[];     // Vision area names
  agentInsight: string;
  color: string;
  points: number;
  pointsEarned: number;
}

export interface WeeklyTarget {
  goalId: string;
  goalTitle: string;
  target: string;
  completed: boolean;
  proofRequired: boolean;
}

export interface WeeklyPlan {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  priorities: string[];
  targets: WeeklyTarget[];
  energyLevel: number;        // 1–5
  keyFocus: string;
  agentNotes: string;
  completionRate: number;     // 0–100 (retrospective)
  locked: boolean;            // true once started
}

export interface CycleRisk {
  id: string;
  severity: RiskLevel;
  title: string;
  description: string;
  affectedGoals: string[];
  recommendation: string;
}

export interface CycleInsight {
  id: string;
  type: "momentum" | "risk" | "achievement" | "behaviour" | "vision";
  title: string;
  body: string;
  icon: "sparkles" | "alert" | "check" | "flame" | "compass";
  color: string;
}

export interface Cycle {
  id: string;
  name: string;
  number: number;
  status: CycleStatus;
  startDate: Date;
  endDate: Date;
  goals: CycleGoal[];
  weeklyPlans: WeeklyPlan[];
  currentWeek: number;        // 1–12
  momentumScore: number;      // 0–100
  overallProgress: number;    // 0–100
  totalPoints: number;
  earnedPoints: number;
  risks: CycleRisk[];
  insights: CycleInsight[];
  visionAlignment: number;    // 0–100
  trustScoreImpact: number;   // delta since cycle start
  behaviourScore: number;
  theme: string;              // e.g. "Foundation" "Acceleration" "Mastery"
  intention: string;          // User's cycle intention statement
}

/* ── In-memory store ─────────────────────────────────────── */
let _cycles: Cycle[] = [];

/* ══════════════════════════════════════════════════════════════
   CYCLE AGENT
   ══════════════════════════════════════════════════════════════ */
export class CycleAgent {

  static calculateMomentumScore(cycle: Cycle): number {
    const milestones    = cycle.goals.flatMap(g => g.milestones);
    const milestDone    = milestones.filter(m => m.status === "completed").length;
    const milestTotal   = milestones.length || 1;
    const milestPct     = (milestDone / milestTotal) * 40;

    const pastWeeks     = cycle.weeklyPlans.filter(w => w.locked);
    const avgCompletion = pastWeeks.length
      ? pastWeeks.reduce((s, w) => s + w.completionRate, 0) / pastWeeks.length
      : cycle.overallProgress;
    const weekPct       = (avgCompletion / 100) * 40;

    const trustPct      = (cycle.behaviourScore / 100) * 20;

    return Math.round(Math.min(100, milestPct + weekPct + trustPct));
  }

  static generateWeeklyTargets(cycle: Cycle, weekNum: number): WeeklyTarget[] {
    const weekProgress = ((weekNum - 1) / 12) * 100;
    return cycle.goals.map(g => ({
      goalId: g.id,
      goalTitle: g.title,
      target: g.weeklyTarget,
      completed: false,
      proofRequired: g.difficulty === "hard" || g.difficulty === "epic" || weekNum === 6 || weekNum === 12,
    }));
  }

  static detectCycleRisk(cycle: Cycle): CycleRisk[] {
    const risks: CycleRisk[] = [];
    const weekFraction = cycle.currentWeek / 12;

    // Progress lag
    const expectedProgress = weekFraction * 100;
    const lag = expectedProgress - cycle.overallProgress;
    if (lag > 15) {
      risks.push({
        id: "r_lag",
        severity: lag > 30 ? "critical" : "high",
        title: "Progress Lag Detected",
        description: `You're ${lag.toFixed(0)}% behind the expected trajectory for Week ${cycle.currentWeek}.`,
        affectedGoals: cycle.goals.filter(g => g.progress < expectedProgress - 10).map(g => g.title),
        recommendation: "Focus on your top 2 goals this week and defer lower-priority tasks.",
      });
    }

    // Milestone at risk
    const upcoming = cycle.goals.flatMap(g => g.milestones)
      .filter(m => m.status !== "completed" && m.dueWeek <= cycle.currentWeek + 1);
    if (upcoming.length > 0) {
      risks.push({
        id: "r_milestone",
        severity: "medium",
        title: `${upcoming.length} Milestone${upcoming.length > 1 ? "s" : ""} Due Soon`,
        description: `${upcoming.map(m => m.title).join(", ")} ${upcoming.length > 1 ? "are" : "is"} due within the next week.`,
        affectedGoals: [...new Set(upcoming.map(m => m.goalId))],
        recommendation: "Block time this week to complete these milestones and submit proof.",
      });
    }

    // Streak risk
    const lowStreakGoals = cycle.goals.filter(g => g.streak < 3 && g.difficulty !== "easy");
    if (lowStreakGoals.length > 0) {
      risks.push({
        id: "r_streak",
        severity: "low",
        title: "Streak Momentum Low",
        description: `${lowStreakGoals.map(g => g.title).join(", ")} have short or broken streaks.`,
        affectedGoals: lowStreakGoals.map(g => g.title),
        recommendation: "Prioritise daily consistency over intensity this week.",
      });
    }

    return risks;
  }

  static generateCycleInsights(cycle: Cycle): CycleInsight[] {
    const insights: CycleInsight[] = [];
    const momentum = this.calculateMomentumScore(cycle);

    if (momentum >= 75) {
      insights.push({
        id: "i_momentum",
        type: "momentum",
        title: "Momentum is Strong",
        body: `Your cycle momentum score is ${momentum}/100. You're ahead of the expected trajectory — keep the pace through Week ${cycle.currentWeek + 1}.`,
        icon: "flame",
        color: "text-orange-400",
      });
    }

    const doneGoals = cycle.goals.filter(g => g.progress >= 100);
    if (doneGoals.length > 0) {
      insights.push({
        id: "i_done",
        type: "achievement",
        title: `${doneGoals.length} Goal${doneGoals.length > 1 ? "s" : ""} Complete`,
        body: `${doneGoals.map(g => g.title).join(", ")} ${doneGoals.length > 1 ? "are" : "is"} complete. Outstanding execution.`,
        icon: "check",
        color: "text-green-400",
      });
    }

    const visionScore = cycle.visionAlignment;
    insights.push({
      id: "i_vision",
      type: "vision",
      title: `${visionScore}% Vision Alignment`,
      body: `This cycle is ${visionScore}% aligned to your 5-year vision arcs. ${visionScore >= 80 ? "Excellent coherence." : "Consider linking underperforming goals to a vision arc."}`,
      icon: "compass",
      color: "text-indigo-400",
    });

    const risks = this.detectCycleRisk(cycle);
    if (risks.some(r => r.severity === "high" || r.severity === "critical")) {
      insights.push({
        id: "i_risk",
        type: "risk",
        title: "Agent Risk Alert",
        body: risks.find(r => r.severity === "high" || r.severity === "critical")!.description,
        icon: "alert",
        color: "text-red-400",
      });
    }

    return insights;
  }

  static generateMidReview(cycle: Cycle): string[] {
    const momentum = this.calculateMomentumScore(cycle);
    const completed = cycle.goals.filter(g => g.progress >= 50);
    const behind    = cycle.goals.filter(g => g.progress < 40);
    return [
      `You are at Week 6 with a momentum score of ${momentum}/100.`,
      `${completed.length} goal${completed.length !== 1 ? "s" : ""} are at or past 50% completion. Strong foundation.`,
      behind.length > 0
        ? `${behind.map(g => g.title).join(", ")} ${behind.length > 1 ? "are" : "is"} behind pace. Recommend focused sprint in Weeks 7–9.`
        : "All goals are on or ahead of target pace. Excellent mid-cycle position.",
      `Your trust score has shifted ${cycle.trustScoreImpact > 0 ? "+" : ""}${cycle.trustScoreImpact} points since cycle start.`,
      "Proof Engine has verified all major milestone completions. Integrity intact.",
    ];
  }

  static generateEndReview(cycle: Cycle): string[] {
    const momentum  = this.calculateMomentumScore(cycle);
    const done      = cycle.goals.filter(g => g.progress >= 100);
    const partial   = cycle.goals.filter(g => g.progress >= 50 && g.progress < 100);
    const missed    = cycle.goals.filter(g => g.progress < 50);
    return [
      `Cycle complete. Final momentum score: ${momentum}/100.`,
      `${done.length} goal${done.length !== 1 ? "s" : ""} fully completed. ${partial.length} in progress. ${missed.length} not achieved.`,
      done.length > 0 ? `Congratulations on completing: ${done.map(g => g.title).join(", ")}.` : "",
      missed.length > 0 ? `${missed.map(g => g.title).join(", ")} will carry forward to Cycle ${cycle.number + 1}.` : "Perfect goal completion rate — rare and commendable.",
      `Net trust score impact: ${cycle.trustScoreImpact > 0 ? "+" : ""}${cycle.trustScoreImpact} points.`,
      `Vision alignment this cycle: ${cycle.visionAlignment}%. ${cycle.visionAlignment >= 80 ? "Outstanding coherence with your long-term vision." : "Increase vision-linked goals in your next cycle."}`,
    ].filter(Boolean);
  }

  static suggestAdjustments(cycle: Cycle): string[] {
    const risks = this.detectCycleRisk(cycle);
    const suggestions: string[] = [];
    if (risks.some(r => r.id === "r_lag")) {
      suggestions.push("Drop 1–2 low-impact tasks and redirect energy to lagging goals.");
    }
    if (risks.some(r => r.id === "r_milestone")) {
      suggestions.push("Block a 90-minute deep work session before each milestone deadline.");
    }
    if (risks.some(r => r.id === "r_streak")) {
      suggestions.push("Set a minimum daily action for each goal — even 10 minutes counts.");
    }
    if (suggestions.length === 0) {
      suggestions.push("Maintain current pace. Consider raising the bar on one goal.");
      suggestions.push("Use surplus momentum to batch proof submissions.");
    }
    return suggestions;
  }
}

/* ══════════════════════════════════════════════════════════════
   SYNTHETIC DATA — "Cycle 3 — Summer 2026"
   ══════════════════════════════════════════════════════════════ */

const CYCLE_START = new Date("2026-05-04");
const CYCLE_END   = new Date("2026-08-02");

function weekStart(weekNum: number): Date {
  const d = new Date(CYCLE_START);
  d.setDate(d.getDate() + (weekNum - 1) * 7);
  return d;
}
function weekEnd(weekNum: number): Date {
  const d = weekStart(weekNum);
  d.setDate(d.getDate() + 6);
  return d;
}

const GOALS: CycleGoal[] = [
  {
    id: "cg1",
    title: "Complete AWS Solutions Architect Certification",
    area: "Career & Purpose",
    difficulty: "hard",
    progress: 62,
    weeklyTarget: "Complete 2 practice exams + review VPC section",
    streak: 19,
    proofCount: 5,
    proofVerified: 4,
    linkedVision: ["Career & Purpose", "Financial Wealth"],
    agentInsight: "On track. Score 74% on last mock — needs 80%. Focus: VPC, IAM, S3.",
    color: "bg-blue-500",
    points: 600,
    pointsEarned: 372,
    milestones: [
      { id:"m1", goalId:"cg1", title:"Complete all 6 study modules",   dueWeek:4,  status:"completed", proofRequired:true,  proofSubmitted:true,  points:100, description:"All core AWS modules finished" },
      { id:"m2", goalId:"cg1", title:"Score 70%+ on first mock exam",  dueWeek:6,  status:"completed", proofRequired:true,  proofSubmitted:true,  points:150, description:"Screenshot of practice exam result" },
      { id:"m3", goalId:"cg1", title:"Score 80%+ on second mock exam", dueWeek:9,  status:"upcoming",  proofRequired:true,  proofSubmitted:false, points:150, description:"Ready to sit real exam" },
      { id:"m4", goalId:"cg1", title:"Pass the official AWS exam",      dueWeek:11, status:"upcoming",  proofRequired:true,  proofSubmitted:false, points:200, description:"Certificate of completion" },
    ],
  },
  {
    id: "cg2",
    title: "Build & Launch P1 Beta",
    area: "Career & Purpose",
    difficulty: "epic",
    progress: 55,
    weeklyTarget: "Ship Cycle Engine + Proof System to staging",
    streak: 24,
    proofCount: 8,
    proofVerified: 7,
    linkedVision: ["Career & Purpose", "Mission & Legacy"],
    agentInsight: "Strong velocity. Backend still at 40%. Prioritise API before Week 8.",
    color: "bg-indigo-500",
    points: 1200,
    pointsEarned: 660,
    milestones: [
      { id:"m5", goalId:"cg2", title:"Core UI shell live",                dueWeek:3,  status:"completed", proofRequired:true,  proofSubmitted:true,  points:150 },
      { id:"m6", goalId:"cg2", title:"Goals + Today screen shipped",      dueWeek:5,  status:"completed", proofRequired:true,  proofSubmitted:true,  points:200 },
      { id:"m7", goalId:"cg2", title:"Proof Engine live",                  dueWeek:7,  status:"in_progress", proofRequired:true, proofSubmitted:false, points:200, description:"Full proof system with admin" },
      { id:"m8", goalId:"cg2", title:"Beta invite to first 10 users",      dueWeek:10, status:"upcoming",  proofRequired:true,  proofSubmitted:false, points:300 },
      { id:"m9", goalId:"cg2", title:"Public launch",                      dueWeek:12, status:"upcoming",  proofRequired:true,  proofSubmitted:false, points:350 },
    ],
  },
  {
    id: "cg3",
    title: "Daily Exercise — 84 Days",
    area: "Health & Vitality",
    difficulty: "hard",
    progress: 50,
    weeklyTarget: "6 sessions: 4 strength + 2 cardio",
    streak: 18,
    proofCount: 6,
    proofVerified: 5,
    linkedVision: ["Health & Vitality"],
    agentInsight: "Streak at 18 days — protect it. Rest day scheduled Sunday.",
    color: "bg-green-500",
    points: 750,
    pointsEarned: 375,
    milestones: [
      { id:"m10", goalId:"cg3", title:"30-day unbroken streak",   dueWeek:5,  status:"completed",  proofRequired:true,  proofSubmitted:true,  points:150 },
      { id:"m11", goalId:"cg3", title:"60-day unbroken streak",   dueWeek:9,  status:"upcoming",   proofRequired:true,  proofSubmitted:false, points:200 },
      { id:"m12", goalId:"cg3", title:"84-day completion",         dueWeek:12, status:"upcoming",   proofRequired:true,  proofSubmitted:false, points:400 },
    ],
  },
  {
    id: "cg4",
    title: "Read 3 Business Books",
    area: "Knowledge & Learning",
    difficulty: "medium",
    progress: 67,
    weeklyTarget: "Finish Chapter 8–12 of 'Zero to One'",
    streak: 14,
    proofCount: 4,
    proofVerified: 4,
    linkedVision: ["Career & Purpose", "Knowledge & Learning"],
    agentInsight: "2 of 3 books done. One more to go. Ahead of schedule.",
    color: "bg-violet-500",
    points: 300,
    pointsEarned: 200,
    milestones: [
      { id:"m13", goalId:"cg4", title:"Finish 'Atomic Habits'",      dueWeek:3, status:"completed", proofRequired:false, proofSubmitted:false, points:50 },
      { id:"m14", goalId:"cg4", title:"Finish 'The Hard Thing'",      dueWeek:6, status:"completed", proofRequired:false, proofSubmitted:false, points:50 },
      { id:"m15", goalId:"cg4", title:"Finish 'Zero to One'",         dueWeek:9, status:"upcoming",  proofRequired:true,  proofSubmitted:false, points:100, description:"Summary note submitted" },
    ],
  },
  {
    id: "cg5",
    title: "Reduce Body Fat to 15%",
    area: "Health & Vitality",
    difficulty: "hard",
    progress: 40,
    weeklyTarget: "Track calories 6/7 days. OMAD 3 days.",
    streak: 8,
    proofCount: 3,
    proofVerified: 2,
    linkedVision: ["Health & Vitality"],
    agentInsight: "Progress slower than projected. Consider adding 1 fasting day per week.",
    color: "bg-teal-500",
    points: 600,
    pointsEarned: 240,
    milestones: [
      { id:"m16", goalId:"cg5", title:"Reach 19% body fat",  dueWeek:5,  status:"at_risk",   proofRequired:true,  proofSubmitted:false, points:150 },
      { id:"m17", goalId:"cg5", title:"Reach 17% body fat",  dueWeek:9,  status:"upcoming",  proofRequired:true,  proofSubmitted:false, points:200 },
      { id:"m18", goalId:"cg5", title:"Reach 15% body fat",  dueWeek:12, status:"upcoming",  proofRequired:true,  proofSubmitted:false, points:250 },
    ],
  },
];

const WEEKLY_PLANS: WeeklyPlan[] = Array.from({ length: 12 }, (_, i) => {
  const wk = i + 1;
  const isPast = wk < 6;
  const isCurrent = wk === 6;
  return {
    weekNumber: wk,
    startDate: weekStart(wk),
    endDate: weekEnd(wk),
    priorities: wk === 6
      ? ["Ship Proof Engine to staging", "AWS mock exam #2", "Hit 18-day exercise streak", "Finish 'Zero to One' Ch.8"]
      : isPast
        ? ["Complete study modules", "Build UI shell", "30-day fitness streak", "Read 30 pages/day"]
        : [],
    targets: isPast || isCurrent ? GOALS.map(g => ({
      goalId: g.id,
      goalTitle: g.title,
      target: g.weeklyTarget,
      completed: isPast,
      proofRequired: g.difficulty === "hard" || g.difficulty === "epic",
    })) : [],
    energyLevel: isPast ? [4,5,4,3,4,4][i] ?? 4 : 4,
    keyFocus: wk === 6 ? "Shipping proof engine and mid-cycle push" : isPast ? "Foundation building" : "Acceleration phase",
    agentNotes: isCurrent
      ? "Week 6 is your momentum checkpoint. Focus on shipping tangible proof for your top 2 goals."
      : isPast
        ? "Week complete. Strong execution."
        : "Not yet planned.",
    completionRate: isPast ? [88, 92, 76, 84, 90][i] ?? 85 : 0,
    locked: isPast,
  };
});

export const CURRENT_CYCLE: Cycle = {
  id: "cycle_3",
  name: "Cycle 3 — Summer 2026",
  number: 3,
  status: "active",
  startDate: CYCLE_START,
  endDate: CYCLE_END,
  goals: GOALS,
  weeklyPlans: WEEKLY_PLANS,
  currentWeek: 6,
  momentumScore: 0,
  overallProgress: 55,
  totalPoints: GOALS.reduce((s, g) => s + g.points, 0),
  earnedPoints: GOALS.reduce((s, g) => s + g.pointsEarned, 0),
  risks: [],
  insights: [],
  visionAlignment: 82,
  trustScoreImpact: +6,
  behaviourScore: 82,
  theme: "Acceleration",
  intention: "This cycle I build the foundations that will define my next 5 years. I show up every day, ship proof, and become someone I am proud to be.",
};

// Hydrate computed fields
CURRENT_CYCLE.momentumScore = CycleAgent.calculateMomentumScore(CURRENT_CYCLE);
CURRENT_CYCLE.risks         = CycleAgent.detectCycleRisk(CURRENT_CYCLE);
CURRENT_CYCLE.insights      = CycleAgent.generateCycleInsights(CURRENT_CYCLE);

export const PAST_CYCLES: Cycle[] = [
  {
    id: "cycle_1", name: "Cycle 1 — Winter 2026", number: 1, status: "completed",
    startDate: new Date("2025-12-01"), endDate: new Date("2026-02-22"),
    goals: [], weeklyPlans: [], currentWeek: 12, momentumScore: 71,
    overallProgress: 100, totalPoints: 2400, earnedPoints: 1710,
    risks: [], insights: [], visionAlignment: 74, trustScoreImpact: +12,
    behaviourScore: 76, theme: "Foundation",
    intention: "Build the daily disciplines that will carry me through the year.",
  },
  {
    id: "cycle_2", name: "Cycle 2 — Spring 2026", number: 2, status: "completed",
    startDate: new Date("2026-02-23"), endDate: new Date("2026-05-17"),
    goals: [], weeklyPlans: [], currentWeek: 12, momentumScore: 84,
    overallProgress: 100, totalPoints: 2800, earnedPoints: 2352,
    risks: [], insights: [], visionAlignment: 79, trustScoreImpact: +9,
    behaviourScore: 80, theme: "Momentum",
    intention: "Accelerate. Ship the first version of P1. Level up fitness. Read 4 books.",
  },
];

export function getCycles(): Cycle[] {
  return [...PAST_CYCLES, CURRENT_CYCLE];
}

export function getCurrentCycle(): Cycle {
  return CURRENT_CYCLE;
}

export function formatCycleDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
}

export function weeksRemaining(cycle: Cycle): number {
  return 12 - cycle.currentWeek;
}
