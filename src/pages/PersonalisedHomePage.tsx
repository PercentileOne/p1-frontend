import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, BookOpen, Bookmark, ChevronRight,
  Users, Trophy, Bot,
  RefreshCw, SlidersHorizontal, X, Check, Plus,
  ArrowRight,
} from "lucide-react";
import BackToCockpit from "../components/BackToCockpit";
import { SmallAwardBadge } from "../components/AwardTiles";
import {
  buildPersonalisedHome,
  type PersonalisedModule,
  type BehaviourSignals,
} from "../lib/personalisationEngine";
import { OWN_PROFILE } from "../lib/profileData";

/* ══════════════════════════════════════════════════════════════
   P1 PERSONALISED HOME PAGE — /home
   ══════════════════════════════════════════════════════════════ */

const EASE = [0.4, 0, 0.2, 1] as const;

// Default behaviour signals (would come from real tracking in production)
const DEFAULT_BEHAVIOUR: BehaviourSignals = {
  savedTags:        ["stoicism", "startups", "resilience"],
  readTags:         ["coding", "mindset", "career-change"],
  ignoredTags:      [],
  interactedGroups: ["g4", "g1"],
  recentSearchTerms:[],
};

function fmtNum(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

// ── Shared card shell ─────────────────────────────────────────

function ModuleCard({
  children, accent = "#6366f1", className = "",
  onClick, hover = true,
}: {
  children: React.ReactNode;
  accent?: string;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      onClick={onClick}
      className={`relative rounded-2xl overflow-hidden ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{
        background: "linear-gradient(150deg, #1c1f2e 0%, #141720 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: `0 8px 28px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06) inset, 0 -1px 0 rgba(0,0,0,0.3) inset`,
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}80, transparent)` }} />
      {children}
    </motion.div>
  );
}

function ModuleHeader({ emoji, label, score, accent, action }: {
  emoji: string; label: string; score?: number; accent: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="text-[16px]">{emoji}</span>
        <h3 className="text-[12px] font-bold text-white uppercase tracking-wide">{label}</h3>
        {score !== undefined && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-lg"
            style={{ color: accent, background: accent + "18", border: `1px solid ${accent}25` }}>
            {score}% match
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MODULE COMPONENTS
   ══════════════════════════════════════════════════════════════ */

// ── 1. Daily Insight ─────────────────────────────────────────

function DailyInsightModule({ mod }: { mod: PersonalisedModule }) {
  const d = mod.dailyInsight!;
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="relative rounded-3xl overflow-hidden col-span-2"
      style={{
        background: `linear-gradient(135deg, ${d.accentColor}18 0%, #0f1117 60%, #0a0c14 100%)`,
        border: `1px solid ${d.accentColor}30`,
        boxShadow: `0 16px 48px rgba(0,0,0,0.7), 0 0 80px ${d.accentColor}08, 0 1px 0 ${d.accentColor}20 inset`,
      }}
    >
      {/* Accent band */}
      <div className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, transparent, ${d.accentColor}, transparent)` }} />

      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-40 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top right, ${d.accentColor}12 0%, transparent 70%)` }} />

      <div className="p-7 flex items-center gap-8">
        {/* Big emoji */}
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 2 }}
          className="text-5xl shrink-0"
        >
          {d.emoji}
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Bot size={11} style={{ color: d.accentColor }} />
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: d.accentColor + "aa" }}>
              Daily Insight · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white leading-snug mb-2">{d.message}</h2>
          <p className="text-[13px] text-slate-400 leading-relaxed mb-4">{d.subtext}</p>
          {d.cta && (
            <p className="text-[11px] text-slate-500 italic leading-relaxed">{d.cta}</p>
          )}
        </div>

        <div className="shrink-0 flex flex-col gap-2">
          <button onClick={() => navigate("/interests")}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-bold text-white transition-all hover:brightness-110"
            style={{ background: d.accentColor }}>
            <Sparkles size={11} /> Update Interests
          </button>
          <button onClick={() => navigate("/profile")}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-semibold border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.18] transition-all">
            <Users size={11} /> View Profile
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── 2. Agent Picks ────────────────────────────────────────────

