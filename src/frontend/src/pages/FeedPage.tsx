import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  Sparkles, Rss, Trophy, BookOpen, Newspaper, Users,
  Layers, Bell, Image, X, ChevronDown, ChevronRight,
  TrendingUp, Star, Pin, Send, Globe,
} from "lucide-react";
import BackToCockpit from "../components/BackToCockpit";

/* ══════════════════════════════════════════════════════════════
   P1 FEED MODULE
   ══════════════════════════════════════════════════════════════ */

// ── Types ─────────────────────────────────────────────────────

type PostType = "post" | "achievement" | "story" | "wisdom" | "news" | "group" | "agent";
type FeedSource = "following" | "wall" | "group" | "agent" | "trending" | "own";

interface Author {
  name: string;
  initials: string;
  color: string;
  profession: string;
  professionEmoji: string;
}

interface Achievement {
  emoji: string;
  metric: string;
  label: string;
  accent: string;
  bg: string;
}

interface WisdomPalette {
  bg: string; border: string; labelColor: string;
  quoteColor: string; authorColor: string; accentColor: string;
  quoteMarkColor: string;
}

interface FeedItem {
  id: string;
  type: PostType;
  source: FeedSource;
  author: Author;
  wall?: string;
  wallEmoji?: string;
  groupName?: string;
  timestamp: string;
  content?: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  // type-specific
  achievement?: Achievement;
  story?: { title: string; excerpt: string; chapter: number; totalChapters: number };
  wisdom?: { quote: string; wisdomAuthor: string | null; category: string; palette: WisdomPalette };
  news?: { headline: string; summary: string; source: string; commentary?: string };
  agentReason?: string;
}

// ── Feed Data ─────────────────────────────────────────────────

const PALETTES: Record<string, WisdomPalette> = {
  stoic: {
    bg: "linear-gradient(135deg, #0f0c29 0%, #1a1744 55%, #24243e 100%)",
    border: "rgba(99,102,241,0.22)", labelColor: "#818cf8",
    quoteColor: "rgba(255,255,255,0.92)", authorColor: "rgba(148,163,184,0.6)",
    accentColor: "#6366f1", quoteMarkColor: "rgba(99,102,241,0.13)",
  },
  amber: {
    bg: "linear-gradient(135deg, #1a0c00 0%, #2a1606 55%, #1c1009 100%)",
    border: "rgba(251,146,60,0.22)", labelColor: "#fb923c",
    quoteColor: "rgba(255,255,255,0.92)", authorColor: "rgba(203,166,121,0.6)",
    accentColor: "#f97316", quoteMarkColor: "rgba(251,146,60,0.11)",
  },
  violet: {
    bg: "linear-gradient(135deg, #12002e 0%, #1e0a45 55%, #170938 100%)",
    border: "rgba(167,139,250,0.22)", labelColor: "#a78bfa",
    quoteColor: "rgba(255,255,255,0.92)", authorColor: "rgba(167,139,250,0.5)",
    accentColor: "#8b5cf6", quoteMarkColor: "rgba(139,92,246,0.13)",
  },
};

