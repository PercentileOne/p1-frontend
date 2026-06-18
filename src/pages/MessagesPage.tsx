import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Users, UserCheck, Briefcase, Sparkles, Bell,
  MessageCircle, Pin, Settings, X, Camera,
} from "lucide-react";
import BackToCockpit from "../components/BackToCockpit";
import {
  DEMO_CONVERSATIONS, MessagingEngine,
} from "../lib/messagesEngine";
import type { Conversation, ConversationType } from "../lib/messagesEngine";

/* ══════════════════════════════════════════════════════════════
   MESSAGES INBOX  /messages
   ══════════════════════════════════════════════════════════════ */

type Tab = "all" | "direct" | "group" | "accountability" | "recruiter";

const TABS: { key: Tab; label: string; type: ConversationType | "all" }[] = [
  { key: "all",            label: "All",            type: "all"            },
  { key: "direct",         label: "Direct",         type: "direct"         },
  { key: "accountability", label: "Accountability", type: "accountability" },
  { key: "group",          label: "Groups",         type: "group"          },
  { key: "recruiter",      label: "Recruiter",      type: "recruiter"      },
];

const TYPE_BADGE: Record<ConversationType, { label: string; color: string; bg: string }> = {
  direct:         { label: "DM",      color: "text-indigo-400",  bg: "bg-indigo-500/10" },
  group:          { label: "Group",   color: "text-blue-400",    bg: "bg-blue-500/10"   },
  accountability: { label: "Acct",   color: "text-amber-400",   bg: "bg-amber-500/10"  },
  recruiter:      { label: "Job",     color: "text-purple-400",  bg: "bg-purple-500/10" },
  agent:          { label: "Agent",   color: "text-green-400",   bg: "bg-green-500/10"  },
  system:         { label: "System",  color: "text-slate-400",   bg: "bg-slate-500/10"  },
};

