import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  MapPin, MessageSquare, UserPlus, Check, BookOpen,
  Bookmark, Bell, Share2, Trophy, Star, TrendingUp,
  Plus, Sparkles, Users, ChevronRight, Layers, Award,
  Flame, Zap, Target, FileText, Hash, Edit3,
  ChevronDown, ChevronUp, X,
} from "lucide-react";
import BackToCockpit from "../components/BackToCockpit";
import { SmallAwardBadge } from "../components/AwardTiles";
import {
  OWN_PROFILE,
  ALL_INTERESTS,
  type UserProfile,
  type Interest,
  type Achievement,
  type ProfileWall,
  type ProfileGroup,
  type ProfilePost,
} from "../lib/profileData";
import { WEEKLY_WINNERS, MONTHLY_WINNERS } from "../lib/awardsData";
import { STORIES } from "../lib/storiesData";

/* ══════════════════════════════════════════════════════════════
   P1 PROFILE PAGE 2.0
   ══════════════════════════════════════════════════════════════ */

type ProfileTab = "overview" | "story" | "posts" | "achievements" | "walls" | "groups" | "awards" | "interests";

const TABS: { key: ProfileTab; label: string; emoji: string }[] = [
  { key: "overview",      label: "Overview",     emoji: "🏠" },
  { key: "story",         label: "Story",        emoji: "📖" },
  { key: "posts",         label: "Posts",        emoji: "📝" },
  { key: "achievements",  label: "Achievements", emoji: "🏅" },
  { key: "walls",         label: "Walls",        emoji: "🧱" },
  { key: "groups",        label: "Groups",       emoji: "👥" },
  { key: "awards",        label: "Awards",       emoji: "🏆" },
  { key: "interests",     label: "Interests",    emoji: "✨" },
];

function fmtNum(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

const SLIDE_UP = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const },
};

/* ══════════════════════════════════════════════════════════════
   A) PROFILE HEADER
   ══════════════════════════════════════════════════════════════ */

