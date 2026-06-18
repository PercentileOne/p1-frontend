/* ══════════════════════════════════════════════════════════════
   GroupsList — /learning/groups
   Tiles for each group + "Create Group" CTA
   ══════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { Plus, Users, Crown, Zap } from "lucide-react";
import type { Group } from "../groupsStore";
import SectionLabel from "../../cards/components/shared/SectionLabel";

function relativeTime(date: Date): string {
  const h = (Date.now() - date.getTime()) / 3_600_000;
  if (h < 1)    return `${Math.round(h * 60)}m ago`;
  if (h < 24)   return `${Math.round(h)}h ago`;
  if (h < 168)  return `${Math.round(h / 24)}d ago`;
  return `${Math.round(h / 168)}w ago`;
}

const ROLE_BADGE: Record<string, string> = {
  owner: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  admin: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  member: "text-white/30 bg-white/[0.04] border-white/[0.08]",
};

interface Props {
  groups:        Group[];
  onSelect:      (group: Group) => void;
  onCreateClick: () => void;
}

export default function GroupsList({ groups, onSelect, onCreateClick }: Props) {
  return (
    <div className="flex flex-col gap-5 px-1 py-2">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-white/90">Groups</h2>
          <p className="text-[11px] text-white/35 mt-0.5">Study together, rank together</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onCreateClick}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-colors"
        >
          <Plus size={12} />
          New Group
        </motion.button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: <Users size={12} className="text-indigo-400" />,   label: "Groups",    value: String(groups.length) },
          { icon: <Zap   size={12} className="text-amber-400" />,    label: "Rooms live", value: "3"   },
          { icon: <Crown size={12} className="text-emerald-400" />,  label: "Top group",  value: "#2"  },
        ].map(s => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"
          >
            {s.icon}
            <span className="text-[15px] font-black text-white/85">{s.value}</span>
            <SectionLabel>{s.label}</SectionLabel>
          </div>
        ))}
      </div>

      {/* Group tiles */}
      <div className="flex flex-col gap-3">
        {groups.map((group, i) => {
          const lastActivity = group.recentActivity[0];
          return (
            <motion.button
              key={group.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(group)}
              className="w-full text-left p-4 rounded-2xl border border-white/[0.06] bg-[#0f1117] flex flex-col gap-3"
              style={{ boxShadow: "0 10px 36px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06) inset" }}
            >
              {/* Top row */}
              <div className="flex items-start gap-3">
                {/* Emoji avatar */}
                <div className={`w-11 h-11 rounded-2xl ${group.accentColor}/20 border border-white/[0.08] flex items-center justify-center text-[22px] shrink-0`}>
                  {group.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-bold text-white/88 truncate">{group.name}</span>
                    {group.localUserRole && (
                      <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${ROLE_BADGE[group.localUserRole]}`}>
                        {group.localUserRole}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/35 line-clamp-2 leading-relaxed">{group.description}</p>
                </div>
              </div>

              {/* Member avatars + count */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {group.members.slice(0, 5).map((m, idx) => (
                    <div
                      key={m.userId}
                      className={`w-6 h-6 rounded-full ${m.accent} border-2 border-[#0f1117] flex items-center justify-center text-[8px] font-bold text-white`}
                      style={{ marginLeft: idx === 0 ? 0 : -8, zIndex: 10 - idx }}
                    >
                      {m.initials.slice(0,1)}
                    </div>
                  ))}
                  {group.members.length > 5 && (
                    <span className="ml-1.5 text-[9px] text-white/30">+{group.members.length - 5}</span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[9px] text-white/25">
                  <Users size={9} />
                  <span>{group.members.length} members</span>
                </div>
              </div>

              {/* Last activity */}
              {lastActivity && (
                <div className="pt-2 border-t border-white/[0.05] flex items-start gap-2">
                  <span className="text-[9px] text-white/25 shrink-0">{relativeTime(lastActivity.timestamp)}</span>
                  <p className="text-[9px] text-white/35 line-clamp-1">{lastActivity.message}</p>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

    </div>
  );
}
