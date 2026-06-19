/* ══════════════════════════════════════════════════════════════
   GROUPS STORE — Phase 4
   Module-level singleton so state persists across route changes.
   No backend yet — fully local simulation.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────

export type ActivityType =
  | "card_created"
  | "room_finished"
  | "note_shared"
  | "milestone"
  | "member_joined";

export interface ActivityItem {
  id:        string;
  type:      ActivityType;
  userId:    string;
  userName:  string;
  userInitials: string;
  userAccent:   string;
  message:   string;
  timestamp: Date;
  meta?: {
    cardTitle?: string;
    score?:     number;
    roomMode?:  string;
    grade?:     string;
  };
}

export interface RoomPreview {
  roomId:       string;
  cardTitle:    string;
  mode:         "study" | "battle" | "exam" | "tournament";
  scheduledFor: Date;
  hostName:     string;
  maxPlayers:   number;
}

export interface GroupMember {
  userId:   string;
  name:     string;
  initials: string;
  accent:   string;
  role:     "owner" | "admin" | "member";
  joinedAt: Date;
}

export interface LeaderboardEntry {
  userId:         string;
  name:           string;
  initials:       string;
  accent:         string;
  weeklyScore:    number;
  cardsCompleted: number;
  streak:         number;
  isLocal:        boolean;
}

export interface Group {
  id:             string;
  name:           string;
  description:    string;
  emoji:          string;
  accentColor:    string;  // tailwind bg class e.g. "bg-indigo-500"
  members:        GroupMember[];
  recentActivity: ActivityItem[];
  upcomingRooms:  RoomPreview[];
  leaderboard:    LeaderboardEntry[];
  createdAt:      Date;
  localUserRole:  "owner" | "admin" | "member" | null;
}

export interface CreateGroupOpts {
  name:        string;
  description: string;
  emoji:       string;
}

export interface CreateRoomOpts {
  cardTitle:    string;
  mode:         "study" | "battle" | "exam" | "tournament";
  scheduledFor: Date;
  maxPlayers:   number;
}

// ── Member pool ───────────────────────────────────────────────────

const LOCAL_MEMBER: GroupMember = {
  userId: "u-francis", name: "Francis", initials: "FR",
  accent: "bg-indigo-500", role: "owner", joinedAt: new Date("2025-11-01"),
};

const POOL: Omit<GroupMember, "role" | "joinedAt">[] = [
  { userId: "u-alex",   name: "Alex Chen",    initials: "AC", accent: "bg-amber-500"   },
  { userId: "u-sam",    name: "Sam Rivera",   initials: "SR", accent: "bg-emerald-500" },
  { userId: "u-jordan", name: "Jordan Park",  initials: "JP", accent: "bg-sky-500"     },
  { userId: "u-taylor", name: "Taylor Moore", initials: "TM", accent: "bg-violet-500"  },
  { userId: "u-casey",  name: "Casey Wu",     initials: "CW", accent: "bg-rose-500"    },
  { userId: "u-morgan", name: "Morgan Lee",   initials: "ML", accent: "bg-teal-500"    },
  { userId: "u-jamie",  name: "Jamie Patel",  initials: "JA", accent: "bg-orange-500"  },
];

function members(ids: string[], roles: Record<string, "owner" | "admin" | "member"> = {}): GroupMember[] {
  const out: GroupMember[] = [];
  if (ids.includes("u-francis")) {
    out.push({ ...LOCAL_MEMBER, role: roles["u-francis"] ?? "member" });
  }
  POOL.filter(p => ids.includes(p.userId)).forEach(p => {
    out.push({ ...p, role: roles[p.userId] ?? "member", joinedAt: new Date("2025-11-15") });
  });
  return out;
}

// ── Leaderboard builder ───────────────────────────────────────────

const LB_SCORES: Record<string, { weekly: number; cards: number; streak: number }> = {
  "u-francis": { weekly: 387, cards: 6, streak: 5  },
  "u-alex":    { weekly: 412, cards: 7, streak: 8  },
  "u-sam":     { weekly: 341, cards: 5, streak: 3  },
  "u-jordan":  { weekly: 298, cards: 4, streak: 2  },
  "u-taylor":  { weekly: 256, cards: 3, streak: 1  },
  "u-casey":   { weekly: 445, cards: 8, streak: 12 },
  "u-morgan":  { weekly: 189, cards: 2, streak: 0  },
  "u-jamie":   { weekly: 321, cards: 5, streak: 4  },
};

function leaderboard(ms: GroupMember[]): LeaderboardEntry[] {
  return ms.map(m => {
    const s = LB_SCORES[m.userId] ?? { weekly: 100, cards: 1, streak: 0 };
    return { userId: m.userId, name: m.name, initials: m.initials, accent: m.accent,
      weeklyScore: s.weekly, cardsCompleted: s.cards, streak: s.streak, isLocal: m.userId === "u-francis" };
  }).sort((a, b) => b.weeklyScore - a.weeklyScore);
}

// ── Activity helpers ──────────────────────────────────────────────

let _idSeq = 100;
function aid() { return `a-${++_idSeq}`; }
function ago(hours: number) { return new Date(Date.now() - hours * 3_600_000); }

function act(
  type: ActivityType, userId: string, m: Omit<GroupMember,"role"|"joinedAt">,
  message: string, hoursAgo: number,
  meta?: ActivityItem["meta"],
): ActivityItem {
  return { id: aid(), type, userId, userName: m.name, userInitials: m.initials,
    userAccent: m.accent, message, timestamp: ago(hoursAgo), meta };
}

// ── Mock groups ───────────────────────────────────────────────────

function buildGroups(): Group[] {
  // Group 1 — React Wizards
  const rw_members = members(
    ["u-francis","u-alex","u-casey","u-sam","u-jordan","u-taylor"],
    { "u-francis": "owner", "u-alex": "admin" },
  );

  const rw_activity: ActivityItem[] = [
    act("room_finished","u-casey", POOL[4], "Casey Wu finished a Battle room — scored 92 on React Components", 1, { score: 92, grade: "S", roomMode: "battle" }),
    act("card_created","u-alex",  POOL[0], "Alex Chen shared the card \"React Hooks\" with the group",         3, { cardTitle: "React Hooks" }),
    act("milestone",   "u-francis",{ userId:"u-francis",name:"Francis",initials:"FR",accent:"bg-indigo-500" }, "Francis hit a 5-day study streak 🔥", 6),
    act("room_finished","u-sam",  POOL[1], "Sam Rivera completed an Exam room — scored 74 on TypeScript Generics", 12, { score: 74, grade: "B", roomMode: "exam" }),
    act("member_joined","u-jordan",POOL[2], "Jordan Park joined React Wizards",                                24),
    act("note_shared", "u-taylor",POOL[3], "Taylor Moore shared study notes on Vite & HMR",                   36),
    act("card_created","u-casey", POOL[4], "Casey Wu shared the card \"Framer Motion\" with the group",       48, { cardTitle: "Framer Motion" }),
  ];

  const rw_rooms: RoomPreview[] = [
    { roomId: "rr-1", cardTitle: "React Components",    mode: "battle",     scheduledFor: new Date(Date.now() + 2 * 3_600_000),   hostName: "Alex Chen",  maxPlayers: 4 },
    { roomId: "rr-2", cardTitle: "TypeScript Generics", mode: "exam",       scheduledFor: new Date(Date.now() + 26 * 3_600_000),  hostName: "Casey Wu",   maxPlayers: 4 },
    { roomId: "rr-3", cardTitle: "Vite & HMR",         mode: "tournament",  scheduledFor: new Date(Date.now() + 74 * 3_600_000),  hostName: "Francis",    maxPlayers: 6 },
  ];

  // Group 2 — TypeScript Guild
  const ts_members = members(
    ["u-francis","u-jordan","u-morgan","u-jamie"],
    { "u-morgan": "owner", "u-francis": "member" },
  );

  const ts_activity: ActivityItem[] = [
    act("card_created","u-jamie",  POOL[6], "Jamie Patel shared the card \"TypeScript Generics\" with the group", 2, { cardTitle: "TypeScript Generics" }),
    act("room_finished","u-jordan",POOL[2], "Jordan Park completed a Study room — scored 68 on TypeScript Generics", 8, { score: 68, grade: "B", roomMode: "study" }),
    act("member_joined","u-francis",{ userId:"u-francis",name:"Francis",initials:"FR",accent:"bg-indigo-500" }, "Francis joined TypeScript Guild", 72),
    act("milestone",   "u-morgan", POOL[5], "Morgan Lee reached 50% mastery on TypeScript Generics 🎯",           96),
  ];

  const ts_rooms: RoomPreview[] = [
    { roomId: "tr-1", cardTitle: "TypeScript Generics", mode: "study", scheduledFor: new Date(Date.now() + 18 * 3_600_000), hostName: "Morgan Lee", maxPlayers: 3 },
  ];

  // Group 3 — P1 Cohort 2026
  const p1_members = members(
    ["u-francis","u-alex","u-sam","u-jordan","u-taylor","u-casey","u-morgan","u-jamie"],
    { "u-francis": "admin" },
  );

  const p1_activity: ActivityItem[] = [
    act("milestone",   "u-casey", POOL[4], "Casey Wu reached mastery on all 6 cards — first in the cohort! 👑", 0.5),
    act("room_finished","u-alex",  POOL[0], "Alex Chen won a Tournament room — scored 88 on Framer Motion", 4, { score: 88, grade: "A", roomMode: "tournament" }),
    act("card_created","u-sam",   POOL[1], "Sam Rivera shared the card \"Vite & HMR\" with the group", 10, { cardTitle: "Vite & HMR" }),
    act("note_shared", "u-francis",{ userId:"u-francis",name:"Francis",initials:"FR",accent:"bg-indigo-500" }, "Francis shared study notes on React Hooks", 18),
    act("member_joined","u-jamie", POOL[6], "Jamie Patel joined P1 Cohort 2026", 48),
    act("room_finished","u-taylor",POOL[3], "Taylor Moore finished a Battle room — scored 61 on React Components", 72, { score: 61, grade: "C", roomMode: "battle" }),
  ];

  const p1_rooms: RoomPreview[] = [
    { roomId: "p1-1", cardTitle: "Framer Motion",     mode: "tournament", scheduledFor: new Date(Date.now() + 6  * 3_600_000), hostName: "Alex Chen",  maxPlayers: 6 },
    { roomId: "p1-2", cardTitle: "React Hooks",       mode: "battle",     scheduledFor: new Date(Date.now() + 30 * 3_600_000), hostName: "Sam Rivera", maxPlayers: 4 },
    { roomId: "p1-3", cardTitle: "Tailwind CSS v4",   mode: "study",      scheduledFor: new Date(Date.now() + 54 * 3_600_000), hostName: "Francis",    maxPlayers: 4 },
  ];

  // Group 4 — Framer Motion Crew
  const fm_members = members(
    ["u-francis","u-taylor","u-morgan"],
    { "u-francis": "owner" },
  );

  const fm_activity: ActivityItem[] = [
    act("card_created","u-francis",{ userId:"u-francis",name:"Francis",initials:"FR",accent:"bg-indigo-500" }, "Francis shared the card \"Framer Motion\" with the group", 5, { cardTitle: "Framer Motion" }),
    act("member_joined","u-morgan",POOL[5], "Morgan Lee joined Framer Motion Crew", 120),
    act("milestone",   "u-taylor", POOL[3], "Taylor Moore completed their first Framer Motion test 🎉", 168),
  ];

  const fm_rooms: RoomPreview[] = [
    { roomId: "fm-1", cardTitle: "Framer Motion", mode: "study", scheduledFor: new Date(Date.now() + 48 * 3_600_000), hostName: "Francis", maxPlayers: 3 },
  ];

  return [
    { id: "g-react-wizards",   name: "React Wizards",      emoji: "⚡", accentColor: "bg-indigo-500",  description: "Speed-running the React ecosystem together. Battle mode obsessed.",   members: rw_members, recentActivity: rw_activity, upcomingRooms: rw_rooms, leaderboard: leaderboard(rw_members), createdAt: new Date("2025-10-15"), localUserRole: "owner"  },
    { id: "g-ts-guild",        name: "TypeScript Guild",   emoji: "🔷", accentColor: "bg-sky-500",     description: "Mastering the type system, one generic at a time.",                   members: ts_members, recentActivity: ts_activity, upcomingRooms: ts_rooms, leaderboard: leaderboard(ts_members), createdAt: new Date("2025-11-01"), localUserRole: "member" },
    { id: "g-p1-cohort",       name: "P1 Cohort 2026",    emoji: "🎓", accentColor: "bg-violet-500",  description: "The full P1 learning cohort — all sections, all cards, all modes.",   members: p1_members, recentActivity: p1_activity, upcomingRooms: p1_rooms, leaderboard: leaderboard(p1_members), createdAt: new Date("2025-09-01"), localUserRole: "admin"  },
    { id: "g-framer-crew",     name: "Framer Motion Crew", emoji: "✨", accentColor: "bg-rose-500",   description: "For those obsessed with spring physics and buttery animations.",         members: fm_members, recentActivity: fm_activity, upcomingRooms: fm_rooms, leaderboard: leaderboard(fm_members), createdAt: new Date("2025-12-01"), localUserRole: "owner"  },
  ];
}

// ── Module-level singleton (persists across route changes) ────────

let _groups: Group[] = buildGroups();
const _listeners = new Set<() => void>();
function _notify() { _listeners.forEach(l => l()); }

// ── Hook ─────────────────────────────────────────────────────────

export function useGroupsStore() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const l = () => rerender(n => n + 1);
    _listeners.add(l);
    return () => { _listeners.delete(l); };
  }, []);

  function getGroup(id: string): Group | undefined {
    return _groups.find(g => g.id === id);
  }

  function createGroup(opts: CreateGroupOpts): Group {
    const localMember: GroupMember = { ...LOCAL_MEMBER, role: "owner", joinedAt: new Date() };
    const newGroup: Group = {
      id:             `g-${Date.now()}`,
      name:           opts.name,
      description:    opts.description,
      emoji:          opts.emoji,
      accentColor:    "bg-indigo-500",
      members:        [localMember],
      recentActivity: [{
        id: aid(), type: "member_joined", userId: "u-francis", userName: "Francis",
        userInitials: "FR", userAccent: "bg-indigo-500",
        message: "Francis created the group and became the first member",
        timestamp: new Date(),
      }],
      upcomingRooms:  [],
      leaderboard:    [{ userId:"u-francis", name:"Francis", initials:"FR", accent:"bg-indigo-500", weeklyScore:0, cardsCompleted:0, streak:0, isLocal:true }],
      createdAt:      new Date(),
      localUserRole:  "owner",
    };
    _groups = [newGroup, ..._groups];
    _notify();
    return newGroup;
  }

  function addActivity(groupId: string, item: Omit<ActivityItem, "id">): void {
    _groups = _groups.map(g =>
      g.id !== groupId ? g : {
        ...g,
        recentActivity: [{ ...item, id: aid() }, ...g.recentActivity].slice(0, 30),
      },
    );
    _notify();
  }

  function addRoom(groupId: string, room: RoomPreview): void {
    _groups = _groups.map(g =>
      g.id !== groupId ? g : { ...g, upcomingRooms: [room, ...g.upcomingRooms] },
    );
    _notify();
  }

  function shareCard(groupId: string, cardTitle: string): void {
    addActivity(groupId, {
      type: "card_created", userId: "u-francis", userName: "Francis",
      userInitials: "FR", userAccent: "bg-indigo-500",
      message: `Francis shared the card "${cardTitle}" with the group`,
      timestamp: new Date(),
      meta: { cardTitle },
    });
  }

  function postRoomResult(groupId: string, score: number, cardTitle: string, mode: string, grade: string): void {
    addActivity(groupId, {
      type: "room_finished", userId: "u-francis", userName: "Francis",
      userInitials: "FR", userAccent: "bg-indigo-500",
      message: `Francis finished a ${mode} room — scored ${score} on ${cardTitle}`,
      timestamp: new Date(),
      meta: { score, cardTitle, roomMode: mode, grade },
    });
  }

  return {
    groups: _groups,
    getGroup,
    createGroup,
    addActivity,
    addRoom,
    shareCard,
    postRoomResult,
  };
}

export type GroupsStore = ReturnType<typeof useGroupsStore>;
