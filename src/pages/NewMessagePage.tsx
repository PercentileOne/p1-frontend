import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Search, Users, UserCheck, Briefcase, Sparkles, MessageCircle, X,
} from "lucide-react";
import { DEMO_CONVERSATIONS } from "../lib/messagesEngine";

/* ══════════════════════════════════════════════════════════════
   NEW MESSAGE  /messages/new
   ══════════════════════════════════════════════════════════════ */

const CONTACTS = [
  { id: "marcus",  name: "Marcus Chen",    initials: "MC", color: "#f59e0b", domain: "Developer",   online: true  },
  { id: "sarah",   name: "Sarah Osei",     initials: "SO", color: "#ec4899", domain: "Designer",    online: false },
  { id: "kwame",   name: "Kwame Mensah",   initials: "KM", color: "#3b82f6", domain: "Entrepreneur",online: false },
  { id: "amara",   name: "Amara Diallo",   initials: "AD", color: "#14b8a6", domain: "Fitness",     online: true  },
  { id: "tunde",   name: "Tunde Adeyemi",  initials: "TA", color: "#f97316", domain: "Developer",   online: false },
  { id: "yemi",    name: "Yemi Adesanya",  initials: "YA", color: "#a78bfa", domain: "Creative",    online: true  },
  { id: "chen",    name: "David Chen",     initials: "DC", color: "#22d3ee", domain: "Engineer",    online: false },
  { id: "priya",   name: "Priya Nair",     initials: "PN", color: "#fb7185", domain: "Coach",       online: true  },
];

type ChatType = "direct" | "group" | "accountability" | "recruiter";

const CHAT_TYPES: { key: ChatType; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { key: "direct",         label: "Direct Message",      desc: "1-on-1 private chat",            icon: <MessageCircle size={16} />, color: "text-indigo-400" },
  { key: "group",          label: "Group Chat",          desc: "Team or community conversation",  icon: <Users         size={16} />, color: "text-blue-400"   },
  { key: "accountability", label: "Accountability Chat", desc: "Shared proof, streaks & goals",   icon: <UserCheck     size={16} />, color: "text-amber-400"  },
  { key: "recruiter",      label: "Recruiter Chat",      desc: "Professional opportunity thread", icon: <Briefcase     size={16} />, color: "text-purple-400" },
];

export default function NewMessagePage() {
  const navigate       = useNavigate();
  const [params]       = useSearchParams();
  const defaultType    = (params.get("type") ?? "direct") as ChatType;

  const [chatType,  setChatType]  = useState<ChatType>(defaultType);
  const [search,    setSearch]    = useState("");
  const [selected,  setSelected]  = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");

  const filtered = CONTACTS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.domain.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    if (chatType === "direct") {
      setSelected([id]);
    } else {
      setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }
  };

  const handleStart = () => {
    if (selected.length === 0) return;
    // Navigate to existing conversation if it exists
    const firstId = selected[0];
    const existing = DEMO_CONVERSATIONS.find(c =>
      c.type === chatType && c.participants.some(p => p.id === firstId)
    );
    if (existing) {
      navigate(`/messages/${existing.id}`);
    } else {
      navigate("/messages");
    }
  };

  const canStart = selected.length > 0 && (chatType === "direct" || groupName.trim());

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-5 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate("/messages")}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-sm font-bold text-white">New Conversation</h1>
        </div>

        {/* Chat type */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {CHAT_TYPES.map(t => (
            <button key={t.key} onClick={() => { setChatType(t.key); setSelected([]); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                chatType === t.key ? "bg-indigo-600 text-white" : "bg-white/[0.03] text-slate-400 hover:text-slate-300"
              }`}>
              <span className={chatType === t.key ? "text-white" : t.color}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">

        {/* Chat type description */}
        <div className="flex items-start gap-3 p-3 bg-indigo-600/8 border border-indigo-500/15 rounded-xl">
          <Sparkles size={12} className="text-indigo-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-300">{CHAT_TYPES.find(t => t.key === chatType)?.desc}</p>
        </div>

        {/* Group/Accountability name */}
        {(chatType === "group" || chatType === "accountability") && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              {chatType === "accountability" ? "Accountability Group Name" : "Group Name"}
            </p>
            <input value={groupName} onChange={e => setGroupName(e.target.value)}
              placeholder={chatType === "accountability" ? "e.g. Morning Warriors" : "e.g. Tech Founders Circle"}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 transition-colors" />
          </div>
        )}

        {/* Selected chips */}
        <AnimatePresence>
          {selected.length > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Selected ({selected.length})</p>
              <div className="flex flex-wrap gap-2">
                {selected.map(id => {
                  const c = CONTACTS.find(x => x.id === id)!;
                  return (
                    <button key={id} onClick={() => toggleSelect(id)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border bg-indigo-600/15 border-indigo-500/25 text-indigo-300 font-semibold">
                      {c.name.split(" ")[0]}
                      <X size={10} />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
            {chatType === "direct" ? "Search Contacts" : "Add Members"}
          </p>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or domain…"
              className="w-full pl-9 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 transition-colors" />
          </div>
        </div>

        {/* Contact list */}
        <div className="space-y-2">
          {filtered.map(c => {
            const isSelected = selected.includes(c.id);
            return (
              <motion.button key={c.id} whileHover={{ x: 2 }}
                onClick={() => toggleSelect(c.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isSelected ? "bg-indigo-600/15 border-indigo-500/25" : "bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]"
                }`}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white relative"
                  style={{ backgroundColor: `${c.color}25`, border: `1.5px solid ${c.color}40` }}>
                  {c.initials}
                  {c.online && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#0f1117]" />}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white">{c.name}</p>
                  <p className="text-[11px] text-slate-500">{c.domain} · {c.online ? "Online" : "Offline"}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected ? "bg-indigo-600 border-indigo-600" : "border-white/20"
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Start button */}
        <motion.button
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          onClick={handleStart}
          disabled={!canStart}
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          <MessageCircle size={16} />
          {chatType === "direct" ? "Start Conversation" :
           chatType === "accountability" ? "Create Accountability Chat" :
           chatType === "group" ? "Create Group" : "Start Recruiter Thread"}
        </motion.button>
      </div>
    </div>
  );
}
