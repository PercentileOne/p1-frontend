/* ══════════════════════════════════════════════════════════════
   PARENT SHELL — /parent
   Standalone shell: dashboard, controls, encouragement, link child
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Shield, LayoutDashboard, Link2, ChevronRight,
  Plus, LogOut, Send,
} from "lucide-react";
import BackToCockpit from "../components/BackToCockpit";
import { useParentStore }         from "../features/parent/parentStore";
import { useEncouragementStore }  from "../features/parent/encouragementStore";
import ParentDashboard            from "../features/parent/components/ParentDashboard";
import ParentControls             from "../features/parent/components/ParentControls";
import LinkChildModal             from "../features/parent/components/LinkChildModal";
import SendEncouragementModal     from "../features/parent/components/SendEncouragementModal";
import type { ChildProfile }      from "../features/parent/parentStore";

// ── View state ─────────────────────────────────────────────────────

type View =
  | { type: "dashboard"; child: ChildProfile }
  | { type: "controls";  child: ChildProfile }
  | { type: "messages";  child: ChildProfile }
  | { type: "picker" };

// ── Sidebar nav items ──────────────────────────────────────────────

function childNavItems(_child: ChildProfile) {
  return [
    { type: "dashboard", icon: <LayoutDashboard size={13} />, label: "Overview",  sub: "Progress & grades"  },
    { type: "controls",  icon: <Shield size={13} />,          label: "Controls",  sub: "Safety & limits"    },
    { type: "messages",  icon: <Send size={13} />,            label: "Encourage", sub: "Send a message"     },
  ] as const;
}

// ── Child picker (no children or multi-child) ──────────────────────

function ChildPicker({ profile, onSelect, onLink }: {
  profile: ReturnType<typeof useParentStore>["profile"];
  onSelect: (c: ChildProfile) => void;
  onLink:   () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(244,114,182,0.12)", border: "1px solid rgba(244,114,182,0.2)" }}
      >
        <Heart size={22} className="text-pink-400" />
      </div>
      <div className="text-center">
        <p className="text-[18px] font-bold text-white">Parent Dashboard</p>
        <p className="text-[13px] text-slate-500 mt-1">Track and support your child's learning</p>
      </div>

      {profile.children.length > 0 ? (
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {profile.children.map(child => (
            <motion.button
              key={child.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(child)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-colors text-left"
            >
              <div className={`w-10 h-10 rounded-full ${child.accent} flex items-center justify-center text-[13px] font-bold text-white shrink-0`}>
                {child.initials}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white">{child.name}</p>
                <p className="text-[11px] text-slate-500">{child.year}</p>
              </div>
              <ChevronRight size={14} className="ml-auto text-slate-600" />
            </motion.button>
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-slate-500">No children linked yet</p>
      )}

      <button
        onClick={onLink}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[12px] text-slate-400 hover:text-white hover:bg-white/[0.07] transition-colors"
      >
        <Plus size={12} />
        Link a child
      </button>
    </div>
  );
}

// ── Shell ──────────────────────────────────────────────────────────

export default function ParentShell() {
  const { profile, removeChild } = useParentStore();
  const { unseen }               = useEncouragementStore();
  const [view,   setView]        = useState<View>(
    profile.children.length === 1
      ? { type: "dashboard", child: profile.children[0] }
      : { type: "picker" }
  );
  const [showLink,       setShowLink]       = useState(false);
  const [showEncourage,  setShowEncourage]  = useState(false);
  const [collapsed,      setCollapsed]      = useState(false);

  const activeChild = view.type !== "picker" ? view.child : null;

  function selectChild(child: ChildProfile) {
    setView({ type: "dashboard", child });
  }

  return (
    <div className="min-h-screen bg-[#0a0b10] text-slate-200 flex flex-col font-sans">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0f1117]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="px-4 h-13 flex items-center gap-3">
          <BackToCockpit />
          <div className="w-px h-4 bg-white/[0.08]" />
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(244,114,182,0.15)", border: "1px solid rgba(244,114,182,0.25)" }}
            >
              <Heart size={11} className="text-pink-400" />
            </div>
            <span className="text-[13px] font-bold text-white">Parent Dashboard</span>
          </div>

          {activeChild && (
            <>
              <div className="w-px h-4 bg-white/[0.08]" />
              <div className={`w-5 h-5 rounded-full ${activeChild.accent} flex items-center justify-center text-[9px] font-bold text-white`}>
                {activeChild.initials}
              </div>
              <span className="text-[12px] text-slate-400">{activeChild.name}</span>
            </>
          )}

          <div className="flex-1" />

          {/* Encouragement badge */}
          {unseen > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-[10px] text-pink-400">
              <Heart size={10} />
              {unseen} unseen
            </div>
          )}

          {/* Multi-child switcher */}
          {profile.children.length > 1 && (
            <button
              onClick={() => setView({ type: "picker" })}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[10px] text-slate-400 hover:text-white transition-colors"
            >
              Switch child
            </button>
          )}

          {/* Link child */}
          <button
            onClick={() => setShowLink(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[10px] text-slate-400 hover:text-white transition-colors"
          >
            <Link2 size={10} />
            Link child
          </button>

          {/* Collapse */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ChevronRight
              size={11}
              className="transition-transform"
              style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)" }}
            />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar — only when a child is active */}
        {activeChild && (
          <motion.aside
            animate={{ width: collapsed ? 0 : 200 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="shrink-0 overflow-hidden border-r border-white/[0.06] bg-[#0f1117]"
          >
            <div className="w-[200px] flex flex-col pt-4 pb-6 px-3 gap-1">

              {/* Child badge */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 mb-2">
                <div className={`w-7 h-7 rounded-full ${activeChild.accent} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
                  {activeChild.initials}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white">{activeChild.name}</p>
                  <p className="text-[9px] text-slate-500">{activeChild.year}</p>
                </div>
              </div>

              {/* Nav items */}
              {childNavItems(activeChild).map(item => {
                const active = view.type === item.type;
                return (
                  <motion.button
                    key={item.type}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setView({ type: item.type as View["type"], child: activeChild } as View)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                      active
                        ? "bg-pink-500/15 border border-pink-500/25 text-white"
                        : "hover:bg-white/[0.04] border border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className={active ? "text-pink-400" : "text-slate-600"}>{item.icon}</span>
                    <div>
                      <p className="text-[11px] font-semibold leading-none">{item.label}</p>
                      <p className="text-[9px] text-slate-600 mt-0.5">{item.sub}</p>
                    </div>
                  </motion.button>
                );
              })}

              <div className="mt-auto flex flex-col gap-1 pt-4 border-t border-white/[0.06]">
                <button
                  onClick={() => setShowEncourage(true)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-slate-400 hover:text-pink-300 hover:bg-pink-500/10 border border-transparent transition-all"
                >
                  <Heart size={12} className="text-pink-400" />
                  <span className="text-[11px]">Send encouragement</span>
                </button>
                {profile.children.length > 1 && (
                  <button
                    onClick={() => { removeChild(activeChild.id); setView({ type: "picker" }); }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent transition-all"
                  >
                    <LogOut size={12} />
                    <span className="text-[11px]">Unlink</span>
                  </button>
                )}
              </div>
            </div>
          </motion.aside>
        )}

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={view.type + (view.type !== "picker" ? view.child.id : "")}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{   opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="p-6 max-w-2xl"
            >
              {view.type === "picker" ? (
                <ChildPicker
                  profile={profile}
                  onSelect={selectChild}
                  onLink={() => setShowLink(true)}
                />
              ) : view.type === "dashboard" ? (
                <>
                  <div className="mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Overview</p>
                    <p className="text-[18px] font-black text-white mt-0.5">{view.child.name}'s Progress</p>
                  </div>
                  <ParentDashboard child={view.child} />
                </>
              ) : view.type === "controls" ? (
                <>
                  <div className="mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Safety &amp; Limits</p>
                    <p className="text-[18px] font-black text-white mt-0.5">Controls for {view.child.name}</p>
                  </div>
                  <ParentControls child={view.child} />
                </>
              ) : (
                // messages — open modal immediately
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Heart size={32} className="text-pink-400" />
                  <p className="text-[13px] text-slate-400">Send {view.child.name} a message of encouragement</p>
                  <button
                    onClick={() => setShowEncourage(true)}
                    className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-white text-[12px] font-semibold transition-colors"
                  >
                    Write a message
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showLink && <LinkChildModal onClose={() => setShowLink(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showEncourage && activeChild && (
          <SendEncouragementModal
            child={activeChild}
            parentId={profile.id}
            parentName={profile.name}
            onClose={() => setShowEncourage(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}