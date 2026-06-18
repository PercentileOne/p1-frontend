/* ══════════════════════════════════════════════════════════════
   MESSAGING ENGINE  v1.0
   Conversations · Threads · AI Ingestion · Agent Participation
   ══════════════════════════════════════════════════════════════ */

export type ConversationType = "direct" | "group" | "accountability" | "recruiter" | "agent" | "system";
export type MessageType      = "text" | "image" | "audio" | "proof" | "focus_summary" | "timeblock" | "goal_update" | "cycle_update" | "agent" | "system" | "job";
export type IngestCategory   = "fitness" | "study" | "work" | "health" | "finance" | "notes" | "code" | "planning";

/* ─── Participants ──────────────────────────────────────────── */

export interface Participant {
  id:       string;
  name:     string;
  initials: string;
  color:    string;
  online:   boolean;
  lastSeen: Date;
  role?:    "admin" | "member" | "recruiter" | "agent";
}

/* ─── Attachments ───────────────────────────────────────────── */

export interface Attachment {
  type:      "proof" | "focus" | "goal" | "cycle" | "event" | "image" | "job" | "timeblock";
  title:     string;
  subtitle?: string;
  meta?:     string;
  emoji:     string;
  color:     string;
}

/* ─── Messages ──────────────────────────────────────────────── */

export interface Reaction {
  emoji:       string;
  count:       number;
  userReacted: boolean;
}

export interface Message {
  id:             string;
  conversationId: string;
  senderId:       string;
  senderName:     string;
  type:           MessageType;
  text?:          string;
  attachment?:    Attachment;
  imageUrl?:      string;
  timestamp:      Date;
  read:           boolean;
  reactions:      Reaction[];
  replyToId?:     string;
  replyPreview?:  string;
  agentGenerated: boolean;
  edited:         boolean;
}

/* ─── Conversations ─────────────────────────────────────────── */

export interface Conversation {
  id:            string;
  type:          ConversationType;
  name:          string;
  description?:  string;
  participants:  Participant[];
  lastMessage?:  Message;
  unreadCount:   number;
  pinned:        boolean;
  muted:         boolean;
  archived:      boolean;
  createdAt:     Date;
  memberCount?:  number;
  // accountability
  sharedGoalTitle?: string;
  currentStreak?:   number;
  // recruiter
  jobTitle?:        string;
  company?:         string;
}

/* ─── Settings ──────────────────────────────────────────────── */

export interface MessagingSettings {
  notifications:     boolean;
  readReceipts:      boolean;
  typingIndicators:  boolean;
  agentParticipation:boolean;
  autoIngest:        boolean;
  autoProof:         boolean;
  autoGoalLinking:   boolean;
  autoCycleLinking:  boolean;
  voiceTranscription:boolean;
}

export const DEFAULT_SETTINGS: MessagingSettings = {
  notifications:      true,
  readReceipts:       true,
  typingIndicators:   true,
  agentParticipation: true,
  autoIngest:         true,
  autoProof:          true,
  autoGoalLinking:    true,
  autoCycleLinking:   true,
  voiceTranscription: true,
};

/* ─── Ingest Result ─────────────────────────────────────────── */

export interface IngestResult {
  category:      IngestCategory;
  categoryLabel: string;
  emoji:         string;
  extractedData: { label: string; value: string }[];
  proofTitle:    string;
  suggestedGoal?: string;
  suggestedCycleWeek?: number;
  agentInsight:  string;
  confidence:    number;
  streakBonus?:  string;
}

/* ─── Demo helpers ──────────────────────────────────────────── */

const now = new Date();
const ago = (mins: number) => new Date(now.getTime() - mins * 60000);
const dAgo = (days: number, hrs = 0) => new Date(now.getTime() - days * 86400000 - hrs * 3600000);

export const CURRENT_USER_ID = "francis";

/* ─── Participants ──────────────────────────────────────────── */