function ProfileHeader({ profile, followed, onFollow }: {
  profile: UserProfile;
  followed: boolean;
  onFollow: () => void;
}) {
  const navigate = useNavigate();
  const awards = [...WEEKLY_WINNERS, ...MONTHLY_WINNERS].filter(w => w.authorName === profile.name);

  return (
    <div
      className="relative rounded-3xl overflow-hidden mb-6"
      style={{
        background: "linear-gradient(150deg, #13151f 0%, #0e1018 50%, #0a0c14 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 24px 72px rgba(0,0,0,0.75), 0 1px 0 rgba(255,255,255,0.06) inset, 0 -1px 0 rgba(0,0,0,0.4) inset",
      }}
    >
      {/* Accent band */}
      <div className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, transparent, ${profile.avatarColor}, transparent)` }} />

      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at center, ${profile.avatarColor}14 0%, transparent 70%)` }} />

      <div className="relative flex items-start gap-6 p-8">
        {/* Avatar */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          className="relative shrink-0"
        >
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
            style={{
              background: `linear-gradient(135deg, ${profile.avatarColor}44 0%, ${profile.avatarColor}22 100%)`,
              border: `2.5px solid ${profile.avatarColor}60`,
              boxShadow: `0 8px 32px ${profile.avatarColor}30, 0 1px 0 ${profile.avatarColor}25 inset`,
            }}
          >
            {profile.initials}
          </div>
          {/* Online dot */}
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[#0e1018]" />
        </motion.div>

        {/* Identity */}
        <motion.div {...SLIDE_UP} className="flex-1 min-w-0 pt-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white mb-1">{profile.name}</h1>
              <p className="text-[13px] font-semibold mb-1" style={{ color: profile.avatarColor }}>
                {profile.professionEmoji} {profile.profession}
              </p>
              {profile.location && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2">
                  <MapPin size={10} /> {profile.location}
                </div>
              )}
              <p className="text-[12px] text-slate-400 leading-relaxed max-w-lg">{profile.bio}</p>
            </div>

            {/* Actions */}
            {!profile.isOwnProfile ? (
              <div className="flex gap-2 shrink-0">
                <motion.button whileTap={{ scale: 0.93 }} onClick={onFollow}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold border transition-all ${
                    followed
                      ? "text-green-400 border-green-500/25 bg-green-500/10"
                      : "text-white border-transparent"
                  }`}
                  style={!followed ? { background: profile.avatarColor } : {}}>
                  {followed ? <><Check size={12} /> Following</> : <><UserPlus size={12} /> Follow</>}
                </motion.button>
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold border border-white/[0.1] text-slate-300 hover:border-white/[0.2] transition-all">
                  <MessageSquare size={12} /> Message
                </button>
              </div>
            ) : (
              <button
                onClick={() => {}}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold border border-white/[0.1] text-slate-400 hover:border-white/[0.2] hover:text-slate-200 transition-all"
              >
                <Edit3 size={12} /> Edit Profile
              </button>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/[0.05]">
            {[
              { label: "Followers",  value: fmtNum(profile.followers)  },
              { label: "Following",  value: fmtNum(profile.following)  },
              { label: "Stories",    value: String(profile.storiesPublished) },
              { label: "Awards",     value: String(profile.awardsWon)  },
              { label: "Posts",      value: String(profile.postsPublished) },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center gap-0.5">
                <span className="text-[16px] font-bold text-white">{value}</span>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">{label}</span>
              </div>
            ))}

            {/* Award badges inline */}
            {awards.length > 0 && (
              <>
                <div className="w-px h-8 bg-white/[0.06]" />
                <div className="flex gap-2">
                  {awards.slice(0, 3).map(w => (
                    <SmallAwardBadge key={w.id} winner={w} showStory={false} />
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   B) MY STORY PANEL
   ══════════════════════════════════════════════════════════════ */

function MyStoryPanel({ profile }: { profile: UserProfile }) {
  const navigate = useNavigate();
  const story = STORIES.find(s => s.author.name === profile.name);
  const storyAwards = [...WEEKLY_WINNERS, ...MONTHLY_WINNERS].filter(w => w.authorName === profile.name);

  if (!story) {
    return (
      <motion.div {...SLIDE_UP}
        className="rounded-2xl overflow-hidden cursor-pointer mb-5"
        style={{
          background: "linear-gradient(150deg, #13151f 0%, #0a0c14 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
        whileHover={{ y: -4 }}
        onClick={() => navigate("/stories/create")}
      >
        <div className="p-6 flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <BookOpen size={20} className="text-indigo-400" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-bold text-white mb-1">Start Your Story</p>
            <p className="text-[12px] text-slate-500 leading-relaxed">
              Your story is your identity on P1. Share your journey — where you've been, where you're going.
            </p>
          </div>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-bold transition-colors shrink-0">
            <Plus size={12} /> Write a Story
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      {...SLIDE_UP}
      className="relative rounded-2xl overflow-hidden mb-5 cursor-pointer"
      style={{
        background: `linear-gradient(150deg, ${story.gradientFrom} 0%, ${story.gradientTo} 100%)`,
        border: `1px solid ${story.accentColor}28`,
        boxShadow: `0 12px 40px rgba(0,0,0,0.65), 0 1px 0 ${story.accentColor}18 inset`,
      }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.22 }}
      onClick={() => navigate(`/stories/${story.id}`)}
    >
      <div className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: story.accentColor + "80" }} />

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Story meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border"
                style={{ color: story.accentColor, background: story.accentColor + "15", borderColor: story.accentColor + "25" }}>
                {story.category}
              </span>
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
                story.status === "ongoing"
                  ? "text-green-400 bg-green-500/10 border-green-500/20"
                  : "text-slate-500 bg-slate-500/10 border-slate-500/10"
              }`}>
                {story.status === "ongoing" ? "Ongoing" : "Complete"}
              </span>
            </div>
            <h3 className="text-[18px] font-bold text-white leading-snug mb-2">{story.title}</h3>
            <p className="text-[12px] text-slate-400 leading-relaxed line-clamp-2 mb-3">{story.description}</p>

            {/* Chapter dots */}
            <div className="flex items-center gap-1.5 mb-3">
              {Array.from({ length: Math.min(story.chapters.length, 10) }).map((_, i) => (
                <div key={i} className="w-4 h-1 rounded-full" style={{ background: story.accentColor + "aa" }} />
              ))}
              <span className="text-[10px] text-slate-600 ml-1">{story.chapters.length} chapters</span>
            </div>

            {/* Awards earned */}
            {storyAwards.length > 0 && (
              <div className="flex gap-2 mb-3">
                {storyAwards.map(w => <SmallAwardBadge key={w.id} winner={w} showStory={false} />)}
              </div>
            )}
          </div>

          {/* Stats column */}
          <div className="flex flex-col gap-3 shrink-0 items-end">
            {[
              { icon: <Bookmark size={10} />, val: fmtNum(story.savedCount)    },
              { icon: <Bell size={10} />,     val: fmtNum(story.followerCount) },
            ].map(({ icon, val }, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px]" style={{ color: story.accentColor + "cc" }}>
                {icon} <span className="text-slate-300 font-semibold">{val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-1" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/stories/${story.id}`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white transition-all hover:brightness-110"
            style={{ background: story.accentColor + "cc" }}
          >
            <BookOpen size={12} /> Read Full Story
          </button>
          <button
            onClick={() => navigate(`/stories/${story.id}`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.16] transition-all"
          >
            <Edit3 size={12} /> Edit Story
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   C) INTERESTS & IDENTITY
   ══════════════════════════════════════════════════════════════ */

function InterestsPanel({ profile }: { profile: UserProfile }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(profile.interests));
  const [addingCustom, setAddingCustom] = useState(false);
  const [customText, setCustomText] = useState("");
  const [customInterests, setCustomInterests] = useState<Interest[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const byCategory = ALL_INTERESTS.reduce<Record<string, Interest[]>>((acc, i) => {
    if (!acc[i.category]) acc[i.category] = [];
    acc[i.category].push(i);
    return acc;
  }, {});

  function toggleInterest(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function addCustom() {
    const label = customText.trim();
    if (!label) return;
    const id = `custom-${Date.now()}`;
    const interest: Interest = { id, label, category: "Custom", emoji: "⭐" };
    setCustomInterests(prev => [...prev, interest]);
    setSelected(prev => new Set([...prev, id]));
    setCustomText("");
    setAddingCustom(false);
  }

  const allCategories = { ...byCategory };
  if (customInterests.length > 0) allCategories["Custom"] = customInterests;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-indigo-400" />
          <span className="text-[12px] font-bold text-white">Interests & Identity</span>
          <span className="text-[10px] text-slate-600 bg-white/[0.04] border border-white/[0.07] px-2 py-0.5 rounded-lg">
            {selected.size} selected
          </span>
        </div>
        <button
          onClick={() => { setAddingCustom(true); setTimeout(() => inputRef.current?.focus(), 50); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 text-[11px] font-semibold hover:bg-indigo-600/25 transition-colors"
        >
          <Plus size={11} /> Add Custom
        </button>
      </div>

      {/* Custom input */}
      <AnimatePresence>
        {addingCustom && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addCustom(); if (e.key === "Escape") setAddingCustom(false); }}
              placeholder="Type your interest and press Enter…"
              className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-xl text-[12px] text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/40"
            />
            <button onClick={addCustom} className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors">Add</button>
            <button onClick={() => setAddingCustom(false)} className="p-2 rounded-xl text-slate-600 hover:text-slate-300 hover:bg-white/[0.04] transition-all">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories */}
      {Object.entries(allCategories).map(([cat, items]) => (
        <div key={cat}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">{cat}</p>
          <div className="flex flex-wrap gap-2">
            {items.map(interest => {
              const active = selected.has(interest.id);
              return (
                <motion.button
                  key={interest.id}
                  whileTap={{ scale: 0.91 }}
                  whileHover={{ y: -2 }}
                  onClick={() => toggleInterest(interest.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all ${
                    active
                      ? "text-indigo-200 bg-indigo-600/20 border-indigo-500/30"
                      : "text-slate-500 bg-white/[0.03] border-white/[0.07] hover:text-slate-300 hover:border-white/[0.14]"
                  }`}
                  style={active ? { boxShadow: "0 4px 12px rgba(99,102,241,0.2)" } : {}}
                >
                  <span className="text-[12px]">{interest.emoji}</span>
                  {interest.label}
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="pt-2 flex items-center gap-2">
        <Sparkles size={10} className="text-indigo-400" />
        <p className="text-[10px] text-slate-600">
          Your interests power your feed, story suggestions, wall recommendations, and agent behaviour.
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   D) ACHIEVEMENTS GRID
   ══════════════════════════════════════════════════════════════ */

const ACHIEVEMENT_ICON: Record<string, JSX.Element> = {
  streak:       <Flame size={14} className="text-orange-400" />,
  goal:         <Target size={14} className="text-green-400" />,
  certification:<Award size={14} className="text-amber-400" />,
  fitness:      <Zap size={14} className="text-yellow-400" />,
  academic:     <Star size={14} className="text-blue-400" />,
  professional: <TrendingUp size={14} className="text-indigo-400" />,
  story:        <BookOpen size={14} className="text-violet-400" />,
  wall:         <Layers size={14} className="text-cyan-400" />,
};

function AchievementTile({ a, delay = 0 }: { a: Achievement; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -5 }}
      className="relative rounded-2xl overflow-hidden flex flex-col items-center text-center p-4"
      style={{
        background: `linear-gradient(150deg, ${a.accentColor}12 0%, ${a.accentColor}06 100%)`,
        border: `1px solid ${a.accentColor}22`,
        boxShadow: `0 8px 24px rgba(0,0,0,0.5), 0 1px 0 ${a.accentColor}15 inset`,
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: a.accentColor + "60" }} />

      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-2.5 mt-0.5"
        style={{ background: a.accentColor + "15", border: `1px solid ${a.accentColor}25` }}
      >
        {a.value
          ? <span className="text-[14px] font-black" style={{ color: a.accentColor }}>{a.value}</span>
          : <span className="text-xl">{a.emoji}</span>
        }
      </div>

      <p className="text-[11px] font-bold text-white mb-1 leading-snug">{a.title}</p>
      <p className="text-[9px] text-slate-500 leading-snug mb-1">{a.description}</p>
      <p className="text-[8px] text-slate-700">{a.date}</p>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   E) WALLS
   ══════════════════════════════════════════════════════════════ */

function WallTileSmall({ wall }: { wall: ProfileWall }) {
  const navigate = useNavigate();
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="relative rounded-2xl overflow-hidden cursor-pointer p-3.5"
      style={{
        background: `linear-gradient(150deg, ${wall.bg} 0%, #0a0c12 100%)`,
        border: `1px solid ${wall.accent}25`,
        boxShadow: `0 6px 20px rgba(0,0,0,0.5), 0 1px 0 ${wall.accent}12 inset`,
      }}
      onClick={() => navigate("/walls")}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: wall.accent + "70" }} />
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-[16px]">{wall.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-white truncate">{wall.name}</p>
          <p className="text-[9px] text-slate-600">{fmtNum(wall.members)} members</p>
        </div>
      </div>
      <div className="flex gap-1.5">
        {wall.pinned && (
          <span className="text-[8px] px-1.5 py-0.5 rounded border" style={{ color: wall.accent, background: wall.accent + "15", borderColor: wall.accent + "25" }}>
            📌 Pinned
          </span>
        )}
        <span className={`text-[8px] px-1.5 py-0.5 rounded border ${
          wall.type === "profession" ? "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
          : wall.type === "university" ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
          : "text-green-400 bg-green-500/10 border-green-500/20"
        }`}>
          {wall.type}
        </span>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   F) AWARDS PANEL
   ══════════════════════════════════════════════════════════════ */

function AwardsPanelSection({ profile }: { profile: UserProfile }) {
  const navigate = useNavigate();
  const myAwards = [...WEEKLY_WINNERS, ...MONTHLY_WINNERS].filter(w => w.authorName === profile.name);
  const monthlyAwards = myAwards.filter(w => w.frequency === "monthly");
  const weeklyAwards  = myAwards.filter(w => w.frequency === "weekly");

  if (myAwards.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center border border-white/[0.06] bg-white/[0.02]">
        <Trophy size={28} className="text-slate-700 mx-auto mb-3" />
        <p className="text-[13px] font-semibold text-slate-500 mb-1">No awards yet</p>
        <p className="text-[11px] text-slate-600">Keep sharing your story — awards are given weekly and monthly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={13} className="text-amber-400" />
          <span className="text-[12px] font-bold text-white">{myAwards.length} Award{myAwards.length !== 1 ? "s" : ""} Won</span>
        </div>
        <button onClick={() => navigate("/awards")}
          className="text-[10px] text-slate-500 hover:text-amber-400 transition-colors flex items-center gap-1">
          View all awards <ChevronRight size={10} />
        </button>
      </div>

      {monthlyAwards.length > 0 && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-amber-600/70 mb-3">🥇 Monthly Awards</p>
          <div className="flex flex-col gap-2">
            {monthlyAwards.map(w => <SmallAwardBadge key={w.id} winner={w} />)}
          </div>
        </div>
      )}
      {weeklyAwards.length > 0 && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-3">🥈 Weekly Awards</p>
          <div className="flex flex-col gap-2">
            {weeklyAwards.map(w => <SmallAwardBadge key={w.id} winner={w} />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   G) STATS PANEL
   ══════════════════════════════════════════════════════════════ */

function StatsPanel({ profile }: { profile: UserProfile }) {
  const stats = [
    { label: "Followers",        value: fmtNum(profile.followers),        icon: <Users size={13} />,    color: "text-indigo-400" },
    { label: "Following",        value: fmtNum(profile.following),        icon: <UserPlus size={13} />, color: "text-violet-400" },
    { label: "Stories",          value: String(profile.storiesPublished), icon: <BookOpen size={13} />, color: "text-emerald-400" },
    { label: "Chapters",         value: String(profile.chaptersWritten),  icon: <FileText size={13} />, color: "text-green-400" },
    { label: "Saves received",   value: fmtNum(profile.savesReceived),    icon: <Bookmark size={13} />, color: "text-amber-400" },
    { label: "Awards won",       value: String(profile.awardsWon),        icon: <Trophy size={13} />,   color: "text-yellow-400" },
    { label: "Posts",            value: String(profile.postsPublished),   icon: <Hash size={13} />,     color: "text-blue-400" },
    { label: "Walls followed",   value: String(profile.wallsFollowed),    icon: <Layers size={13} />,   color: "text-cyan-400" },
    { label: "Groups joined",    value: String(profile.groupsJoined),     icon: <Users size={13} />,    color: "text-pink-400" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map(({ label, value, icon, color }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-center"
          style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.35)" }}
        >
          <div className={`${color}`}>{icon}</div>
          <span className="text-[20px] font-black text-white">{value}</span>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">{label}</span>
        </motion.div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   H) POSTS
   ══════════════════════════════════════════════════════════════ */

function PostCard({ post, delay = 0 }: { post: ProfilePost; delay?: number }) {
  const [liked, setLiked] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const isLong = post.content.length > 220;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.4, 0, 0.2, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: post.type === "wisdom"
          ? `linear-gradient(150deg, ${post.accentColor}12 0%, #0f1117 100%)`
          : post.type === "story-preview"
          ? `linear-gradient(150deg, ${post.accentColor}10 0%, #0f1117 100%)`
          : "#1c1f2e",
        border: post.accentColor
          ? `1px solid ${post.accentColor}20`
          : "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
      }}
    >
      {post.accentColor && <div className="h-[2px]" style={{ background: post.accentColor + "60" }} />}

      <div className="p-4">
        {/* Wisdom quote */}
        {post.type === "wisdom" && post.quote && (
          <div className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: post.accentColor }}>
              💬 Wisdom shared
            </p>
            <blockquote className="text-[13px] italic text-slate-300 leading-relaxed border-l-2 pl-3"
              style={{ borderColor: post.accentColor + "60" }}>
              "{post.quote}"
            </blockquote>
          </div>
        )}

        {/* Story preview */}
        {post.type === "story-preview" && post.storyTitle && (
          <div className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: post.accentColor }}>
              📖 New chapter
            </p>
            <p
              className="text-[13px] font-bold text-white cursor-pointer hover:underline"
              onClick={() => navigate("/stories")}
            >
              {post.storyTitle}
            </p>
          </div>
        )}

        {/* Body text */}
        {post.content && post.type !== "wisdom" && (
          <div className="mb-3">
            <p className="text-[13px] text-slate-300 leading-relaxed">
              {isLong && !expanded ? post.content.slice(0, 220) + "…" : post.content}
            </p>
            {isLong && (
              <button onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-1 mt-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors">
                {expanded ? <><ChevronUp size={10} /> Less</> : <><ChevronDown size={10} /> Read more</>}
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
          <span className="text-[10px] text-slate-600">{post.timestamp}</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setLiked(v => !v)}
              className={`flex items-center gap-1 text-[10px] transition-colors ${liked ? "text-rose-400" : "text-slate-600 hover:text-slate-300"}`}>
              ❤️ {post.likes + (liked ? 1 : 0)}
            </button>
            <span className="text-[10px] text-slate-600 flex items-center gap-1">
              💬 {post.comments}
            </span>
            <span className="text-[10px] text-slate-600 flex items-center gap-1">
              <Share2 size={9} /> {post.shares}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   I) GROUPS
   ══════════════════════════════════════════════════════════════ */

function GroupTile({ group }: { group: ProfileGroup }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="relative rounded-2xl overflow-hidden p-4"
      style={{
        background: `linear-gradient(150deg, ${group.accent}10 0%, #0a0c12 100%)`,
        border: `1px solid ${group.accent}22`,
        boxShadow: `0 6px 20px rgba(0,0,0,0.45), 0 1px 0 ${group.accent}12 inset`,
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: group.accent + "60" }} />
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <span className="text-[18px]">{group.emoji}</span>
          <div>
            <p className="text-[12px] font-bold text-white">{group.name}</p>
            <p className="text-[9px] text-slate-600">{fmtNum(group.members)} members</p>
          </div>
        </div>
        {group.isCreator && (
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border"
            style={{ color: group.accent, background: group.accent + "15", borderColor: group.accent + "25" }}>
            Creator
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
        <span className="text-[9px] text-slate-600">{group.postsToday} posts today</span>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TAB CONTENT SECTIONS
   ══════════════════════════════════════════════════════════════ */

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.07] bg-[#1c1f2e] p-5 ${className}`}
      style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}
    >
      {children}
    </div>
  );
}

function SectionHeading({ emoji, title, action }: { emoji: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="text-[14px]">{emoji}</span>
        <h3 className="text-[12px] font-bold text-white uppercase tracking-wide">{title}</h3>
      </div>
      {action}
    </div>
  );
}

function OverviewTab({ profile }: { profile: UserProfile }) {
  return (
    <div className="space-y-5">
      <MyStoryPanel profile={profile} />

      <div className="grid grid-cols-2 gap-5">
        {/* Quick stats */}
        <SectionCard>
          <SectionHeading emoji="📊" title="Stats" />
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Followers", value: fmtNum(profile.followers), color: "text-indigo-400" },
              { label: "Following", value: fmtNum(profile.following), color: "text-violet-400" },
              { label: "Stories",   value: String(profile.storiesPublished), color: "text-emerald-400" },
              { label: "Awards",    value: String(profile.awardsWon),        color: "text-amber-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <p className={`text-[18px] font-black ${color}`}>{value}</p>
                <p className="text-[9px] text-slate-600 uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Awards quick view */}
        <SectionCard>
          <SectionHeading emoji="🏆" title="Awards" />
          <AwardsPanelSection profile={profile} />
        </SectionCard>
      </div>

      {/* Achievements preview */}
      <SectionCard>
        <SectionHeading emoji="🏅" title="Recent Achievements" />
        <div className="grid grid-cols-4 gap-3">
          {profile.achievements.slice(0, 4).map((a, i) => (
            <AchievementTile key={a.id} a={a} delay={i * 0.07} />
          ))}
        </div>
      </SectionCard>

      {/* Interests preview */}
      <SectionCard>
        <SectionHeading emoji="✨" title="Interests" />
        <div className="flex flex-wrap gap-2">
          {profile.interests.slice(0, 10).map(id => {
            const interest = ALL_INTERESTS.find(i => i.id === id);
            if (!interest) return null;
            return (
              <span key={id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-indigo-200 bg-indigo-600/15 border border-indigo-500/20">
                <span>{interest.emoji}</span>{interest.label}
              </span>
            );
          })}
        </div>
      </SectionCard>

      {/* Pinned walls */}
      <SectionCard>
        <SectionHeading emoji="🧱" title="Pinned Walls" />
        <div className="grid grid-cols-3 gap-3">
          {profile.walls.filter(w => w.pinned).map(w => <WallTileSmall key={w.id} wall={w} />)}
        </div>
      </SectionCard>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */

export default function ProfilePage() {
  const navigate = useNavigate();
  const profile = OWN_PROFILE;
  const [tab, setTab] = useState<ProfileTab>("overview");
  const [followed, setFollowed] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 flex flex-col">

      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-6 py-3">
          <BackToCockpit />
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-bold text-white"
              style={{ background: profile.avatarColor }}>
              {profile.initials}
            </div>
            <span className="text-sm font-bold text-white">{profile.name}</span>
          </div>
          <span className="text-[11px] text-slate-500">{profile.professionEmoji} {profile.profession}</span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 px-6 pb-0 border-t border-white/[0.04] overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[11px] font-semibold border-b-2 whitespace-nowrap transition-all ${
                tab === t.key
                  ? "border-indigo-400 text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              <span>{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">

          {/* Profile header — always visible */}
          <ProfileHeader profile={profile} followed={followed} onFollow={() => setFollowed(v => !v)} />

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            >

              {tab === "overview" && <OverviewTab profile={profile} />}

              {tab === "story" && (
                <div className="space-y-5">
                  <MyStoryPanel profile={profile} />
                  {STORIES.filter(s => s.author.name === profile.name).length === 0 && (
                    <SectionCard>
                      <p className="text-[12px] text-slate-500 text-center py-4">No story published yet.</p>
                    </SectionCard>
                  )}
                </div>
              )}

              {tab === "posts" && (
                <div className="space-y-4">
                  {profile.posts.map((p, i) => (
                    <PostCard key={p.id} post={p} delay={i * 0.06} />
                  ))}
                </div>
              )}

              {tab === "achievements" && (
                <SectionCard>
                  <SectionHeading emoji="🏅" title="All Achievements" />
                  <div className="grid grid-cols-4 gap-3">
                    {profile.achievements.map((a, i) => (
                      <AchievementTile key={a.id} a={a} delay={i * 0.06} />
                    ))}
                  </div>
                </SectionCard>
              )}

              {tab === "walls" && (
                <div className="space-y-5">
                  <SectionCard>
                    <SectionHeading emoji="📌" title="Pinned Walls"
                      action={<button onClick={() => navigate("/walls")} className="text-[10px] text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-1">Explore <ChevronRight size={10} /></button>} />
                    <div className="grid grid-cols-3 gap-3">
                      {profile.walls.filter(w => w.pinned).map(w => <WallTileSmall key={w.id} wall={w} />)}
                    </div>
                  </SectionCard>
                  <SectionCard>
                    <SectionHeading emoji="👣" title="Followed Walls" />
                    <div className="grid grid-cols-3 gap-3">
                      {profile.walls.filter(w => w.followed && !w.pinned).map(w => <WallTileSmall key={w.id} wall={w} />)}
                    </div>
                  </SectionCard>
                </div>
              )}

              {tab === "groups" && (
                <SectionCard>
                  <SectionHeading emoji="👥" title="Groups" />
                  <div className="grid grid-cols-3 gap-4">
                    {profile.groups.map(g => <GroupTile key={g.id} group={g} />)}
                  </div>
                </SectionCard>
              )}

              {tab === "awards" && (
                <SectionCard>
                  <SectionHeading emoji="🏆" title="Awards" />
                  <AwardsPanelSection profile={profile} />
                </SectionCard>
              )}

              {tab === "interests" && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button
                      onClick={() => navigate("/interests")}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors"
                    >
                      <Sparkles size={11} /> Open Interests Editor
                    </button>
                  </div>
                  <SectionCard>
                    <InterestsPanel profile={profile} />
                  </SectionCard>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
        <div className="h-10" />
      </div>
    </div>
  );
}
