import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Trophy, Star, Bookmark, Bell, Share2, ChevronRight,
  Sparkles, TrendingUp, Users, BookOpen, X, Check,
} from "lucide-react";
import type { AwardWinner, AwardTier } from "../lib/awardsData";
import { CATEGORY_META, AWARD_PALETTE } from "../lib/awardsData";

/* ══════════════════════════════════════════════════════════════
   AWARD TILES — raised 3D, cinematic, gold shimmer
   ══════════════════════════════════════════════════════════════ */

function fmtCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

// ── Gold shimmer overlay ──────────────────────────────────────

function GoldShimmer({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.6, 0] }}
      transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 3.5, ease: "easeInOut" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(105deg, transparent 30%, rgba(245,158,11,0.18) 50%, transparent 70%)",
          transform: "translateX(-100%)",
          animation: "shimmer-slide 2.4s ease-in-out infinite 3.5s",
        }}
      />
    </motion.div>
  );
}

// ── Glow pulse ────────────────────────────────────────────────

function GlowEdge({ color, intensity = 1 }: { color: string; intensity?: number }) {
  return (
    <motion.div
      className="absolute inset-0 rounded-[inherit] pointer-events-none"
      animate={{ opacity: [0.4 * intensity, 0.85 * intensity, 0.4 * intensity] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      style={{ boxShadow: `0 0 28px 4px ${color}`, zIndex: -1 }}
    />
  );
}

// ── Tier badge ────────────────────────────────────────────────

function TierBadge({ tier }: { tier: AwardTier }) {
  const cfg = {
    gold:   { label: "🥇 Gold Award",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
    silver: { label: "🥈 Silver Award", color: "#94a3b8", bg: "rgba(148,163,184,0.1)"  },
    bronze: { label: "🥉 Bronze Award", color: "#cd7c4a", bg: "rgba(205,124,74,0.1)"   },
  }[tier];
  return (
    <span
      className="inline-flex items-center text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg border"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.color + "30" }}
    >
      {cfg.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════
   LARGE FEATURE TILE — Story of the Week / Month
   ══════════════════════════════════════════════════════════════ */

export function LargeAwardTile({ winner, delay = 0 }: { winner: AwardWinner; delay?: number }) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);
  const palette = AWARD_PALETTE[winner.tier];
  const meta = CATEGORY_META[winner.category];
  const shouldReduce = useReducedMotion();

  function handleShare() {
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.4, 0, 0.2, 1] }}
      className="relative rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: `linear-gradient(150deg, ${winner.gradientFrom} 0%, ${winner.gradientTo} 100%)`,
        border: `1px solid ${winner.accentColor}40`,
        boxShadow: `0 20px 60px rgba(0,0,0,0.75), 0 1px 0 ${winner.accentColor}25 inset, 0 -1px 0 rgba(0,0,0,0.5) inset`,
      }}
      whileHover={shouldReduce ? undefined : { y: -6, transition: { duration: 0.25 } }}
      onClick={() => navigate(`/stories/${winner.storyId}`)}
    >
      {/* Glow edge */}
      <GlowEdge color={palette.glow} intensity={winner.tier === "gold" ? 1 : 0.6} />

      {/* Gold shimmer */}
      <GoldShimmer active={winner.tier === "gold"} />

      {/* Accent top bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, transparent, ${winner.accentColor}, transparent)` }} />

      <div className="p-6">
        {/* Header row */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <motion.span
                className="text-2xl"
                animate={shouldReduce ? undefined : { scale: [1, 1.12, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
              >
                {meta.emoji}
              </motion.span>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: winner.accentColor + "aa" }}>
                  {winner.period}
                </p>
                <h3 className="text-[13px] font-bold text-white">{winner.category}</h3>
              </div>
            </div>
            <TierBadge tier={winner.tier} />
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1 text-[10px] font-bold"
              style={{ color: winner.accentColor }}>
              <Trophy size={11} fill="currentColor" />
              <span>{winner.score.total}</span>
              <span className="text-slate-600 font-normal">/ 100</span>
            </div>
            <div className="flex flex-col gap-0.5 items-end">
              {[
                { label: "Community", val: winner.score.community, w: "60%" },
                { label: "Agent",     val: winner.score.agent,     w: "30%" },
                { label: "Editorial", val: winner.score.editorial, w: "10%" },
              ].map(({ label, val, w }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="text-[8px] text-slate-700">{w}</span>
                  <div className="w-16 h-1 rounded-full bg-white/[0.06]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${val}%` }}
                      transition={{ duration: 0.8, delay: delay + 0.3 }}
                      className="h-full rounded-full"
                      style={{ background: winner.accentColor + "cc" }}
                    />
                  </div>
                  <span className="text-[8px] text-slate-600 w-5 text-right">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Story title + excerpt */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-white leading-snug mb-2">{winner.storyTitle}</h2>
          <p className="text-[12px] text-slate-400 leading-relaxed line-clamp-2">{winner.storyExcerpt}</p>
        </div>

        {/* Why won — agent insight */}
        <div className="rounded-xl p-3.5 mb-5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles size={9} style={{ color: winner.accentColor }} />
            <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: winner.accentColor }}>
              Why this story won
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">{winner.whyWon}</p>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 mb-5">
          {[
            { icon: <Bookmark size={9} />,    val: fmtCount(winner.savedCount),    label: "saves"     },
            { icon: <Bell size={9} />,        val: fmtCount(winner.followerCount), label: "followers" },
            { icon: <BookOpen size={9} />,    val: fmtCount(winner.readCount),     label: "reads"     },
            { icon: <Share2 size={9} />,      val: fmtCount(winner.shareCount),    label: "shares"    },
          ].map(({ icon, val, label }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1" style={{ color: winner.accentColor + "cc" }}>{icon}</div>
              <span className="text-[13px] font-bold text-white">{val}</span>
              <span className="text-[8px] text-slate-700">{label}</span>
            </div>
          ))}
        </div>

        {/* Author + actions */}
        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ background: winner.authorColor + "33", border: `1.5px solid ${winner.authorColor}50` }}>
            {winner.authorInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-white truncate">{winner.authorName}</p>
            <p className="text-[10px] text-slate-500">{winner.authorProfessionEmoji} {winner.authorProfession}</p>
          </div>

          <div className="flex gap-2">
            <motion.button whileTap={{ scale: 0.88 }} onClick={() => setSaved(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold border transition-all ${
                saved
                  ? "text-amber-300 border-amber-500/30 bg-amber-500/10"
                  : "text-slate-500 border-white/[0.08] hover:text-slate-200 hover:border-white/[0.18]"
              }`}>
              <Bookmark size={10} fill={saved ? "currentColor" : "none"} />
              {saved ? "Saved" : "Save"}
            </motion.button>

            <motion.button whileTap={{ scale: 0.88 }} onClick={handleShare}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold border border-white/[0.08] text-slate-500 hover:text-slate-200 hover:border-white/[0.18] transition-all">
              <AnimatePresence mode="wait">
                {shared
                  ? <motion.span key="ok" initial={{ scale: 0.6 }} animate={{ scale: 1 }} exit={{ scale: 0.6 }} className="text-green-400"><Check size={10} /></motion.span>
                  : <motion.span key="share" initial={{ scale: 0.6 }} animate={{ scale: 1 }}><Share2 size={10} /></motion.span>
                }
              </AnimatePresence>
              {shared ? "Shared" : "Share"}
            </motion.button>

            <motion.button whileTap={{ scale: 0.96 }}
              onClick={() => navigate(`/stories/${winner.storyId}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white transition-all"
              style={{ background: winner.accentColor + "cc" }}>
              Read Story <ChevronRight size={11} />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MEDIUM AWARD TILE — runner-up / category winner
   ══════════════════════════════════════════════════════════════ */

export function MediumAwardTile({ winner, delay = 0 }: { winner: AwardWinner; delay?: number }) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const meta = CATEGORY_META[winner.category];
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.4, 0, 0.2, 1] }}
      className="relative rounded-2xl overflow-hidden cursor-pointer flex flex-col"
      style={{
        background: `linear-gradient(150deg, ${winner.gradientFrom} 0%, ${winner.gradientTo} 100%)`,
        border: `1px solid ${winner.accentColor}30`,
        boxShadow: `0 12px 40px rgba(0,0,0,0.65), 0 1px 0 ${winner.accentColor}18 inset, 0 -1px 0 rgba(0,0,0,0.4) inset`,
      }}
      whileHover={shouldReduce ? undefined : { y: -5, transition: { duration: 0.22 } }}
      onClick={() => navigate(`/stories/${winner.storyId}`)}
    >
      <GlowEdge color={AWARD_PALETTE[winner.tier].glow} intensity={0.45} />
      <GoldShimmer active={winner.tier === "gold"} />

      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${winner.accentColor}80, transparent)` }} />

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <motion.span
              className="text-xl"
              animate={shouldReduce ? undefined : { scale: [1, 1.1, 1] }}
              transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 5, delay }}
            >{meta.emoji}</motion.span>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: winner.accentColor + "99" }}>
                {winner.period}
              </p>
              <p className="text-[11px] font-bold text-white leading-snug">{winner.category}</p>
            </div>
          </div>
          <TierBadge tier={winner.tier} />
        </div>

        <h3 className="text-[13px] font-bold text-white mb-1.5 leading-snug">{winner.storyTitle}</h3>
        <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2 mb-3 flex-1">{winner.storyExcerpt}</p>

        {/* Insight snippet */}
        <div className="rounded-xl p-3 mb-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-1 mb-1">
            <Sparkles size={8} style={{ color: winner.accentColor }} />
            <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: winner.accentColor + "99" }}>Why this won</span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{winner.whyWon}</p>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-3">
          {[
            { icon: <Bookmark size={8} />, val: fmtCount(winner.savedCount) },
            { icon: <BookOpen size={8} />, val: fmtCount(winner.readCount)  },
            { icon: <TrendingUp size={8} />, val: `${winner.score.total}/100` },
          ].map(({ icon, val }, i) => (
            <div key={i} className="flex items-center gap-1 text-[10px]" style={{ color: winner.accentColor + "aa" }}>
              {icon} <span className="text-slate-400">{val}</span>
            </div>
          ))}
        </div>

        {/* Author + actions */}
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold text-white shrink-0"
            style={{ background: winner.authorColor + "33", border: `1px solid ${winner.authorColor}50` }}>
            {winner.authorInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-white truncate">{winner.authorName}</p>
            <p className="text-[9px] text-slate-600">{winner.authorProfessionEmoji} {winner.authorProfession}</p>
          </div>
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => setSaved(v => !v)}
            className={`p-1.5 rounded-lg border transition-all ${
              saved ? "text-amber-300 border-amber-500/30 bg-amber-500/10" : "text-slate-600 border-white/[0.07] hover:text-slate-300"
            }`}>
            <Bookmark size={9} fill={saved ? "currentColor" : "none"} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.96 }}
            onClick={() => navigate(`/stories/${winner.storyId}`)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-white"
            style={{ background: winner.accentColor + "cc" }}>
            Read <ChevronRight size={9} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SMALL AWARD BADGE — for profiles, feed previews
   ══════════════════════════════════════════════════════════════ */

export function SmallAwardBadge({ winner, showStory = true }: { winner: AwardWinner; showStory?: boolean }) {
  const navigate = useNavigate();
  const meta = CATEGORY_META[winner.category];
  const tierColors = {
    gold:   { bg: "rgba(245,158,11,0.12)",  border: "#f59e0b30", text: "#f59e0b" },
    silver: { bg: "rgba(148,163,184,0.1)",  border: "#94a3b820", text: "#94a3b8" },
    bronze: { bg: "rgba(205,124,74,0.1)",   border: "#cd7c4a20", text: "#cd7c4a" },
  }[winner.tier];

  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer border transition-all"
      style={{ background: tierColors.bg, borderColor: tierColors.border }}
      onClick={() => showStory && navigate(`/stories/${winner.storyId}`)}
    >
      <span className="text-[14px]">{meta.emoji}</span>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: tierColors.text }}>
          {winner.category}
        </p>
        {showStory && (
          <p className="text-[10px] text-slate-400 truncate">{winner.storyTitle}</p>
        )}
        <p className="text-[9px] text-slate-600">{winner.period}</p>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   AWARD WINNER FEED CARD — for FeedPage injection
   ══════════════════════════════════════════════════════════════ */

export function AwardFeedCard({ winner, onDismiss }: { winner: AwardWinner; onDismiss?: () => void }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const meta = CATEGORY_META[winner.category];

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${winner.gradientFrom} 0%, ${winner.gradientTo} 100%)`,
        border: `1px solid ${winner.accentColor}35`,
        boxShadow: `0 10px 32px rgba(0,0,0,0.6), 0 1px 0 ${winner.accentColor}18 inset`,
      }}
    >
      <GoldShimmer active={winner.tier === "gold"} />
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${winner.accentColor}, transparent)` }} />

      {onDismiss && (
        <button
          onClick={() => { setDismissed(true); onDismiss(); }}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-all z-10"
        >
          <X size={11} />
        </button>
      )}

      <div className="p-4 pr-10">
        <div className="flex items-center gap-2 mb-3">
          <motion.span className="text-lg" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}>
            {meta.emoji}
          </motion.span>
          <div>
            <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: winner.accentColor + "99" }}>
              Award Announcement · {winner.awardedAt}
            </p>
            <p className="text-[12px] font-bold text-white">{winner.category}</p>
          </div>
          <TierBadge tier={winner.tier} />
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ background: winner.authorColor + "33", border: `1.5px solid ${winner.authorColor}50` }}>
            {winner.authorInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-white">{winner.storyTitle}</p>
            <p className="text-[10px] text-slate-400 mb-2">{winner.authorName} · {winner.authorProfessionEmoji} {winner.authorProfession}</p>
            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{winner.whyWon}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <div className="flex gap-3 text-[10px] text-slate-600">
            <span>{fmtCount(winner.readCount)} reads</span>
            <span>{fmtCount(winner.savedCount)} saves</span>
          </div>
          <button
            onClick={() => navigate(`/stories/${winner.storyId}`)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white"
            style={{ background: winner.accentColor + "cc" }}
          >
            Read Story <ChevronRight size={10} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   AWARD NOTIFICATION TOAST
   ══════════════════════════════════════════════════════════════ */

export function AwardNotificationToast({ message, accentColor, onClose }: {
  message: string;
  accentColor: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.95 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
      style={{
        background: `linear-gradient(135deg, #1a1505 0%, #0f0c00 100%)`,
        borderColor: accentColor + "40",
        boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 20px ${accentColor}20`,
        minWidth: "320px",
      }}
    >
      <motion.span className="text-xl" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: 2 }}>🏆</motion.span>
      <p className="flex-1 text-[12px] text-slate-300 leading-snug">{message}</p>
      <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors p-1">
        <X size={12} />
      </button>
    </motion.div>
  );
}