function AgentPicksModule({ mod }: { mod: PersonalisedModule }) {
  const picks = mod.agentPicks!;
  const navigate = useNavigate();

  return (
    <ModuleCard accent="#8b5cf6">
      <div className="p-5">
        <ModuleHeader emoji="🤖" label="Agent Picks" score={mod.score} accent="#8b5cf6"
          action={<Bot size={12} className="text-violet-500" />} />

        <div className="space-y-3">
          {picks.story && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition-colors"
              onClick={() => navigate(`/stories/${picks.story!.id}`)}>
              <BookOpen size={13} className="text-violet-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wide mb-0.5">Story</p>
                <p className="text-[12px] font-semibold text-white leading-snug">{picks.story.title}</p>
                <p className="text-[10px] text-slate-500">{picks.story.author.name}</p>
              </div>
              <ChevronRight size={12} className="text-slate-600 shrink-0 mt-1" />
            </div>
          )}
          {picks.quote && (
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wide mb-1.5">Quote</p>
              <blockquote className="text-[11px] italic text-slate-300 leading-relaxed border-l-2 border-violet-500/40 pl-2.5">
                "{picks.quote.text.slice(0, 110)}{picks.quote.text.length > 110 ? "…" : ""}"
              </blockquote>
              <p className="text-[9px] text-slate-600 mt-1 pl-2.5">— {picks.quote.author}</p>
            </div>
          )}
          {picks.wallName && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition-colors"
              onClick={() => navigate("/walls")}>
              <span className="text-[16px]">{picks.wallEmoji}</span>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: picks.wallAccent ?? "#8b5cf6" }}>Suggested Wall</p>
                <p className="text-[12px] font-semibold text-white">{picks.wallName}</p>
              </div>
              <ChevronRight size={12} className="text-slate-600" />
            </div>
          )}
          {picks.groupName && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition-colors">
              <span className="text-[16px]">{picks.groupEmoji}</span>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wide mb-0.5">Suggested Group</p>
                <p className="text-[12px] font-semibold text-white">{picks.groupName}</p>
              </div>
              <Plus size={12} className="text-slate-600" />
            </div>
          )}
          <div className="p-3 rounded-xl bg-violet-500/[0.07] border border-violet-500/15">
            <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wide mb-1">Insight</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">{picks.insight}</p>
          </div>
        </div>
      </div>
    </ModuleCard>
  );
}

// ── 3. Wisdom Wall ────────────────────────────────────────────

function WisdomModule({ mod }: { mod: PersonalisedModule }) {
  const [idx, setIdx] = useState(0);
  const quotes = mod.quotes!;
  const q = quotes[idx];

  return (
    <ModuleCard accent={q.accentColor}>
      <div className="p-5">
        <ModuleHeader emoji="💬" label="Wisdom Wall" score={mod.score} accent={q.accentColor}
          action={
            <button onClick={() => setIdx(i => (i + 1) % quotes.length)}
              className="text-slate-600 hover:text-slate-300 transition-colors p-1">
              <RefreshCw size={11} />
            </button>
          } />

        <AnimatePresence mode="wait">
          <motion.div key={idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="rounded-2xl p-5 mb-4"
            style={{
              background: `linear-gradient(150deg, ${q.gradientFrom} 0%, ${q.gradientTo} 100%)`,
              border: `1px solid ${q.accentColor}25`,
              boxShadow: `0 6px 20px rgba(0,0,0,0.5), 0 1px 0 ${q.accentColor}18 inset`,
            }}
          >
            <div className="text-4xl font-black mb-3 opacity-20" style={{ color: q.accentColor, lineHeight: 1 }}>"</div>
            <p className="text-[14px] italic font-medium text-white leading-relaxed mb-3">"{q.text}"</p>
            <p className="text-[10px] text-slate-500 font-semibold">— {q.author}</p>
          </motion.div>
        </AnimatePresence>

        {/* Dot nav */}
        <div className="flex items-center justify-center gap-1.5">
          {quotes.slice(0, 6).map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className="rounded-full transition-all"
              style={{
                width: i === idx ? "20px" : "6px",
                height: "6px",
                background: i === idx ? q.accentColor : "rgba(255,255,255,0.1)",
              }} />
          ))}
        </div>
      </div>
    </ModuleCard>
  );
}

// ── 4. Story Recommendations ──────────────────────────────────

