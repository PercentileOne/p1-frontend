import { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, X, ChevronUp, ChevronDown, Sparkles,
  Layers, BookOpen, Rss, Home, Bot, Check, Info,
  GripVertical, ArrowRight, TrendingUp,
} from "lucide-react";
import BackToCockpit from "../components/BackToCockpit";
import {
  ALL_INTERESTS,
  ORDERED_CATEGORIES,
  CATEGORY_META,
  getInterestById,
  deriveWallRecommendations,
  deriveStoryRecommendations,
  deriveAgentRecommendations,
  deriveFeedWeighting,
  type InterestCategory,
  type Interest,
} from "../lib/interestsEngine";
import { OWN_PROFILE } from "../lib/profileData";

/* ══════════════════════════════════════════════════════════════
   P1 INTERESTS PAGE — /interests
   Dedicated editor with category filters, search, priority
   reorder, and live mapping panel.
   ══════════════════════════════════════════════════════════════ */

// ── Interest chip ─────────────────────────────────────────────

function InterestChip({
  interest, selected, priority, onToggle,
}: {
  interest: Interest;
  selected: boolean;
  priority?: number;
  onToggle: () => void;
}) {
  const meta = CATEGORY_META[interest.category];

  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      whileTap={{ scale: 0.91 }}
      onClick={onToggle}
      className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold border transition-colors"
      style={selected ? {
        color: meta.color,
        background: meta.bg,
        borderColor: meta.color + "40",
        boxShadow: `0 6px 18px ${meta.color}20, 0 1px 0 ${meta.color}18 inset`,
      } : {
        color: "#64748b",
        background: "rgba(255,255,255,0.025)",
        borderColor: "rgba(255,255,255,0.07)",
      }}
    >
      {/* Priority badge */}
      {selected && priority !== undefined && priority < 3 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center text-white"
          style={{ background: meta.color }}
        >
          {priority + 1}
        </motion.span>
      )}

      <span className="text-[13px]">{interest.emoji}</span>
      <span>{interest.label}</span>

      {selected && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="ml-0.5"
          style={{ color: meta.color }}
        >
          <Check size={10} strokeWidth={3} />
        </motion.span>
      )}
    </motion.button>
  );
}

// ── Priority reorder list ─────────────────────────────────────

