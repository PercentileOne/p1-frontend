import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search, Pin, Bell, BellOff, EyeOff, Users, Layers,
  ChevronRight, X, Sparkles, Globe, GraduationCap, UsersRound,
  Check,
} from "lucide-react";
import BackToCockpit from "../components/BackToCockpit";

/* ══════════════════════════════════════════════════════════════
   P1 WALL EXPLORER
   ══════════════════════════════════════════════════════════════ */

type WallType = "profession" | "university" | "group";
type FilterTab = "all" | WallType;

interface Wall {
  id: string;
  name: string;
  description: string;
  emoji: string;
  type: WallType;
  members: number;
  accent: string;      // hex accent colour
  bg: string;          // tailwind gradient classes
  featured?: boolean;
}

// ── Data ─────────────────────────────────────────────────────

const PROFESSION_WALLS: Wall[] = [
  { id: "founders",      name: "Founders' Wall",       emoji: "🚀", description: "Building from nothing — stories, wins, and the hard truths",              type: "profession", members: 18_900, accent: "#f59e0b", bg: "from-amber-900/50 to-amber-800/25",    featured: true  },
  { id: "developers",    name: "Developers' Wall",      emoji: "💻", description: "Code, careers, open source, and the craft of software",                   type: "profession", members: 47_200, accent: "#6366f1", bg: "from-indigo-900/50 to-indigo-800/25",  featured: true  },
  { id: "designers",     name: "Designers' Wall",       emoji: "🎨", description: "Visual thinking, craft, aesthetics, and design systems",                  type: "profession", members: 31_400, accent: "#ec4899", bg: "from-pink-900/50 to-pink-800/25"               },
  { id: "nurses",        name: "Nurses' Wall",          emoji: "🩺", description: "NHS, private, and global nursing — stories from the front line",          type: "profession", members: 62_100, accent: "#10b981", bg: "from-emerald-900/50 to-emerald-800/25"         },
  { id: "musicians",     name: "Musicians' Wall",       emoji: "🎵", description: "Artists, producers, session players, and music professionals",            type: "profession", members: 28_700, accent: "#8b5cf6", bg: "from-violet-900/50 to-violet-800/25"           },
  { id: "chefs",         name: "Chefs' Wall",           emoji: "👨‍🍳", description: "Kitchen culture, Michelin moments, and restaurant life",                  type: "profession", members: 19_300, accent: "#f97316", bg: "from-orange-900/50 to-orange-800/25"           },
  { id: "teachers",      name: "Teachers' Wall",        emoji: "📚", description: "Education, classroom stories, pedagogy, and the future of learning",      type: "profession", members: 43_800, accent: "#06b6d4", bg: "from-cyan-900/50 to-cyan-800/25"               },
  { id: "electricians",  name: "Electricians' Wall",    emoji: "⚡", description: "Trades, certifications, regulations, and work stories",                   type: "profession", members: 22_600, accent: "#eab308", bg: "from-yellow-900/50 to-yellow-800/25"           },
  { id: "plumbers",      name: "Plumbers' Wall",        emoji: "🔧", description: "The trade, the life, and the community behind the pipes",                  type: "profession", members: 17_400, accent: "#94a3b8", bg: "from-slate-800/60 to-slate-700/35"             },
  { id: "athletes",      name: "Athletes' Wall",        emoji: "🏆", description: "Professional and amateur sport — performance, grit, and recovery",        type: "profession", members: 35_100, accent: "#22c55e", bg: "from-green-900/50 to-green-800/25"             },
  { id: "lawyers",       name: "Lawyers' Wall",         emoji: "⚖️", description: "Law, practice areas, and the professional life behind the bar",           type: "profession", members: 24_500, accent: "#a78bfa", bg: "from-purple-900/50 to-purple-800/25"           },
  { id: "architects",    name: "Architects' Wall",      emoji: "🏛️", description: "Design, structure, planning, and the built environment",                  type: "profession", members: 13_900, accent: "#fb923c", bg: "from-orange-900/40 to-amber-800/25"            },
];