function StoriesModule({ mod }: { mod: PersonalisedModule }) {
  const navigate = useNavigate();
  const stories = mod.stories!;
  const [saved, setSaved] = useState<Set<string>>(new Set());

  return (
    <ModuleCard accent="#8b5cf6">
      <div className="p-5">
        <ModuleHeader emoji="📖" label="Story Recommendations" score={mod.score} accent="#8b5cf6"
          action={<button onClick={() => navigate("/stories")} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-violet-400 transition-colors">See all <ChevronRight size={10} /></button>} />

        <div className="flex flex-col gap-3">
          {stories.map((s, i) => (
            <motion.div key={s.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.07, ease: EASE }}
              className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer hover:bg-white/[0.04] transition-colors"
              style={{ borderColor: s.accentColor + "20", background: s.accentColor + "06" }}
              onClick={() => navigate(`/stories/${s.id}`)}
            >
              <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: s.accentColor + "80" }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border"
                    style={{ color: s.accentColor, background: s.accentColor + "15", borderColor: s.accentColor + "25" }}>
                    {s.category}
                  </span>
                </div>
                <p className="text-[12px] font-bold text-white leading-snug mb-0.5 truncate">{s.title}</p>
                <p className="text-[10px] text-slate-500">{s.author.professionEmoji} {s.author.name} · {s.chapters.length} chapters</p>
              </div>
              <motion.button whileTap={{ scale: 0.85 }}
                onClick={e => { e.stopPropagation(); setSaved(prev => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; }); }}
                className={`shrink-0 p-1.5 rounded-lg border transition-all ${saved.has(s.id) ? "text-amber-300 border-amber-500/30 bg-amber-500/10" : "text-slate-700 border-white/[0.07] hover:text-slate-300"}`}>
                <Bookmark size={10} fill={saved.has(s.id) ? "currentColor" : "none"} />
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>
    </ModuleCard>
  );
}

// ── 5. News ───────────────────────────────────────────────────

function NewsModule({ mod }: { mod: PersonalisedModule }) {
  const news = mod.news!.slice(0, 4);

  return (
    <ModuleCard accent="#0ea5e9">
      <div className="p-5">
        <ModuleHeader emoji="📡" label="Trending News" score={mod.score} accent="#0ea5e9" />
        <div className="flex flex-col gap-2">
          {news.map((n, i) => (
            <motion.div key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.06, ease: EASE }}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer border border-transparent hover:border-white/[0.07]"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[16px] shrink-0"
                style={{ background: n.accentColor + "18", border: `1px solid ${n.accentColor}25` }}>
                {n.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-white leading-snug mb-0.5 line-clamp-2">{n.headline}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold" style={{ color: n.accentColor }}>{n.source}</span>
                  <span className="text-[9px] text-slate-700">{n.timestamp}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </ModuleCard>
  );
}

// ── 6. Feed Highlights ────────────────────────────────────────

function FeedHighlightsModule({ mod }: { mod: PersonalisedModule }) {
  const navigate = useNavigate();
  const items = mod.feedHighlights!;

  return (
    <ModuleCard accent="#22c55e">
      <div className="p-5">
        <ModuleHeader emoji="📰" label="Feed Highlights" score={mod.score} accent="#22c55e"
          action={<button onClick={() => navigate("/feed")} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-green-400 transition-colors">Open feed <ArrowRight size={10} /></button>} />
        <div className="flex flex-col gap-3">
          {items.map((fh, i) => (
            <motion.div key={fh.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.28, delay: i * 0.06, ease: EASE }}
              className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12] cursor-pointer transition-all"
            >
              <div className="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ background: fh.authorColor + "33", border: `1px solid ${fh.authorColor}50` }}>
                {fh.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[10px] font-bold text-white">{fh.author}</p>
                  <span className="text-[9px] text-slate-700">{fh.timestamp}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">{fh.content}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[8px] text-slate-700 flex items-center gap-1">❤️ {fh.likes}</span>
                  <span className="text-[8px] text-slate-700">{fh.wall}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </ModuleCard>
  );
}

// ── 7. Wall Suggestions ───────────────────────────────────────

function WallSuggestionsModule({ mod }: { mod: PersonalisedModule }) {
  const navigate = useNavigate();
  const walls = mod.walls!;
  const [joined, setJoined] = useState<Set<string>>(new Set(["founders"]));

  return (
    <ModuleCard accent="#6366f1">
      <div className="p-5">
        <ModuleHeader emoji="🧱" label="Wall Suggestions" score={mod.score} accent="#6366f1"
          action={<button onClick={() => navigate("/walls")} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-indigo-400 transition-colors">Explore <ChevronRight size={10} /></button>} />
        <div className="grid grid-cols-2 gap-2">
          {walls.map((w, i) => (
            <motion.div key={w.wallId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.28, delay: i * 0.07, ease: EASE }}
              className="relative rounded-xl overflow-hidden p-3 cursor-pointer"
              style={{
                background: w.accent + "10",
                border: `1px solid ${w.accent}25`,
                boxShadow: `0 4px 14px rgba(0,0,0,0.4), 0 1px 0 ${w.accent}15 inset`,
              }}
              onClick={() => navigate("/walls")}
            >
              <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: w.accent + "60" }} />
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[16px]">{w.wallEmoji}</span>
                <motion.button whileTap={{ scale: 0.85 }}
                  onClick={e => { e.stopPropagation(); setJoined(prev => { const n = new Set(prev); n.has(w.wallId) ? n.delete(w.wallId) : n.add(w.wallId); return n; }); }}
                  className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all ${joined.has(w.wallId) ? "border-green-500/25 text-green-400 bg-green-500/10" : "border-white/[0.1] text-slate-500 hover:text-slate-200"}`}>
                  {joined.has(w.wallId) ? <Check size={9} /> : <Plus size={9} />}
                </motion.button>
              </div>
              <p className="text-[11px] font-semibold text-white leading-snug mb-1">{w.wallName}</p>
              <p className="text-[8px] text-slate-600">via {w.matchingInterests.slice(0, 1).join(", ")}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </ModuleCard>
  );
}

// ── 8. Group Suggestions ──────────────────────────────────────

function GroupSuggestionsModule({ mod }: { mod: PersonalisedModule }) {
  const groups = mod.groups!;
  const [joined, setJoined] = useState<Set<string>>(new Set(["g4"]));

  return (
    <ModuleCard accent="#14b8a6">
      <div className="p-5">
        <ModuleHeader emoji="👥" label="Group Suggestions" score={mod.score} accent="#14b8a6" />
        <div className="flex flex-col gap-2">
          {groups.map((g, i) => (
            <motion.div key={g.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.07, ease: EASE }}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] transition-all"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[18px] shrink-0"
                style={{ background: g.accent + "15", border: `1px solid ${g.accent}25` }}>
                {g.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white">{g.name}</p>
                <p className="text-[9px] text-slate-600">{fmtNum(g.members)} members · {g.postsToday} posts today</p>
              </div>
              <motion.button whileTap={{ scale: 0.88 }}
                onClick={() => setJoined(prev => { const n = new Set(prev); n.has(g.id) ? n.delete(g.id) : n.add(g.id); return n; })}
                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                  joined.has(g.id)
                    ? "text-green-400 border-green-500/25 bg-green-500/10"
                    : "text-slate-400 border-white/[0.1] hover:text-white"
                }`}>
                {joined.has(g.id) ? <><Check size={9} /> Joined</> : <><Plus size={9} /> Join</>}
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>
    </ModuleCard>
  );
}

// ── 9. Achievements ───────────────────────────────────────────

function AchievementsModule({ mod }: { mod: PersonalisedModule }) {
  const items = mod.achievements!;

  return (
    <ModuleCard accent="#f59e0b">
      <div className="p-5">
        <ModuleHeader emoji="🏅" label="Achievements" score={mod.score} accent="#f59e0b" />
        <div className="grid grid-cols-2 gap-2">
          {items.map((a, i) => (
            <motion.div key={a.id}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.28, delay: i * 0.06, ease: EASE }}
              className="relative flex flex-col items-center text-center p-3 rounded-xl"
              style={{
                background: a.accentColor + "0e",
                border: `1px solid ${a.accentColor}20`,
                boxShadow: `0 4px 14px rgba(0,0,0,0.4)`,
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: a.accentColor + "50" }} />
              {a.isNew && (
                <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-green-500 text-white">New</span>
              )}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-2"
                style={{ background: a.accentColor + "18", border: `1px solid ${a.accentColor}25` }}>
                {a.value
                  ? <span className="text-[13px] font-black" style={{ color: a.accentColor }}>{a.value}</span>
                  : <span>{a.emoji}</span>
                }
              </div>
              <p className="text-[10px] font-bold text-white mb-0.5">{a.title}</p>
              <p className="text-[8px] text-slate-600 leading-snug">{a.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </ModuleCard>
  );
}

// ── 10. Trending (award winners) ─────────────────────────────

function TrendingModule({ mod }: { mod: PersonalisedModule }) {
  const navigate = useNavigate();
  const winners = mod.awardWinners!;

  return (
    <ModuleCard accent="#f59e0b">
      <div className="p-5">
        <ModuleHeader emoji="🔥" label="Trending on P1" score={mod.score} accent="#f59e0b"
          action={<button onClick={() => navigate("/awards")} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-amber-400 transition-colors">Awards <Trophy size={10} /></button>} />
        <div className="flex flex-col gap-3">
          {winners.map((w, i) => (
            <motion.div key={w.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.28, delay: i * 0.08, ease: EASE }}
              className="flex items-start gap-3 cursor-pointer group"
              onClick={() => navigate(`/stories/${w.storyId}`)}
            >
              <span className="text-[18px] font-black shrink-0 mt-0.5" style={{ color: w.accentColor }}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-white group-hover:text-amber-200 transition-colors leading-snug mb-0.5">{w.storyTitle}</p>
                <p className="text-[9px] text-slate-600">{w.category} · {fmtNum(w.savedCount)} saves</p>
              </div>
              <SmallAwardBadge winner={w} showStory={false} />
            </motion.div>
          ))}
        </div>
      </div>
    </ModuleCard>
  );
}

// ── 11. Smart Picks placeholder ───────────────────────────────

function SmartPicksModule(_: { mod: PersonalisedModule }) {
  return (
    <ModuleCard accent="#94a3b8">
      <div className="p-5 flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-700/20 border border-white/[0.07] flex items-center justify-center text-2xl">🛍️</div>
        <div>
          <p className="text-[12px] font-bold text-slate-400">Smart Picks</p>
          <p className="text-[10px] text-slate-600 mt-1">Interest-based product recommendations coming soon.</p>
        </div>
      </div>
    </ModuleCard>
  );
}

/* ══════════════════════════════════════════════════════════════
   BEHAVIOUR PANEL — shows signals and lets user adjust
   ══════════════════════════════════════════════════════════════ */

function BehaviourPanel({
  signals, onChange,
}: {
  signals: BehaviourSignals;
  onChange: (s: BehaviourSignals) => void;
}) {
  const [open, setOpen] = useState(false);

  const signalItems = [
    { label: "Saved", tags: signals.savedTags, emoji: "🔖", color: "#f59e0b" },
    { label: "Read",  tags: signals.readTags,  emoji: "📖", color: "#22c55e" },
  ];

  function removeTag(type: "saved" | "read", tag: string) {
    onChange({
      ...signals,
      savedTags: type === "saved" ? signals.savedTags.filter(t => t !== tag) : signals.savedTags,
      readTags:  type === "read"  ? signals.readTags.filter(t => t !== tag)  : signals.readTags,
    });
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all ${
          open ? "border-indigo-500/30 bg-indigo-600/15 text-indigo-300" : "border-white/[0.08] text-slate-400 hover:text-slate-200"
        }`}>
        <SlidersHorizontal size={11} /> Behaviour Signals
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-72 bg-[#1c1f2e] border border-white/[0.08] rounded-2xl z-20 overflow-hidden"
            style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.7)" }}
          >
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-white">Behaviour Signals</p>
                <p className="text-[9px] text-slate-600">Shape what appears on your home page</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-600 hover:text-slate-300 transition-colors">
                <X size={12} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {signalItems.map(({ label, tags, emoji, color }) => (
                <div key={label}>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color }}>
                    {emoji} {label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(tag => (
                      <div key={tag}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold border"
                        style={{ color, background: color + "12", borderColor: color + "25" }}>
                        {tag}
                        <button onClick={() => removeTag(label.toLowerCase() as "saved" | "read", tag)}
                          className="hover:text-rose-400 transition-colors ml-0.5">
                          <X size={8} />
                        </button>
                      </div>
                    ))}
                    {tags.length === 0 && <p className="text-[9px] text-slate-700">No signals recorded yet.</p>}
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-white/[0.06]">
                <p className="text-[9px] text-slate-700">
                  Signals update automatically as you save, read, and interact with content. Remove tags to reduce that content type.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MODULE RENDERER
   ══════════════════════════════════════════════════════════════ */

function renderModule(mod: PersonalisedModule, i: number) {
  const delay = Math.min(i * 0.08, 0.5);

  const wrap = (el: React.ReactNode, wide = false) => (
    <motion.div
      key={mod.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: EASE }}
      className={wide ? "col-span-2" : ""}
    >
      {el}
    </motion.div>
  );

  switch (mod.id) {
    case "daily-insight":    return wrap(<DailyInsightModule mod={mod} />, true);
    case "agent-picks":      return wrap(<AgentPicksModule mod={mod} />);
    case "wisdom":           return wrap(<WisdomModule mod={mod} />);
    case "stories":          return wrap(<StoriesModule mod={mod} />);
    case "feed-highlights":  return wrap(<FeedHighlightsModule mod={mod} />);
    case "wall-suggestions": return wrap(<WallSuggestionsModule mod={mod} />);
    case "group-suggestions":return wrap(<GroupSuggestionsModule mod={mod} />);
    case "news":             return wrap(<NewsModule mod={mod} />);
    case "achievements":     return wrap(<AchievementsModule mod={mod} />);
    case "trending":         return wrap(<TrendingModule mod={mod} />);
    case "smart-picks":      return wrap(<SmartPicksModule mod={mod} />);
    default: return null;
  }
}

/* ══════════════════════════════════════════════════════════════
   WEIGHTING INDICATOR
   ══════════════════════════════════════════════════════════════ */

function WeightingBar() {
  const bars = [
    { label: "Interests", pct: 40, color: "#6366f1" },
    { label: "Walls",     pct: 30, color: "#8b5cf6" },
    { label: "Agent",     pct: 20, color: "#f59e0b" },
    { label: "Trending",  pct: 10, color: "#22c55e" },
  ];
  return (
    <div className="flex items-center gap-3">
      {bars.map(({ label, pct, color }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className="h-1.5 rounded-full" style={{ width: `${pct * 1.2}px`, background: color + "cc" }} />
          <span className="text-[9px] font-semibold" style={{ color }}>
            {pct}% {label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */

export default function PersonalisedHomePage() {
  const navigate = useNavigate();
  const profile = OWN_PROFILE;
  const [interestIds, setInterestIds] = useState(profile.interests);
  const [behaviour, setBehaviour] = useState<BehaviourSignals>(DEFAULT_BEHAVIOUR);
  const [refreshKey, setRefreshKey] = useState(0);

  const modules = useMemo(
    () => buildPersonalisedHome(interestIds, behaviour),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [interestIds, behaviour, refreshKey],
  );

  const handleRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-6 py-3">
          <BackToCockpit />
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-bold text-white"
              style={{ background: profile.avatarColor }}>
              {profile.initials}
            </div>
            <span className="text-[13px] font-bold text-white">
              {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening"}, Francis.
            </span>
          </div>
          <span className="text-slate-700">·</span>
          <WeightingBar />

          <div className="ml-auto flex items-center gap-2">
            <BehaviourPanel signals={behaviour} onChange={setBehaviour} />
            <button onClick={() => navigate("/interests")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] text-slate-400 text-[11px] font-semibold hover:text-slate-200 hover:border-white/[0.18] transition-all">
              <Sparkles size={11} /> Edit Interests
            </button>
            <motion.button whileTap={{ rotate: 180 }} onClick={handleRefresh}
              className="p-2 rounded-xl border border-white/[0.08] text-slate-500 hover:text-slate-300 hover:border-white/[0.18] transition-all">
              <RefreshCw size={12} />
            </motion.button>
          </div>
        </div>

        {/* Interest chips strip */}
        <div className="flex items-center gap-2 px-6 py-2 border-t border-white/[0.04] overflow-x-auto scrollbar-none">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-700 shrink-0">Your interests:</span>
          {interestIds.slice(0, 12).map(id => {
            return (
              <motion.button key={id} whileTap={{ scale: 0.9 }}
                onClick={() => setInterestIds(prev => prev.filter(x => x !== id))}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-semibold border border-indigo-500/20 bg-indigo-600/10 text-indigo-300 hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-400 transition-all shrink-0"
              >
                {id} <X size={8} />
              </motion.button>
            );
          })}
          <button onClick={() => navigate("/interests")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-semibold border border-dashed border-white/[0.1] text-slate-600 hover:text-slate-300 hover:border-white/[0.2] transition-all shrink-0">
            <Plus size={9} /> Add
          </button>
        </div>
      </div>

      {/* Module grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">

          <AnimatePresence mode="wait">
            <motion.div
              key={refreshKey}
              className="grid grid-cols-2 gap-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {modules.map((mod, i) => renderModule(mod, i))}
            </motion.div>
          </AnimatePresence>

          {/* Module score debug (collapsed by default) */}
          <details className="mt-8">
            <summary className="text-[10px] text-slate-700 cursor-pointer hover:text-slate-500 transition-colors select-none">
              Module scores (personalisation debug)
            </summary>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {modules.map(m => (
                <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-[9px] text-slate-600">{m.emoji} {m.label}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-12 h-1 rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-indigo-500/60" style={{ width: `${m.score}%` }} />
                    </div>
                    <span className="text-[9px] font-bold text-slate-500">{m.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
        <div className="h-10" />
      </div>
    </div>
  );
}
