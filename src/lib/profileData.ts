/* ══════════════════════════════════════════════════════════════
   P1 PROFILE DATA — types + mock data
   ══════════════════════════════════════════════════════════════ */

// ── Interest system ───────────────────────────────────────────

export type InterestCategory =
  | "Personal Growth"
  | "Career & Skills"
  | "Trades & Crafts"
  | "Creativity"
  | "Health & Fitness"
  | "Technology"
  | "Business & Finance"
  | "Lifestyle"
  | "Mental Health"
  | "Education"
  | "Custom";

export interface Interest {
  id: string;
  label: string;
  category: InterestCategory;
  emoji: string;
}

export const ALL_INTERESTS: Interest[] = [
  // Personal Growth
  { id: "stoicism",       label: "Stoicism",          category: "Personal Growth", emoji: "🏛️" },
  { id: "journaling",     label: "Journaling",         category: "Personal Growth", emoji: "📓" },
  { id: "mindset",        label: "Mindset",            category: "Personal Growth", emoji: "🧠" },
  { id: "habits",         label: "Habit Building",     category: "Personal Growth", emoji: "🔄" },
  { id: "self-discipline",label: "Self-Discipline",    category: "Personal Growth", emoji: "💪" },
  // Career & Skills
  { id: "career-change",  label: "Career Change",      category: "Career & Skills", emoji: "🔀" },
  { id: "leadership",     label: "Leadership",         category: "Career & Skills", emoji: "👑" },
  { id: "public-speaking",label: "Public Speaking",    category: "Career & Skills", emoji: "🎤" },
  { id: "negotiation",    label: "Negotiation",        category: "Career & Skills", emoji: "🤝" },
  { id: "networking",     label: "Networking",         category: "Career & Skills", emoji: "🕸️" },
  // Trades & Crafts
  { id: "plumbing",       label: "Plumbing",           category: "Trades & Crafts", emoji: "🔧" },
  { id: "carpentry",      label: "Carpentry",          category: "Trades & Crafts", emoji: "🪚" },
  { id: "electrical",     label: "Electrical",         category: "Trades & Crafts", emoji: "⚡" },
  { id: "welding",        label: "Welding",            category: "Trades & Crafts", emoji: "🔥" },
  // Creativity
  { id: "writing",        label: "Writing",            category: "Creativity",      emoji: "✍️" },
  { id: "music",          label: "Music",              category: "Creativity",      emoji: "🎵" },
  { id: "design",         label: "Design",             category: "Creativity",      emoji: "🎨" },
  { id: "photography",    label: "Photography",        category: "Creativity",      emoji: "📸" },
  { id: "filmmaking",     label: "Filmmaking",         category: "Creativity",      emoji: "🎬" },
  // Health & Fitness
  { id: "running",        label: "Running",            category: "Health & Fitness", emoji: "🏃" },
  { id: "strength",       label: "Strength Training",  category: "Health & Fitness", emoji: "🏋️" },
  { id: "nutrition",      label: "Nutrition",          category: "Health & Fitness", emoji: "🥗" },
  { id: "cycling",        label: "Cycling",            category: "Health & Fitness", emoji: "🚴" },
  { id: "yoga",           label: "Yoga",               category: "Health & Fitness", emoji: "🧘" },
  // Technology
  { id: "coding",         label: "Coding",             category: "Technology",      emoji: "💻" },
  { id: "ai",             label: "AI & Machine Learning", category: "Technology",   emoji: "🤖" },
  { id: "product",        label: "Product Management", category: "Technology",      emoji: "📋" },
  { id: "cybersecurity",  label: "Cybersecurity",      category: "Technology",      emoji: "🔐" },
  { id: "cloud",          label: "Cloud Computing",    category: "Technology",      emoji: "☁️" },
  // Business & Finance
  { id: "startups",       label: "Startups",           category: "Business & Finance", emoji: "🚀" },
  { id: "investing",      label: "Investing",          category: "Business & Finance", emoji: "📈" },
  { id: "marketing",      label: "Marketing",          category: "Business & Finance", emoji: "📣" },
  { id: "finance",        label: "Personal Finance",   category: "Business & Finance", emoji: "💰" },
  { id: "sales",          label: "Sales",              category: "Business & Finance", emoji: "🎯" },
  // Lifestyle
  { id: "travel",         label: "Travel",             category: "Lifestyle",       emoji: "✈️" },
  { id: "cooking",        label: "Cooking",            category: "Lifestyle",       emoji: "👨‍🍳" },
  { id: "fashion",        label: "Fashion",            category: "Lifestyle",       emoji: "👔" },
  { id: "reading",        label: "Reading",            category: "Lifestyle",       emoji: "📚" },
  // Mental Health
  { id: "anxiety",        label: "Managing Anxiety",   category: "Mental Health",   emoji: "🌊" },
  { id: "therapy",        label: "Therapy & Healing",  category: "Mental Health",   emoji: "💬" },
  { id: "resilience",     label: "Resilience",         category: "Mental Health",   emoji: "🌱" },
  // Education
  { id: "uni-life",       label: "University Life",    category: "Education",       emoji: "🎓" },
  { id: "certifications", label: "Certifications",     category: "Education",       emoji: "📜" },
  { id: "online-learning",label: "Online Learning",    category: "Education",       emoji: "🖥️" },
];