const PARTICIPANTS: Record<string, Participant> = {
  francis:  { id: "francis",   name: "Francis Cobbinah", initials: "FC", color: "#6366f1", online: true,  lastSeen: now,         role: "admin"    },
  p1agent:  { id: "p1agent",   name: "P1 Agent",         initials: "AI", color: "#10b981", online: true,  lastSeen: now,         role: "agent"    },
  marcus:   { id: "marcus",    name: "Marcus Chen",      initials: "MC", color: "#f59e0b", online: true,  lastSeen: ago(5),      role: "member"   },
  sarah:    { id: "sarah",     name: "Sarah Osei",       initials: "SO", color: "#ec4899", online: false, lastSeen: ago(45),     role: "member"   },
  kwame:    { id: "kwame",     name: "Kwame Mensah",     initials: "KM", color: "#3b82f6", online: false, lastSeen: dAgo(0, 3),  role: "member"   },
  james:    { id: "james",     name: "James Wilson",     initials: "JW", color: "#64748b", online: true,  lastSeen: ago(10),     role: "recruiter"},
  lisa:     { id: "lisa",      name: "Lisa Park",        initials: "LP", color: "#8b5cf6", online: false, lastSeen: dAgo(1),     role: "recruiter"},
  amara:    { id: "amara",     name: "Amara Diallo",     initials: "AD", color: "#14b8a6", online: true,  lastSeen: ago(2),      role: "member"   },
  tunde:    { id: "tunde",     name: "Tunde Adeyemi",    initials: "TA", color: "#f97316", online: false, lastSeen: ago(90),     role: "member"   },
  yemi:     { id: "yemi",      name: "Yemi Adesanya",    initials: "YA", color: "#a78bfa", online: true,  lastSeen: ago(8),      role: "member"   },
  chen:     { id: "chen",      name: "David Chen",       initials: "DC", color: "#22d3ee", online: false, lastSeen: dAgo(2),     role: "member"   },
  priya:    { id: "priya",     name: "Priya Nair",       initials: "PN", color: "#fb7185", online: true,  lastSeen: ago(15),     role: "member"   },
};

/* ─── Conversations ─────────────────────────────────────────── */