function PriorityList({
  ids, onReorder, onRemove,
}: {
  ids: string[];
  onReorder: (ids: string[]) => void;
  onRemove: (id: string) => void;
}) {
  if (ids.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={12} className="text-indigo-400" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">My Interests — Priority Order</span>
        <span className="text-[9px] text-slate-700 bg-white/[0.04] border border-white/[0.07] px-2 py-0.5 rounded-lg">
          Top 3 have the strongest influence
        </span>
      </div>

      <Reorder.Group axis="y" values={ids} onReorder={onReorder} className="flex flex-col gap-1.5">
        {ids.map((id, idx) => {
          const interest = getInterestById(id);
          if (!interest) return null;
          const meta = CATEGORY_META[interest.category];
          const isTop3 = idx < 3;

          return (
            <Reorder.Item key={id} value={id} className="cursor-grab active:cursor-grabbing">
              <motion.div
                layout
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border"
                style={{
                  background: isTop3 ? meta.bg : "rgba(255,255,255,0.02)",
                  borderColor: isTop3 ? meta.color + "30" : "rgba(255,255,255,0.07)",
                  boxShadow: isTop3 ? `0 4px 14px ${meta.color}15` : "0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                <GripVertical size={13} className="text-slate-700 shrink-0" />

                {/* Rank */}
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0"
                  style={{ background: isTop3 ? meta.color : "#1e2130" }}
                >
                  {idx + 1}
                </div>

                <span className="text-[14px] shrink-0">{interest.emoji}</span>
                <span className="text-[12px] font-semibold flex-1" style={{ color: isTop3 ? meta.color : "#94a3b8" }}>
                  {interest.label}
                </span>
                <span className="text-[9px] text-slate-700 shrink-0">{interest.category}</span>

                {isTop3 && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{ color: meta.color, background: meta.color + "15", border: `1px solid ${meta.color}20` }}>
                    Top influence
                  </span>
                )}

                <button
                  onClick={() => onRemove(id)}
                  className="shrink-0 p-1 rounded-lg text-slate-700 hover:text-rose-400 hover:bg-rose-500/[0.08] transition-all"
                >
                  <X size={11} />
                </button>
              </motion.div>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
    </div>
  );
}

// ── Left sidebar: category filter ─────────────────────────────

function CategorySidebar({
  active, setActive, counts,
}: {
  active: InterestCategory | "all";
  setActive: (c: InterestCategory | "all") => void;
  counts: Record<string, number>;
}) {
  return (
    <aside className="w-48 shrink-0 sticky top-[112px] self-start" style={{ maxHeight: "calc(100vh - 130px)" }}>
      <div
        className="rounded-2xl overflow-hidden border border-white/[0.07]"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)", overflowY: "auto", maxHeight: "calc(100vh - 140px)" }}
      >
        <div className="p-1.5 flex flex-col gap-0.5">
          <button
            onClick={() => setActive("all")}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-all text-left ${
              active === "all"
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles size={10} /> All
            </span>
            <span className="text-[9px] text-slate-600">{ALL_INTERESTS.length}</span>
          </button>

          {ORDERED_CATEGORIES.filter(c => c !== "Custom").map(cat => {
            const meta = CATEGORY_META[cat];
            const isActive = active === cat;
            return (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-all text-left ${
                  isActive ? "border" : "border border-transparent hover:bg-white/[0.04]"
                }`}
                style={isActive ? {
                  background: meta.bg,
                  borderColor: meta.color + "30",
                  color: meta.color,
                } : { color: "#64748b" }}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <span>{meta.emoji}</span>
                  <span className="truncate">{cat}</span>
                </span>
                <span className="text-[9px] shrink-0 ml-1"
                  style={{ color: isActive ? meta.color + "99" : "#334155" }}>
                  {counts[cat] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

// ── Right panel: mapping preview ──────────────────────────────

function MappingPanel({ selectedIds }: { selectedIds: string[] }) {
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState<string | null>("walls");

  const wallRecs   = useMemo(() => deriveWallRecommendations(selectedIds),   [selectedIds]);
  const storyRecs  = useMemo(() => deriveStoryRecommendations(selectedIds),  [selectedIds]);
  const agentRecs  = useMemo(() => deriveAgentRecommendations(selectedIds),  [selectedIds]);
  const feedWeight = useMemo(() => deriveFeedWeighting(selectedIds),         [selectedIds]);

  const sections = [
    {
      id: "walls",
      icon: <Layers size={11} />,
      label: "Walls Unlocked",
      color: "#6366f1",
      count: wallRecs.length,
      content: (
        <div className="flex flex-col gap-2 pt-2">
          {wallRecs.length === 0 ? (
            <p className="text-[10px] text-slate-600 text-center py-3">Select interests to see wall matches.</p>
          ) : wallRecs.map(w => (
            <div key={w.wallId} className="flex items-start gap-2 px-2 py-2 rounded-xl hover:bg-white/[0.04] cursor-pointer transition-colors"
              onClick={() => navigate("/walls")}>
              <span className="text-[14px] shrink-0">{w.wallEmoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-slate-300 truncate">{w.wallName}</p>
                <p className="text-[9px] text-slate-600">
                  via {w.matchingInterests.slice(0, 2).join(", ")}
                  {w.matchingInterests.length > 2 && ` +${w.matchingInterests.length - 2}`}
                </p>
              </div>
              <div className="w-5 h-5 rounded-lg text-[10px] font-bold flex items-center justify-center text-white shrink-0"
                style={{ background: w.accent }}>
                {w.score}
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "stories",
      icon: <BookOpen size={11} />,
      label: "Story Categories",
      color: "#8b5cf6",
      count: storyRecs.length,
      content: (
        <div className="flex flex-col gap-1.5 pt-2">
          {storyRecs.length === 0 ? (
            <p className="text-[10px] text-slate-600 text-center py-3">Select interests to see story matches.</p>
          ) : storyRecs.slice(0, 7).map(r => (
            <div key={r.category} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/[0.04] cursor-pointer transition-colors"
              onClick={() => navigate("/stories")}>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-slate-300">{r.category}</p>
                <p className="text-[9px] text-slate-600 truncate">{r.matchingInterests.slice(0, 3).join(" · ")}</p>
              </div>
              <div className="h-1 w-12 rounded-full bg-white/[0.06] shrink-0">
                <div className="h-full rounded-full bg-violet-500/60"
                  style={{ width: `${Math.min(100, r.score * 20)}%` }} />
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "feed",
      icon: <Rss size={11} />,
      label: "Feed Weighting",
      color: "#22c55e",
      count: selectedIds.length > 0 ? 1 : 0,
      content: (
        <div className="pt-2 space-y-2.5">
          {[
            { label: "People you follow", pct: feedWeight.followingPct, color: "#6366f1" },
            { label: "Walls you follow",  pct: feedWeight.wallsPct,     color: "#8b5cf6" },
            { label: "Interest-based",    pct: feedWeight.interestsPct, color: "#22c55e" },
            { label: "Agent picks",       pct: feedWeight.agentPct,     color: "#f59e0b" },
          ].map(({ label, pct, color }) => (
            <div key={label}>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-slate-500">{label}</span>
                <span className="text-[10px] font-bold" style={{ color }}>{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                  className="h-full rounded-full"
                  style={{ background: color + "cc" }}
                />
              </div>
            </div>
          ))}
          {feedWeight.topInterestBoost.length > 0 && (
            <div className="pt-1 border-t border-white/[0.05]">
              <p className="text-[9px] text-slate-700 mb-1.5">Boosted by your top interests:</p>
              <div className="flex flex-wrap gap-1.5">
                {feedWeight.topInterestBoost.map(label => (
                  <span key={label} className="text-[9px] px-2 py-0.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "agent",
      icon: <Bot size={11} />,
      label: "Agent Recommendations",
      color: "#f59e0b",
      count: agentRecs.length,
      content: (
        <div className="flex flex-col gap-2 pt-2">
          {agentRecs.length === 0 ? (
            <p className="text-[10px] text-slate-600 text-center py-3">Select interests to see agent insights.</p>
          ) : agentRecs.map((r, i) => (
            <div key={i} className="flex items-start gap-2 px-2 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <span className="text-[14px] shrink-0 mt-0.5">{r.emoji}</span>
              <p className="text-[10px] text-slate-400 leading-relaxed">{r.text}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "home",
      icon: <Home size={11} />,
      label: "Home Page Modules",
      color: "#0ea5e9",
      count: selectedIds.length > 0 ? 5 : 0,
      content: (
        <div className="pt-2 space-y-2">
          {[
            { emoji: "💬", module: "Wisdom Wall",        desc: selectedIds.length > 0 ? `Quotes on ${getInterestById(selectedIds[0])?.label ?? "your interests"}` : "Select interests to personalise" },
            { emoji: "📰", module: "News Tiles",         desc: selectedIds.some(id => ["ai","startups","coding"].includes(id)) ? "Tech & startup news boosted" : "Personalised by your interests" },
            { emoji: "📖", module: "Story Picks",        desc: storyRecs[0] ? `Prioritising ${storyRecs[0].category} stories` : "Matched to your interests" },
            { emoji: "🧱", module: "Wall Suggestions",   desc: wallRecs[0] ? `${wallRecs[0].wallName} suggested` : "Matched to your interests" },
            { emoji: "👥", module: "Group Suggestions",  desc: "Groups linked to your top interests" },
          ].map(({ emoji, module, desc }) => (
            <div key={module} className="flex items-start gap-2 px-1">
              <span className="text-[13px] shrink-0 mt-0.5">{emoji}</span>
              <div>
                <p className="text-[10px] font-semibold text-slate-400">{module}</p>
                <p className="text-[9px] text-slate-600">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <aside className="w-56 shrink-0 sticky top-[112px] self-start flex flex-col gap-3" style={{ maxHeight: "calc(100vh - 130px)", overflowY: "auto" }}>
      <div className="rounded-2xl border border-white/[0.07] overflow-hidden"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
        <div className="px-3 pt-3 pb-2 flex items-center gap-1.5 border-b border-white/[0.05]">
          <Info size={10} className="text-slate-600" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">What your interests unlock</span>
        </div>

        <div className="divide-y divide-white/[0.05]">
          {sections.map(sec => (
            <div key={sec.id}>
              <button
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/[0.03] transition-colors"
                onClick={() => setOpenSection(openSection === sec.id ? null : sec.id)}
              >
                <span style={{ color: sec.color }}>{sec.icon}</span>
                <span className="flex-1 text-[10px] font-semibold text-slate-400 text-left">{sec.label}</span>
                {sec.count > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{ color: sec.color, background: sec.color + "15" }}>
                    {sec.count}
                  </span>
                )}
                <span className="text-slate-700">
                  {openSection === sec.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {openSection === sec.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 bg-black/[0.08]">{sec.content}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Save CTA */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        className="w-full py-3 rounded-2xl text-[12px] font-bold text-white flex items-center justify-center gap-2 transition-all"
        style={{
          background: selectedIds.length > 0
            ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
            : "#1c1f2e",
          opacity: selectedIds.length > 0 ? 1 : 0.5,
          boxShadow: selectedIds.length > 0 ? "0 8px 24px rgba(99,102,241,0.35)" : "none",
        }}
        disabled={selectedIds.length === 0}
      >
        <Check size={13} /> Save Interests
      </motion.button>
    </aside>
  );
}

// ── Custom interest input ─────────────────────────────────────

function CustomInterestInput({ onAdd }: { onAdd: (label: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const label = value.trim();
    if (!label) return;
    onAdd(label);
    setValue("");
    setOpen(false);
  }

  return (
    <div className="mt-3">
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 60); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-white/[0.12] text-[11px] font-semibold text-slate-600 hover:text-slate-300 hover:border-white/[0.25] transition-all"
          >
            <Plus size={11} /> Add custom interest
          </motion.button>
        ) : (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") setOpen(false); }}
              placeholder="Type your interest and press Enter…"
              className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-xl text-[12px] text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/40 transition-colors"
            />
            <button onClick={submit}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors">
              Add
            </button>
            <button onClick={() => setOpen(false)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-300 hover:bg-white/[0.04] transition-all">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */

export default function InterestsPage() {
  const navigate = useNavigate();

  // State
  const [selected,    setSelected]    = useState<string[]>(OWN_PROFILE.interests);
  const [category,    setCategory]    = useState<InterestCategory | "all">("all");
  const [search,      setSearch]      = useState("");
  const [customList,  setCustomList]  = useState<Interest[]>([]);
  const [saved,       setSaved]       = useState(false);

  // Derived counts per category (from selected)
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const countsByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    for (const id of selected) {
      const interest = getInterestById(id) ?? customList.find(c => c.id === id);
      if (interest) m[interest.category] = (m[interest.category] ?? 0) + 1;
    }
    return m;
  }, [selected, customList]);

  // Filtered interest list for the grid
  const visibleInterests = useMemo(() => {
    const base = [...ALL_INTERESTS, ...customList];
    return base.filter(i => {
      if (category !== "all" && i.category !== category) return false;
      if (search) return i.label.toLowerCase().includes(search.toLowerCase());
      return true;
    });
  }, [category, search, customList]);

  const toggleInterest = useCallback((id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const removeFromPriority = useCallback((id: string) => {
    setSelected(prev => prev.filter(x => x !== id));
  }, []);

  function addCustom(label: string) {
    const id = `custom-${Date.now()}`;
    const newInterest: Interest = { id, label, category: "Custom", emoji: "⭐" };
    setCustomList(prev => [...prev, newInterest]);
    setSelected(prev => [...prev, id]);
    setCategory("Custom");
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  const groupedByCategory = useMemo(() => {
    if (category !== "all" || search) return { [category === "all" ? "Results" : category]: visibleInterests };
    const groups: Record<string, Interest[]> = {};
    for (const cat of ORDERED_CATEGORIES) {
      const items = visibleInterests.filter(i => i.category === cat);
      if (items.length > 0) groups[cat] = items;
    }
    return groups;
  }, [visibleInterests, category, search]);

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-6 py-3">
          <BackToCockpit />
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-indigo-400" />
            <h1 className="text-sm font-bold text-white">Interests & Identity</h1>
          </div>
          <span className="text-[10px] text-slate-600">·</span>
          <span className="text-[11px] text-slate-500">
            {selected.length} selected · shapes your feed, walls, stories and agent
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => navigate("/profile")}
              className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
              Back to Profile <ArrowRight size={11} />
            </button>
            <AnimatePresence mode="wait">
              {saved ? (
                <motion.span
                  key="saved"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-green-600/20 border border-green-500/25 text-green-400 text-[11px] font-semibold"
                >
                  <Check size={11} /> Saved!
                </motion.span>
              ) : (
                <motion.button
                  key="save"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={handleSave}
                  disabled={selected.length === 0}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors disabled:opacity-40"
                >
                  <Check size={11} /> Save Interests
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-6 py-2 border-t border-white/[0.04]">
          <div className="relative max-w-sm">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); if (e.target.value) setCategory("all"); }}
              placeholder="Search interests…"
              className="w-full pl-8 pr-8 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[12px] text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/35 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
                <X size={11} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex gap-6">

            {/* Left: category filter */}
            <CategorySidebar
              active={category}
              setActive={cat => { setCategory(cat); setSearch(""); }}
              counts={countsByCategory}
            />

            {/* Center: interests grid */}
            <div className="flex-1 min-w-0">

              {/* Priority reorder */}
              <AnimatePresence>
                {selected.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                  >
                    <PriorityList
                      ids={selected}
                      onReorder={setSelected}
                      onRemove={removeFromPriority}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Interest grid by category */}
              {Object.entries(groupedByCategory).map(([cat, items]) => {
                const meta = CATEGORY_META[cat as InterestCategory] ?? CATEGORY_META["Custom"];
                return (
                  <div key={cat} className="mb-7">
                    {(category === "all" && !search) && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[14px]">{meta.emoji}</span>
                        <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>
                          {cat}
                        </h3>
                        <div className="flex-1 h-px" style={{ background: meta.color + "20" }} />
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg"
                          style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.color}25` }}>
                          {countsByCategory[cat] ?? 0} selected
                        </span>
                      </div>
                    )}

                    <motion.div layout className="flex flex-wrap gap-2">
                      <AnimatePresence>
                        {items.map(interest => (
                          <InterestChip
                            key={interest.id}
                            interest={interest}
                            selected={selectedSet.has(interest.id)}
                            priority={selected.indexOf(interest.id)}
                            onToggle={() => toggleInterest(interest.id)}
                          />
                        ))}
                      </AnimatePresence>
                    </motion.div>

                    {cat === "Custom" && (
                      <CustomInterestInput onAdd={addCustom} />
                    )}
                  </div>
                );
              })}

              {/* Add custom at bottom of "all" view */}
              {(category === "all" || category === "Custom") && !search && (
                <div className="border-t border-white/[0.06] pt-6">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-3">
                    ⭐ Custom Interests
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence>
                      {customList.map(interest => (
                        <InterestChip
                          key={interest.id}
                          interest={interest}
                          selected={selectedSet.has(interest.id)}
                          priority={selected.indexOf(interest.id)}
                          onToggle={() => toggleInterest(interest.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                  <CustomInterestInput onAdd={addCustom} />
                </div>
              )}

              {visibleInterests.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Sparkles size={24} className="text-slate-700" />
                  <p className="text-[13px] text-slate-500">No interests match.</p>
                  <button onClick={() => { setSearch(""); setCategory("all"); }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
                    Clear search
                  </button>
                </div>
              )}
            </div>

            {/* Right: mapping preview */}
            <MappingPanel selectedIds={selected} />
          </div>
        </div>
        <div className="h-10" />
      </div>
    </div>
  );
}