// ── Achievement types ─────────────────────────────────────────

export type AchievementType =
  | "streak" | "goal" | "certification" | "fitness"
  | "academic" | "professional" | "story" | "wall";

export interface Achievement {
  id: string;
  type: AchievementType;
  emoji: string;
  title: string;
  description: string;
  date: string;
  accentColor: string;
  value?: string;
}

// ── Wall membership ───────────────────────────────────────────

export interface ProfileWall {
  id: string;
  name: string;
  emoji: string;
  type: "profession" | "university" | "group";
  members: number;
  accent: string;
  bg: string;
  pinned: boolean;
  followed: boolean;
}

// ── Group ─────────────────────────────────────────────────────

export interface ProfileGroup {
  id: string;
  name: string;
  emoji: string;
  members: number;
  accent: string;
  isCreator: boolean;
  postsToday: number;
}

// ── Post ──────────────────────────────────────────────────────

export interface ProfilePost {
  id: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  type: "post" | "wisdom" | "achievement" | "story-preview";
  image?: string;
  accentColor?: string;
  quote?: string;
  storyTitle?: string;
}

// ── Full profile ──────────────────────────────────────────────

export interface UserProfile {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  profession: string;
  professionEmoji: string;
  university?: string;
  location: string;
  bio: string;
  followers: number;
  following: number;
  storiesPublished: number;
  chaptersWritten: number;
  savesReceived: number;
  awardsWon: number;
  postsPublished: number;
  wallsFollowed: number;
  groupsJoined: number;
  interests: string[];        // Interest ids
  achievements: Achievement[];
  walls: ProfileWall[];
  groups: ProfileGroup[];
  posts: ProfilePost[];
  isOwnProfile: boolean;
}

// ── Mock: Francis (own profile) ───────────────────────────────