const UNIVERSITY_WALLS: Wall[] = [
  { id: "oxford",     name: "University of Oxford",    emoji: "🎓", description: "One of the world's oldest and most prestigious research institutions",    type: "university", members: 89_200, accent: "#1d4ed8", bg: "from-blue-950/70 to-blue-900/40",   featured: true },
  { id: "cambridge",  name: "University of Cambridge", emoji: "🎓", description: "Excellence in research and learning since 1209",                          type: "university", members: 84_600, accent: "#7e22ce", bg: "from-purple-950/70 to-purple-900/40"              },
  { id: "ucl",        name: "University College London", emoji: "🎓", description: "London's global research university — radical and independent",         type: "university", members: 76_300, accent: "#b91c1c", bg: "from-red-950/70 to-red-900/40"                    },
  { id: "imperial",   name: "Imperial College London", emoji: "🎓", description: "Science, engineering, medicine, and business at the frontier",            type: "university", members: 52_800, accent: "#0369a1", bg: "from-sky-950/70 to-sky-900/40"                    },
  { id: "manchester", name: "University of Manchester", emoji: "🎓", description: "Research excellence and innovation in the heart of Manchester",           type: "university", members: 91_400, accent: "#9f1239", bg: "from-rose-950/70 to-rose-900/40"                  },
  { id: "edinburgh",  name: "University of Edinburgh", emoji: "🎓", description: "Scotland's ancient and globally ranked research university",              type: "university", members: 67_200, accent: "#166534", bg: "from-green-950/70 to-green-900/40"                },
  { id: "harvard",    name: "Harvard University",      emoji: "🎓", description: "The world's most renowned academic institution, founded 1636",            type: "university", members: 142_800, accent: "#991b1b", bg: "from-red-950/70 to-red-900/40", featured: true },
  { id: "mit",        name: "MIT",                     emoji: "🎓", description: "Technology, science, and innovation at the very edge of the possible",   type: "university", members: 108_500, accent: "#7f1d1d", bg: "from-red-950/70 to-red-900/40"                    },
];

const GROUP_WALLS: Wall[] = [
  { id: "ai-builders-uk",     name: "AI Builders UK",          emoji: "🤖", description: "Developers and founders building AI products in the UK",                type: "group", members: 4_200, accent: "#6366f1", bg: "from-indigo-900/50 to-indigo-800/25", featured: true },
  { id: "nhs-night-shift",    name: "NHS Night Shift Crew",    emoji: "🌙", description: "The unsung heroes of overnight healthcare — real stories",              type: "group", members: 8_700, accent: "#10b981", bg: "from-emerald-900/50 to-emerald-800/25"               },
  { id: "plumbers-london",    name: "Plumbers of London",      emoji: "🔧", description: "Tight-knit trade community for London-based plumbers",                  type: "group", members: 1_900, accent: "#94a3b8", bg: "from-slate-800/60 to-slate-700/35"                   },
  { id: "musicians-who-code", name: "Musicians Who Code",      emoji: "🎸", description: "Where music production meets software engineering",                    type: "group", members: 3_400, accent: "#8b5cf6", bg: "from-violet-900/50 to-violet-800/25"                  },
  { id: "remote-founders-eu", name: "Remote Founders EU",      emoji: "🌍", description: "European founders building remote-first companies across borders",     type: "group", members: 6_100, accent: "#f59e0b", bg: "from-amber-900/50 to-amber-800/25"                    },
];

const ALL_WALLS: Wall[] = [...PROFESSION_WALLS, ...UNIVERSITY_WALLS, ...GROUP_WALLS];

// ── Helpers ───────────────────────────────────────────────────

function fmtMembers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

const TYPE_META: Record<WallType, { label: string; icon: React.ReactNode; color: string }> = {
  profession: { label: "Profession", icon: <Layers size={9} />,        color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  university: { label: "University", icon: <GraduationCap size={9} />, color: "text-amber-400 bg-amber-500/10 border-amber-500/20"   },
  group:      { label: "Group",      icon: <UsersRound size={9} />,    color: "text-green-400 bg-green-500/10 border-green-500/20"    },
};

const TABS: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
  { key: "all",        label: "All Walls",   icon: <Globe size={11} />        },
  { key: "profession", label: "Professions", icon: <Layers size={11} />       },
  { key: "university", label: "Universities",icon: <GraduationCap size={11} />},
  { key: "group",      label: "Groups",      icon: <UsersRound size={11} />   },
];

// ── WallTile ─────────────────────────────────────────────────

