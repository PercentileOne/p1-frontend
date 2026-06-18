import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Bookmark, Bell, Share2, ChevronLeft, ChevronRight, Clock, Star, TrendingUp, Heart, MessageCircle,
} from "lucide-react";
import BackToCockpit from "../components/BackToCockpit";
import { getStory } from "../lib/storiesData";
import type { Chapter, Story } from "../lib/storiesData";

/* ══════════════════════════════════════════════════════════════
   P1 STORY DETAIL — chapter reader
   ══════════════════════════════════════════════════════════════ */

function fmtCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

function ChapterSidebar({ story, current, onSelect }: {
  story: Story;
  current: number;
  onSelect: (i: number) => void;
}) {
  return (
    <aside className="w-56 shrink-0 sticky top-[100px] self-start flex flex-col gap-3" style={{ maxHeight: "calc(100vh - 120px)" }}>
      {/* Story header */}
      <div className="rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(150deg, ${story.gradientFrom} 0%, ${story.gradientTo} 100%)`,
          border: `1px solid ${story.accentColor}28`,
          boxShadow: `0 8px 28px rgba(0,0,0,0.5), 0 1px 0 ${story.accentColor}15 inset`,
        }}>
        <div className="h-[3px]" style={{ background: story.accentColor }} />
        <div className="p-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-base font-bold text-white"
            style={{ background: story.author.color + "33", border: `1.5px solid ${story.author.color}50` }}>
            {story.author.initials}
          </div>
          <p className="text-[11px] font-bold text-white leading-snug mb-1">{story.title}</p>
          <p className="text-[10px] text-slate-400">{story.author.name}</p>
          <p className="text-[10px] text-slate-500">{story.author.professionEmoji} {story.author.profession}</p>
        </div>
      </div>

      {/* Chapter list */}
      <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)", overflowY: "auto", flex: 1 }}>
        <div className="px-3 pt-3 pb-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Chapters</span>
        </div>
        <div className="p-1.5 flex flex-col gap-0.5">
          {story.chapters.map((ch, i) => (
            <button
              key={ch.number}
              onClick={() => onSelect(i)}
              className={`w-full flex items-start gap-2 px-2.5 py-2.5 rounded-xl text-left transition-all ${
                i === current
                  ? "bg-indigo-600/20 border border-indigo-500/20"
                  : "hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              <span
                className="text-[11px] font-black shrink-0 mt-0.5"
                style={{ color: i === current ? story.accentColor : "#475569" }}
              >
                {ch.number}
              </span>
              <div className="min-w-0">
                <p className={`text-[11px] font-semibold leading-snug ${i === current ? "text-white" : "text-slate-400"}`}>
                  {ch.title}
                </p>
                <p className="text-[9px] text-slate-600 mt-0.5">{ch.publishedAt}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function ChapterContent({ chapter, story }: { chapter: Chapter; story: Story }) {
  const paragraphs = chapter.content.split("\n\n").filter(Boolean);

  return (
    <motion.article
      key={chapter.number}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="flex-1 min-w-0"
    >
      {/* Chapter header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg"
            style={{ background: story.accentColor + "18", color: story.accentColor, border: `1px solid ${story.accentColor}25` }}>
            Chapter {chapter.number}
          </span>
          <span className="text-[10px] text-slate-600">{chapter.publishedAt}</span>
          <span className="flex items-center gap-1 text-[10px] text-slate-600 ml-auto">
            <Clock size={9} /> {chapter.readTime ?? `${Math.max(1, Math.ceil(chapter.content.split(/\s+/).length / 200))} min`}
          </span>
        </div>
        <h2 className="text-2xl font-bold text-white leading-snug">{chapter.title}</h2>
        <div className="mt-2 h-[2px] w-16 rounded-full" style={{ background: story.accentColor + "60" }} />
      </div>

      {/* Chapter body */}
      <div className="space-y-5">
        {paragraphs.map((para, i) => (
          <p key={i} className="text-[14px] leading-[1.85] text-slate-300">
            {para}
          </p>
        ))}
      </div>

      {/* Emotions / reactions */}
      <div className="mt-10 flex items-center gap-3 border-t border-white/[0.06] pt-5">
        {[
          { emoji: "❤️",  label: "Touched",   count: 142 },
          { emoji: "💪",  label: "Motivated",  count: 98  },
          { emoji: "🎯",  label: "Relatable",  count: 76  },
          { emoji: "🙏",  label: "Grateful",   count: 54  },
        ].map(({ emoji, label, count }) => (
          <button key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] transition-all">
            <span className="text-[13px]">{emoji}</span>
            <span className="text-[10px] font-semibold text-slate-400">{count}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-[10px] text-slate-600">
          <MessageCircle size={11} />
          <span>Leave a comment</span>
        </div>
      </div>
    </motion.article>
  );
}

function AuthorPanel({ story, saved, followed, onSave, onFollow }: {
  story: Story;
  saved: boolean;
  followed: boolean;
  onSave: () => void;
  onFollow: () => void;
}) {
  return (
    <aside className="w-60 shrink-0 sticky top-[100px] self-start flex flex-col gap-4" style={{ maxHeight: "calc(100vh - 120px)" }}>
      {/* Author card */}
      <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[12px] font-bold text-white shrink-0"
              style={{ background: story.author.color + "33", border: `1.5px solid ${story.author.color}50` }}>
              {story.author.initials}
            </div>
            <div>
              <p className="text-[12px] font-bold text-white">{story.author.name}</p>
              <p className="text-[10px] text-slate-500">{story.author.professionEmoji} {story.author.profession}</p>
              {story.wall && <p className="text-[10px] text-slate-600">{story.wall}</p>}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
            Sharing their journey — {story.chapters.length} chapters published on P1.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: "Saves",     value: fmtCount(story.savedCount)    },
              { label: "Followers", value: fmtCount(story.followerCount) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-2.5 text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[14px] font-bold text-white">{value}</p>
                <p className="text-[9px] text-slate-600">{label}</p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <motion.button whileTap={{ scale: 0.88 }} onClick={onSave}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold border transition-all ${
                saved ? "text-amber-300 border-amber-500/30 bg-amber-500/10" : "text-slate-400 border-white/[0.08] hover:border-white/[0.15] hover:text-slate-200"
              }`}>
              <Bookmark size={11} fill={saved ? "currentColor" : "none"} />
              {saved ? "Saved" : "Save"}
            </motion.button>
            <motion.button whileTap={{ scale: 0.88 }} onClick={onFollow}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold border transition-all ${
                followed ? "text-green-400 border-green-500/25 bg-green-500/10" : "text-slate-400 border-white/[0.08] hover:border-white/[0.15] hover:text-slate-200"
              }`}>
              <Bell size={11} fill={followed ? "currentColor" : "none"} />
              {followed ? "Following" : "Follow"}
            </motion.button>
            <motion.button whileTap={{ scale: 0.88 }}
              className="px-2.5 py-2 rounded-xl text-[11px] font-semibold border text-slate-400 border-white/[0.08] hover:border-white/[0.15] hover:text-slate-200 transition-all">
              <Share2 size={11} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Story stats */}
      <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl p-4"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
        <div className="flex items-center gap-1.5 mb-3">
          <TrendingUp size={10} className="text-slate-500" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Story Details</span>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { label: "Category",  value: story.category                       },
            { label: "Status",    value: story.status === "ongoing" ? "Ongoing" : "Complete" },
            { label: "Chapters",  value: String(story.chapters.length)        },
            { label: "Updated",   value: story.lastUpdate                     },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-[10px] text-slate-600">{label}</span>
              <span className="text-[10px] font-semibold text-slate-400">{value}</span>
            </div>
          ))}
        </div>
        {story.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {story.tags.map(tag => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-500 border border-white/[0.06]">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Trending reaction */}
      <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl p-4"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
        <div className="flex items-center gap-1.5 mb-3">
          <Heart size={10} className="text-rose-500" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Reader Reactions</span>
        </div>
        <div className="space-y-2">
          {[
            { emoji: "❤️",  label: "Touched",   pct: 68 },
            { emoji: "💪",  label: "Motivated",  pct: 52 },
            { emoji: "🎯",  label: "Relatable",  pct: 41 },
            { emoji: "🙏",  label: "Grateful",   pct: 29 },
          ].map(({ emoji, label, pct }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[11px] w-4">{emoji}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-rose-500/50" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[9px] text-slate-600 w-6 text-right">{pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default function StoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const story = getStory(id ?? "");

  const [chapterIdx, setChapterIdx] = useState(0);
  const [saved,    setSaved]    = useState(false);
  const [followed, setFollowed] = useState(false);

  if (!story) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-center">
          <BookOpen size={32} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 mb-3">Story not found.</p>
          <button onClick={() => navigate("/stories")} className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
            Back to Stories
          </button>
        </div>
      </div>
    );
  }

  const chapter = story.chapters[chapterIdx];
  const hasNext = chapterIdx < story.chapters.length - 1;
  const hasPrev = chapterIdx > 0;

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-6 py-3">
          <BackToCockpit />
          <button onClick={() => navigate("/stories")} className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
            <ChevronLeft size={12} /> Stories
          </button>
          <span className="text-slate-700">/</span>
          <span className="text-[11px] text-slate-400 truncate max-w-xs">{story.title}</span>

          <div className="ml-auto flex items-center gap-2">
            {/* Chapter nav */}
            <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-2 py-1">
              <button disabled={!hasPrev} onClick={() => setChapterIdx(i => i - 1)}
                className="disabled:opacity-30 hover:text-white text-slate-400 transition-colors p-0.5">
                <ChevronLeft size={12} />
              </button>
              <span className="text-[10px] text-slate-400 px-1">
                Ch. {chapter.number} / {story.chapters.length}
              </span>
              <button disabled={!hasNext} onClick={() => setChapterIdx(i => i + 1)}
                className="disabled:opacity-30 hover:text-white text-slate-400 transition-colors p-0.5">
                <ChevronRight size={12} />
              </button>
            </div>
            {story.featured && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-amber-400 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Star size={8} fill="currentColor" /> Featured
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex gap-8">

            {/* Left: chapter nav */}
            <ChapterSidebar story={story} current={chapterIdx} onSelect={setChapterIdx} />

            {/* Center: content */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                <ChapterContent key={chapterIdx} chapter={chapter} story={story} />
              </AnimatePresence>

              {/* Bottom chapter navigation */}
              <div className="flex gap-3 mt-12 pt-6 border-t border-white/[0.06]">
                {hasPrev && (
                  <motion.button whileTap={{ scale: 0.97 }}
                    onClick={() => setChapterIdx(i => i - 1)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.14] transition-all">
                    <ChevronLeft size={13} className="text-slate-400" />
                    <div className="text-left">
                      <p className="text-[9px] text-slate-600 uppercase tracking-wide">Previous</p>
                      <p className="text-[12px] font-semibold text-slate-200">{story.chapters[chapterIdx - 1].title}</p>
                    </div>
                  </motion.button>
                )}
                {hasNext && (
                  <motion.button whileTap={{ scale: 0.97 }}
                    onClick={() => setChapterIdx(i => i + 1)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ml-auto"
                    style={{
                      background: story.accentColor + "18",
                      borderColor: story.accentColor + "40",
                    }}>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-600 uppercase tracking-wide">Next Chapter</p>
                      <p className="text-[12px] font-semibold text-slate-200">{story.chapters[chapterIdx + 1].title}</p>
                    </div>
                    <ChevronRight size={13} style={{ color: story.accentColor }} />
                  </motion.button>
                )}
              </div>
            </div>

            {/* Right: author + story info */}
            <AuthorPanel
              story={story}
              saved={saved}
              followed={followed}
              onSave={() => setSaved(v => !v)}
              onFollow={() => setFollowed(v => !v)}
            />
          </div>
        </div>
        <div className="h-10" />
      </div>
    </div>
  );
}
