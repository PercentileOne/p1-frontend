import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search, Bookmark, Bell, Share2, TrendingUp, Star,
  BookOpen, X, ChevronRight, Sparkles, Filter, SlidersHorizontal,
  Users, Layers,
} from "lucide-react";
import BackToCockpit from "../components/BackToCockpit";
import AwardsSection from "../components/AwardsSection";
import { STORIES, ALL_CATEGORIES, type Story, type StoryCategory } from "../lib/storiesData";

/* ══════════════════════════════════════════════════════════════
   P1 STORIES HOME
   ══════════════════════════════════════════════════════════════ */

type SortKey = "trending" | "saved" | "followed" | "newest" | "emotional";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "trending",  label: "Trending"        },
  { key: "saved",     label: "Most Saved"       },
  { key: "followed",  label: "Most Followed"    },
  { key: "newest",    label: "Newest"           },
  { key: "emotional", label: "Most Moving"      },
];

const CATEGORY_COLORS: Record<StoryCategory, string> = {
  "Hardship":              "text-rose-400 bg-rose-500/10 border-rose-500/20",
  "Comeback Story":        "text-orange-400 bg-orange-500/10 border-orange-500/20",
  "Career Journey":        "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  "Student Life":          "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "Health & Recovery":     "text-green-400 bg-green-500/10 border-green-500/20",
  "Mental Health":         "text-teal-400 bg-teal-500/10 border-teal-500/20",
  "Family & Relationships":"text-pink-400 bg-pink-500/10 border-pink-500/20",
  "Craft & Mastery":       "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "Founder Journey":       "text-violet-400 bg-violet-500/10 border-violet-500/20",
  "Trade Story":           "text-slate-400 bg-slate-500/10 border-slate-500/20",
  "Creativity & Art":      "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20",
  "Identity & Background": "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  "Life Lessons":          "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
};

function fmtCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

// ── Story Card ────────────────────────────────────────────────

