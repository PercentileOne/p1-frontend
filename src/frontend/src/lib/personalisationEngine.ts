/* ══════════════════════════════════════════════════════════════
   P1 HOME PAGE PERSONALISATION ENGINE
   Weighting: 40% Interests · 30% Walls · 20% Agent · 10% Trending
   ══════════════════════════════════════════════════════════════ */

import {
  getInterestById,
  deriveWallRecommendations,
  deriveStoryRecommendations,
  deriveAgentRecommendations,
  type WallRecommendation,
} from "./interestsEngine";
import { STORIES, type Story } from "./storiesData";
import { WEEKLY_WINNERS, MONTHLY_WINNERS, type AwardWinner } from "./awardsData";
import { OWN_PROFILE } from "./profileData";

// ── Module types ──────────────────────────────────────────────

export type ModuleId =
  | "daily-insight"
  | "wisdom"
  | "stories"
  | "feed-highlights"
  | "agent-picks"
  | "wall-suggestions"
  | "group-suggestions"
  | "achievements"
  | "news"
  | "smart-picks"
  | "trending";

// ── Wisdom quotes ─────────────────────────────────────────────

export interface WisdomQuote {
  id: string;
  text: string;
  author: string;
  tags: string[];
  accentColor: string;
  gradientFrom: string;
  gradientTo: string;
}

