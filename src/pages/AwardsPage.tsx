import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Trophy, Star, Calendar, TrendingUp, Bell, BookOpen,
  ChevronRight, Sparkles, X, Check,
} from "lucide-react";
import BackToCockpit from "../components/BackToCockpit";
import { LargeAwardTile, MediumAwardTile, SmallAwardBadge, AwardNotificationToast } from "../components/AwardTiles";
import {
  WEEKLY_WINNERS, MONTHLY_WINNERS, AWARD_NOTIFICATIONS,
  CATEGORY_META,
} from "../lib/awardsData";
import type { AwardWinner } from "../lib/awardsData";

/* ══════════════════════════════════════════════════════════════
   P1 AWARDS PAGE — /awards
   ══════════════════════════════════════════════════════════════ */

type AwardTab = "weekly" | "monthly" | "history";

function ScoreBreakdown({ winner }: { winner: AwardWinner }) {
  return (
    <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl p-4"
      style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
      <div className="flex items-center gap-1.5 mb-3">
        <TrendingUp size={10} className="text-slate-500" />
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Scoring Breakdown</span>
      </div>
      <div className="space-y-2.5">
        {[
          { label: "Community Signals", val: winner.score.community, weight: "60%",
            desc: "Saves · Follows · Reads · Shares · Completion rate" },
          { label: "Agent Signals",     val: winner.score.agent,     weight: "30%",
            desc: "Emotional depth · Narrative arc · Writing quality" },
          { label: "Editorial Signals", val: winner.score.editorial, weight: "10%",
            desc: "Cultural relevance · Story impact · Manual curation" },
        ].map(({ label, val, weight, desc }) => (
          <div key={label}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-semibold text-slate-400">{label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-700">{weight}</span>
                <span className="text-[11px] font-bold text-white">{val}</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.05] mb-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${val}%` }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                className="h-full rounded-full"
                style={{ background: winner.accentColor + "cc" }}
              />
            </div>
            <p className="text-[9px] text-slate-700">{desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-white/[0.06] flex justify-between items-center">
        <span className="text-[10px] text-slate-500">Total Score</span>
        <span className="text-[15px] font-black" style={{ color: winner.accentColor }}>{winner.score.total} / 100</span>
      </div>
    </div>
  );
}

function AwardHistoryRow({ winner }: { winner: AwardWinner }) {
  const navigate = useNavigate();
  const meta = CATEGORY_META[winner.category];
  return (
    <motion.div
      whileHover={{ x: 3 }}
      className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.03] cursor-pointer border border-transparent hover:border-white/[0.06] transition-all"
      onClick={() => navigate(`/stories/${winner.storyId}`)}
    >
      <span className="text-lg w-6 text-center">{meta.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-slate-300 truncate">{winner.storyTitle}</p>
        <p className="text-[9px] text-slate-600">{winner.category} · {winner.period}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold" style={{ color: winner.accentColor }}>{winner.score.total}</span>
        <ChevronRight size={10} className="text-slate-700" />
      </div>
    </motion.div>
  );
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState(AWARD_NOTIFICATIONS);
  const [featured, setFeatured] = useState<Record<string, boolean>>({});

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.3 }}
      className="absolute top-full right-0 mt-2 w-80 z-30 bg-[#1c1f2e] border border-white/[0.08] rounded-2xl overflow-hidden"
      style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.75)" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Bell size={11} className="text-slate-400" />
          <span className="text-[11px] font-bold text-white">Award Notifications</span>
          {notifications.some(n => !n.read) && (
            <span className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-[8px] font-bold text-white">
              {notifications.filter(n => !n.read).length}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors p-1">
          <X size={11} />
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-slate-600 text-[11px]">No notifications</div>
        ) : (
          notifications.map(n => (
            <div key={n.id}
              className={`px-4 py-3 border-b border-white/[0.04] last:border-0 ${!n.read ? "bg-indigo-600/[0.04]" : ""}`}>
              <div className="flex items-start gap-2 mb-2">
                <span className="text-base">🏆</span>
                <div className="flex-1">
                  <p className="text-[11px] text-slate-300 leading-snug">{n.message}</p>
                  <p className="text-[9px] text-slate-600 mt-0.5">{n.awardedAt}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                    className="text-slate-700 hover:text-slate-400 transition-colors"
                  >
                    <Check size={10} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <div
                    className={`w-7 h-4 rounded-full transition-colors relative ${featured[n.id] ? "bg-indigo-600" : "bg-white/[0.1]"}`}
                    onClick={() => setFeatured(f => ({ ...f, [n.id]: !f[n.id] }))}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${featured[n.id] ? "translate-x-3.5" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-[9px] text-slate-600">Feature on profile</span>
                </label>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

export default function AwardsPage() {
  const [tab, setTab] = useState<AwardTab>("weekly");
  const [showNotifs, setShowNotifs] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const unread = AWARD_NOTIFICATIONS.filter(n => !n.read).length;

  const weeklyWinner = WEEKLY_WINNERS[0];
  const weeklyRunners = WEEKLY_WINNERS.slice(1);
  const monthlyWinner = MONTHLY_WINNERS[0];
  const monthlyRunners = MONTHLY_WINNERS.slice(1);

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-6 py-3">
          <BackToCockpit />
          <div className="flex items-center gap-2">
            <Trophy size={14} className="text-amber-400" />
            <h1 className="text-sm font-bold text-white">Story Awards</h1>
          </div>
          <span className="text-[10px] text-slate-600">·</span>
          <span className="text-[11px] text-slate-500">Celebrating the best stories on P1</span>

          <div className="ml-auto flex items-center gap-3 relative">
            <button
              onClick={() => setShowNotifs(v => !v)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-all text-[11px] text-slate-400"
            >
              <Bell size={12} />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-[8px] font-bold text-white">
                  {unread}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} />}
            </AnimatePresence>

            <button
              onClick={() => setToast("Test: Your story has won Story of the Week 🏆")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold hover:bg-amber-500/15 transition-all"
            >
              <Sparkles size={11} /> Preview Notification
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pb-0 border-t border-white/[0.04]">
          {([
            { key: "weekly",  label: "🏆 This Week",  sub: "Week of 9 Jun 2026" },
            { key: "monthly", label: "🌟 This Month", sub: "June 2026"           },
            { key: "history", label: "📚 All Awards",  sub: "Full history"        },
          ] as const).map(({ key, label, sub }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex flex-col items-start px-4 py-2.5 text-left border-b-2 transition-all ${
                tab === key
                  ? "border-amber-400 text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              <span className="text-[12px] font-semibold">{label}</span>
              <span className="text-[9px] text-slate-600">{sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
            <AwardNotificationToast
              message={toast}
              accentColor="#f59e0b"
              onClose={() => setToast(null)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">

          <AnimatePresence mode="wait">

            {/* ── Weekly ── */}
            {tab === "weekly" && (
              <motion.div key="weekly" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-amber-400" />
                    <h2 className="text-[15px] font-bold text-white">This Week's Winners</h2>
                  </div>
                  <span className="text-[10px] text-slate-600 bg-white/[0.04] border border-white/[0.07] px-2 py-0.5 rounded-lg">
                    Week of 9 Jun 2026
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-8">
                  {/* Large tile spans 2 cols */}
                  <div className="col-span-2">
                    <LargeAwardTile winner={weeklyWinner} delay={0} />
                  </div>
                  {/* Score breakdown sidebar */}
                  <div className="flex flex-col gap-4">
                    <ScoreBreakdown winner={weeklyWinner} />
                    <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl p-4"
                      style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
                      <div className="flex items-center gap-1.5 mb-3">
                        <Calendar size={10} className="text-slate-500" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Award Cycle</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-600">Awarded</span>
                          <span className="text-slate-400">{weeklyWinner.awardedAt}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-600">Next award</span>
                          <span className="text-slate-400">23 Jun 2026</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-600">Stories scored</span>
                          <span className="text-slate-400">148 this week</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Runner-up tiles */}
                <div className="flex items-center gap-2 mb-4">
                  <Star size={12} className="text-slate-500" />
                  <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">This Week's Category Winners</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {weeklyRunners.map((w, i) => (
                    <MediumAwardTile key={w.id} winner={w} delay={i * 0.1} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Monthly ── */}
            {tab === "monthly" && (
              <motion.div key="monthly" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center gap-2">
                    <Star size={16} className="text-amber-400" />
                    <h2 className="text-[15px] font-bold text-white">June 2026 — Monthly Awards</h2>
                  </div>
                  <span className="text-[10px] text-slate-600 bg-white/[0.04] border border-white/[0.07] px-2 py-0.5 rounded-lg">
                    5 category winners
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className="col-span-2">
                    <LargeAwardTile winner={monthlyWinner} delay={0} />
                  </div>
                  <div className="flex flex-col gap-4">
                    <ScoreBreakdown winner={monthlyWinner} />
                    <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl p-4"
                      style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
                      <div className="flex items-center gap-1.5 mb-3">
                        <BookOpen size={10} className="text-slate-500" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Month Stats</span>
                      </div>
                      <div className="space-y-2">
                        {[
                          { label: "Stories published",   value: "62"     },
                          { label: "Total reads",          value: "214K"   },
                          { label: "Stories scored",       value: "618"    },
                          { label: "Avg completion rate",  value: "51%"    },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between text-[10px]">
                            <span className="text-slate-600">{label}</span>
                            <span className="text-slate-400 font-semibold">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={12} className="text-slate-500" />
                  <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Category Winners</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {monthlyRunners.map((w, i) => (
                    <MediumAwardTile key={w.id} winner={w} delay={i * 0.1} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── History ── */}
            {tab === "history" && (
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <div className="grid grid-cols-2 gap-8">
                  {/* Award badges legend */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Trophy size={13} className="text-amber-400" />
                      <h3 className="text-[12px] font-bold text-white">Award Badges</h3>
                    </div>
                    <div className="space-y-2 mb-6">
                      {[
                        { tier: "gold" as const,   label: "Gold Award",   desc: "Monthly category winner"     },
                        { tier: "silver" as const, label: "Silver Award", desc: "Weekly category winner"      },
                        { tier: "bronze" as const, label: "Bronze Award", desc: "Runner-up / honourable mention" },
                      ].map(({ tier, desc }) => {
                        const mockWinner = { ...WEEKLY_WINNERS[0], tier, category: "Story of the Week" as const, id: `badge-${tier}`, period: "Jun 2026" };
                        return (
                          <div key={tier} className="flex items-center gap-3">
                            <SmallAwardBadge winner={mockWinner} showStory={false} />
                            <p className="text-[10px] text-slate-500">{desc}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* All category definitions */}
                    <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl p-4"
                      style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600 block mb-3">Award Categories</span>
                      <div className="space-y-2.5">
                        {Object.entries(CATEGORY_META).map(([cat, { emoji, description }]) => (
                          <div key={cat} className="flex items-start gap-2">
                            <span className="text-[13px] w-5">{emoji}</span>
                            <div>
                              <p className="text-[10px] font-semibold text-slate-300">{cat}</p>
                              <p className="text-[9px] text-slate-600">{description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Award history list */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar size={13} className="text-slate-500" />
                      <h3 className="text-[12px] font-bold text-white">Award History</h3>
                    </div>

                    <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl overflow-hidden mb-4"
                      style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
                      <div className="px-3 pt-3 pb-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Weekly Awards</span>
                      </div>
                      <div className="p-2">
                        {WEEKLY_WINNERS.map(w => <AwardHistoryRow key={w.id} winner={w} />)}
                      </div>
                    </div>

                    <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl overflow-hidden"
                      style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
                      <div className="px-3 pt-3 pb-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Monthly Awards — June 2026</span>
                      </div>
                      <div className="p-2">
                        {MONTHLY_WINNERS.map(w => <AwardHistoryRow key={w.id} winner={w} />)}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
        <div className="h-8" />
      </div>
    </div>
  );
}