export const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: "p1agent", type: "agent", name: "P1 Agent", pinned: true, muted: false, archived: false, unreadCount: 2,
    participants: [PARTICIPANTS.francis, PARTICIPANTS.p1agent],
    createdAt: dAgo(30),
    lastMessage: {
      id: "la1", conversationId: "p1agent", senderId: "p1agent", senderName: "P1 Agent",
      type: "agent", text: "You've focused 3.2 hours today — your best this week. Consider a recovery block at 6pm.",
      timestamp: ago(8), read: false, reactions: [], agentGenerated: true, edited: false,
    },
  },
  {
    id: "accountability-squad", type: "accountability", name: "Accountability Squad", pinned: true, muted: false, archived: false, unreadCount: 3,
    participants: [PARTICIPANTS.francis, PARTICIPANTS.marcus, PARTICIPANTS.sarah, PARTICIPANTS.amara],
    description: "Daily proof, streaks, and wins. No excuses.",
    createdAt: dAgo(14), memberCount: 4,
    sharedGoalTitle: "Ship P1 MVP", currentStreak: 7,
    lastMessage: {
      id: "las1", conversationId: "accountability-squad", senderId: "marcus", senderName: "Marcus Chen",
      type: "proof", text: "Morning run done 🔥",
      attachment: { type: "proof", title: "5.2km Run", subtitle: "28:45 · Avg HR 162bpm", meta: "Fitness · Today 6:43am", emoji: "🏃", color: "#10b981" },
      timestamp: ago(22), read: false, reactions: [{ emoji: "🔥", count: 2, userReacted: true }], agentGenerated: false, edited: false,
    },
  },
  {
    id: "marcus-dm", type: "direct", name: "Marcus Chen", pinned: false, muted: false, archived: false, unreadCount: 0,
    participants: [PARTICIPANTS.francis, PARTICIPANTS.marcus],
    createdAt: dAgo(20),
    lastMessage: {
      id: "lm1", conversationId: "marcus-dm", senderId: "francis", senderName: "Francis Cobbinah",
      type: "text", text: "Just shipped the focus engine 🚀 check it out",
      timestamp: ago(180), read: true, reactions: [{ emoji: "💪", count: 1, userReacted: false }], agentGenerated: false, edited: false,
    },
  },
  {
    id: "techcorp-recruiter", type: "recruiter", name: "James Wilson · TechCorp", pinned: false, muted: false, archived: false, unreadCount: 1,
    participants: [PARTICIPANTS.francis, PARTICIPANTS.james],
    createdAt: dAgo(5), jobTitle: "Senior Full-Stack Engineer", company: "TechCorp",
    lastMessage: {
      id: "lr1", conversationId: "techcorp-recruiter", senderId: "james", senderName: "James Wilson",
      type: "text", text: "Hi Francis, your profile is impressive. Are you open to a Senior Full-Stack role at TechCorp?",
      timestamp: ago(95), read: false, reactions: [], agentGenerated: false, edited: false,
    },
  },
  {
    id: "morning-warriors", type: "accountability", name: "Morning Warriors", pinned: false, muted: false, archived: false, unreadCount: 0,
    participants: [PARTICIPANTS.francis, PARTICIPANTS.yemi, PARTICIPANTS.tunde],
    description: "5am club. Every day. No days off.",
    createdAt: dAgo(21), memberCount: 3, currentStreak: 12,
    lastMessage: {
      id: "lmw1", conversationId: "morning-warriors", senderId: "yemi", senderName: "Yemi Adesanya",
      type: "text", text: "Day 12 streak 🔥 Keep going warriors!",
      timestamp: dAgo(0, 2), read: true, reactions: [{ emoji: "🔥", count: 3, userReacted: true }], agentGenerated: false, edited: false,
    },
  },
  {
    id: "sarah-dm", type: "direct", name: "Sarah Osei", pinned: false, muted: false, archived: false, unreadCount: 0,
    participants: [PARTICIPANTS.francis, PARTICIPANTS.sarah],
    createdAt: dAgo(10),
    lastMessage: {
      id: "ls1", conversationId: "sarah-dm", senderId: "sarah", senderName: "Sarah Osei",
      type: "text", text: "The new design looks clean 🤌 Love the dark mode palette",
      timestamp: dAgo(1, 3), read: true, reactions: [], agentGenerated: false, edited: false,
    },
  },
  {
    id: "tech-founders", type: "group", name: "Tech Founders Circle", pinned: false, muted: false, archived: false, unreadCount: 0,
    participants: [PARTICIPANTS.francis, PARTICIPANTS.marcus, PARTICIPANTS.kwame, PARTICIPANTS.priya, PARTICIPANTS.chen],
    description: "African tech founders building for global scale.",
    createdAt: dAgo(30), memberCount: 12,
    lastMessage: {
      id: "ltf1", conversationId: "tech-founders", senderId: "kwame", senderName: "Kwame Mensah",
      type: "text", text: "Anyone going to the Lagos tech summit next month?",
      timestamp: dAgo(2), read: true, reactions: [], agentGenerated: false, edited: false,
    },
  },
  {
    id: "startup-recruiter", type: "recruiter", name: "Lisa Park · StartupHR", pinned: false, muted: false, archived: false, unreadCount: 0,
    participants: [PARTICIPANTS.francis, PARTICIPANTS.lisa],
    createdAt: dAgo(8), jobTitle: "CTO / Co-Founder", company: "StartupHR",
    lastMessage: {
      id: "lsr1", conversationId: "startup-recruiter", senderId: "francis", senderName: "Francis Cobbinah",
      type: "text", text: "Thanks for reaching out. I'll review the details this week.",
      timestamp: dAgo(3), read: true, reactions: [], agentGenerated: false, edited: false,
    },
  },
  {
    id: "kwame-dm", type: "direct", name: "Kwame Mensah", pinned: false, muted: false, archived: false, unreadCount: 0,
    participants: [PARTICIPANTS.francis, PARTICIPANTS.kwame],
    createdAt: dAgo(15),
    lastMessage: {
      id: "lk1", conversationId: "kwame-dm", senderId: "kwame", senderName: "Kwame Mensah",
      type: "text", text: "Bro the traction you're getting is real. Keep building.",
      timestamp: dAgo(4), read: true, reactions: [{ emoji: "👍", count: 1, userReacted: true }], agentGenerated: false, edited: false,
    },
  },
  {
    id: "system", type: "system", name: "System", pinned: false, muted: false, archived: false, unreadCount: 3,
    participants: [PARTICIPANTS.francis],
    createdAt: dAgo(30),
    lastMessage: {
      id: "lsys1", conversationId: "system", senderId: "system", senderName: "System",
      type: "system", text: "Your Cycle 6 Week 3 review is due tomorrow.",
      timestamp: ago(240), read: false, reactions: [], agentGenerated: false, edited: false,
    },
  },
];

