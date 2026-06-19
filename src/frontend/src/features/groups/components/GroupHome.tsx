/* ══════════════════════════════════════════════════════════════
   GroupHome — 4 tabs: Feed · Members · Rooms · Leaderboard
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, BookOpen, Trophy, FileText, Star, UserPlus,
  Users, Play, Plus, Crown, Flame, ChevronRight, CalendarClock,
} from "lucide-react";
import type { Group, ActivityItem, ActivityType, RoomPreview, LeaderboardEntry, GroupMember, CreateRoomOpts } from "../groupsStore";
import type { GroupsStore } from "../groupsStore";
import SectionLabel from "../../cards/components/shared/SectionLabel";
import CreateGroupRoomModal from "./CreateGroupRoomModal";

// ── Helpers ───────────────────────────────────────────────────────

function relativeTime(date: Date): string {
  const h = (Date.now() - date.getTime()) / 3_600_000;
  if (h < 1)   return `${Math.round(h * 60)}m ago`;
  if (h < 24)  return `${Math.round(h)}h ago`;
  if (h < 168) return `${Math.round(h / 24)}d ago`;
  return `${Math.round(h / 168)}w ago`;
}

function formatScheduled(date: Date): string {
  const h = (date.getTime() - Date.now()) / 3_600_000;
  if (h < 1)   return "Starting soon";
  if (h < 24)  return `In ${Math.round(h)}h`;
  return `In ${Math.round(h / 24)}d`;
}

// ── Activity icon/color map ────────────────────────────────────────

const ACTIVITY_META: Record<ActivityType, { icon: React.ReactNode; color: string; bg: string }> = {
  card_created:  { icon: <BookOpen size={11} />,  color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/20" },
  room_finished: { icon: <Trophy   size={11} />,  color: "text-amber-400",   bg: "bg-amber-500/15   border-amber-500/20"   },
  note_shared:   { icon: <FileText size={11} />,  color: "text-sky-400",     bg: "bg-sky-500/15     border-sky-500/20"     },
  milestone:     { icon: <Star     size={11} />,  color: "text-violet-400",  bg: "bg-violet-500/15  border-violet-500/20"  },
  member_joined: { icon: <UserPlus size={11} />,  color: "text-indigo-400",  bg: "bg-indigo-500/15  border-indigo-500/20"  },
};

const MODE_BADGE: Record<string, string> = {
  battle:     "text-rose-400   bg-rose-500/10   border-rose-500/20",
  study:      "text-sky-400    bg-sky-500/10    border-sky-500/20",
  exam:       "text-amber-400  bg-amber-500/10  border-amber-500/20",
  tournament: "text-violet-400 bg-violet-500/10 border-violet-500/20",
};

const ROLE_BADGE: Record<string, string> = {
  owner:  "text-amber-400  bg-amber-500/10  border-amber-500/20",
  admin:  "text-violet-400 bg-violet-500/10 border-violet-500/20",
  member: "text-white/30   bg-white/[0.04]  border-white/[0.08]",
};

// ── Tab: Feed ─────────────────────────────────────────────────────

function FeedTab({ activity }: { activity: ActivityItem[] }) {
  if (activity.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
          <BookOpen size={18} className="text-white/20" />
        </div>
        <p className="text-[12px] text-white/35">No activity yet</p>
        <p className="text-[10px] text-white/20">Complete cards and rooms to see updates here</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {activity.map((item, i) => {
        const meta = ACTIVITY_META[item.type];
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-start gap-3 p-3 rounded-2xl border border-white/[0.05] bg-[#0f1117]"
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: `var(--tw-bg-${item.userAccent?.replace("bg-","")})` }}
            >
              <div className={`w-8 h-8 rounded-full ${item.userAccent} flex items-center justify-center text-[10px] font-bold text-white`}>
                {item.userInitials}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-white/70 leading-snug">{item.message}</p>

              {/* Meta chips */}
              {item.meta && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  {item.meta.score !== undefined && (
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                      item.meta.score >= 85 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                      item.meta.score >= 70 ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                                              "text-rose-400 bg-rose-500/10 border-rose-500/20"
                    }`}>
                      {item.meta.score}pts
                    </span>
                  )}
                  {item.meta.grade && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border text-white/40 bg-white/[0.04] border-white/[0.08]">
                      Grade {item.meta.grade}
                    </span>
                  )}
                  {item.meta.roomMode && (
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border capitalize ${MODE_BADGE[item.meta.roomMode] ?? ""}`}>
                      {item.meta.roomMode}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className={`w-6 h-6 rounded-lg border flex items-center justify-center ${meta.bg} ${meta.color}`}>
                {meta.icon}
              </div>
              <span className="text-[8px] text-white/20 tabular-nums">{relativeTime(item.timestamp)}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Tab: Members ──────────────────────────────────────────────────

function MembersTab({ members }: { members: GroupMember[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SectionLabel>{members.length} members</SectionLabel>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/25 text-indigo-400 text-[10px] font-medium hover:bg-indigo-600/30 transition-colors">
          <UserPlus size={10} />
          Invite
        </button>
      </div>

      {members.map((m, i) => (
        <motion.div
          key={m.userId}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className={`flex items-center gap-3 p-3 rounded-2xl border ${
            m.userId === "u-francis"
              ? "bg-indigo-600/10 border-indigo-500/15"
              : "bg-white/[0.02] border-white/[0.05]"
          }`}
        >
          <div className={`w-9 h-9 rounded-full ${m.accent} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
            {m.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-[12px] font-semibold ${m.userId === "u-francis" ? "text-indigo-300" : "text-white/75"}`}>
                {m.name}
              </span>
              <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${ROLE_BADGE[m.role]}`}>
                {m.role}
              </span>
            </div>
            <p className="text-[9px] text-white/25 mt-0.5">
              Joined {relativeTime(m.joinedAt)}
            </p>
          </div>
          {m.role === "owner" && <Crown size={13} className="text-amber-400/60 shrink-0" />}
        </motion.div>
      ))}
    </div>
  );
}

// ── Tab: Rooms ────────────────────────────────────────────────────

function RoomsTab({
  rooms, canCreate, onCreateRoom,
}: {
  rooms: RoomPreview[];
  canCreate: boolean;
  onCreateRoom: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {canCreate && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onCreateRoom}
          className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-dashed border-indigo-500/25 bg-indigo-600/05 hover:bg-indigo-600/10 transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/25 flex items-center justify-center">
            <Plus size={13} className="text-indigo-400" />
          </div>
          <div className="text-left">
            <p className="text-[12px] font-semibold text-indigo-400">Create Group Room</p>
            <p className="text-[10px] text-white/30">Schedule a room for your group</p>
          </div>
        </motion.button>
      )}

      {rooms.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
            <CalendarClock size={18} className="text-white/20" />
          </div>
          <p className="text-[12px] text-white/35">No rooms scheduled</p>
        </div>
      )}

      {rooms.map((room, i) => (
        <motion.div
          key={room.roomId}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3 p-3.5 rounded-2xl border border-white/[0.06] bg-[#0f1117]"
          style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.05) inset" }}
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Play size={11} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[12px] font-semibold text-white/80 truncate">{room.cardTitle}</span>
              <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${MODE_BADGE[room.mode] ?? ""}`}>
                {room.mode}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[9px] text-white/30">
              <Crown size={8} className="text-amber-500/60" />
              <span>{room.hostName}</span>
              <Users size={8} />
              <span>up to {room.maxPlayers}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[9px] text-emerald-400/70 font-medium">{formatScheduled(room.scheduledFor)}</span>
            <button className="text-[9px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors">
              Join <ChevronRight size={9} />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Tab: Leaderboard ─────────────────────────────────────────────

function LeaderboardTab({ entries }: { entries: LeaderboardEntry[] }) {
  const top3 = entries.slice(0, 3);
  const rest  = entries.slice(3);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Weekly leaderboard</SectionLabel>
        <span className="text-[9px] text-white/25">Resets Sunday</span>
      </div>

      {/* Podium top 3 */}
      <div className="grid grid-cols-3 gap-2 items-end pb-2">
        {[top3[1], top3[0], top3[2]].map((entry, i) => {
          if (!entry) return <div key={i} />;
          const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
          const HEIGHT = ["h-20", "h-24", "h-16"][i];
          const podiumColor = rank === 1 ? "from-amber-500/30 to-amber-500/10 border-amber-500/30" :
                              rank === 2 ? "from-white/15 to-white/5 border-white/15" :
                                          "from-orange-700/20 to-orange-700/5 border-orange-600/20";
          return (
            <motion.div
              key={entry.userId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex flex-col items-center gap-1.5"
            >
              <div className={`w-9 h-9 rounded-full ${entry.accent} flex items-center justify-center text-[11px] font-bold text-white ${entry.isLocal ? "ring-2 ring-indigo-400/60 ring-offset-1 ring-offset-[#0a0b10]" : ""}`}>
                {entry.initials}
              </div>
              <span className="text-[9px] text-white/50 font-medium truncate w-full text-center">{entry.name.split(" ")[0]}</span>
              <div className={`${HEIGHT} w-full rounded-xl bg-gradient-to-b ${podiumColor} border flex flex-col items-center justify-center gap-0.5`}>
                {rank === 1 && <Crown size={11} className="text-amber-400" />}
                <span className="text-[11px] font-black text-white/80">#{rank}</span>
                <span className="text-[9px] text-white/40 tabular-nums">{entry.weeklyScore}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Rest of list */}
      {rest.map((entry, i) => (
        <motion.div
          key={entry.userId}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + i * 0.04 }}
          className={`flex items-center gap-3 p-3 rounded-2xl border ${
            entry.isLocal
              ? "bg-indigo-600/10 border-indigo-500/15"
              : "bg-white/[0.02] border-white/[0.05]"
          }`}
        >
          <span className="text-[11px] text-white/25 w-5 text-center font-bold">#{i + 4}</span>
          <div className={`w-8 h-8 rounded-full ${entry.accent} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
            {entry.initials}
          </div>
          <div className="flex-1 min-w-0">
            <span className={`text-[12px] font-semibold ${entry.isLocal ? "text-indigo-300" : "text-white/70"}`}>
              {entry.name}
            </span>
            <div className="flex items-center gap-2 mt-0.5 text-[9px] text-white/25">
              <span>{entry.cardsCompleted} cards</span>
              {entry.streak > 0 && (
                <span className="flex items-center gap-0.5 text-amber-400/70">
                  <Flame size={8} /> {entry.streak}d
                </span>
              )}
            </div>
          </div>
          <span className="text-[13px] font-black text-white/70 tabular-nums">{entry.weeklyScore}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Main GroupHome ────────────────────────────────────────────────

type Tab = "feed" | "members" | "rooms" | "leaderboard";
const TABS: { key: Tab; label: string }[] = [
  { key: "feed",        label: "Feed"        },
  { key: "members",     label: "Members"     },
  { key: "rooms",       label: "Rooms"       },
  { key: "leaderboard", label: "Leaderboard" },
];

interface Props {
  group:   Group;
  store:   GroupsStore;
  onBack:  () => void;
}

export default function GroupHome({ group, store, onBack }: Props) {
  const [tab,         setTab]         = useState<Tab>("feed");
  const [showRoomModal, setShowRoomModal] = useState(false);

  const canCreate = group.localUserRole === "owner" || group.localUserRole === "admin";

  const handleCreateRoom = (opts: CreateRoomOpts) => {
    store.addRoom(group.id, opts as unknown as RoomPreview);
    setShowRoomModal(false);
    store.addActivity(group.id, {
      type: "room_finished", userId: "u-francis", userName: "Francis",
      userInitials: "FR", userAccent: "bg-indigo-500",
      message: `Francis scheduled a ${opts.mode} room for "${opts.cardTitle}"`,
      timestamp: new Date(),
      meta: { cardTitle: opts.cardTitle, roomMode: opts.mode },
    });
  };

  // Get fresh group data from store on each render
  const liveGroup = store.getGroup(group.id) ?? group;

  return (
    <div className="flex flex-col gap-0 h-full">

      {/* Header */}
      <div className="flex items-center gap-3 pb-4">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={13} className="text-white/50" />
        </button>
        <div className="flex items-center gap-2.5">
          <span className="text-[18px]">{liveGroup.emoji}</span>
          <div>
            <h2 className="text-[14px] font-bold text-white/90 leading-tight">{liveGroup.name}</h2>
            <p className="text-[10px] text-white/30">{liveGroup.members.length} members</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06] mb-4">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-1.5 rounded-xl text-[10px] font-semibold transition-all ${
              tab === t.key
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-white/35 hover:text-white/55"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {tab === "feed"        && <FeedTab        activity={liveGroup.recentActivity} />}
            {tab === "members"     && <MembersTab     members={liveGroup.members} />}
            {tab === "rooms"       && (
              <RoomsTab
                rooms={liveGroup.upcomingRooms}
                canCreate={canCreate}
                onCreateRoom={() => setShowRoomModal(true)}
              />
            )}
            {tab === "leaderboard" && <LeaderboardTab entries={liveGroup.leaderboard} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Create Room Modal */}
      {showRoomModal && (
        <CreateGroupRoomModal
          onConfirm={handleCreateRoom}
          onClose={() => setShowRoomModal(false)}
        />
      )}
    </div>
  );
}