export const OWN_PROFILE: UserProfile = {
  id: "francis-cobbinah",
  name: "Francis Cobbinah",
  initials: "FC",
  avatarColor: "#6366f1",
  profession: "Founder & Builder",
  professionEmoji: "🚀",
  location: "London, UK",
  bio: "Building Percentile.One — a platform for personal transformation. Founder. Builder. Always in the arena.",
  followers: 1247,
  following: 384,
  storiesPublished: 1,
  chaptersWritten: 4,
  savesReceived: 892,
  awardsWon: 2,
  postsPublished: 34,
  wallsFollowed: 6,
  groupsJoined: 3,
  interests: [
    "startups", "coding", "ai", "mindset", "writing",
    "stoicism", "habits", "leadership", "product", "resilience",
  ],
  achievements: [
    {
      id: "a1", type: "streak", emoji: "🔥",
      title: "14-Day Streak", description: "14 consecutive days on P1",
      date: "Jun 2026", accentColor: "#f97316", value: "14",
    },
    {
      id: "a2", type: "goal", emoji: "🎯",
      title: "Goal Complete", description: "Launched P1 MVP",
      date: "May 2026", accentColor: "#22c55e", value: "✓",
    },
    {
      id: "a3", type: "story", emoji: "📖",
      title: "First Story", description: "Published your first story",
      date: "Apr 2026", accentColor: "#8b5cf6",
    },
    {
      id: "a4", type: "professional", emoji: "🏅",
      title: "100 Followers", description: "Reached 100 followers on P1",
      date: "Mar 2026", accentColor: "#f59e0b", value: "100",
    },
    {
      id: "a5", type: "professional", emoji: "💼",
      title: "Founder Badge", description: "Verified founder on P1",
      date: "Feb 2026", accentColor: "#6366f1",
    },
    {
      id: "a6", type: "wall", emoji: "🧱",
      title: "Wall Curator", description: "Pinned 5+ walls",
      date: "Jun 2026", accentColor: "#0ea5e9",
    },
    {
      id: "a7", type: "streak", emoji: "⚡",
      title: "Power Week", description: "7 focus sessions in 7 days",
      date: "Jun 2026", accentColor: "#eab308", value: "7",
    },
    {
      id: "a8", type: "certification", emoji: "📜",
      title: "P1 Cycle Pro", description: "Completed 3 full P1 cycles",
      date: "Jun 2026", accentColor: "#ec4899", value: "3",
    },
  ],
  walls: [
    { id: "founders",       name: "Founders' Wall",       emoji: "🚀", type: "profession", members: 12400, accent: "#6366f1", bg: "#13141f", pinned: true,  followed: true  },
    { id: "ai-builders-uk", name: "AI Builders UK",       emoji: "🤖", type: "group",      members: 8200,  accent: "#8b5cf6", bg: "#110f1f", pinned: true,  followed: true  },
    { id: "indie-hackers",  name: "Indie Hackers",        emoji: "💡", type: "group",      members: 34100, accent: "#f59e0b", bg: "#1a1505", pinned: false, followed: true  },
    { id: "product-mgmt",   name: "Product Management",   emoji: "📋", type: "profession", members: 19700, accent: "#0ea5e9", bg: "#041018", pinned: false, followed: true  },
    { id: "tech-london",    name: "Tech London",          emoji: "🏙️", type: "group",      members: 41000, accent: "#22c55e", bg: "#051408", pinned: false, followed: true  },
    { id: "stoic-circle",   name: "Stoic Circle",         emoji: "🏛️", type: "group",      members: 6800,  accent: "#94a3b8", bg: "#0f1014", pinned: false, followed: false },
  ],
  groups: [
    { id: "p1-founders", name: "P1 Founders",      emoji: "🚀", members: 47,  accent: "#6366f1", isCreator: true,  postsToday: 3  },
    { id: "ai-lab",      name: "AI Lab UK",        emoji: "🤖", members: 128, accent: "#8b5cf6", isCreator: false, postsToday: 8  },
    { id: "build-in-pub",name: "Build in Public",  emoji: "🔨", members: 892, accent: "#f59e0b", isCreator: false, postsToday: 21 },
  ],
  posts: [
    {
      id: "p1",
      content: "3 months in. The product is alive, the users are arriving, and I still wake up every morning not quite believing it's real. Here's what I've learned about building in public.",
      timestamp: "2h ago", likes: 84, comments: 12, shares: 7, type: "post",
    },
    {
      id: "p2",
      type: "wisdom",
      content: "On resilience",
      quote: "The impediment to action advances action. What stands in the way becomes the way.",
      timestamp: "1d ago", likes: 142, comments: 8, shares: 23,
      accentColor: "#6366f1",
    },
    {
      id: "p3",
      content: "Just shipped the Feed module. 7 card types, a live composer, real-time filtering. If you're building on P1, give it a try.",
      timestamp: "3d ago", likes: 61, comments: 5, shares: 4, type: "post",
    },
    {
      id: "p4",
      type: "story-preview",
      content: "New chapter published:",
      storyTitle: "The Founder's Diary — Ch. 4: The Week Everything Broke",
      timestamp: "5d ago", likes: 97, comments: 14, shares: 9,
      accentColor: "#8b5cf6",
    },
    {
      id: "p5",
      content: "Thoughts after 6 months of daily journaling: it doesn't make the hard days easy. It just makes them clearer.",
      timestamp: "1w ago", likes: 203, comments: 31, shares: 44, type: "post",
    },
  ],
  isOwnProfile: true,
};