function StoryCard({ story, saved, followed, onSave, onFollow }: {
  story: Story;
  saved: boolean;
  followed: boolean;
  onSave: () => void;
  onFollow: () => void;
}) {
  const navigate = useNavigate();
  const catColor = CATEGORY_COLORS[story.category];
  const totalChapters = story.chapters.length;
  const latestChapter = story.chapters[totalChapters - 1];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: `linear-gradient(160deg, ${story.gradientFrom} 0%, ${story.gradientTo} 100%)`,
        border: `1px solid ${story.accentColor}28`,
        boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 1px 0 ${story.accentColor}20 inset, 0 -1px 0 rgba(0,0,0,0.4) inset`,
        minHeight: "300px",
      }}
      onClick={() => navigate(`/stories/${story.id}`)}
    >
      {/* Accent top line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: story.accentColor + "80" }} />

      {/* Featured badge */}
      {story.featured && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg"
          style={{ background: story.accentColor + "22", border: `1px solid ${story.accentColor}40` }}>
          <Star size={9} style={{ color: story.accentColor }} fill="currentColor" />
          <span className="text-[9px] font-bold" style={{ color: story.accentColor }}>Featured</span>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-col flex-1 p-5 pb-4">
        {/* Category + status */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${catColor}`}>
            {story.category}
          </span>
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
            story.status === "ongoing"
              ? "text-green-400 bg-green-500/10 border-green-500/20"
              : "text-slate-400 bg-slate-500/10 border-slate-500/10"
          }`}>
            {story.status === "ongoing" ? "Ongoing" : "Complete"}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[17px] font-bold text-white leading-snug mb-2">{story.title}</h3>

        {/* Description */}
        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 mb-4">{story.description}</p>

        {/* Chapter progress */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalChapters, 8) }).map((_, i) => (
              <div key={i} className="w-4 h-1 rounded-full" style={{ background: story.accentColor + (i < totalChapters ? "cc" : "22") }} />
            ))}
            {totalChapters > 8 && <span className="text-[9px] text-slate-500">+{totalChapters - 8}</span>}
          </div>
          <span className="text-[10px] text-slate-500">
            {totalChapters} chapter{totalChapters !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Latest chapter preview */}
        <div className="rounded-xl p-3 mb-4 flex-1"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <BookOpen size={9} style={{ color: story.accentColor }} />
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: story.accentColor }}>
              Latest · Ch. {latestChapter.number}
            </span>
            <span className="text-[9px] text-slate-600 ml-auto">{latestChapter.publishedAt}</span>
          </div>
          <p className="text-[11px] font-semibold text-white mb-1 leading-snug">{latestChapter.title}</p>
          <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
            {latestChapter.content.slice(0, 120)}…
          </p>
        </div>

        {/* Author */}
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ background: story.author.color + "33", border: `1.5px solid ${story.author.color}50` }}
          >
            {story.author.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-white truncate">{story.author.name}</p>
            <p className="text-[10px] text-slate-500 truncate">
              {story.author.professionEmoji} {story.author.profession}
              {story.wall && <span className="text-slate-600"> · {story.wall}</span>}
            </p>
          </div>
          <span className="text-[9px] text-slate-600">{story.lastUpdate}</span>
        </div>
      </div>

      {/* Action footer */}
      <div
        className="flex gap-2 px-4 pb-4 pt-3 border-t border-white/[0.05]"
        onClick={e => e.stopPropagation()}
      >
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onSave}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all border ${
            saved
              ? "text-amber-300 border-amber-500/30 bg-amber-500/10"
              : "text-slate-500 border-white/[0.07] bg-white/[0.03] hover:text-slate-300 hover:border-white/[0.14]"
          }`}
        >
          <Bookmark size={10} fill={saved ? "currentColor" : "none"} />
          {fmtCount(story.savedCount + (saved ? 1 : 0))}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onFollow}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all border flex-1 justify-center ${
            followed
              ? "border-green-500/25 text-green-400 bg-green-500/10"
              : "text-slate-500 border-white/[0.07] bg-white/[0.03] hover:text-slate-300 hover:border-white/[0.14]"
          }`}
        >
          <Bell size={10} fill={followed ? "currentColor" : "none"} />
          {followed ? "Following" : `Follow · ${fmtCount(story.followerCount)}`}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => {}}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold text-slate-500 border border-white/[0.07] bg-white/[0.03] hover:text-slate-300 hover:border-white/[0.14] transition-all"
        >
          <Share2 size={10} />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Left sidebar ──────────────────────────────────────────────

function LeftSidebar({ category, setCategory, sort, setSort }: {
  category: StoryCategory | "all";
  setCategory: (c: StoryCategory | "all") => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
}) {
  return (
    <aside className="w-52 shrink-0 flex flex-col gap-4">
      {/* Categories */}
      <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
        <div className="px-3 pt-3 pb-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Categories</span>
        </div>
        <div className="p-1.5 flex flex-col gap-0.5 max-h-[360px] overflow-y-auto">
          <button
            onClick={() => setCategory("all")}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-all text-left ${
              category === "all"
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            }`}
          >
            <BookOpen size={11} className={category === "all" ? "text-indigo-400" : "text-slate-600"} />
            All Stories
          </button>
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`w-full px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-all text-left ${
                category === cat
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
        <div className="px-3 pt-3 pb-1 flex items-center gap-1.5">
          <SlidersHorizontal size={9} className="text-slate-600" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Sort By</span>
        </div>
        <div className="p-1.5 flex flex-col gap-0.5">
          {SORT_OPTIONS.map(s => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`w-full px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-all text-left ${
                sort === s.key
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Profession filter */}
      <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
        <div className="px-3 pt-3 pb-2 flex items-center gap-1.5">
          <Layers size={9} className="text-slate-600" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">By Profession</span>
        </div>
        <div className="px-2 pb-2 flex flex-col gap-0.5">
          {[
            { emoji: "🚀", label: "Founders",   count: 2 },
            { emoji: "💻", label: "Developers",  count: 2 },
            { emoji: "🩺", label: "Nurses",      count: 1 },
            { emoji: "🎵", label: "Musicians",   count: 1 },
            { emoji: "🏆", label: "Athletes",    count: 1 },
            { emoji: "🔧", label: "Plumbers",    count: 1 },
          ].map(({ emoji, label, count }) => (
            <button key={label} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/[0.04] transition-colors text-left">
              <span className="text-[12px]">{emoji}</span>
              <span className="flex-1 text-[11px] text-slate-400">{label}</span>
              <span className="text-[10px] font-bold text-slate-600">{count}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

// ── Right sidebar ─────────────────────────────────────────────

function RightSidebar({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const trending = STORIES.filter(s => s.featured).slice(0, 3);

  return (
    <aside className="w-60 shrink-0 flex flex-col gap-4">
      {/* Trending */}
      <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
        <div className="px-4 pt-3.5 pb-2 flex items-center gap-1.5">
          <TrendingUp size={10} className="text-slate-500" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Trending Stories</span>
        </div>
        <div className="p-2 flex flex-col gap-1">
          {trending.map((s, i) => (
            <button key={s.id} onClick={() => navigate(`/stories/${s.id}`)}
              className="w-full flex items-start gap-2.5 px-2.5 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors text-left group">
              <span className="text-[13px] font-black shrink-0 mt-0.5" style={{ color: s.accentColor }}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-slate-300 group-hover:text-white transition-colors leading-snug line-clamp-2">
                  {s.title}
                </p>
                <p className="text-[9px] text-slate-600 mt-0.5">{fmtCount(s.savedCount)} saves</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Agent picks */}
      <div className="bg-[#1c1f2e] border border-indigo-500/15 rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
        <div className="px-4 pt-3.5 pb-2 flex items-center gap-1.5">
          <Sparkles size={10} className="text-indigo-400" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">P1 Recommends</span>
        </div>
        <div className="px-3 pb-3">
          {[
            { id: "pipes-to-product",    label: "A founder's story — relevant to your goals" },
            { id: "code-at-40",          label: "Learning a new craft — resonates with your cycle" },
            { id: "invisible-excellence",label: "On craft and mastery — worth reading" },
          ].map(({ id, label }) => {
            const s = STORIES.find(st => st.id === id);
            if (!s) return null;
            return (
              <button key={id} onClick={() => navigate(`/stories/${s.id}`)}
                className="w-full flex items-start gap-2 py-2 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] -mx-1 px-1 rounded-lg transition-colors text-left">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: s.accentColor }} />
                <div>
                  <p className="text-[11px] font-semibold text-slate-300 leading-snug">{s.title}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{label}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl p-4"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
        <div className="flex items-center gap-1.5 mb-3">
          <Users size={10} className="text-slate-500" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Story Stats</span>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { label: "Stories published",   value: "8",     color: "text-indigo-400" },
            { label: "Total saves",         value: "13.9K", color: "text-amber-400"  },
            { label: "Total followers",     value: "9.6K",  color: "text-green-400"  },
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

// ── Featured Story Banner ─────────────────────────────────────

function FeaturedBanner({ story, navigate }: { story: Story; navigate: ReturnType<typeof useNavigate> }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="relative rounded-2xl overflow-hidden cursor-pointer mb-6"
      style={{
        background: `linear-gradient(135deg, ${story.gradientFrom} 0%, ${story.gradientTo} 60%, ${story.accentColor}18 100%)`,
        border: `1px solid ${story.accentColor}35`,
        boxShadow: `0 16px 50px rgba(0,0,0,0.65), 0 1px 0 ${story.accentColor}20 inset`,
        minHeight: "160px",
      }}
      onClick={() => navigate(`/stories/${story.id}`)}
      whileHover={{ y: -3 }}
    >
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: story.accentColor }} />
      <div className="flex items-center gap-6 p-6">
        {/* Big number */}
        <div className="flex flex-col items-center justify-center shrink-0"
          style={{ width: "80px" }}>
          <span className="text-5xl font-black" style={{ color: story.accentColor }}>
            {story.chapters.length}
          </span>
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">chapters</span>
        </div>
        <div className="w-px self-stretch bg-white/[0.06]" />
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[story.category]}`}>
              {story.category}
            </span>
            <span className="text-[9px] font-bold text-amber-400 flex items-center gap-1">
              <Star size={8} fill="currentColor" /> Editor's Pick
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{story.title}</h2>
          <p className="text-[12px] text-slate-400 line-clamp-2 mb-3">{story.description}</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: story.author.color + "33", border: `1.5px solid ${story.author.color}50` }}>
                {story.author.initials}
              </div>
              <span className="text-[11px] text-slate-300">{story.author.name}</span>
            </div>
            <span className="text-[10px] text-slate-600">{fmtCount(story.savedCount)} saves</span>
            <span className="text-[10px] text-slate-600">{fmtCount(story.followerCount)} following</span>
          </div>
        </div>
        {/* CTA */}
        <button
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all hover:brightness-110"
          style={{ background: story.accentColor + "cc" }}
          onClick={e => { e.stopPropagation(); navigate(`/stories/${story.id}`); }}
        >
          Read Story <ChevronRight size={13} />
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function StoriesPage() {
  const navigate = useNavigate();
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState<StoryCategory | "all">("all");
  const [sort,     setSort]     = useState<SortKey>("trending");
  const [saved,    setSaved]    = useState<Set<string>>(new Set(["pipes-to-product"]));
  const [followed, setFollowed] = useState<Set<string>>(new Set(["night-shift-diaries"]));

  const toggleSave   = (id: string) => setSaved(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleFollow = (id: string) => setFollowed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const filtered = useMemo(() => {
    let list = STORIES.filter(s => {
      if (category !== "all" && s.category !== category) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.author.name.toLowerCase().includes(q) ||
          s.tags.some(t => t.includes(q)) ||
          s.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
    if (sort === "saved")     list = [...list].sort((a, b) => b.savedCount - a.savedCount);
    if (sort === "followed")  list = [...list].sort((a, b) => b.followerCount - a.followerCount);
    if (sort === "newest")    list = [...list].reverse();
    if (sort === "emotional") list = [...list].sort((a, b) => b.followerCount + b.savedCount - a.followerCount - a.savedCount);
    if (sort === "trending")  list = [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    return list;
  }, [category, sort, search]);

  const featuredStory = STORIES.find(s => s.featured && s.id === "pipes-to-product")!;

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-6 py-3 border-b border-white/[0.04]">
          <BackToCockpit />
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-indigo-400" />
            <h1 className="text-sm font-bold text-white">Stories</h1>
          </div>
          <span className="text-[10px] text-slate-600">·</span>
          <span className="text-[11px] text-slate-500">Real stories from real people</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => navigate("/stories/create")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors"
            >
              <BookOpen size={11} /> Write a Story
            </button>
          </div>
        </div>

        {/* Search row */}
        <div className="flex items-center gap-3 px-6 py-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search stories, authors, categories, tags…"
              className="w-full pl-8 pr-8 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                <X size={11} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <Filter size={10} />
            {category !== "all" && <span className="text-indigo-400 font-semibold">{category}</span>}
            {category === "all" && <span>All categories</span>}
          </div>
          <span className="ml-auto text-[10px] text-slate-600 font-medium">{filtered.length} stories</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex gap-6">

            {/* Left sidebar */}
            <LeftSidebar category={category} setCategory={setCategory} sort={sort} setSort={setSort} />

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Awards section — show when on "all" and no search */}
              {category === "all" && !search && <AwardsSection />}

              {/* Featured banner — show when on "all" and no search */}
              {category === "all" && !search && <FeaturedBanner story={featuredStory} navigate={navigate} />}

              {/* Grid */}
              {filtered.length > 0 ? (
                <div className="grid grid-cols-2 gap-5">
                  <AnimatePresence>
                    {filtered.map((story, i) => (
                      <motion.div
                        key={story.id}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i < 4 ? i * 0.07 : 0, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <StoryCard
                          story={story}
                          saved={saved.has(story.id)}
                          followed={followed.has(story.id)}
                          onSave={() => toggleSave(story.id)}
                          onFollow={() => toggleFollow(story.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <BookOpen size={28} className="text-slate-700" />
                  <p className="text-sm text-slate-500">No stories match your search.</p>
                  <button onClick={() => { setSearch(""); setCategory("all"); }} className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <RightSidebar navigate={navigate} />
          </div>
        </div>
        <div className="h-8" />
      </div>
    </div>
  );
}