const FEED_ITEMS: FeedItem[] = [
  {
    id: "1", type: "post", source: "own",
    author: { name: "Francis Cobbinah", initials: "FC", color: "#6366f1", profession: "Founder", professionEmoji: "🚀" },
    timestamp: "2m ago",
    content: "Just shipped the P1 Cockpit v1 — live tiles, wisdom wall, news cluster, and now the full feed. Every day I build something I didn't know I could build. That's what the 1% mindset looks like in practice.\n\nWhat are you shipping this week?",
    likes: 47, comments: 12, shares: 6,
  },
  {
    id: "2", type: "achievement", source: "own",
    author: { name: "Francis Cobbinah", initials: "FC", color: "#6366f1", profession: "Founder", professionEmoji: "🚀" },
    timestamp: "1h ago",
    content: "Didn't miss a single morning session this fortnight.",
    likes: 83, comments: 9, shares: 4,
    achievement: { emoji: "🔥", metric: "14", label: "Day Gym Streak", accent: "#f97316", bg: "from-orange-900/50 to-amber-900/30" },
  },
  {
    id: "3", type: "post", source: "wall",
    wall: "Nurses' Wall", wallEmoji: "🩺",
    author: { name: "Sarah Chen", initials: "SC", color: "#10b981", profession: "RN — ICU", professionEmoji: "🩺" },
    timestamp: "3h ago",
    content: "Third consecutive night shift. A patient held my hand and said 'thank you' before being transferred to the ward. No amount of tiredness outweighs moments like that.\n\nNHS nurses are extraordinary. We don't talk about it enough.",
    likes: 312, comments: 48, shares: 29,
  },
  {
    id: "4", type: "news", source: "wall",
    wall: "Founders' Wall", wallEmoji: "🚀",
    author: { name: "Daniel Osei", initials: "DO", color: "#f59e0b", profession: "Founder · SaaS", professionEmoji: "🚀" },
    timestamp: "4h ago",
    content: "This is the clearest signal yet that AI agents are about to eat the SaaS market. Worth reading.",
    likes: 94, comments: 31, shares: 22,
    news: {
      headline: "AI productivity tools see 40% enterprise adoption surge in Q2 2026",
      summary: "Driven by agentic workflows replacing repetitive SaaS tasks, adoption is accelerating fastest in mid-market firms where AI now handles up to 60% of operational overhead.",
      source: "TechCrunch",
      commentary: "This is the clearest signal yet that AI agents are about to eat the SaaS market. Worth reading.",
    },
  },
  {
    id: "5", type: "post", source: "wall",
    wall: "Developers' Wall", wallEmoji: "💻",
    author: { name: "Priya Sharma", initials: "PS", color: "#8b5cf6", profession: "Senior Engineer", professionEmoji: "💻" },
    timestamp: "5h ago",
    content: "Hot take: the best architecture decision you can make in 2026 is to make your system smaller, not bigger. Cut the service mesh. Kill the microservices. Ship a modular monolith.\n\nComplex distributed systems are a career development strategy, not a product strategy. 🧵",
    likes: 228, comments: 67, shares: 44,
  },
  {
    id: "6", type: "story", source: "following",
    author: { name: "Marcus Williams", initials: "MW", color: "#22c55e", profession: "Ex-Plumber · Founder", professionEmoji: "🔧" },
    timestamp: "6h ago",
    content: "",
    likes: 156, comments: 38, shares: 19,
    story: {
      title: "From Pipes to Product: A Founder's Journey",
      excerpt: "I spent 12 years under sinks and behind walls before I built my first app. People laughed. My own mates said 'you're a plumber, not a developer.' Chapter 4 is the one where I nearly quit — and why I didn't.",
      chapter: 4,
      totalChapters: 7,
    },
  },
  {
    id: "7", type: "wisdom", source: "following",
    author: { name: "Amara Okonkwo", initials: "AO", color: "#a78bfa", profession: "Life Coach", professionEmoji: "✨" },
    timestamp: "7h ago",
    content: "Saved this and it stopped me in my tracks.",
    likes: 189, comments: 14, shares: 33,
    wisdom: {
      quote: "The impediment to action advances action. What stands in the way becomes the way.",
      wisdomAuthor: "Marcus Aurelius",
      category: "Stoic Wisdom",
      palette: PALETTES.stoic,
    },
  },
  {
    id: "8", type: "agent", source: "agent",
    author: { name: "P1 Intelligence", initials: "P1", color: "#6366f1", profession: "AI Agent", professionEmoji: "🤖" },
    timestamp: "8h ago",
    content: "Three founders in your network just shared the same article about Series A valuations stabilising. Might be worth a read — it's relevant to your fundraising timeline.",
    likes: 0, comments: 0, shares: 0,
    agentReason: "3 people you follow shared this in the last 4 hours",
  },
  {
    id: "9", type: "group", source: "group",
    wall: "AI Builders UK", wallEmoji: "🤖", groupName: "AI Builders UK",
    author: { name: "James Park", initials: "JP", color: "#6366f1", profession: "ML Engineer", professionEmoji: "💻" },
    timestamp: "9h ago",
    content: "We just crossed 4,000 members in AI Builders UK 🎉\n\nTo celebrate — I'm hosting an open AMA on Thursday evening. Bring your questions about deploying LLMs in production, RAG architectures, or anything agentic. Drop a comment if you're coming.",
    likes: 73, comments: 29, shares: 11,
  },
  {
    id: "10", type: "post", source: "wall",
    wall: "Musicians' Wall", wallEmoji: "🎵",
    author: { name: "Layla Hassan", initials: "LH", color: "#ec4899", profession: "Composer & Producer", professionEmoji: "🎵" },
    timestamp: "10h ago",
    content: "Just wrapped my first orchestral session. 32 musicians. 6 hours. Complete chaos and the most beautiful thing I've ever heard.\n\nIf you're a producer who's never recorded live strings — do it. Nothing in the box sounds like that.",
    image: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=600&q=80",
    likes: 441, comments: 58, shares: 37,
  },
  {
    id: "11", type: "achievement", source: "wall",
    wall: "Athletes' Wall", wallEmoji: "🏆",
    author: { name: "Tom Adeyemi", initials: "TA", color: "#22c55e", profession: "Amateur Marathoner", professionEmoji: "🏃" },
    timestamp: "11h ago",
    content: "Sub-4 finally.",
    likes: 612, comments: 94, shares: 51,
    achievement: { emoji: "🏅", metric: "3:58", label: "Marathon — Personal Best", accent: "#22c55e", bg: "from-green-900/50 to-emerald-900/30" },
  },
  {
    id: "12", type: "news", source: "wall",
    wall: "Developers' Wall", wallEmoji: "💻",
    author: { name: "Chloe Bennett", initials: "CB", color: "#06b6d4", profession: "Staff Engineer", professionEmoji: "💻" },
    timestamp: "12h ago",
    content: "Junior hiring is back. If you've been sitting on hiring decisions — now is the time.",
    likes: 138, comments: 42, shares: 28,
    news: {
      headline: "Junior developer hiring rebounds 22% year-on-year in UK tech",
      summary: "After 18 months of caution, tech firms are reopening graduate and junior pipelines. AI upskilling programmes are cited as the primary driver of renewed confidence.",
      source: "Stack Overflow Insights",
      commentary: "Junior hiring is back. If you've been sitting on hiring decisions — now is the time.",
    },
  },
  {
    id: "13", type: "post", source: "wall",
    wall: "Teachers' Wall", wallEmoji: "📚",
    author: { name: "Fiona MacLeod", initials: "FM", color: "#06b6d4", profession: "Secondary Teacher", professionEmoji: "📚" },
    timestamp: "Yesterday",
    content: "A student who barely said a word all year stood up today and explained a concept better than I could have. That silence was not absence — it was processing.\n\nNever confuse quiet with disengaged.",
    likes: 597, comments: 83, shares: 64,
  },
  {
    id: "14", type: "story", source: "group",
    wall: "NHS Night Shift Crew", wallEmoji: "🌙", groupName: "NHS Night Shift Crew",
    author: { name: "Kwame Asante", initials: "KA", color: "#10b981", profession: "A&E Nurse", professionEmoji: "🩺" },
    timestamp: "Yesterday",
    content: "",
    likes: 284, comments: 61, shares: 40,
    story: {
      title: "Night Shift Diaries: What the Ward Looks Like at 3am",
      excerpt: "The ward at 3am has a quality that daytime never shows you. I've been writing this for 8 months — Chapter 2 covers the night we had 14 emergencies in 90 minutes and what we did to hold it together.",
      chapter: 2,
      totalChapters: 5,
    },
  },
  {
    id: "15", type: "wisdom", source: "agent",
    author: { name: "Elena Vasquez", initials: "EV", color: "#f59e0b", profession: "Executive Coach", professionEmoji: "✨" },
    timestamp: "Yesterday",
    content: "This one. Every single time.",
    likes: 203, comments: 19, shares: 47,
    wisdom: {
      quote: "Discipline equals freedom.",
      wisdomAuthor: "Jocko Willink",
      category: "Founder Mindset",
      palette: PALETTES.amber,
    },
  },
  {
    id: "16", type: "group", source: "group",
    wall: "Remote Founders EU", wallEmoji: "🌍", groupName: "Remote Founders EU",
    author: { name: "Niklas Berg", initials: "NB", color: "#f59e0b", profession: "Founder · B2B SaaS", professionEmoji: "🚀" },
    timestamp: "2 days ago",
    content: "After 3 years fully remote across 7 countries — here are the 5 things that actually matter:\n\n1. Overlap hours (not full-day alignment)\n2. Async-first documentation\n3. Quarterly in-person intensives\n4. Clear writing culture\n5. Over-communicate decisions, not just outcomes\n\nEverything else is noise.",
    likes: 317, comments: 74, shares: 55,
  },
  {
    id: "17", type: "post", source: "wall",
    wall: "Founders' Wall", wallEmoji: "🚀",
    author: { name: "Zara Ahmed", initials: "ZA", color: "#f59e0b", profession: "Pre-seed Founder", professionEmoji: "🚀" },
    timestamp: "2 days ago",
    content: "Investor said 'the market isn't ready.' Same investor passed on Slack in 2014.\n\nThe market is never ready. You make it ready.",
    likes: 892, comments: 147, shares: 203,
  },
  {
    id: "18", type: "achievement", source: "following",
    author: { name: "Oliver Nash", initials: "ON", color: "#8b5cf6", profession: "Developer", professionEmoji: "💻" },
    timestamp: "2 days ago",
    content: "First open-source PR merged into a project with 12k stars. Six months of learning in public, one merged commit.",
    likes: 448, comments: 62, shares: 33,
    achievement: { emoji: "⭐", metric: "1st", label: "Open Source PR Merged", accent: "#8b5cf6", bg: "from-violet-900/50 to-purple-900/30" },
  },
  {
    id: "19", type: "news", source: "agent",
    wall: "Founders' Wall", wallEmoji: "🚀",
    author: { name: "P1 Intelligence", initials: "P1", color: "#6366f1", profession: "AI Agent", professionEmoji: "🤖" },
    timestamp: "2 days ago",
    content: "Trending in your profession right now.",
    likes: 0, comments: 0, shares: 0,
    agentReason: "Trending among Founders this week",
    news: {
      headline: "Series A valuations stabilise at 8–12× ARR as market finds new equilibrium",
      summary: "After two years of compression, early-stage valuations are finding a floor. Investors cite improving unit economics and leaner team structures as the primary drivers of renewed confidence.",
      source: "Crunchbase News",
      commentary: "Trending in your profession right now.",
    },
  },
  {
    id: "20", type: "post", source: "wall",
    wall: "Plumbers' Wall", wallEmoji: "🔧",
    author: { name: "Gary Benson", initials: "GB", color: "#94a3b8", profession: "Plumber · 22 yrs", professionEmoji: "🔧" },
    timestamp: "3 days ago",
    content: "Apprentice asked me today why I still take pride in jobs nobody sees — hidden pipes, sealed joints, perfect soldering inside a wall.\n\nTold him: because the family who lives there will never flood. That's why.\n\nEvery trade has its invisible excellence.",
    likes: 1203, comments: 218, shares: 334,
  },
];