/* ─── Messages per Conversation ─────────────────────────────── */

export const DEMO_MESSAGES: Record<string, Message[]> = {

  "p1agent": [
    { id: "pa1", conversationId: "p1agent", senderId: "p1agent", senderName: "P1 Agent", type: "agent",
      text: "Good morning Francis 👋 Today is Day 7 of your current cycle. You have 3 goals active and 2 focus sessions planned. Your streak is at 7 days — protect it today.",
      timestamp: dAgo(0, 8), read: true, reactions: [], agentGenerated: true, edited: false },
    { id: "pa2", conversationId: "p1agent", senderId: "francis", senderName: "Francis Cobbinah", type: "text",
      text: "Morning! What's my priority for today?",
      timestamp: dAgo(0, 8), read: true, reactions: [], agentGenerated: false, edited: false },
    { id: "pa3", conversationId: "p1agent", senderId: "p1agent", senderName: "P1 Agent", type: "agent",
      text: "Based on your cycle goals and time blocks: (1) Finish the Focus Module — 90min strategic block at 9am. (2) Review investor materials — 45min at 2pm. (3) Evening: recovery walk. You have a planning block suggested at 8:30am. Start there.",
      timestamp: dAgo(0, 8), read: true, reactions: [{ emoji: "✅", count: 1, userReacted: true }], agentGenerated: true, edited: false },
    { id: "pa4", conversationId: "p1agent", senderId: "p1agent", senderName: "P1 Agent", type: "focus_summary",
      text: "Session complete:",
      attachment: { type: "focus", title: "90-Minute Strategic Session", subtitle: "Focus Module · Completed ✓", meta: "10:32am · 100% complete", emoji: "⚡", color: "#6366f1" },
      timestamp: ago(180), read: true, reactions: [], agentGenerated: true, edited: false },
    { id: "pa5", conversationId: "p1agent", senderId: "francis", senderName: "Francis Cobbinah", type: "text",
      text: "Just finished the focus and history pages. This is coming together well.",
      timestamp: ago(170), read: true, reactions: [], agentGenerated: false, edited: false },
    { id: "pa6", conversationId: "p1agent", senderId: "p1agent", senderName: "P1 Agent", type: "agent",
      text: "Outstanding output. That's 4 consecutive days of 3+ hour deep work sessions — a new personal record. Your Focus Score is now 94/100. Want me to log this as proof and update your cycle progress?",
      timestamp: ago(168), read: true, reactions: [{ emoji: "🔥", count: 1, userReacted: true }], agentGenerated: true, edited: false },
    { id: "pa7", conversationId: "p1agent", senderId: "p1agent", senderName: "P1 Agent", type: "timeblock",
      text: "Suggested recovery block:",
      attachment: { type: "timeblock", title: "Recovery Walk · 30min", subtitle: "Today 6:00pm – 6:30pm", meta: "Auto-scheduled based on your output today", emoji: "🌿", color: "#10b981" },
      timestamp: ago(10), read: false, reactions: [], agentGenerated: true, edited: false },
    { id: "pa8", conversationId: "p1agent", senderId: "p1agent", senderName: "P1 Agent", type: "agent",
      text: "You've focused 3.2 hours today — your best this week. Consider a recovery block at 6pm.",
      timestamp: ago(8), read: false, reactions: [], agentGenerated: true, edited: false },
  ],

  "accountability-squad": [
    { id: "as1", conversationId: "accountability-squad", senderId: "p1agent", senderName: "P1 Agent", type: "agent",
      text: "🌅 Good morning Accountability Squad! Day 7 of your streak. Today's goal: each person posts 1 proof entry before noon. Let's go!",
      timestamp: dAgo(0, 7), read: true, reactions: [{ emoji: "🔥", count: 3, userReacted: true }], agentGenerated: true, edited: false },
    { id: "as2", conversationId: "accountability-squad", senderId: "amara", senderName: "Amara Diallo", type: "proof",
      text: "5am workout done ✅",
      attachment: { type: "proof", title: "Strength Training · 45min", subtitle: "Chest & Shoulders · 8 exercises", meta: "Fitness · Today 5:08am", emoji: "💪", color: "#f59e0b" },
      timestamp: dAgo(0, 6), read: true, reactions: [{ emoji: "🔥", count: 2, userReacted: true }, { emoji: "💪", count: 1, userReacted: false }], agentGenerated: false, edited: false },
    { id: "as3", conversationId: "accountability-squad", senderId: "sarah", senderName: "Sarah Osei", type: "text",
      text: "Amara you're an animal 💪 I'll post mine after my 7am run",
      timestamp: dAgo(0, 5), read: true, reactions: [], agentGenerated: false, edited: false },
    { id: "as4", conversationId: "accountability-squad", senderId: "francis", senderName: "Francis Cobbinah", type: "focus_summary",
      text: "Morning deep work done 🚀",
      attachment: { type: "focus", title: "90-Minute Strategic Session", subtitle: "P1 Platform · Focus Module", meta: "Work · Today 9am – 10:30am", emoji: "⚡", color: "#6366f1" },
      timestamp: dAgo(0, 3), read: true, reactions: [{ emoji: "🔥", count: 3, userReacted: false }, { emoji: "💪", count: 1, userReacted: false }], agentGenerated: false, edited: false },
    { id: "as5", conversationId: "accountability-squad", senderId: "marcus", senderName: "Marcus Chen", type: "proof",
      text: "Morning run done 🔥",
      attachment: { type: "proof", title: "5.2km Run", subtitle: "28:45 · Avg HR 162bpm", meta: "Fitness · Today 6:43am", emoji: "🏃", color: "#10b981" },
      timestamp: ago(22), read: false, reactions: [{ emoji: "🔥", count: 2, userReacted: true }], agentGenerated: false, edited: false },
    { id: "as6", conversationId: "accountability-squad", senderId: "p1agent", senderName: "P1 Agent", type: "agent",
      text: "3 of 4 members have posted proof today. Streak Day 7 is looking strong 🔥 Sarah — you've got until noon! The group is counting on you.",
      timestamp: ago(18), read: false, reactions: [{ emoji: "😮", count: 1, userReacted: false }], agentGenerated: true, edited: false },
    { id: "as7", conversationId: "accountability-squad", senderId: "sarah", senderName: "Sarah Osei", type: "text",
      text: "On my way! Just got back from a 7km run 👟",
      timestamp: ago(15), read: false, reactions: [], agentGenerated: false, edited: false },
  ],

  "marcus-dm": [
    { id: "md1", conversationId: "marcus-dm", senderId: "marcus", senderName: "Marcus Chen", type: "text",
      text: "Bro how's the platform coming along? You've been quiet on socials",
      timestamp: dAgo(2), read: true, reactions: [], agentGenerated: false, edited: false },
    { id: "md2", conversationId: "marcus-dm", senderId: "francis", senderName: "Francis Cobbinah", type: "text",
      text: "Deep build mode. No distractions. I'm about to ship something special.",
      timestamp: dAgo(2), read: true, reactions: [{ emoji: "🔥", count: 1, userReacted: false }], agentGenerated: false, edited: false },
    { id: "md3", conversationId: "marcus-dm", senderId: "marcus", senderName: "Marcus Chen", type: "text",
      text: "That's the energy 🙌 Can I see a demo when you're ready?",
      timestamp: dAgo(1), read: true, reactions: [], agentGenerated: false, edited: false },
    { id: "md4", conversationId: "marcus-dm", senderId: "francis", senderName: "Francis Cobbinah", type: "focus_summary",
      text: "Progress update:",
      attachment: { type: "focus", title: "14 Focus Sessions · Past 12 Days", subtitle: "Focus, Planning, Contacts, Messaging modules", meta: "Work · 1,380 total minutes", emoji: "⚡", color: "#6366f1" },
      timestamp: ago(200), read: true, reactions: [{ emoji: "😮", count: 1, userReacted: false }, { emoji: "🔥", count: 1, userReacted: false }], agentGenerated: false, edited: false },
    { id: "md5", conversationId: "marcus-dm", senderId: "marcus", senderName: "Marcus Chen", type: "text",
      text: "That's insane output. 1,380 minutes?! You're built different man 🚀",
      timestamp: ago(195), read: true, reactions: [], agentGenerated: false, edited: false },
    { id: "md6", conversationId: "marcus-dm", senderId: "francis", senderName: "Francis Cobbinah", type: "text",
      text: "Just shipped the focus engine 🚀 check it out",
      timestamp: ago(180), read: true, reactions: [{ emoji: "💪", count: 1, userReacted: false }], agentGenerated: false, edited: false },
  ],

  "techcorp-recruiter": [
    { id: "tr1", conversationId: "techcorp-recruiter", senderId: "james", senderName: "James Wilson", type: "job",
      text: "Hi Francis, I came across your profile and I'm very impressed with your work at Percentile.One. We have an exciting opportunity at TechCorp:",
      attachment: { type: "job", title: "Senior Full-Stack Engineer", subtitle: "TechCorp · London / Remote", meta: "£120k–£160k · Series B · 500 employees", emoji: "🏢", color: "#64748b" },
      timestamp: dAgo(5), read: true, reactions: [], agentGenerated: false, edited: false },
    { id: "tr2", conversationId: "techcorp-recruiter", senderId: "p1agent", senderName: "P1 Agent", type: "agent",
      text: "💡 Agent insight: This role aligns with your Skills goal at 78%. However, your current cycle priority is P1 launch. Consider bookmarking for post-launch review. Want me to draft a polite holding response?",
      timestamp: dAgo(5), read: true, reactions: [], agentGenerated: true, edited: false },
    { id: "tr3", conversationId: "techcorp-recruiter", senderId: "francis", senderName: "Francis Cobbinah", type: "text",
      text: "Hi James, thanks for reaching out. I'm currently heads-down on my startup but always happy to learn more.",
      timestamp: dAgo(4), read: true, reactions: [], agentGenerated: false, edited: false },
    { id: "tr4", conversationId: "techcorp-recruiter", senderId: "james", senderName: "James Wilson", type: "text",
      text: "Totally understand! The role can wait until you're ready. In the meantime, here's some context on TechCorp's mission — we're building AI infrastructure for the next billion users.",
      timestamp: dAgo(4), read: true, reactions: [], agentGenerated: false, edited: false },
    { id: "tr5", conversationId: "techcorp-recruiter", senderId: "james", senderName: "James Wilson", type: "text",
      text: "Hi Francis, your profile is impressive. Are you open to a Senior Full-Stack role at TechCorp?",
      timestamp: ago(95), read: false, reactions: [], agentGenerated: false, edited: false },
  ],

  "morning-warriors": [
    { id: "mw1", conversationId: "morning-warriors", senderId: "tunde", senderName: "Tunde Adeyemi", type: "text",
      text: "Day 12 starts now 💪 Who's up?",
      timestamp: dAgo(0, 5), read: true, reactions: [{ emoji: "🔥", count: 2, userReacted: true }], agentGenerated: false, edited: false },
    { id: "mw2", conversationId: "morning-warriors", senderId: "francis", senderName: "Francis Cobbinah", type: "proof",
      text: "5am ✅",
      attachment: { type: "proof", title: "Morning Meditation · 20min", subtitle: "Breathwork + Journaling", meta: "Health · Today 5:02am", emoji: "🧘", color: "#8b5cf6" },
      timestamp: dAgo(0, 5), read: true, reactions: [], agentGenerated: false, edited: false },
    { id: "mw3", conversationId: "morning-warriors", senderId: "yemi", senderName: "Yemi Adesanya", type: "text",
      text: "Day 12 streak 🔥 Keep going warriors!",
      timestamp: dAgo(0, 2), read: true, reactions: [{ emoji: "🔥", count: 3, userReacted: true }], agentGenerated: false, edited: false },
  ],

  "system": [
    { id: "sys1", conversationId: "system", senderId: "system", senderName: "System", type: "system",
      text: "🔔 Cycle 6 Week 3 mid-review is due tomorrow. Tap to start your review.",
      timestamp: ago(240), read: false, reactions: [], agentGenerated: false, edited: false },
    { id: "sys2", conversationId: "system", senderId: "system", senderName: "System", type: "system",
      text: "🎯 Goal update: 'Launch P1 MVP' is 62% complete — on track for your end-of-cycle target.",
      timestamp: dAgo(1), read: false, reactions: [], agentGenerated: false, edited: false },
    { id: "sys3", conversationId: "system", senderId: "system", senderName: "System", type: "system",
      text: "🏆 New milestone: 7-day focus streak achieved! You're in the top 5% of P1 users.",
      timestamp: dAgo(2), read: false, reactions: [], agentGenerated: false, edited: false },
    { id: "sys4", conversationId: "system", senderId: "system", senderName: "System", type: "system",
      text: "📋 Proof entry verified: 'Gym Session 45min' was confirmed. Proof score: +12 pts.",
      timestamp: dAgo(3), read: true, reactions: [], agentGenerated: false, edited: false },
  ],
};

