/* ══════════════════════════════════════════════════════════════
   P1 STORY AWARDS — data layer
   ══════════════════════════════════════════════════════════════ */

export type AwardTier = "gold" | "silver" | "bronze";
export type AwardFrequency = "weekly" | "monthly";

export type WeeklyAwardCategory =
  | "Story of the Week"
  | "Rising Storyteller"
  | "Most Inspiring Comeback"
  | "Community Favourite";

export type MonthlyAwardCategory =
  | "Story of the Month"
  | "Comeback of the Month"
  | "Professional Story of the Month"
  | "Student Story of the Month"
  | "P1 Editors' Pick";

export type AwardCategory = WeeklyAwardCategory | MonthlyAwardCategory;

export interface AwardScore {
  community: number;   // 0–100, weighted 60%
  agent: number;       // 0–100, weighted 30%
  editorial: number;   // 0–100, weighted 10%
  total: number;       // computed
}

export interface AwardWinner {
  id: string;
  storyId: string;
  storyTitle: string;
  storyExcerpt: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  authorProfession: string;
  authorProfessionEmoji: string;
  category: AwardCategory;
  frequency: AwardFrequency;
  tier: AwardTier;
  accentColor: string;
  gradientFrom: string;
  gradientTo: string;
  score: AwardScore;
  savedCount: number;
  followerCount: number;
  readCount: number;
  shareCount: number;
  period: string;           // "Week of 9 Jun 2026" | "June 2026"
  awardedAt: string;
  whyWon: string;           // agent-generated blurb
  wall?: string;
  featured?: boolean;
}

export interface AwardNotification {
  id: string;
  winnerId: string;
  recipientName: string;
  message: string;
  read: boolean;
  awardedAt: string;
}

// ── Scoring helper ────────────────────────────────────────────

export function computeScore(community: number, agent: number, editorial: number): number {
  return Math.round(community * 0.6 + agent * 0.3 + editorial * 0.1);
}

// ── Award palette ─────────────────────────────────────────────

export const AWARD_PALETTE: Record<AwardTier, { accent: string; from: string; to: string; glow: string }> = {
  gold:   { accent: "#f59e0b", from: "#1a1505", to: "#0f0c00", glow: "#f59e0b40" },
  silver: { accent: "#94a3b8", from: "#0f1117", to: "#0a0c14", glow: "#94a3b820" },
  bronze: { accent: "#cd7c4a", from: "#120d08", to: "#0a0804", glow: "#cd7c4a20" },
};

export const CATEGORY_META: Record<AwardCategory, { emoji: string; description: string }> = {
  "Story of the Week":             { emoji: "🏆", description: "The most powerful, emotionally resonant story of the week." },
  "Rising Storyteller":            { emoji: "🚀", description: "A newcomer whose story is gaining rapid traction." },
  "Most Inspiring Comeback":       { emoji: "💪", description: "Hardship → resilience → transformation." },
  "Community Favourite":           { emoji: "❤️", description: "Highest combined community engagement." },
  "Story of the Month":            { emoji: "🌟", description: "The most powerful story of the month." },
  "Comeback of the Month":         { emoji: "🔥", description: "The most inspiring comeback story this month." },
  "Professional Story of the Month": { emoji: "💼", description: "Best story tagged to a profession wall." },
  "Student Story of the Month":    { emoji: "🎓", description: "Best story tagged to a university wall." },
  "P1 Editors' Pick":              { emoji: "✨", description: "Chosen for exceptional quality and cultural relevance." },
};

// ── Weekly winners — week of 9 Jun 2026 ──────────────────────

