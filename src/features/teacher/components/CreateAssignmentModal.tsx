/* ══════════════════════════════════════════════════════════════
   CREATE ASSIGNMENT MODAL — Phase 10B
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ClipboardList, CheckCircle } from "lucide-react";
import { addAssignment } from "../teacherStore";
import type { Class } from "../teacherStore";

interface Props {
  cls:     Class;
  onClose: () => void;
}

type SourceType = "card" | "topic" | "subtopic" | "lesson" | "custom";

const SOURCE_OPTIONS: { type: SourceType; label: string; desc: string }[] = [
  { type: "topic",    label: "Topic",    desc: "Assign revision of a full topic"       },
  { type: "subtopic", label: "Subtopic", desc: "Assign a specific subtopic area"       },
  { type: "lesson",   label: "Lesson",   desc: "Based on a lesson you uploaded"        },
  { type: "card",     label: "Card",     desc: "Link directly to a cognitive card"     },
  { type: "custom",   label: "Custom",   desc: "Write your own description and tasks"  },
];

export default function CreateAssignmentModal({ cls, onClose }: Props) {
  const [title,      setTitle]      = useState("");
  const [desc,       setDesc]       = useState("");
  const [dueDate,    setDueDate]    = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [sourceType, setSourceType] = useState<SourceType>("topic");
  const [done,       setDone]       = useState(false);

  function handleCreate() {
    if (!title.trim()) return;
    addAssignment(cls.id, {
      title:       title.trim(),
      description: desc.trim(),
      sourceType,
      dueDate:     new Date(dueDate),
    });
    setDone(true);
    setTimeout(onClose, 1400);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{   opacity: 0, scale: 0.94, y: 12 }}
        className="relative w-full max-w-md rounded-2xl border border-white/[0.09] bg-[#13151c] p-6"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.06) inset" }}
      >
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}>
            <ClipboardList size={14} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">Create Assignment</p>
            <p className="text-[10px] text-slate-500">{cls.name}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors">
            <X size={14} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-8 gap-3">
              <CheckCircle size={32} className="text-emerald-400" />
              <p className="text-[13px] font-semibold text-white">Assignment created!</p>
              <p className="text-[11px] text-slate-500">Added to {cls.name}</p>
            </motion.div>
          ) : (
            <motion.div key="form" className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Sorting Algorithms Practice"
                  className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-3 py-2.5 text-[12px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/40"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="What should students do?"
                  className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-3 py-2.5 text-[12px] text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500/40"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Due date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-3 py-2.5 text-[12px] text-slate-200 focus:outline-none focus:border-indigo-500/40"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Source type</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {SOURCE_OPTIONS.map(s => (
                    <button
                      key={s.type}
                      onClick={() => setSourceType(s.type)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left border transition-all text-[11px] ${
                        sourceType === s.type
                          ? "bg-indigo-500/15 border-indigo-500/35 text-white"
                          : "bg-white/[0.03] border-white/[0.07] text-slate-400 hover:text-white hover:bg-white/[0.05]"
                      }`}
                    >
                      <span className="font-semibold w-14 shrink-0">{s.label}</span>
                      <span className="text-slate-500 text-[10px]">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCreate}
                disabled={!title.trim()}
                className={`mt-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${
                  title.trim()
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                    : "bg-white/[0.05] text-slate-600 cursor-not-allowed"
                }`}
              >
                <ClipboardList size={13} />
                Create Assignment
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