/* ─── Ingest Scenarios ───────────────────────────────────────── */

export const INGEST_SCENARIOS: IngestResult[] = [
  {
    category: "fitness", categoryLabel: "Fitness", emoji: "🏋️",
    extractedData: [
      { label: "Activity",   value: "Treadmill Run" },
      { label: "Distance",   value: "5.2 km" },
      { label: "Duration",   value: "28m 45s" },
      { label: "Calories",   value: "412 kcal" },
      { label: "Avg HR",     value: "162 bpm" },
      { label: "Pace",       value: "5:32 / km" },
    ],
    proofTitle: "5.2km Treadmill Run · 28:45",
    suggestedGoal: "Fitness & Health",
    suggestedCycleWeek: 3,
    agentInsight: "This is your fastest 5km this cycle. Your cardiovascular consistency is in the top 12% of P1 users. Streak: 6 days running.",
    confidence: 97,
    streakBonus: "6-day fitness streak 🔥",
  },
  {
    category: "study", categoryLabel: "Study", emoji: "📚",
    extractedData: [
      { label: "Subject",     value: "System Design" },
      { label: "Pages read",  value: "42" },
      { label: "Duration",    value: "90 minutes" },
      { label: "Key topics",  value: "Distributed Systems, CAP Theorem" },
      { label: "Notes taken", value: "3 pages" },
    ],
    proofTitle: "System Design Study · 90min · 42 pages",
    suggestedGoal: "Technical Excellence",
    suggestedCycleWeek: 3,
    agentInsight: "You've studied 3 times this week — that's 4.5 hours of focused learning. This directly contributes to your Technical Excellence goal at 71%.",
    confidence: 92,
  },
  {
    category: "health", categoryLabel: "Health", emoji: "❤️",
    extractedData: [
      { label: "Device",     value: "Apple Watch" },
      { label: "Resting HR", value: "52 bpm" },
      { label: "HRV",        value: "68ms" },
      { label: "Sleep",      value: "7h 42m" },
      { label: "Recovery",   value: "87%" },
      { label: "Steps",      value: "9,240" },
    ],
    proofTitle: "Apple Watch Health Summary · 87% Recovery",
    suggestedGoal: "Fitness & Health",
    suggestedCycleWeek: 3,
    agentInsight: "HRV of 68ms is excellent — your body is well-recovered and primed for a high-output day. Your resting heart rate has dropped 4 bpm this cycle. Keep going.",
    confidence: 98,
  },
];