export const WEEKLY_WINNERS: AwardWinner[] = [
  {
    id: "w-story-week",
    storyId: "pipes-to-product",
    storyTitle: "From Pipes to Product",
    storyExcerpt: "He went from fixing leaks at 6am to pitching investors at 6pm. This is the story of Marcus Williams — and the week everything changed.",
    authorName: "Marcus Williams",
    authorInitials: "MW",
    authorColor: "#22c55e",
    authorProfession: "Founder & Ex-Plumber",
    authorProfessionEmoji: "🚀",
    category: "Story of the Week",
    frequency: "weekly",
    tier: "gold",
    accentColor: "#f59e0b",
    gradientFrom: "#1a1505",
    gradientTo: "#0f0c00",
    score: { community: 94, agent: 91, editorial: 96, total: computeScore(94, 91, 96) },
    savedCount: 3847,
    followerCount: 2104,
    readCount: 11200,
    shareCount: 623,
    period: "Week of 9 Jun 2026",
    awardedAt: "16 Jun 2026",
    whyWon: "An extraordinary account of career reinvention. Marcus's voice is raw, specific, and deeply honest — the chapter where he nearly quit resonated with thousands of readers. Community signals were 94th percentile for the week.",
    wall: "Founders' Wall 🚀",
    featured: true,
  },
  {
    id: "w-rising",
    storyId: "code-at-40",
    storyTitle: "Learning to Code at 40",
    storyExcerpt: "Gary thought it was too late. It wasn't. Three months in, he shipped his first app.",
    authorName: "Gary Wilson",
    authorInitials: "GW",
    authorColor: "#8b5cf6",
    authorProfession: "Software Developer",
    authorProfessionEmoji: "💻",
    category: "Rising Storyteller",
    frequency: "weekly",
    tier: "silver",
    accentColor: "#94a3b8",
    gradientFrom: "#0f1117",
    gradientTo: "#0a0c14",
    score: { community: 81, agent: 85, editorial: 78, total: computeScore(81, 85, 78) },
    savedCount: 1923,
    followerCount: 1047,
    readCount: 5800,
    shareCount: 291,
    period: "Week of 9 Jun 2026",
    awardedAt: "16 Jun 2026",
    whyWon: "Published 3 chapters in 7 days and gained 1,000 followers in under 48 hours — the fastest-growing story this week by a new author on P1.",
    featured: false,
  },
  {
    id: "w-comeback",
    storyId: "sub4-after-injury",
    storyTitle: "Sub-4 After the Injury",
    storyExcerpt: "Tom's knee gave out at mile 18. Two years later, he crossed the line in 3:58. This is everything in between.",
    authorName: "Tom Adeyemi",
    authorInitials: "TA",
    authorColor: "#22c55e",
    authorProfession: "Marathon Runner",
    authorProfessionEmoji: "🏃",
    category: "Most Inspiring Comeback",
    frequency: "weekly",
    tier: "silver",
    accentColor: "#94a3b8",
    gradientFrom: "#0a100a",
    gradientTo: "#060c06",
    score: { community: 88, agent: 93, editorial: 82, total: computeScore(88, 93, 82) },
    savedCount: 2714,
    followerCount: 1560,
    readCount: 8400,
    shareCount: 440,
    period: "Week of 9 Jun 2026",
    awardedAt: "16 Jun 2026",
    whyWon: "The agent scoring flagged this as the week's highest-rated narrative arc — a textbook hardship-to-triumph structure with exceptional emotional specificity.",
    featured: false,
  },
  {
    id: "w-community",
    storyId: "night-shift-diaries",
    storyTitle: "Night Shift Diaries",
    storyExcerpt: "Kwame started writing at 3am after a 12-hour shift. He never expected anyone to read it.",
    authorName: "Kwame Asante",
    authorInitials: "KA",
    authorColor: "#10b981",
    authorProfession: "A&E Nurse",
    authorProfessionEmoji: "🩺",
    category: "Community Favourite",
    frequency: "weekly",
    tier: "silver",
    accentColor: "#94a3b8",
    gradientFrom: "#061210",
    gradientTo: "#030a08",
    score: { community: 97, agent: 79, editorial: 74, total: computeScore(97, 79, 74) },
    savedCount: 4102,
    followerCount: 2380,
    readCount: 13900,
    shareCount: 891,
    period: "Week of 9 Jun 2026",
    awardedAt: "16 Jun 2026",
    whyWon: "The highest community engagement of any story this week — 13,900 reads, 4,100+ saves, and a completion rate of 78%, well above the platform average of 43%.",
    featured: false,
  },
];

// ── Monthly winners — June 2026 ───────────────────────────────

