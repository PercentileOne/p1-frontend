import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Send, Camera, Mic, Paperclip, Sparkles, MoreHorizontal,
} from "lucide-react";
import {
  MessagingEngine, CURRENT_USER_ID,
} from "../lib/messagesEngine";
import type { Message, Attachment } from "../lib/messagesEngine";

/* ══════════════════════════════════════════════════════════════
   CONVERSATION THREAD  /messages/:id
   ══════════════════════════════════════════════════════════════ */


export default function ConversationThread() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const conv     = id ? MessagingEngine.getConversation(id) : undefined;
  const messages = id ? MessagingEngine.getMessages(id) : [];

  const [text,        setText]       = useState("");
  const [showAttach,  setShowAttach] = useState(false);
  const [localMsgs,   setLocalMsgs] = useState<Message[]>(messages);
  const [typing,      setTyping]     = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Simulate other-person typing after we send
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMsgs]);

  if (!conv) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Conversation not found.</p>
          <button onClick={() => navigate("/messages")} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
            Back to Messages
          </button>
        </div>
      </div>
    );
  }

  const other   = MessagingEngine.otherParticipant(conv);
  const isOnline = MessagingEngine.isOnline(conv);
  const localGrouped = MessagingEngine.groupMessagesByDate(localMsgs);

  const handleSend = () => {
    if (!text.trim()) return;
    const msg: Message = {
      id: `local-${Date.now()}`,
      conversationId: conv.id,
      senderId: CURRENT_USER_ID,
      senderName: "Francis Cobbinah",
      type: "text",
      text: text.trim(),
      timestamp: new Date(),
      read: false,
      reactions: [],
      agentGenerated: false,
      edited: false,
    };
    setLocalMsgs(prev => [...prev, msg]);
    setText("");

    // Simulate typing + reply
    if (conv.type === "agent" || Math.random() > 0.4) {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        const reply: Message = {
          id: `reply-${Date.now()}`,
          conversationId: conv.id,
          senderId: conv.type === "agent" ? "p1agent" : (other?.id ?? "other"),
          senderName: conv.type === "agent" ? "P1 Agent" : (other?.name ?? ""),
          type: conv.type === "agent" ? "agent" : "text",
          text: conv.type === "agent"
            ? "Got it. I'll factor that into your daily summary. Keep the momentum going 💪"
            : "👍",
          timestamp: new Date(),
          read: false, reactions: [], agentGenerated: conv.type === "agent", edited: false,
        };
        setLocalMsgs(prev => [...prev, reply]);
      }, 1500 + Math.random() * 1000);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/messages")}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors shrink-0">
            <ArrowLeft size={16} />
          </button>

          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white"
              style={{ backgroundColor: `${other?.color ?? "#6366f1"}25`, border: `1.5px solid ${other?.color ?? "#6366f1"}40` }}>
              {conv.type === "agent" ? "🤖" : conv.type === "system" ? "🔔" :
               conv.type === "group" || conv.type === "accountability" ? conv.name.slice(0,2).toUpperCase() :
               (other?.initials ?? "??")}
            </div>
            {isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#13151c]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{conv.name}</p>
            <p className="text-[10px] text-slate-500">
              {conv.type === "agent"  ? "Your personal AI coach · always on"                         :
               conv.type === "system" ? "Platform notifications"                                      :
               isOnline               ? "Online"                                                       :
               conv.type === "group" || conv.type === "accountability" ? `${conv.memberCount ?? conv.participants.length} members` :
               `Last seen ${MessagingEngine.formatTimestamp(other?.lastSeen ?? new Date())}`}
            </p>
          </div>

          {/* Thread meta */}
          <div className="flex items-center gap-2 shrink-0">
            {conv.type === "accountability" && conv.currentStreak && (
              <span className="text-[10px] font-bold text-amber-400 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                {conv.currentStreak}d 🔥
              </span>
            )}
            {conv.type === "recruiter" && conv.jobTitle && (
              <span className="text-[10px] font-bold text-purple-400 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 max-w-[120px] truncate">
                {conv.jobTitle}
              </span>
            )}
            <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-500 transition-colors">
              <MoreHorizontal size={15} />
            </button>
          </div>
        </div>

        {/* Accountability bar */}
        {conv.type === "accountability" && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-amber-500/8 border border-amber-500/15 rounded-xl">
            <Sparkles size={11} className="text-amber-400 shrink-0" />
            <p className="text-[11px] text-amber-200">
              <span className="font-semibold">{conv.sharedGoalTitle}</span> · Streak: {conv.currentStreak} days · {conv.participants.length} members all active
            </p>
          </div>
        )}

        {/* Recruiter agent hint */}
        {conv.type === "recruiter" && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-indigo-600/8 border border-indigo-500/15 rounded-xl">
            <Sparkles size={11} className="text-indigo-400 shrink-0" />
            <p className="text-[11px] text-indigo-200">Agent is analysing this conversation · <button className="font-semibold text-indigo-300">View insights</button></p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {localGrouped.map(({ label, messages: msgs }) => (
          <div key={label}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-white/[0.05]" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{label}</p>
              <div className="flex-1 h-px bg-white/[0.05]" />
            </div>
            <div className="space-y-2">
              {msgs.map((msg, i) => (
                <MessageBubble key={msg.id} msg={msg} prevMsg={msgs[i - 1]} conv={conv} />
              ))}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        <AnimatePresence>
          {typing && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="flex items-end gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                style={{ backgroundColor: `${other?.color ?? "#10b981"}20` }}>
                {conv.type === "agent" ? "🤖" : (other?.initials ?? "??")}
              </div>
              <div className="flex gap-1 px-4 py-3 bg-[#1c1f2e] border border-white/[0.08] rounded-2xl rounded-bl-sm">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-500"
                    animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 bg-[#13151c] border-t border-white/[0.06] px-4 py-3">

        {/* Quick attach */}
        <AnimatePresence>
          {showAttach && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-2">
              <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-hide">
                {[
                  { emoji: "🛡️", label: "Proof",      color: "text-green-400"  },
                  { emoji: "⚡",  label: "Focus",      color: "text-indigo-400" },
                  { emoji: "🎯",  label: "Goal",       color: "text-amber-400"  },
                  { emoji: "🔄",  label: "Cycle",      color: "text-blue-400"   },
                  { emoji: "📅",  label: "Event",      color: "text-rose-400"   },
                  { emoji: "📷",  label: "Ingest",     color: "text-purple-400" },
                ].map(a => (
                  <button key={a.label}
                    onClick={() => { setShowAttach(false); if (a.label === "Ingest") navigate("/messages/ingest"); }}
                    className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] transition-all shrink-0">
                    <span className="text-lg">{a.emoji}</span>
                    <span className={`text-[10px] font-semibold ${a.color}`}>{a.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2">
          {/* Attach */}
          <button onClick={() => setShowAttach(v => !v)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all shrink-0 ${
              showAttach ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-400" : "bg-white/[0.04] border-white/[0.08] text-slate-500 hover:text-slate-300"
            }`}>
            <Paperclip size={15} />
          </button>

          {/* Camera → ingest */}
          <button onClick={() => navigate("/messages/ingest")}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-500 hover:text-slate-300 hover:bg-white/[0.07] transition-all shrink-0">
            <Camera size={15} />
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Message…"
              rows={1}
              style={{ resize: "none", maxHeight: "120px", overflowY: text.split("\n").length > 3 ? "auto" : "hidden" }}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
            />
          </div>

          {/* Mic */}
          <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-500 hover:text-slate-300 hover:bg-white/[0.07] transition-all shrink-0">
            <Mic size={15} />
          </button>

          {/* Send */}
          <button onClick={handleSend} disabled={!text.trim()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Message Bubble ────────────────────────────────────────── */

function MessageBubble({ msg, prevMsg, conv }: {
  msg:     Message;
  prevMsg: Message | undefined;
  conv:    { type: string; participants: { id: string; initials: string; color: string; name: string }[] };
}) {
  const isMine     = msg.senderId === CURRENT_USER_ID;
  const isAgent    = msg.type === "agent";
  const isSystem   = msg.type === "system";
  const sameAsPrev = prevMsg?.senderId === msg.senderId;

  const sender = conv.participants.find(p => p.id === msg.senderId);

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/[0.05] rounded-xl max-w-[85%]">
          <span className="text-sm">🔔</span>
          <p className="text-[11px] text-slate-400 text-center">{msg.text}</p>
        </div>
      </div>
    );
  }

  if (isAgent) {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-green-500/15 border border-green-500/25 flex items-center justify-center text-sm shrink-0 mt-0.5">🤖</div>
        <div className="max-w-[82%] space-y-1.5">
          {!sameAsPrev && <p className="text-[10px] font-semibold text-green-400 ml-1">P1 Agent</p>}
          <div className="bg-green-500/8 border border-green-500/15 rounded-2xl rounded-tl-sm px-4 py-3">
            {msg.text && <p className="text-sm text-slate-200 leading-relaxed">{msg.text}</p>}
            {msg.attachment && <AttachmentCard att={msg.attachment} />}
          </div>
          <div className="flex items-center gap-2 ml-1">
            <Sparkles size={9} className="text-green-400" />
            <p className="text-[10px] text-slate-600">{MessagingEngine.formatTime(msg.timestamp)}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}>

      {/* Avatar (only show for first in a group) */}
      {!isMine && (
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 ${sameAsPrev ? "opacity-0" : ""}`}
          style={{ backgroundColor: `${sender?.color ?? "#6366f1"}30` }}>
          {sender?.initials ?? "??"}
        </div>
      )}

      <div className={`max-w-[75%] space-y-1 ${isMine ? "items-end" : "items-start"} flex flex-col`}>
        {!isMine && !sameAsPrev && (
          <p className="text-[10px] font-semibold text-slate-500 ml-1">{msg.senderName}</p>
        )}

        <div className={`px-4 py-2.5 rounded-2xl ${
          isMine
            ? "bg-indigo-600 text-white rounded-br-sm"
            : "bg-[#1c1f2e] border border-white/[0.08] text-slate-200 rounded-bl-sm"
        }`}>
          {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}
          {msg.attachment && <AttachmentCard att={msg.attachment} mine={isMine} />}
        </div>

        {/* Timestamp + reactions */}
        <div className={`flex items-center gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
          <p className="text-[10px] text-slate-700">{MessagingEngine.formatTime(msg.timestamp)}</p>
          {msg.reactions.length > 0 && (
            <div className="flex gap-1">
              {msg.reactions.map((r, i) => (
                <button key={i}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-all ${
                    r.userReacted ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300" : "bg-white/[0.04] border-white/[0.06] text-slate-400"
                  }`}>
                  {r.emoji} {r.count > 1 && r.count}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Attachment Card ───────────────────────────────────────── */

function AttachmentCard({ att, mine }: { att: Attachment; mine?: boolean }) {
  return (
    <div className={`mt-2 rounded-xl border p-3 flex items-start gap-3 ${
      mine ? "bg-white/10 border-white/20" : "bg-white/[0.03] border-white/[0.08]"
    }`}>
      <span className="text-2xl shrink-0">{att.emoji}</span>
      <div className="min-w-0">
        <p className={`text-xs font-bold truncate ${mine ? "text-white" : "text-white"}`}>{att.title}</p>
        {att.subtitle && <p className={`text-[11px] truncate mt-0.5 ${mine ? "text-white/70" : "text-slate-400"}`}>{att.subtitle}</p>}
        {att.meta    && <p className={`text-[10px] mt-1 ${mine ? "text-white/50" : "text-slate-600"}`}>{att.meta}</p>}
      </div>
    </div>
  );
}