/* ─── MessagingEngine ────────────────────────────────────────── */

export class MessagingEngine {

  static formatTimestamp(d: Date): string {
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60)    return "now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    const days = Math.floor(diff / 86400);
    if (days < 7)     return `${days}d`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  static formatTime(d: Date): string {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  static totalUnread(convs: Conversation[]): number {
    return convs.reduce((t, c) => t + c.unreadCount, 0);
  }

  static filterConversations(convs: Conversation[], type: ConversationType | "all", query: string): Conversation[] {
    return convs.filter(c => {
      if (type !== "all" && c.type !== type) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !(c.lastMessage?.text ?? "").toLowerCase().includes(q)) return false;
      }
      return !c.archived;
    });
  }

  static getConversation(id: string): Conversation | undefined {
    return DEMO_CONVERSATIONS.find(c => c.id === id);
  }

  static getMessages(convId: string): Message[] {
    return DEMO_MESSAGES[convId] ?? [];
  }

  static groupMessagesByDate(messages: Message[]): { label: string; messages: Message[] }[] {
    const groups: Record<string, Message[]> = {};
    for (const m of messages) {
      const d = m.timestamp;
      const diff = (Date.now() - d.getTime()) / 86400000;
      const label = diff < 1 ? "Today" : diff < 2 ? "Yesterday" : d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
      (groups[label] ??= []).push(m);
    }
    return Object.entries(groups).map(([label, messages]) => ({ label, messages }));
  }

  static getParticipantById(conv: Conversation, id: string): Participant | undefined {
    return conv.participants.find(p => p.id === id);
  }

  static otherParticipant(conv: Conversation): Participant | undefined {
    return conv.participants.find(p => p.id !== CURRENT_USER_ID);
  }

  static isOnline(conv: Conversation): boolean {
    const other = this.otherParticipant(conv);
    return other?.online ?? false;
  }

  static agentSuggestionForRecruiter(conv: Conversation): string {
    if (!conv.jobTitle) return "";
    return `This role (${conv.jobTitle}) aligns with your skills. Your Proof portfolio strengthens this application. Want me to draft a compelling response?`;
  }

  static threadSummary(messages: Message[]): string {
    const n = messages.length;
    const participants = [...new Set(messages.map(m => m.senderName))].filter(n => n !== "P1 Agent" && n !== "System");
    return `${n} messages · ${participants.slice(0, 3).join(", ")}`;
  }
}