// ── Helpers ───────────────────────────────────────────────────

function fmtLikes(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

const SOURCE_LABELS: Record<FeedSource, { label: string; color: string }> = {
  own:       { label: "Your post",        color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  following: { label: "Following",        color: "text-blue-400 bg-blue-500/10 border-blue-500/20"      },
  wall:      { label: "Wall",             color: "text-slate-400 bg-white/[0.05] border-white/[0.09]"   },
  group:     { label: "Group",            color: "text-green-400 bg-green-500/10 border-green-500/20"   },
  agent:     { label: "P1 Recommends",    color: "text-violet-400 bg-violet-500/10 border-violet-500/20"},
  trending:  { label: "Trending",         color: "text-amber-400 bg-amber-500/10 border-amber-500/20"   },
};

// ── UI Atoms ──────────────────────────────────────────────────

function Avatar({ initials, color, size = 36 }: { initials: string; color: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: size, height: size, background: color + "33", border: `1.5px solid ${color}50`, fontSize: size * 0.33 }}
    >
      {initials}
    </div>
  );
}

function ActionBtn({ icon, count, active, activeColor = "text-rose-400", onClick }: {
  icon: React.ReactNode; count?: number; active?: boolean; activeColor?: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all hover:bg-white/[0.06] ${active ? activeColor : "text-slate-500 hover:text-slate-300"}`}
    >
      {icon}
      {count !== undefined && <span>{fmtLikes(count)}</span>}
    </button>
  );
}

// ── Card Shell ────────────────────────────────────────────────

function FeedCard({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl overflow-hidden"
      style={{
        boxShadow: `0 8px 32px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset, 0 -1px 0 rgba(0,0,0,0.35) inset`,
      }}
    >
      {accent && <div className="h-[2px]" style={{ background: accent }} />}
      {children}
    </motion.div>
  );
}

// ── Standard Post Card ────────────────────────────────────────

function PostCard({ item }: { item: FeedItem }) {
  const [liked,  setLiked]  = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const sourceMeta = SOURCE_LABELS[item.source];
  const needsTruncate = (item.content?.length ?? 0) > 220;
  const displayContent = needsTruncate && !expanded
    ? item.content!.slice(0, 220) + "…"
    : item.content ?? "";

  return (
    <FeedCard>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <Avatar initials={item.author.initials} color={item.author.color} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-bold text-white leading-tight">{item.author.name}</span>
                <span className="text-[10px]">{item.author.professionEmoji}</span>
                <span className="text-[10px] text-slate-500">{item.author.profession}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[10px] text-slate-600">{item.timestamp}</span>
                {item.wall && (
                  <button
                    onClick={() => navigate("/walls")}
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <span>{item.wallEmoji}</span>
                    <span>{item.wall}</span>
                  </button>
                )}
                <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded border ${sourceMeta.color}`}>
                  {sourceMeta.label}
                </span>
              </div>
            </div>
          </div>
          <button className="text-slate-600 hover:text-slate-400 transition-colors mt-0.5">
            <MoreHorizontal size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="mb-3">
          <p className="text-[13px] text-slate-300 leading-relaxed whitespace-pre-line">{displayContent}</p>
          {needsTruncate && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 mt-1 transition-colors font-semibold"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>

        {/* Image */}
        {item.image && (
          <div className="rounded-xl overflow-hidden mb-3" style={{ height: "200px" }}>
            <img src={item.image} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5 pt-2 border-t border-white/[0.05] -mx-1">
          <ActionBtn
            icon={<Heart size={13} fill={liked ? "currentColor" : "none"} />}
            count={item.likes + (liked ? 1 : 0)}
            active={liked} activeColor="text-rose-400"
            onClick={() => setLiked(v => !v)}
          />
          <ActionBtn icon={<MessageCircle size={13} />} count={item.comments} />
          <ActionBtn icon={<Share2 size={13} />} count={item.shares} />
          <div className="ml-auto">
            <ActionBtn
              icon={<Bookmark size={13} fill={saved ? "currentColor" : "none"} />}
              active={saved} activeColor="text-amber-400"
              onClick={() => setSaved(v => !v)}
            />
          </div>
        </div>
      </div>
    </FeedCard>
  );
}

// ── Achievement Card ──────────────────────────────────────────

function AchievementCard({ item }: { item: FeedItem }) {
  const [liked, setLiked] = useState(false);
  const a = item.achievement!;

  return (
    <FeedCard accent={a.accent}>
      <div className="p-4">
        {/* Author */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar initials={item.author.initials} color={item.author.color} />
          <div>
            <span className="text-[13px] font-bold text-white">{item.author.name}</span>
            <div className="text-[10px] text-slate-500 mt-0.5">{item.timestamp}</div>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border text-amber-400 bg-amber-500/10 border-amber-500/20">
            <Trophy size={8} /> Achievement
          </span>
        </div>

        {/* Achievement tile */}
        <div className={`rounded-2xl bg-gradient-to-br ${a.bg} border border-white/[0.08] p-5 flex items-center gap-5 mb-3`}
          style={{ boxShadow: `0 6px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.06) inset` }}>
          <span className="text-5xl leading-none">{a.emoji}</span>
          <div>
            <p className="text-4xl font-black text-white leading-none">{a.metric}</p>
            <p className="text-[12px] font-semibold mt-1" style={{ color: a.accent }}>{a.label}</p>
          </div>
        </div>

        {/* Caption */}
        {item.content && <p className="text-[12px] text-slate-400 mb-3">{item.content}</p>}

        {/* Actions */}
        <div className="flex items-center gap-0.5 pt-2 border-t border-white/[0.05] -mx-1">
          <ActionBtn
            icon={<Heart size={13} fill={liked ? "currentColor" : "none"} />}
            count={item.likes + (liked ? 1 : 0)}
            active={liked} activeColor="text-rose-400"
            onClick={() => setLiked(v => !v)}
          />
          <ActionBtn icon={<MessageCircle size={13} />} count={item.comments} />
          <ActionBtn icon={<Share2 size={13} />} count={item.shares} />
        </div>
      </div>
    </FeedCard>
  );
}

// ── Story Card ────────────────────────────────────────────────

function StoryCard({ item }: { item: FeedItem }) {
  const [liked, setLiked] = useState(false);
  const s = item.story!;

  return (
    <FeedCard accent="rgba(139,92,246,0.6)">
      <div className="p-4">
        {/* Author + label */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar initials={item.author.initials} color={item.author.color} />
          <div>
            <span className="text-[13px] font-bold text-white">{item.author.name}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-slate-500">{item.timestamp}</span>
              {item.groupName && (
                <span className="text-[10px] text-green-400">{item.wallEmoji} {item.groupName}</span>
              )}
            </div>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border text-violet-400 bg-violet-500/10 border-violet-500/20">
            <BookOpen size={8} /> Story
          </span>
        </div>

        {/* Story preview */}
        <div className="rounded-2xl overflow-hidden mb-3"
          style={{
            background: "linear-gradient(135deg, #1a0a30 0%, #2d1655 60%, #1e0f3d 100%)",
            border: "1px solid rgba(139,92,246,0.2)",
            boxShadow: "0 8px 28px rgba(0,0,0,0.45), 0 1px 0 rgba(139,92,246,0.1) inset",
          }}>
          <div className="px-5 py-4">
            {/* Chapter badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] font-bold uppercase tracking-widest text-violet-400">
                Chapter {s.chapter} of {s.totalChapters}
              </span>
              <div className="flex-1 h-px bg-violet-500/20" />
            </div>
            {/* Progress dots */}
            <div className="flex gap-1 mb-4">
              {Array.from({ length: s.totalChapters }).map((_, i) => (
                <div key={i} className={`h-1 rounded-full flex-1 ${i < s.chapter ? "bg-violet-500" : "bg-white/10"}`} />
              ))}
            </div>
            <h3 className="text-[15px] font-bold text-white leading-snug mb-2">{s.title}</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">{s.excerpt}</p>
            <button className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-violet-300 hover:text-violet-200 transition-colors">
              Continue Reading <ChevronRight size={11} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 pt-2 border-t border-white/[0.05] -mx-1">
          <ActionBtn
            icon={<Heart size={13} fill={liked ? "currentColor" : "none"} />}
            count={item.likes + (liked ? 1 : 0)}
            active={liked} activeColor="text-rose-400"
            onClick={() => setLiked(v => !v)}
          />
          <ActionBtn icon={<MessageCircle size={13} />} count={item.comments} />
          <ActionBtn icon={<Share2 size={13} />} count={item.shares} />
        </div>
      </div>
    </FeedCard>
  );
}

// ── Wisdom Card ───────────────────────────────────────────────

function WisdomCard({ item }: { item: FeedItem }) {
  const [liked, setLiked] = useState(false);
  const w = item.wisdom!;
  const p = w.palette;

  return (
    <FeedCard>
      <div className="p-4">
        {/* Author */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar initials={item.author.initials} color={item.author.color} />
          <div>
            <span className="text-[13px] font-bold text-white">{item.author.name}</span>
            <div className="text-[10px] text-slate-500 mt-0.5">{item.timestamp}</div>
          </div>
          {item.content && (
            <span className="ml-auto text-[10px] text-slate-500 italic max-w-[140px] text-right line-clamp-2">
              "{item.content}"
            </span>
          )}
        </div>

        {/* Wisdom tile */}
        <div
          className="relative rounded-2xl overflow-hidden mb-3"
          style={{ background: p.bg, border: `1px solid ${p.border}`, boxShadow: `0 8px 28px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset`, minHeight: "120px" }}
        >
          {/* Big quote mark */}
          <div className="absolute top-0 left-2 text-[72px] font-serif leading-none select-none pointer-events-none"
            style={{ color: p.quoteMarkColor, lineHeight: 1, top: "-6px" }}>
            &ldquo;
          </div>
          <div className="px-5 pt-8 pb-4">
            <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: p.labelColor }}>
              {w.category}
            </div>
            <p className="text-[13px] font-semibold leading-relaxed" style={{ color: p.quoteColor }}>
              {w.quote}
            </p>
            {w.wisdomAuthor && (
              <p className="text-[10px] mt-2 font-medium" style={{ color: p.authorColor }}>
                &mdash; {w.wisdomAuthor}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 pt-2 border-t border-white/[0.05] -mx-1">
          <ActionBtn
            icon={<Heart size={13} fill={liked ? "currentColor" : "none"} />}
            count={item.likes + (liked ? 1 : 0)}
            active={liked} activeColor="text-rose-400"
            onClick={() => setLiked(v => !v)}
          />
          <ActionBtn icon={<MessageCircle size={13} />} count={item.comments} />
          <ActionBtn icon={<Share2 size={13} />} count={item.shares} />
          <div className="ml-auto">
            <ActionBtn icon={<Bookmark size={13} />} />
          </div>
        </div>
      </div>
    </FeedCard>
  );
}

// ── News Card ─────────────────────────────────────────────────

function NewsCard({ item }: { item: FeedItem }) {
  const [liked, setLiked] = useState(false);
  const n = item.news!;
  const isAgent = item.type === "agent" || item.source === "agent";

  return (
    <FeedCard accent={isAgent ? "rgba(99,102,241,0.5)" : undefined}>
      <div className="p-4">
        {/* Author */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar
            initials={item.author.initials}
            color={isAgent ? "#6366f1" : item.author.color}
            size={34}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] font-bold text-white">
                {isAgent ? "P1 Intelligence" : item.author.name}
              </span>
              {isAgent ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border text-violet-400 bg-violet-500/10 border-violet-500/20">
                  <Sparkles size={8} /> {item.agentReason ?? "Recommended"}
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">{item.author.profession}</span>
              )}
            </div>
            <span className="text-[10px] text-slate-600">{item.timestamp}</span>
          </div>
        </div>

        {/* News block */}
        <div className="rounded-xl overflow-hidden mb-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="px-4 py-3.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Newspaper size={10} className="text-slate-500" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{n.source}</span>
            </div>
            <p className="text-[13px] font-bold text-white leading-snug mb-1.5">{n.headline}</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">{n.summary}</p>
          </div>
        </div>

        {/* User commentary */}
        {n.commentary && !isAgent && (
          <p className="text-[12px] text-slate-300 mb-3 italic">"{n.commentary}"</p>
        )}

        {/* Actions */}
        {!isAgent && (
          <div className="flex items-center gap-0.5 pt-2 border-t border-white/[0.05] -mx-1">
            <ActionBtn
              icon={<Heart size={13} fill={liked ? "currentColor" : "none"} />}
              count={item.likes + (liked ? 1 : 0)}
              active={liked} activeColor="text-rose-400"
              onClick={() => setLiked(v => !v)}
            />
            <ActionBtn icon={<MessageCircle size={13} />} count={item.comments} />
            <ActionBtn icon={<Share2 size={13} />} count={item.shares} />
          </div>
        )}
      </div>
    </FeedCard>
  );
}

// ── Agent Recommendation Card ─────────────────────────────────

function AgentCard({ item }: { item: FeedItem }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <FeedCard accent="rgba(139,92,246,0.45)">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/25 flex items-center justify-center shrink-0">
            <Sparkles size={14} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-bold text-white">P1 Intelligence</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border text-violet-400 bg-violet-500/10 border-violet-500/20">
                For you
              </span>
            </div>
            <p className="text-[12px] text-slate-300 leading-relaxed">{item.content}</p>
            {item.agentReason && (
              <p className="text-[10px] text-slate-600 mt-1.5 flex items-center gap-1">
                <Sparkles size={8} className="text-indigo-600" /> {item.agentReason}
              </p>
            )}
          </div>
          <button onClick={() => setDismissed(true)} className="text-slate-600 hover:text-slate-400 transition-colors shrink-0 mt-0.5">
            <X size={13} />
          </button>
        </div>
      </div>
    </FeedCard>
  );
}

// ── Post Composer ─────────────────────────────────────────────

function PostComposer() {
  const [open,  setOpen]    = useState(false);
  const [text,  setText]    = useState("");
  const [wall,  setWall]    = useState("Founders' Wall");
  const [posting, setPosting] = useState(false);

  const handlePost = () => {
    if (!text.trim()) return;
    setPosting(true);
    setTimeout(() => { setText(""); setOpen(false); setPosting(false); }, 900);
  };

  return (
    <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl overflow-hidden"
      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset" }}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
        >
          <Avatar initials="FC" color="#6366f1" size={36} />
          <span className="text-[13px] text-slate-500">What's on your mind, Francis?</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[10px] text-slate-500">
              <Image size={10} /> Photo
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/25 text-[10px] text-indigo-300">
              <Send size={10} /> Post
            </div>
          </div>
        </button>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="p-4"
          >
            <div className="flex items-start gap-3 mb-3">
              <Avatar initials="FC" color="#6366f1" size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[12px] font-bold text-white">Francis Cobbinah</span>
                  <span className="text-[10px]">🚀</span>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] text-slate-400">
                    <Layers size={9} />
                    <select
                      value={wall}
                      onChange={e => setWall(e.target.value)}
                      className="bg-transparent text-slate-400 text-[10px] focus:outline-none cursor-pointer"
                      style={{ colorScheme: "dark" }}
                    >
                      {["Founders' Wall", "AI Builders UK", "Developers' Wall", "Remote Founders EU"].map(w => (
                        <option key={w}>{w}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <textarea
                  autoFocus
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Share something with your walls…"
                  rows={3}
                  className="w-full bg-transparent text-[13px] text-slate-200 placeholder:text-slate-600 focus:outline-none resize-none leading-relaxed"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-white/[0.05]">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
                <Image size={11} /> Photo
              </button>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => { setOpen(false); setText(""); }}
                  className="px-3 py-1.5 rounded-xl text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handlePost}
                  disabled={!text.trim() || posting}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-[11px] font-bold transition-all"
                >
                  {posting ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
                      <Sparkles size={11} />
                    </motion.div>
                  ) : (
                    <Send size={11} />
                  )}
                  {posting ? "Posting…" : "Post"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ── Feed Item Router ──────────────────────────────────────────

function FeedItemRenderer({ item }: { item: FeedItem }) {
  if (item.type === "achievement")                          return <AchievementCard item={item} />;
  if (item.type === "story")                               return <StoryCard item={item} />;
  if (item.type === "wisdom")                              return <WisdomCard item={item} />;
  if (item.type === "news" && item.news)                   return <NewsCard item={item} />;
  if (item.type === "agent" && !item.news)                 return <AgentCard item={item} />;
  if (item.type === "agent" && item.news)                  return <NewsCard item={item} />;
  return <PostCard item={item} />;
}

// ── Left Sidebar ──────────────────────────────────────────────

type FeedFilter = "all" | "following" | "profession" | "groups" | "walls" | "agent";

const FEED_FILTERS: { key: FeedFilter; label: string; icon: React.ReactNode }[] = [
  { key: "all",        label: "All",            icon: <Rss size={12} />         },
  { key: "following",  label: "Following",      icon: <Users size={12} />       },
  { key: "profession", label: "My Profession",  icon: <Star size={12} />        },
  { key: "groups",     label: "Groups",         icon: <UsersRound size={12} />  },
  { key: "walls",      label: "Pinned Walls",   icon: <Pin size={12} />         },
  { key: "agent",      label: "P1 Picks",       icon: <Sparkles size={12} />    },
];

function LeftSidebar({ filter, setFilter }: {
  filter: FeedFilter;
  setFilter: (f: FeedFilter) => void;
}) {
  const navigate = useNavigate();
  return (
    <aside className="w-52 shrink-0 flex flex-col gap-4">
      {/* Feed filters */}
      <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
        <div className="px-3 pt-3 pb-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Feed Sources</span>
        </div>
        <div className="p-1.5 flex flex-col gap-0.5">
          {FEED_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-all text-left ${
                filter === f.key
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              }`}
            >
              <span className={filter === f.key ? "text-indigo-400" : "text-slate-600"}>{f.icon}</span>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Your walls */}
      <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
        <div className="px-3 pt-3 pb-1 flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Your Walls</span>
          <button onClick={() => navigate("/walls")} className="text-[9px] text-indigo-400 hover:text-indigo-300 transition-colors font-semibold">
            Explore
          </button>
        </div>
        <div className="p-1.5 flex flex-col gap-0.5">
          {[
            { emoji: "🚀", label: "Founders' Wall",   accent: "#f59e0b", count: 47 },
            { emoji: "🤖", label: "AI Builders UK",   accent: "#6366f1", count: 23 },
            { emoji: "💻", label: "Developers' Wall", accent: "#8b5cf6", count: 31 },
          ].map(({ emoji, label, accent, count }) => (
            <button key={label}
              onClick={() => navigate("/walls")}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-white/[0.04] transition-colors group">
              <span className="text-[13px] leading-none shrink-0">{emoji}</span>
              <span className="flex-1 text-[11px] text-slate-400 group-hover:text-slate-200 transition-colors truncate">{label}</span>
              <span className="text-[10px] font-bold shrink-0" style={{ color: accent }}>{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Trending */}
      <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={10} className="text-slate-500" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Trending</span>
          </div>
        </div>
        <div className="px-3 pb-3 flex flex-col gap-2">
          {[
            { tag: "#AIAgents",   posts: "1.2K posts" },
            { tag: "#NHSNurses",  posts: "847 posts"  },
            { tag: "#FounderLife",posts: "634 posts"   },
            { tag: "#OpenSource", posts: "512 posts"   },
          ].map(({ tag, posts }) => (
            <div key={tag} className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-indigo-400">{tag}</span>
              <span className="text-[10px] text-slate-600">{posts}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

// ── Right Sidebar ─────────────────────────────────────────────

function RightSidebar() {
  const navigate = useNavigate();
  const [followed, setFollowed] = useState<Set<string>>(new Set());

  const suggestions = [
    { name: "Priya Sharma",    initials: "PS", color: "#8b5cf6", role: "Senior Engineer",   mutual: 4 },
    { name: "Sarah Chen",      initials: "SC", color: "#10b981", role: "RN — ICU",           mutual: 2 },
    { name: "Layla Hassan",    initials: "LH", color: "#ec4899", role: "Composer",           mutual: 1 },
    { name: "Marcus Williams", initials: "MW", color: "#22c55e", role: "Ex-Plumber · Founder", mutual: 3 },
  ];

  const suggestedWalls = [
    { id: "athletes",   name: "Athletes' Wall",   emoji: "🏆", members: "35.1K" },
    { id: "musicians",  name: "Musicians' Wall",  emoji: "🎵", members: "28.7K" },
    { id: "designers",  name: "Designers' Wall",  emoji: "🎨", members: "31.4K" },
  ];

  return (
    <aside className="w-64 shrink-0 flex flex-col gap-4">
      {/* Suggested people */}
      <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
        <div className="px-4 pt-3.5 pb-1 flex items-center gap-1.5">
          <Users size={10} className="text-slate-500" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">People to Follow</span>
        </div>
        <div className="p-2 flex flex-col gap-0.5">
          {suggestions.map(p => (
            <div key={p.name} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/[0.03] transition-colors">
              <Avatar initials={p.initials} color={p.color} size={32} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-white truncate">{p.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{p.role}</p>
                <p className="text-[9px] text-slate-600">{p.mutual} mutual connections</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setFollowed(prev => {
                  const n = new Set(prev);
                  n.has(p.name) ? n.delete(p.name) : n.add(p.name);
                  return n;
                })}
                className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                  followed.has(p.name)
                    ? "bg-green-500/10 border-green-500/20 text-green-400"
                    : "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:border-white/[0.16] hover:text-slate-200"
                }`}
              >
                {followed.has(p.name) ? <><Bell size={9} /> On</> : <>+ Follow</>}
              </motion.button>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested walls */}
      <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
        <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layers size={10} className="text-slate-500" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Suggested Walls</span>
          </div>
          <button onClick={() => navigate("/walls")} className="text-[9px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
            See all
          </button>
        </div>
        <div className="px-2 pb-2 flex flex-col gap-0.5">
          {suggestedWalls.map(w => (
            <button key={w.id} onClick={() => navigate("/walls")}
              className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors text-left group">
              <span className="text-xl leading-none">{w.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-slate-300 group-hover:text-white transition-colors truncate">{w.name}</p>
                <p className="text-[10px] text-slate-600">{w.members} members</p>
              </div>
              <ChevronRight size={11} className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Activity summary */}
      <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl p-4"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
        <div className="flex items-center gap-1.5 mb-3">
          <Globe size={10} className="text-slate-500" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Your Activity</span>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { label: "Post views this week", value: "1.4K",  color: "text-indigo-400" },
            { label: "Profile views",        value: "83",    color: "text-green-400"  },
            { label: "Connections made",     value: "6",     color: "text-amber-400"  },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500">{label}</span>
              <span className={`text-[12px] font-bold ${color}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

// ── Main Feed Page ────────────────────────────────────────────

const FILTER_MAP: Record<FeedFilter, FeedSource[]> = {
  all:        ["own", "following", "wall", "group", "agent", "trending"],
  following:  ["own", "following"],
  profession: ["wall"],
  groups:     ["group"],
  walls:      ["wall"],
  agent:      ["agent"],
};

export default function FeedPage() {
  const [filter, setFilter]   = useState<FeedFilter>("all");
  const [visible, setVisible] = useState(12);

  const filtered = FEED_ITEMS.filter(item => FILTER_MAP[filter].includes(item.source));
  const shown    = filtered.slice(0, visible);
  const hasMore  = visible < filtered.length;

  const loadMore = useCallback(() => {
    setVisible(v => v + 6);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 flex flex-col">

      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <BackToCockpit />
          <div className="flex items-center gap-2">
            <Rss size={15} className="text-indigo-400" />
            <h1 className="text-sm font-bold text-white">Feed</h1>
          </div>
          <span className="text-[10px] text-slate-600">·</span>
          <span className="text-[11px] text-slate-500">Founders · AI Builders UK · Developers' Wall</span>
          <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors">
              <Bell size={11} /> Notifications
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex gap-6">

            {/* Left sidebar */}
            <LeftSidebar filter={filter} setFilter={setFilter} />

            {/* Main feed */}
            <div className="flex-1 min-w-0 flex flex-col gap-4">
              {/* Composer */}
              <PostComposer />

              {/* Filter label */}
              {filter !== "all" && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-white/[0.05]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-2">
                    {FEED_FILTERS.find(f => f.key === filter)?.label}
                  </span>
                  <div className="flex-1 h-px bg-white/[0.05]" />
                </div>
              )}

              {/* Feed cards */}
              <AnimatePresence initial={false}>
                {shown.length > 0 ? (
                  shown.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i < 4 ? i * 0.06 : 0, ease: [0.4, 0, 0.2, 1] }}
                    >
                      <FeedItemRenderer item={item} />
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Rss size={26} className="text-slate-700" />
                    <p className="text-sm text-slate-500">No posts in this filter.</p>
                    <button onClick={() => setFilter("all")} className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
                      Show all
                    </button>
                  </div>
                )}
              </AnimatePresence>

              {/* Load more */}
              {hasMore && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={loadMore}
                  className="w-full py-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-[12px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all flex items-center justify-center gap-2"
                >
                  <ChevronDown size={13} /> Load more posts
                </motion.button>
              )}
            </div>

            {/* Right sidebar */}
            <RightSidebar />

          </div>
        </div>
        <div className="h-8" />
      </div>
    </div>
  );
}

// missing import shim
import React from "react";
function UsersRound(props: React.ComponentProps<typeof Users>) { return <Users {...props} />; }