export const WISDOM_POOL: WisdomQuote[] = [
  { id: "w1", text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius",  tags: ["stoicism","mindset","resilience"],    accentColor: "#6366f1", gradientFrom: "#0d0e1a", gradientTo: "#090a14" },
  { id: "w2", text: "You have power over your mind, not outside events. Realise this and you will find strength.", author: "Marcus Aurelius", tags: ["stoicism","mindset","clarity"],    accentColor: "#6366f1", gradientFrom: "#0d0e1a", gradientTo: "#090a14" },
  { id: "w3", text: "It is not that I'm so smart, but that I stay with the questions much longer.", author: "Albert Einstein", tags: ["mindset","learning","curiosity"],      accentColor: "#0ea5e9", gradientFrom: "#041018", gradientTo: "#020c14" },
  { id: "w4", text: "The secret of getting ahead is getting started.", author: "Mark Twain",      tags: ["productivity","habits","action"],     accentColor: "#22c55e", gradientFrom: "#051408", gradientTo: "#030c05" },
  { id: "w5", text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill", tags: ["resilience","comeback","courage"],  accentColor: "#f59e0b", gradientFrom: "#1a1505", gradientTo: "#0f0c00" },
  { id: "w6", text: "The only way to do great work is to love what you do.", author: "Steve Jobs",       tags: ["purpose","career-change","startups"], accentColor: "#f97316", gradientFrom: "#1a0d05", gradientTo: "#0f0802" },
  { id: "w7", text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin", tags: ["education","self-taught","learning"],  accentColor: "#3b82f6", gradientFrom: "#05081a", gradientTo: "#030512" },
  { id: "w8", text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke",       tags: ["self-discipline","strength","habits"], accentColor: "#ec4899", gradientFrom: "#1a0510", gradientTo: "#0f0208" },
  { id: "w9", text: "The journey of a thousand miles begins with one step.", author: "Lao Tzu",         tags: ["purpose","journey","resilience"],      accentColor: "#14b8a6", gradientFrom: "#041412", gradientTo: "#020c0a" },
  { id: "w10",text: "Build something 100 people love, not something 1 million people kind of like.", author: "Paul Graham",  tags: ["startups","product","build-in-public"], accentColor: "#8b5cf6", gradientFrom: "#0e0514", gradientTo: "#08020c" },
  { id: "w11",text: "A ship in harbour is safe — but that is not what ships are built for.", author: "John A. Shedd",  tags: ["resilience","purpose","courage"],   accentColor: "#0ea5e9", gradientFrom: "#041018", gradientTo: "#020c14" },
  { id: "w12",text: "The master has failed more times than the beginner has even tried.", author: "Stephen McCranie", tags: ["craftsmanship","mastery","self-taught"], accentColor: "#f97316", gradientFrom: "#1a0d05", gradientTo: "#0f0802" },
  { id: "w13",text: "What you do every day matters more than what you do once in a while.", author: "Gretchen Rubin",  tags: ["habits","productivity","self-discipline"], accentColor: "#22c55e", gradientFrom: "#051408", gradientTo: "#030c05" },
  { id: "w14",text: "Don't count the days; make the days count.", author: "Muhammad Ali",    tags: ["resilience","sport-comeback","purpose"],accentColor: "#f59e0b", gradientFrom: "#1a1505", gradientTo: "#0f0c00" },
  { id: "w15",text: "The mind is everything. What you think, you become.", author: "Buddha",           tags: ["mindset","meditation","clarity"],    accentColor: "#a78bfa", gradientFrom: "#0d0514", gradientTo: "#08020c" },
  { id: "w16",text: "If you are working on something exciting that you really care about, you don't have to be pushed. The vision pulls you.", author: "Steve Jobs", tags: ["startups","purpose","leadership"], accentColor: "#6366f1", gradientFrom: "#0d0e1a", gradientTo: "#090a14" },
  { id: "w17",text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky",   tags: ["self-discipline","startups","action"],accentColor: "#ec4899", gradientFrom: "#1a0510", gradientTo: "#0f0208" },
  { id: "w18",text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein",   tags: ["resilience","mindset","hardship"],   accentColor: "#f59e0b", gradientFrom: "#1a1505", gradientTo: "#0f0c00" },
  { id: "w19",text: "Mastery is not a function of genius or talent. It's a function of time and intense focus applied to a particular field.", author: "Robert Greene", tags: ["mastery","craftsmanship","coding"], accentColor: "#8b5cf6", gradientFrom: "#0e0514", gradientTo: "#08020c" },
  { id: "w20",text: "The cave you fear to enter holds the treasure you seek.", author: "Joseph Campbell", tags: ["resilience","purpose","therapy"],  accentColor: "#14b8a6", gradientFrom: "#041412", gradientTo: "#020c0a" },
];

// ── News items ────────────────────────────────────────────────

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  summary: string;
  tags: string[];
  accentColor: string;
  emoji: string;
  timestamp: string;
}

export const NEWS_POOL: NewsItem[] = [
  { id: "n1",  headline: "UK startup funding hits £12B in H1 2026",   source: "TechCrunch",    tags: ["startups","fundraising","investing"],   accentColor: "#6366f1", emoji: "🚀", summary: "British startups have raised record amounts this year, led by fintech and AI sectors.", timestamp: "2h ago" },
  { id: "n2",  headline: "GPT-5 changes how developers build products", source: "The Verge",     tags: ["ai","coding","product"],               accentColor: "#8b5cf6", emoji: "🤖", summary: "OpenAI's latest model dramatically reduces boilerplate and accelerates prototyping.", timestamp: "4h ago" },
  { id: "n3",  headline: "NHS digital transformation gathers pace",    source: "Health IT",     tags: ["healthcare","technology","education"],  accentColor: "#10b981", emoji: "🩺", summary: "Electronic patient records and AI diagnostics are now live across 80% of NHS trusts.", timestamp: "6h ago" },
  { id: "n4",  headline: "Trade skills shortage hits 10-year high",    source: "Construction+", tags: ["plumbing","carpentry","trade-business"],accentColor: "#f97316", emoji: "🔧", summary: "The UK faces a 430,000 skilled trades shortfall as apprenticeship numbers lag demand.", timestamp: "8h ago" },
  { id: "n5",  headline: "Mental health apps surge to 200M users",     source: "Wired",         tags: ["anxiety","depression","self-care"],     accentColor: "#a78bfa", emoji: "🌊", summary: "Digital mental health tools are now used by 1 in 4 adults in developed markets.", timestamp: "3h ago" },
  { id: "n6",  headline: "No-code market reaches $52B valuation",      source: "Forbes",        tags: ["no-code","startups","build-in-public"], accentColor: "#f59e0b", emoji: "🛠️", summary: "The no-code revolution is enabling non-technical founders to ship faster than ever.", timestamp: "5h ago" },
  { id: "n7",  headline: "Marathon record broken at London 2026",      source: "BBC Sport",     tags: ["running","sport-comeback","fitness"],   accentColor: "#22c55e", emoji: "🏃", summary: "A new course record was set at the London Marathon, reigniting elite athletics.", timestamp: "1h ago" },
  { id: "n8",  headline: "UK music streaming revenue tops £2.1B",      source: "Music Week",    tags: ["music","creativity","fashion"],         accentColor: "#ec4899", emoji: "🎵", summary: "Independent artists now capture 40% of total streaming revenue in the UK.", timestamp: "7h ago" },
  { id: "n9",  headline: "University applications rise for first time in 5 years", source: "UCAS", tags: ["uni-life","first-gen","scholarships"], accentColor: "#3b82f6", emoji: "🎓", summary: "UCAS data shows a 7% increase, driven by mature students and part-time learners.", timestamp: "9h ago" },
  { id: "n10", headline: "Remote work is permanent for 68% of UK companies", source: "CityAM", tags: ["remote-work","productivity","lifestyle"], accentColor: "#14b8a6", emoji: "🏠", summary: "A new survey confirms hybrid and fully remote models have become the default.", timestamp: "2h ago" },
  { id: "n11", headline: "Strength training cuts dementia risk by 33%", source: "BMJ",           tags: ["strength","nutrition","biohacking"],    accentColor: "#22c55e", emoji: "🏋️", summary: "A landmark 20-year study links resistance training to significantly lower cognitive decline.", timestamp: "12h ago" },
  { id: "n12", headline: "Cloud infrastructure spending up 41% YoY",   source: "Gartner",       tags: ["cloud","cybersecurity","data"],         accentColor: "#0ea5e9", emoji: "☁️", summary: "Enterprise cloud migration accelerates, driven by AI workload demands.", timestamp: "4h ago" },
];

// ── Group suggestions ─────────────────────────────────────────

export interface GroupSuggestion {
  id: string;
  name: string;
  emoji: string;
  description: string;
  members: number;
  accent: string;
  bg: string;
  tags: string[];
  postsToday: number;
}

export const GROUP_POOL: GroupSuggestion[] = [
  { id: "g1", name: "AI Builders UK",       emoji: "🤖", description: "Building with AI — products, tools, experiments.", members: 8200,  accent: "#8b5cf6", bg: "#110f1f", tags: ["ai","coding","startups"],         postsToday: 14 },
  { id: "g2", name: "Indie Hackers",         emoji: "💡", description: "Revenue-first builders and solo founders.",        members: 34100, accent: "#f59e0b", bg: "#1a1505", tags: ["startups","build-in-public","ecommerce"], postsToday: 31 },
  { id: "g3", name: "Stoic Circle",          emoji: "🏛️", description: "Ancient philosophy applied to modern life.",       members: 6800,  accent: "#94a3b8", bg: "#0f1014", tags: ["stoicism","philosophy","meditation"],postsToday: 6  },
  { id: "g4", name: "Build in Public",       emoji: "🔨", description: "Share what you're building, openly.",             members: 892,   accent: "#6366f1", bg: "#0d0e1a", tags: ["build-in-public","startups","side-hustle"], postsToday: 21 },
  { id: "g5", name: "Trades Collective UK",  emoji: "🔧", description: "UK tradespeople — skills, business, community.",  members: 12400, accent: "#f97316", bg: "#1a0d05", tags: ["plumbing","carpentry","trade-business"], postsToday: 8 },
  { id: "g6", name: "Runners' Road",         emoji: "🏃", description: "From couch to marathon — every step matters.",   members: 19700, accent: "#22c55e", bg: "#051408", tags: ["running","sport-comeback","fitness"],  postsToday: 17 },
  { id: "g7", name: "Mental Health Collective",emoji:"🌊", description: "A safe space to talk, share, and heal.",        members: 9400,  accent: "#a78bfa", bg: "#0e0514", tags: ["anxiety","therapy","resilience"],      postsToday: 11 },
  { id: "g8", name: "UK Founders Forum",     emoji: "🚀", description: "Early-stage UK founders sharing the journey.",   members: 4700,  accent: "#6366f1", bg: "#0d0e1a", tags: ["startups","leadership","fundraising"], postsToday: 9  },
  { id: "g9", name: "First-Gen Network",     emoji: "🏅", description: "First-generation students and graduates.",       members: 5800,  accent: "#3b82f6", bg: "#05081a", tags: ["first-gen","uni-life","identity"],     postsToday: 7  },
  { id: "g10",name: "Creativity Lab",        emoji: "🎨", description: "Designers, artists, makers — all welcome.",     members: 7200,  accent: "#ec4899", bg: "#1a0510", tags: ["design","writing","illustration"],     postsToday: 13 },
];

// ── Feed highlights ───────────────────────────────────────────

export interface FeedHighlight {
  id: string;
  author: string;
  initials: string;
  authorColor: string;
  content: string;
  tags: string[];
  likes: number;
  wall: string;
  timestamp: string;
}

export const FEED_POOL: FeedHighlight[] = [
  { id: "fh1", author: "Marcus Williams",  initials: "MW", authorColor: "#22c55e", content: "3 months since I left the tools for the last time. Here's what nobody tells you about career switching: the hardest part isn't learning — it's letting go of your old identity.", tags: ["career-change","startups","resilience"], likes: 214, wall: "Founders' Wall", timestamp: "3h ago" },
  { id: "fh2", author: "Kwame Asante",     initials: "KA", authorColor: "#10b981", content: "Night shift truth: the NHS doesn't run on funding or policy. It runs on people choosing to show up at 3am. I've been one of those people for 8 years. Today I'm proud of that.", tags: ["craftsmanship","resilience","self-discipline"], likes: 387, wall: "NHS & Healthcare", timestamp: "5h ago" },
  { id: "fh3", author: "Gary Wilson",      initials: "GW", authorColor: "#8b5cf6", content: "Shipped my first side project this morning. It took 14 weeks. It does one thing. I'm irrationally proud of it. Learning to code at 40 was the best decision I've ever made.", tags: ["coding","self-taught","habits"], likes: 162, wall: "Developers UK", timestamp: "2h ago" },
  { id: "fh4", author: "Zara Ahmed",       initials: "ZA", authorColor: "#f59e0b", content: "We had £400 left in the company account. The wire came through at 11:47pm on a Friday. The team didn't know. I had three browser tabs open: bank, Revolut, and LinkedIn.", tags: ["startups","fundraising","resilience"], likes: 492, wall: "Founders' Wall", timestamp: "1d ago" },
  { id: "fh5", author: "Emma Clarke",      initials: "EC", authorColor: "#1d4ed8", content: "Oxford PPE year 1, week 3: I cried in the Bodleian. Not from the workload — from not knowing anyone who'd done this before me. First-gen is a specific kind of lonely.", tags: ["first-gen","uni-life","anxiety"], likes: 318, wall: "Oxford University", timestamp: "4h ago" },
  { id: "fh6", author: "Tom Adeyemi",      initials: "TA", authorColor: "#22c55e", content: "Sub-4 goal: ✓. The knee that 'would never be the same' begs to differ. 3:58:12. The comeback is always sweeter than the original.", tags: ["running","sport-comeback","resilience"], likes: 561, wall: "Athletes' Wall", timestamp: "6h ago" },
  { id: "fh7", author: "Gary Benson",      initials: "GB", authorColor: "#94a3b8", content: "My best pipes are buried under a floor in Westminster. Nobody will ever see them. They'll work perfectly for 40 years. That's the whole point.", tags: ["craftsmanship","plumbing","purpose"], likes: 234, wall: "Plumbers' Wall", timestamp: "8h ago" },
  { id: "fh8", author: "Sarah Okonkwo",    initials: "SO", authorColor: "#ec4899", content: "Took 6 months off for burnout. Came back with boundaries, a 4-day week, and zero regrets. Best career decision I've ever made and I'd been dreading it for 2 years.", tags: ["burnout","self-care","therapy"], likes: 445, wall: "Mental Health Collective", timestamp: "2d ago" },
];

// ── Achievement highlights (from profile) ────────────────────

export interface AchievementHighlight {
  id: string;
  emoji: string;
  title: string;
  description: string;
  accentColor: string;
  date: string;
  isNew: boolean;
  value?: string | number;
}

// ── Personalisation profile ───────────────────────────────────

export interface BehaviourSignals {
  savedTags: string[];       // tags of things user saved
  readTags: string[];        // tags of things user read/finished
  ignoredTags: string[];     // tags user scrolled past
  interactedGroups: string[];// group ids user engaged with
  recentSearchTerms: string[];
}

export interface PersonalisedModule {
  id: ModuleId;
  score: number;             // 0–100, determines order
  label: string;
  emoji: string;
  // Personalised content payloads
  quotes?: WisdomQuote[];
  stories?: Story[];
  news?: NewsItem[];
  walls?: WallRecommendation[];
  groups?: GroupSuggestion[];
  feedHighlights?: FeedHighlight[];
  agentPicks?: AgentPick;
  dailyInsight?: DailyInsight;
  achievements?: AchievementHighlight[];
  awardWinners?: AwardWinner[];
}

export interface AgentPick {
  story?: Story;
  quote?: WisdomQuote;
  wallName?: string;
  wallEmoji?: string;
  wallAccent?: string;
  groupName?: string;
  groupEmoji?: string;
  insight: string;
}

export interface DailyInsight {
  message: string;
  subtext: string;
  accentColor: string;
  emoji: string;
  cta?: string;
}

// ── Core engine ───────────────────────────────────────────────

export function buildPersonalisedHome(
  interestIds: string[],
  behaviourSignals: BehaviourSignals,
): PersonalisedModule[] {

  const profile = OWN_PROFILE;
  const wallRecs = deriveWallRecommendations(interestIds);
  const storyRecs = deriveStoryRecommendations(interestIds);
  const agentRecs = deriveAgentRecommendations(interestIds);

  // All interest tags flattened (id + feedTags)
  const allTags = new Set<string>([
    ...interestIds,
    ...interestIds.flatMap(id => getInterestById(id)?.feedTags ?? []),
    ...behaviourSignals.savedTags,
    ...behaviourSignals.readTags,
  ]);

  // Score helper — how many of an item's tags match our interest set
  function tagScore(tags: string[]): number {
    return tags.filter(t => allTags.has(t) || behaviourSignals.savedTags.includes(t)).length;
  }

  // ── 1. Daily Insight ─────────────────────────────────────────
  const topInterest = getInterestById(interestIds[0]);
  const top2        = getInterestById(interestIds[1]);
  const behavioural = behaviourSignals.savedTags[0];
  const dailyInsight: DailyInsight = topInterest ? {
    message: `You've been focused on ${topInterest.label}${top2 ? ` and ${top2.label}` : ""} lately.`,
    subtext: topInterest.agentHint
      ? `Your agent suggests: ${topInterest.agentHint.split(",")[0].trim()}.`
      : "Keep showing up. Compound effort is invisible until it isn't.",
    accentColor: "#6366f1",
    emoji: topInterest.emoji,
    cta: behavioural ? `You've been saving content tagged "${behavioural}" — want to explore more?` : undefined,
  } : {
    message: "Welcome back. Your personalised home is ready.",
    subtext: "Add interests to unlock recommendations tailored to your identity.",
    accentColor: "#6366f1",
    emoji: "✨",
  };

  // ── 2. Wisdom Wall ────────────────────────────────────────────
  const scoredQuotes = WISDOM_POOL
    .map(q => ({ quote: q, score: tagScore(q.tags) }))
    .sort((a, b) => b.score - a.score);
  const topQuotes = scoredQuotes.slice(0, 6).map(s => s.quote);
  const wisdomScore = Math.min(100, scoredQuotes[0]?.score * 25 + 30);

  // ── 3. Stories ────────────────────────────────────────────────
  const scoredStories = STORIES
    .map(s => {
      let score = 0;
      // category match
      const catMatch = storyRecs.find(r => r.category === s.category);
      if (catMatch) score += catMatch.score * 20;
      // tag match
      score += tagScore(s.tags);
      // walls match
      if (s.wall) {
        const wallMatch = wallRecs.find(w => s.wall?.includes(w.wallName.split("'")[0]));
        if (wallMatch) score += wallMatch.score * 10;
      }
      // behaviour
      if (behaviourSignals.readTags.some(t => s.tags.includes(t))) score += 15;
      return { story: s, score };
    })
    .sort((a, b) => b.score - a.score);
  const topStories = scoredStories.slice(0, 4).map(s => s.story);
  const storiesScore = Math.min(100, (scoredStories[0]?.score ?? 0) * 5 + 20);

  // ── 4. News ───────────────────────────────────────────────────
  const scoredNews = NEWS_POOL
    .map(n => ({ news: n, score: tagScore(n.tags) }))
    .sort((a, b) => b.score - a.score);
  const topNews = scoredNews.slice(0, 6).map(s => s.news);
  const newsScore = Math.min(100, scoredNews[0]?.score * 20 + 15);

  // ── 5. Feed highlights ────────────────────────────────────────
  const scoredFeed = FEED_POOL
    .map(f => ({ fh: f, score: tagScore(f.tags) }))
    .sort((a, b) => b.score - a.score);
  const topFeed = scoredFeed.slice(0, 4).map(s => s.fh);
  const feedScore = Math.min(100, scoredFeed[0]?.score * 18 + 20);

  // ── 6. Wall suggestions ───────────────────────────────────────
  const wallScore = Math.min(100, wallRecs.length * 18 + 10);

  // ── 7. Group suggestions ──────────────────────────────────────
  const scoredGroups = GROUP_POOL
    .map(g => ({ group: g, score: tagScore(g.tags) }))
    .sort((a, b) => b.score - a.score);
  const topGroups = scoredGroups.slice(0, 4).map(s => s.group);
  const groupsScore = Math.min(100, scoredGroups[0]?.score * 22 + 10);

  // ── 8. Achievements ───────────────────────────────────────────
  const achievementHighlights: AchievementHighlight[] = profile.achievements.slice(0, 4).map(a => ({
    ...a,
    isNew: a.date === "Jun 2026",
  }));

  // ── 9. Agent picks ────────────────────────────────────────────
  const agentPickStory  = topStories[0];
  const agentPickQuote  = topQuotes[0];
  const agentPickWall   = wallRecs[0];
  const agentPickGroup  = topGroups[0];
  const agentPick: AgentPick = {
    story:     agentPickStory,
    quote:     agentPickQuote,
    wallName:  agentPickWall?.wallName,
    wallEmoji: agentPickWall?.wallEmoji,
    wallAccent:agentPickWall?.accent,
    groupName: agentPickGroup?.name,
    groupEmoji:agentPickGroup?.emoji,
    insight:   agentRecs[0]?.text ?? "Keep building your identity on P1 — every interaction makes your home smarter.",
  };

  // ── 10. Award winners ─────────────────────────────────────────
  const allWinners = [...WEEKLY_WINNERS, ...MONTHLY_WINNERS].slice(0, 3);

  // ── Module scoring (weighted) ─────────────────────────────────
  // INTERESTS 40% | WALLS 30% | AGENT 20% | TRENDING 10%
  // Behaviour adjusts scores up/down

  const behaviourBoost = (moduleId: ModuleId): number => {
    if (moduleId === "wisdom"   && behaviourSignals.savedTags.some(t => ["stoicism","mindset","philosophy"].includes(t))) return 20;
    if (moduleId === "stories"  && behaviourSignals.readTags.length > 3) return 18;
    if (moduleId === "group-suggestions" && behaviourSignals.interactedGroups.length > 0) return 15;
    if (moduleId === "news"     && behaviourSignals.ignoredTags.includes("news")) return -15;
    return 0;
  };

  const raw: Array<{ id: ModuleId; baseScore: number; label: string; emoji: string }> = [
    { id: "daily-insight",    baseScore: 95,          label: "Daily Insight",         emoji: "✨" },
    { id: "agent-picks",      baseScore: 85,          label: "Agent Picks",           emoji: "🤖" },
    { id: "wisdom",           baseScore: wisdomScore,  label: "Wisdom Wall",           emoji: "💬" },
    { id: "stories",          baseScore: storiesScore, label: "Story Recommendations", emoji: "📖" },
    { id: "feed-highlights",  baseScore: feedScore,    label: "Feed Highlights",       emoji: "📰" },
    { id: "wall-suggestions", baseScore: wallScore,    label: "Wall Suggestions",      emoji: "🧱" },
    { id: "group-suggestions",baseScore: groupsScore,  label: "Group Suggestions",     emoji: "👥" },
    { id: "news",             baseScore: newsScore,    label: "Trending News",         emoji: "📡" },
    { id: "achievements",     baseScore: 45,          label: "Achievements",          emoji: "🏅" },
    { id: "trending",         baseScore: 35,          label: "Trending on P1",        emoji: "🔥" },
    { id: "smart-picks",      baseScore: 20,          label: "Smart Picks",           emoji: "🛍️" },
  ];

  return raw
    .map(m => ({
      id: m.id,
      score: Math.max(0, Math.min(100, m.baseScore + behaviourBoost(m.id))),
      label: m.label,
      emoji: m.emoji,
      quotes:          m.id === "wisdom"           ? topQuotes    : undefined,
      stories:         m.id === "stories"          ? topStories   : undefined,
      news:            m.id === "news"             ? topNews      : undefined,
      walls:           m.id === "wall-suggestions" ? wallRecs.slice(0, 4) : undefined,
      groups:          m.id === "group-suggestions"? topGroups    : undefined,
      feedHighlights:  m.id === "feed-highlights"  ? topFeed      : undefined,
      agentPicks:      m.id === "agent-picks"      ? agentPick    : undefined,
      dailyInsight:    m.id === "daily-insight"    ? dailyInsight : undefined,
      achievements:    m.id === "achievements"     ? achievementHighlights : undefined,
      awardWinners:    m.id === "trending"         ? allWinners   : undefined,
    }))
    .sort((a, b) => b.score - a.score);
}
