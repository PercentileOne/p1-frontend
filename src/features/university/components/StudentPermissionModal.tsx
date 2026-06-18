/* ══════════════════════════════════════════════════════════════
   STUDENT PERMISSION MODAL — Phase 11
   Student controls what universities can see
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Eye, EyeOff, CheckCircle } from "lucide-react";
import { setPermission, getPermission } from "../permissionsStore";
import type { PermissionLevel } from "../permissionsStore";

interface Props {
  studentId:    string;
  universityId: string;
  universityName: string;
  onClose:      () => void;
}

const LEVELS: {
  level:   PermissionLevel;
  label:   string;
  desc:    string;
  color:   string;
  icon:    React.ReactNode;
  reveals: string[];
}[] = [
  {
    level:   "full",
    label:   "Full Profile",
    desc:    "University can see your complete cognitive profile",
    color:   "border-emerald-500/35 bg-emerald-500/08",
    icon:    <Eye size={14} className="text-emerald-400" />,
    reveals: ["Study streak", "Deep work sessions", "Mock exam scores", "Concept mastery", "Semester timeline", "Improvement rate", "Consistency score"],
  },
  {
    level:   "partial",
    label:   "Partial Profile",
    desc:    "Mastery and mock scores only — no timeline",
    color:   "border-sky-500/35 bg-sky-500/08",
    icon:    <Eye size={14} className="text-sky-400" />,
    reveals: ["Concept mastery", "Mock exam scores", "Consistency score"],
  },
  {
    level:   "readiness",
    label:   "Readiness Only",
    desc:    "Overall readiness score — nothing else",
    color:   "border-amber-500/35 bg-amber-500/08",
    icon:    <Shield size={14} className="text-amber-400" />,
    reveals: ["Overall readiness score"],
  },
  {
    level:   "none",
    label:   "Private",
    desc:    "University cannot see any of your data",
    color:   "border-white/[0.09] bg-white/[0.02]",
    icon:    <EyeOff size={14} className="text-slate-500" />,
    reveals: [],
  },
];

export default function StudentPermissionModal({ studentId, universityId, universityName, onClose }: Props) {
  const current = getPermission(studentId, universityId);
  const [selected, setSelected] = useState<PermissionLevel>(current);
  const [saved,    setSaved]    = useState(false);

  function handleSave() {
    setPermission(studentId, universityId, selected);
    setSaved(true);
    setTimeout(onClose, 1200);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{   opacity: 0, scale: 0.94, y: 12 }}
        className="relative w-full max-w-md rounded-2xl border border-white/[0.09] bg-[#13151c] p-6"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.06) inset" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}>
            <Shield size={14} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">Data Permissions</p>
            <p className="text-[11px] text-slate-400">{universityName}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors">
            <X size={14} />
          </button>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
          Choose what <strong className="text-slate-300">{universityName}</strong> can see about your learning journey.
          You can change this at any time.
        </p>

        <AnimatePresence mode="wait">
          {saved ? (
            <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center py-8 gap-3">
              <CheckCircle size={32} className="text-emerald-400" />
              <p className="text-[13px] font-semibold text-white">Preferences saved</p>
            </motion.div>
          ) : (
            <motion.div key="form" className="flex flex-col gap-2">
              {LEVELS.map(opt => {
                const isSelected = selected === opt.level;
                return (
                  <button
                    key={opt.level}
                    onClick={() => setSelected(opt.level)}
                    className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      isSelected ? opt.color : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">{opt.icon}</span>
                    <div className="flex-1">
                      <p className="text-[12px] font-semibold text-white">{opt.label}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</p>
                      {isSelected && opt.reveals.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          className="mt-2 flex flex-wrap gap-1"
                        >
                          {opt.reveals.map(r => (
                            <span key={r} className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-[9px] text-slate-400">
                              {r}
                            </span>
                          ))}
                        </motion.div>
                      )}
                    </div>
                    {isSelected && <CheckCircle size={13} className="text-emerald-400 shrink-0 mt-0.5" />}
                  </button>
                );
              })}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                className="mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-semibold transition-colors"
              >
                <CheckCircle size={13} />
                Save preferences
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