export default function MessagesPage() {
  const navigate = useNavigate();
  const [tab,     setTab]    = useState<Tab>("all");
  const [search,  setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  const type  = TABS.find(t => t.key === tab)?.type ?? "all";
  const convs = MessagingEngine.filterConversations(DEMO_CONVERSATIONS, type, search);
  const pinned    = convs.filter(c => c.pinned);
  const unpinned  = convs.filter(c => !c.pinned);
  const totalUnread = MessagingEngine.totalUnread(DEMO_CONVERSATIONS);

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-5 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BackToCockpit />
            <MessageCircle size={16} className="text-indigo-400" />
            <h1 className="text-sm font-bold text-white">Messages</h1>
            {totalUnread > 0 && (
              <span className="flex items-center justify-center px-1.5 min-w-[18px] h-[18px] rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/messages/ingest")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-400 text-xs hover:bg-white/[0.07] transition-colors"
              title="AI Ingest">
              <Camera size={12} /> Ingest
            </button>
            <button onClick={() => navigate("/messages/settings")}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:bg-white/[0.07] transition-colors">
              <Settings size={13} />
            </button>
            <button onClick={() => setShowNew(v => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations, messages…"
            className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 transition-colors" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map(t => {
            const typeConvs = MessagingEngine.filterConversations(DEMO_CONVERSATIONS, t.type, "");
            const unread = typeConvs.reduce((s, c) => s + c.unreadCount, 0);
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  tab === t.key ? "bg-indigo-600 text-white" : "bg-white/[0.03] text-slate-400 hover:text-slate-300 hover:bg-white/[0.06]"
                }`}>
                {t.label}
                {unread > 0 && t.key !== "all" && (
                  <span className="ml-0.5 px-1 min-w-[16px] h-4 rounded-full bg-white/20 text-[9px] font-bold flex items-center justify-center">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* New conversation dropdown */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-white/[0.06] bg-[#13151c]">
            <div className="px-5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Start New</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: <MessageCircle size={13} />, label: "Direct Message",       color: "text-indigo-400", href: "/messages/new?type=direct"         },
                  { icon: <Users         size={13} />, label: "Group Chat",           color: "text-blue-400",   href: "/messages/new?type=group"           },
                  { icon: <UserCheck     size={13} />, label: "Accountability Chat",  color: "text-amber-400",  href: "/messages/new?type=accountability"  },
                  { icon: <Briefcase     size={13} />, label: "Recruiter Chat",       color: "text-purple-400", href: "/messages/new?type=recruiter"       },
                  { icon: <Sparkles      size={13} />, label: "Agent Coaching",       color: "text-green-400",  href: "/messages/p1agent"                  },
                  { icon: <Camera        size={13} />, label: "Ingest Media",         color: "text-rose-400",   href: "/messages/ingest"                   },
                ].map(a => (
                  <button key={a.label} onClick={() => { setShowNew(false); navigate(a.href); }}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all text-left">
                    <span className={a.color}>{a.icon}</span>
                    <span className="text-xs text-slate-300 font-medium">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {convs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <MessageCircle size={28} className="text-slate-700" />
            <p className="text-sm text-slate-500">No conversations found</p>
          </div>
        ) : (
          <>
            {/* Pinned */}
            {pinned.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-5 pt-3 pb-1.5">
                  <Pin size={10} className="text-slate-600" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Pinned</p>
                </div>
                {pinned.map(c => <ConversationRow key={c.id} conv={c} navigate={navigate} />)}
                <div className="h-px bg-white/[0.05] mx-5 my-1" />
              </div>
            )}
            {/* All */}
            {unpinned.map(c => <ConversationRow key={c.id} conv={c} navigate={navigate} />)}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Conversation Row ──────────────────────────────────────── */

function ConversationRow({ conv, navigate }: { conv: Conversation; navigate: ReturnType<typeof useNavigate> }) {
  const badge   = TYPE_BADGE[conv.type];
  const other   = MessagingEngine.otherParticipant(conv);
  const initials = conv.type === "direct" ? (other?.initials ?? "??") : conv.name.slice(0, 2).toUpperCase();
  const color    = conv.type === "direct" ? (other?.color ?? "#6366f1") : "#6366f1";
  const isOnline = conv.type === "direct" && (other?.online ?? false);
  const preview  = conv.lastMessage?.text ?? "";
  const ts       = conv.lastMessage ? MessagingEngine.formatTimestamp(conv.lastMessage.timestamp) : "";

  return (
    <motion.button whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
      onClick={() => navigate(`/messages/${conv.id}`)}
      className="w-full flex items-center gap-3 px-5 py-3.5 transition-colors text-left border-b border-white/[0.03]">

      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm text-white"
          style={{ backgroundColor: `${color}25`, border: `1.5px solid ${color}40` }}>
          {conv.type === "agent" ? "🤖" : conv.type === "system" ? "🔔" : initials}
        </div>
        {isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#0f1117]" />
        )}
        {conv.type === "accountability" && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
            <span className="text-[8px]">🔥</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className={`text-sm font-semibold truncate ${conv.unreadCount > 0 ? "text-white" : "text-slate-300"}`}>
              {conv.name}
            </p>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${badge.bg} ${badge.color}`}>
              {badge.label}
            </span>
            {conv.currentStreak && (
              <span className="text-[10px] text-amber-400 font-bold shrink-0">{conv.currentStreak}d 🔥</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="text-[10px] text-slate-600">{ts}</span>
            {conv.unreadCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {conv.unreadCount}
              </span>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-1">
          {conv.lastMessage?.agentGenerated && (
            <Sparkles size={9} className="text-green-400 shrink-0" />
          )}
          {conv.lastMessage?.attachment && (
            <span className="text-[11px] shrink-0">{conv.lastMessage.attachment.emoji}</span>
          )}
          <p className={`text-xs truncate ${conv.unreadCount > 0 ? "text-slate-300" : "text-slate-500"}`}>
            {preview}
          </p>
        </div>
      </div>
    </motion.button>
  );
}