function WallTile({
  wall,
  pinned,
  followed,
  onPin,
  onFollow,
  onHide,
  onOpen,
}: {
  wall: Wall;
  pinned: boolean;
  followed: boolean;
  onPin: () => void;
  onFollow: () => void;
  onHide: () => void;
  onOpen: () => void;
}) {
  const [justPinned,    setJustPinned]    = useState(false);
  const [justFollowed,  setJustFollowed]  = useState(false);

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPin();
    if (!pinned) { setJustPinned(true); setTimeout(() => setJustPinned(false), 1400); }
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFollow();
    if (!followed) { setJustFollowed(true); setTimeout(() => setJustFollowed(false), 1400); }
  };

  const handleHide = (e: React.MouseEvent) => {
    e.stopPropagation();
    onHide();
  };

  const meta = TYPE_META[wall.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={onOpen}
      className={`relative flex flex-col rounded-2xl overflow-hidden cursor-pointer bg-gradient-to-br ${wall.bg} border border-white/[0.07]`}
      style={{
        boxShadow: `0 10px 36px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06) inset, 0 -1px 0 rgba(0,0,0,0.4) inset`,
      }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl" style={{ background: wall.accent + "60" }} />

      {/* Pin indicator */}
      {pinned && (
        <div
          className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: wall.accent + "25", border: `1px solid ${wall.accent}40` }}
        >
          <Pin size={9} style={{ color: wall.accent }} />
        </div>
      )}

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 pb-3">
        {/* Type badge */}
        <div className="mb-3">
          <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${meta.color}`}>
            {meta.icon} {meta.label}
          </span>
        </div>

        {/* Emoji + name */}
        <div className="flex items-start gap-3 mb-2">
          <span className="text-3xl leading-none shrink-0">{wall.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white leading-snug">{wall.name}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2 flex-1">
          {wall.description}
        </p>

        {/* Member count */}
        <div className="flex items-center gap-1.5 mt-3 mb-3">
          <Users size={10} className="text-slate-500" />
          <span className="text-[10px] font-semibold text-slate-400">
            {fmtMembers(wall.members)} members
          </span>
          {wall.featured && (
            <span className="ml-auto flex items-center gap-0.5 text-[9px] font-bold text-amber-400">
              <Sparkles size={8} /> Featured
            </span>
          )}
        </div>
      </div>

      {/* Action footer */}
      <div
        className="flex gap-1.5 px-3 pb-3 pt-2 border-t border-white/[0.05]"
        onClick={e => e.stopPropagation()}
      >
        {/* Pin */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={handlePin}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all border ${
            pinned
              ? "border-white/[0.12] text-white"
              : "bg-white/[0.04] border-white/[0.07] text-slate-500 hover:text-slate-300 hover:border-white/[0.14]"
          }`}
          style={pinned ? { background: wall.accent + "22", borderColor: wall.accent + "40", color: wall.accent } : {}}
        >
          <AnimatePresence mode="wait" initial={false}>
            {justPinned ? (
              <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Check size={9} />
              </motion.span>
            ) : (
              <motion.span key="pin" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Pin size={9} />
              </motion.span>
            )}
          </AnimatePresence>
          {pinned ? "Pinned" : "Pin"}
        </motion.button>

        {/* Follow */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={handleFollow}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all border flex-1 justify-center ${
            followed
              ? "border-green-500/30 text-green-400 bg-green-500/10"
              : "bg-white/[0.04] border-white/[0.07] text-slate-500 hover:text-slate-300 hover:border-white/[0.14]"
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {justFollowed ? (
              <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Check size={9} />
              </motion.span>
            ) : followed ? (
              <motion.span key="bellow" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <BellOff size={9} />
              </motion.span>
            ) : (
              <motion.span key="bell" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Bell size={9} />
              </motion.span>
            )}
          </AnimatePresence>
          {followed ? "Following" : "Follow"}
        </motion.button>

        {/* Hide */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={handleHide}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold bg-white/[0.03] border border-white/[0.06] text-slate-600 hover:text-slate-400 hover:border-white/[0.12] transition-all"
          title="Hide this wall"
        >
          <EyeOff size={9} />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Wall Detail Modal (stub) ──────────────────────────────────

function WallModal({ wall, onClose }: { wall: Wall; onClose: () => void }) {
  const meta = TYPE_META[wall.type];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl overflow-hidden bg-gradient-to-br ${wall.bg} border border-white/[0.09]`}
        style={{ boxShadow: `0 28px 80px rgba(0,0,0,0.75), 0 1px 0 rgba(255,255,255,0.07) inset` }}
      >
        {/* Top accent */}
        <div className="h-[3px]" style={{ background: wall.accent }} />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4">
          <div className="flex items-start gap-4">
            <span className="text-5xl leading-none">{wall.emoji}</span>
            <div>
              <div className="mb-1.5">
                <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${meta.color}`}>
                  {meta.icon} {meta.label}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white leading-tight">{wall.name}</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">{wall.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/[0.08] text-slate-500 hover:text-white transition-colors shrink-0 mt-0.5"
          >
            <X size={14} />
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex gap-0 border-t border-b border-white/[0.07] mx-6 mb-4 rounded-xl overflow-hidden">
          {[
            { label: "Members",  value: fmtMembers(wall.members)   },
            { label: "Posts today", value: `${Math.floor(wall.members / 120)}`  },
            { label: "Active now",  value: `${Math.floor(wall.members / 800)}`  },
          ].map(({ label, value }, i) => (
            <div key={label} className={`flex-1 text-center py-3 ${i > 0 ? "border-l border-white/[0.07]" : ""}`}>
              <p className="text-[15px] font-bold text-white">{value}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Sample posts preview */}
        <div className="px-6 pb-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Recent Posts</p>
          <div className="space-y-2">
            {[
              `Just hit a major milestone in the ${wall.name.replace("'s Wall", "").replace(" Wall", "").replace("University of ", "").replace("University", "")} community. Grateful for everyone here 🙌`,
              `Question for the group — what's the biggest challenge you've faced this year?`,
              `Sharing a resource that changed everything for me. Worth reading if you're in this field.`,
            ].map((text, i) => (
              <div key={i} className="flex gap-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                <div
                  className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ background: wall.accent + "40" }}
                >
                  {String.fromCharCode(65 + i)}
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            className="mt-4 w-full py-2.5 rounded-xl text-[12px] font-bold text-white transition-all flex items-center justify-center gap-2 hover:brightness-110"
            style={{ background: wall.accent + "cc" }}
            onClick={onClose}
          >
            Open Wall <ChevronRight size={13} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function WallsPage() {
  const navigate = useNavigate();

  const [tab,     setTab]     = useState<FilterTab>("all");
  const [search,  setSearch]  = useState("");
  const [pinned,  setPinned]  = useState<Set<string>>(new Set(["founders"]));
  const [followed,setFollowed]= useState<Set<string>>(new Set(["founders", "ai-builders-uk"]));
  const [hidden,  setHidden]  = useState<Set<string>>(new Set());
  const [openWall,setOpenWall]= useState<Wall | null>(null);

  const togglePin    = (id: string) => setPinned(prev  => { const n = new Set(prev);  n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleFollow = (id: string) => setFollowed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const hideWall     = (id: string) => setHidden(prev  => new Set(prev).add(id));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ALL_WALLS.filter(w => {
      if (hidden.has(w.id)) return false;
      if (tab !== "all" && w.type !== tab) return false;
      if (q && !w.name.toLowerCase().includes(q) && !w.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tab, search, hidden]);

  const pinnedWalls  = filtered.filter(w => pinned.has(w.id));
  const unpinnedWalls = filtered.filter(w => !pinned.has(w.id));

  const totalPinned   = [...ALL_WALLS].filter(w => pinned.has(w.id)).length;
  const totalFollowed = [...ALL_WALLS].filter(w => followed.has(w.id)).length;

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 flex flex-col">

      {/* ── Sticky Header ───────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06]">

        {/* Title row */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <BackToCockpit />
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.25)" }}
              >
                <Layers size={14} className="text-indigo-400" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white leading-none">Wall Explorer</h1>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Discover every profession, university, and group
                </p>
              </div>
            </div>
          </div>

          {/* Stats chips */}
          <div className="flex items-center gap-2">
            {totalPinned > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[10px] text-slate-400">
                <Pin size={9} className="text-indigo-400" />
                {totalPinned} pinned
              </div>
            )}
            {totalFollowed > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[10px] text-slate-400">
                <Bell size={9} className="text-green-400" />
                {totalFollowed} following
              </div>
            )}
          </div>
        </div>

        {/* Search + Tabs row */}
        <div className="flex items-center gap-3 px-6 py-2.5">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search walls…"
              className="w-full pl-8 pr-8 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  tab === t.key
                    ? "bg-indigo-600 text-white"
                    : "bg-white/[0.03] text-slate-400 hover:text-slate-300 hover:bg-white/[0.06]"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Result count */}
          <span className="text-[10px] text-slate-600 ml-auto font-medium">
            {filtered.length} wall{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6 space-y-8">

          {/* Your Walls (pinned) */}
          {pinnedWalls.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Pin size={11} className="text-indigo-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Your Pinned Walls
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <AnimatePresence>
                  {pinnedWalls.map(w => (
                    <WallTile
                      key={w.id}
                      wall={w}
                      pinned={pinned.has(w.id)}
                      followed={followed.has(w.id)}
                      onPin={() => togglePin(w.id)}
                      onFollow={() => toggleFollow(w.id)}
                      onHide={() => hideWall(w.id)}
                      onOpen={() => setOpenWall(w)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* Following banner */}
          {totalFollowed > 0 && tab === "all" && !search && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/8 border border-green-500/15">
              <Bell size={13} className="text-green-400 shrink-0" />
              <p className="text-[11px] text-green-300">
                You're following <span className="font-bold text-green-200">{totalFollowed} wall{totalFollowed !== 1 ? "s" : ""}</span>.
                Posts from these walls appear in your Feed.
              </p>
              <button
                onClick={() => navigate("/feed")}
                className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-green-400 hover:text-green-300 transition-colors shrink-0"
              >
                View Feed <ChevronRight size={10} />
              </button>
            </div>
          )}

          {/* Featured / All walls */}
          {unpinnedWalls.length > 0 ? (
            <>
              {/* Featured row (when All tab, no search) */}
              {tab === "all" && !search && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={11} className="text-amber-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Featured
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <AnimatePresence>
                      {unpinnedWalls.filter(w => w.featured).map(w => (
                        <WallTile
                          key={w.id}
                          wall={w}
                          pinned={pinned.has(w.id)}
                          followed={followed.has(w.id)}
                          onPin={() => togglePin(w.id)}
                          onFollow={() => toggleFollow(w.id)}
                          onHide={() => hideWall(w.id)}
                          onOpen={() => setOpenWall(w)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </section>
              )}

              {/* Full grid */}
              <section>
                {tab === "all" && !search && (
                  <div className="flex items-center gap-2 mb-3">
                    <Globe size={11} className="text-slate-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      All Walls
                    </span>
                  </div>
                )}
                {(tab !== "all" || search) && (
                  <div className="flex items-center gap-2 mb-3">
                    <Globe size={11} className="text-slate-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {filtered.length} Result{filtered.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-4 gap-4">
                  <AnimatePresence>
                    {(tab === "all" && !search ? unpinnedWalls.filter(w => !w.featured) : unpinnedWalls).map(w => (
                      <WallTile
                        key={w.id}
                        wall={w}
                        pinned={pinned.has(w.id)}
                        followed={followed.has(w.id)}
                        onPin={() => togglePin(w.id)}
                        onFollow={() => toggleFollow(w.id)}
                        onHide={() => hideWall(w.id)}
                        onOpen={() => setOpenWall(w)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            </>
          ) : (
            !pinnedWalls.length && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Globe size={28} className="text-slate-700" />
                <p className="text-sm text-slate-500">No walls match your search.</p>
                <button
                  onClick={() => { setSearch(""); setTab("all"); }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Clear filters
                </button>
              </div>
            )
          )}

          {/* Hidden walls restore */}
          {hidden.size > 0 && (
            <div className="flex items-center justify-center gap-2 pt-4 pb-2">
              <span className="text-[10px] text-slate-600">
                {hidden.size} wall{hidden.size !== 1 ? "s" : ""} hidden
              </span>
              <button
                onClick={() => setHidden(new Set())}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors font-semibold"
              >
                Restore all
              </button>
            </div>
          )}

        </div>
        <div className="h-8" />
      </div>

      {/* ── Wall Detail Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {openWall && (
          <WallModal wall={openWall} onClose={() => setOpenWall(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