export const MONTHLY_WINNERS: AwardWinner[] = [
  {
    id: "m-story-month",
    storyId: "night-shift-diaries",
    storyTitle: "Night Shift Diaries",
    storyExcerpt: "Five chapters. One NHS nurse. A story that made 12,000 people feel less alone at 3am.",
    authorName: "Kwame Asante",
    authorInitials: "KA",
    authorColor: "#10b981",
    authorProfession: "A&E Nurse",
    authorProfessionEmoji: "🩺",
    category: "Story of the Month",
    frequency: "monthly",
    tier: "gold",
    accentColor: "#f59e0b",
    gradientFrom: "#1a1505",
    gradientTo: "#0f0c00",
    score: { community: 97, agent: 88, editorial: 95, total: computeScore(97, 88, 95) },
    savedCount: 11240,
    followerCount: 6320,
    readCount: 44800,
    shareCount: 2180,
    period: "June 2026",
    awardedAt: "16 Jun 2026",
    whyWon: "Night Shift Diaries is the defining P1 story of June. Kwame's writing captures the weight of a 12-hour NHS shift with an intimacy that is rare — and it showed in the numbers. 44,800 reads, a 78% completion rate, and more shares than any story in June.",
    wall: "NHS & Healthcare 🩺",
    featured: true,
  },
  {
    id: "m-comeback",
    storyId: "pipes-to-product",
    storyTitle: "From Pipes to Product",
    storyExcerpt: "Left the tools. Picked up a laptop. Didn't look back.",
    authorName: "Marcus Williams",
    authorInitials: "MW",
    authorColor: "#22c55e",
    authorProfession: "Founder & Ex-Plumber",
    authorProfessionEmoji: "🚀",
    category: "Comeback of the Month",
    frequency: "monthly",
    tier: "gold",
    accentColor: "#f59e0b",
    gradientFrom: "#1a1505",
    gradientTo: "#0f0c00",
    score: { community: 94, agent: 91, editorial: 88, total: computeScore(94, 91, 88) },
    savedCount: 9840,
    followerCount: 5100,
    readCount: 38600,
    shareCount: 1920,
    period: "June 2026",
    awardedAt: "16 Jun 2026",
    whyWon: "The clearest hardship-to-transformation arc in June's cohort. Marcus's career switch is specific, verifiable, and inspiring — it scored 91 on narrative structure, the highest agent score this month.",
    wall: "Founders' Wall 🚀",
    featured: false,
  },
  {
    id: "m-professional",
    storyId: "startup-near-death",
    storyTitle: "The Day My Startup Nearly Died",
    storyExcerpt: "Zara had £400 left in the company account. Here's what happened next.",
    authorName: "Zara Ahmed",
    authorInitials: "ZA",
    authorColor: "#f59e0b",
    authorProfession: "Tech Founder",
    authorProfessionEmoji: "💡",
    category: "Professional Story of the Month",
    frequency: "monthly",
    tier: "gold",
    accentColor: "#f59e0b",
    gradientFrom: "#1a1205",
    gradientTo: "#0f0c00",
    score: { community: 86, agent: 89, editorial: 90, total: computeScore(86, 89, 90) },
    savedCount: 7230,
    followerCount: 3980,
    readCount: 29100,
    shareCount: 1340,
    period: "June 2026",
    awardedAt: "16 Jun 2026",
    whyWon: "Highest professional relevance score in June — the story speaks directly to the founder experience and was widely shared across profession walls. The editorial team rated it 90 for cultural and professional impact.",
    wall: "Founders' Wall 🚀",
    featured: false,
  },
  {
    id: "m-student",
    storyId: "first-year-oxford",
    storyTitle: "How I Survived My First Year at Oxford",
    storyExcerpt: "Emma arrived knowing nobody. She left the year with a first, two friends, and a story worth telling.",
    authorName: "Emma Clarke",
    authorInitials: "EC",
    authorColor: "#1d4ed8",
    authorProfession: "PPE Student",
    authorProfessionEmoji: "🎓",
    category: "Student Story of the Month",
    frequency: "monthly",
    tier: "gold",
    accentColor: "#f59e0b",
    gradientFrom: "#05081a",
    gradientTo: "#030512",
    score: { community: 82, agent: 84, editorial: 88, total: computeScore(82, 84, 88) },
    savedCount: 5410,
    followerCount: 2870,
    readCount: 21400,
    shareCount: 980,
    period: "June 2026",
    awardedAt: "16 Jun 2026",
    whyWon: "The most-read student story in June. Emma's writing is precise without being cold — she captures the alienation of elite academia with honesty that resonated widely across university walls.",
    wall: "Oxford University 🎓",
    featured: false,
  },
  {
    id: "m-editors",
    storyId: "invisible-excellence",
    storyTitle: "The Plumber's Philosophy",
    storyExcerpt: "Nobody sees the pipes. Nobody sees Gary either. But the work is immaculate, and he knows it.",
    authorName: "Gary Benson",
    authorInitials: "GB",
    authorColor: "#94a3b8",
    authorProfession: "Master Plumber",
    authorProfessionEmoji: "🔧",
    category: "P1 Editors' Pick",
    frequency: "monthly",
    tier: "gold",
    accentColor: "#f59e0b",
    gradientFrom: "#0d0f14",
    gradientTo: "#080a0f",
    score: { community: 71, agent: 94, editorial: 98, total: computeScore(71, 94, 98) },
    savedCount: 3180,
    followerCount: 1640,
    readCount: 12900,
    shareCount: 720,
    period: "June 2026",
    awardedAt: "16 Jun 2026",
    whyWon: "The editorial team rarely agrees unanimously. This time they did. The Plumber's Philosophy is the quietest story on P1 this month — and the most profound. Gary's reflections on invisible craft are a genuine piece of writing.",
    featured: false,
  },
];

export const ALL_WINNERS = [...WEEKLY_WINNERS, ...MONTHLY_WINNERS];

export function getWinner(id: string): AwardWinner | undefined {
  return ALL_WINNERS.find(w => w.id === id);
}

// ── Sample award notifications ────────────────────────────────

export const AWARD_NOTIFICATIONS: AwardNotification[] = [
  {
    id: "notif-1",
    winnerId: "w-story-week",
    recipientName: "Marcus Williams",
    message: "Your story 'From Pipes to Product' has won Story of the Week 🏆",
    read: false,
    awardedAt: "16 Jun 2026",
  },
  {
    id: "notif-2",
    winnerId: "m-community",
    recipientName: "You (following Night Shift Diaries)",
    message: "A story you follow — Night Shift Diaries — has won Story of the Month 🌟",
    read: false,
    awardedAt: "16 Jun 2026",
  },
];
