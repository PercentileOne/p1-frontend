/* ══════════════════════════════════════════════════════════════
   CreateAssessmentModal — title, description, sections, assignees
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Plus, Trash2, Check, ChevronDown, LayoutGrid,
  BookMarked, StickyNote, Wand2, Save,
} from "lucide-react";
import type { Employer, AssessmentSection, AssessmentConceptMode, TeamMember } from "../employerStore";
import type { DifficultyLevel } from "../../cards/types";
import { useCardsStore } from "../../cards/cardsStore";
import SectionLabel from "../../cards/components/shared/SectionLabel";

type SourceType = AssessmentSection["sourceType"];

const SOURCE_META: Record<SourceType, { icon: React.ReactNode; label: string; color: string }> = {
  card:    { icon: <LayoutGrid size={10} />, label: "Card",    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  chapter: { icon: <BookMarked size={10} />, label: "Chapter", color: "text-amber-400  bg-amber-500/10  border-amber-500/20"  },
  note:    { icon: <StickyNote size={10} />, label: "Note",    color: "text-sky-400    bg-sky-500/10    border-sky-500/20"    },
  custom:  { icon: <Wand2 size={10} />,      label: "Custom",  color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
};

const DIFFICULTY_OPTS: DifficultyLevel[] = ["easy", "medium", "hard", "expert"];
const CC_MODES: AssessmentConceptMode[]  = ["auto", "manual", "difficulty", "fixed"];

const DIFF_COLORS: Record<DifficultyLevel, string> = {
  easy:   "text-emerald-400 bg-emerald-500/15 border-emerald-500/25",
  medium: "text-sky-400     bg-sky-500/15     border-sky-500/25",
  hard:   "text-amber-400   bg-amber-500/15   border-amber-500/25",
  expert: "text-red-400     bg-red-500/15     border-red-500/25",
};

interface SectionDraft extends Omit<AssessmentSection, "id" | "concepts"> {
  _key: number;
}

interface Props {
  employer:  Employer;
  onConfirm: (draft: {
    title:       string;
    description: string;
    sections:    Omit<AssessmentSection, "id">[];
    assignedTo:  string[];
  }) => void;
  onClose: () => void;
}

let _key = 0;
function mkSection(): SectionDraft {
  return {
    _key:             _key++,
    title:            "",
    sourceType:       "card",
    sourceId:         "",
    conceptCountMode: "auto",
    difficulty:       "medium",
  };
}

function SourcePicker({ value, onChange }: { value: SourceType; onChange: (v: SourceType) => void }) {
  const [open, setOpen] = useState(false);
  const meta = SOURCE_META[value];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-bold ${meta.color}`}
      >
        {meta.icon} {meta.label} <ChevronDown size={8} className={open ? "rotate-180" : ""} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute top-full left-0 mt-1 z-40 flex flex-col gap-0.5 p-1 rounded-xl border border-white/[0.08] bg-[#13151c]"
            style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.6)", minWidth: 120 }}
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0, y: -4, scale: 0.96  }}
            transition={{ duration: 0.12 }}
          >
            {(Object.keys(SOURCE_META) as SourceType[]).map(st => {
              const m = SOURCE_META[st];
              return (
                <button
                  key={st}
                  onClick={() => { onChange(st); setOpen(false); }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors w-full text-left ${
                    st === value ? m.color : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
                  }`}
                >
                  {m.icon} {m.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Chip({ label, selected, onClick, className = "" }: {
  label: string; selected: boolean; onClick: () => void; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold border transition-all ${
        selected ? `${className} ring-1 ring-current/20` : "text-white/30 bg-white/[0.04] border-white/[0.07] hover:text-white/55"
      }`}
    >
      {selected && <Check size={8} />} {label}
    </button>
  );
}

export default function CreateAssessmentModal({ employer, onConfirm, onClose }: Props) {
  const { cards } = useCardsStore();

  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [sections,    setSections]    = useState<SectionDraft[]>([mkSection()]);
  const [assignedTo,  setAssignedTo]  = useState<string[]>([]);

  const allCandidates: TeamMember[] = employer.teams
    .flatMap(t => t.members)
    .filter((m, i, arr) => arr.findIndex(x => x.userId === m.userId) === i);

  const updateSection = (key: number, patch: Partial<SectionDraft>) =>
    setSections(prev => prev.map(s => s._key === key ? { ...s, ...patch } : s));

  const removeSection = (key: number) =>
    setSections(prev => prev.filter(s => s._key !== key));

  const toggleAssignee = (uid: string) =>
    setAssignedTo(prev => prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid]);

  const canSubmit = title.trim().length >= 2 && sections.every(s => s.title.trim().length >= 2);

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm({
      title:       title.trim(),
      description: description.trim(),
      sections: sections.map(s => ({
        title:            s.title,
        sourceType:       s.sourceType,
        sourceId:         s.sourceId || `custom-${s._key}`,
        conceptCountMode: s.conceptCountMode,
        conceptCount:     s.conceptCount,
        difficulty:       s.difficulty,
        concepts:         s.sourceType === "card"
          ? (cards.find(c => c.id === s.sourceId)?.concepts ?? [])
          : [],
      })),
      assignedTo,
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative w-full max-w-lg flex flex-col gap-0 rounded-3xl border border-white/[0.08] bg-[#0f1117] overflow-hidden max-h-[90vh]"
          style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.75), 0 1px 0 rgba(255,255,255,0.06) inset" }}
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{   opacity: 0, scale: 0.94,  y: 12 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="absolute top-0 left-5 right-5 h-[2px] rounded-b-full bg-gradient-to-r from-indigo-500 to-violet-500 opacity-70" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
            <div>
              <h3 className="text-[14px] font-bold text-white/90">Create Assessment</h3>
              <p className="text-[10px] text-white/35 mt-0.5">{employer.name}</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-xl bg-white/[0.05] flex items-center justify-center hover:bg-white/10 transition-colors">
              <X size={12} className="text-white/40" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Assessment title</SectionLabel>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. React Developer Screen"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[12px] font-semibold text-white/80 placeholder-white/20 outline-none focus:border-indigo-500/40 transition-colors"
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Description</SectionLabel>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What skills does this assessment cover?"
                rows={2}
                className="w-full resize-none bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[11px] text-white/65 placeholder-white/20 outline-none focus:border-indigo-500/40 transition-colors"
              />
            </div>

            {/* Sections */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <SectionLabel>Sections</SectionLabel>
                <button
                  onClick={() => setSections(prev => [...prev, mkSection()])}
                  className="flex items-center gap-1 text-[9px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <Plus size={10} /> Add section
                </button>
              </div>

              {sections.map((sec, i) => (
                <motion.div
                  key={sec._key}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-2.5 p-3.5 rounded-2xl border border-white/[0.07] bg-white/[0.02]"
                >
                  {/* Row 1: index + title + source + delete */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-white/20 shrink-0 w-4">{i + 1}</span>
                    <input
                      value={sec.title}
                      onChange={e => updateSection(sec._key, { title: e.target.value })}
                      placeholder="Section title"
                      className="flex-1 bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-white/75 placeholder-white/20 outline-none focus:border-indigo-500/35 transition-colors"
                    />
                    <SourcePicker value={sec.sourceType} onChange={v => updateSection(sec._key, { sourceType: v, sourceId: "" })} />
                    {sections.length > 1 && (
                      <button onClick={() => removeSection(sec._key)} className="text-white/20 hover:text-red-400 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                  {/* Row 2: source picker — card only */}
                  {sec.sourceType === "card" && (
                    <div className="flex flex-col gap-1">
                      <SectionLabel>Link card</SectionLabel>
                      <select
                        value={sec.sourceId}
                        onChange={e => updateSection(sec._key, { sourceId: e.target.value })}
                        className="w-full bg-[#0a0b10] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[11px] text-white/60 outline-none focus:border-indigo-500/35 transition-colors"
                      >
                        <option value="">— select card —</option>
                        {cards.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Row 3: difficulty + concept count mode */}
                  <div className="flex flex-col gap-1.5">
                    <SectionLabel>Difficulty</SectionLabel>
                    <div className="flex gap-1.5 flex-wrap">
                      {DIFFICULTY_OPTS.map(d => (
                        <Chip
                          key={d}
                          label={d.charAt(0).toUpperCase() + d.slice(1)}
                          selected={sec.difficulty === d}
                          onClick={() => updateSection(sec._key, { difficulty: d })}
                          className={DIFF_COLORS[d]}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <SectionLabel>Concept count</SectionLabel>
                    <div className="flex gap-1.5 flex-wrap">
                      {CC_MODES.map(m => (
                        <Chip
                          key={m}
                          label={m.charAt(0).toUpperCase() + m.slice(1)}
                          selected={sec.conceptCountMode === m}
                          onClick={() => updateSection(sec._key, { conceptCountMode: m })}
                          className="text-violet-400 bg-violet-500/15 border-violet-500/25"
                        />
                      ))}
                    </div>
                    {sec.conceptCountMode === "fixed" && (
                      <input
                        type="number" min={1} max={20}
                        value={sec.conceptCount ?? 5}
                        onChange={e => updateSection(sec._key, { conceptCount: Math.max(1, Number(e.target.value)) })}
                        className="w-20 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1 text-[11px] text-white/70 outline-none focus:border-violet-500/40 transition-colors"
                      />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Assign to */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <SectionLabel>Assign to ({assignedTo.length} selected)</SectionLabel>
                <button
                  onClick={() =>
                    setAssignedTo(assignedTo.length === allCandidates.length
                      ? []
                      : allCandidates.map(m => m.userId)
                    )
                  }
                  className="text-[9px] text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {assignedTo.length === allCandidates.length ? "Clear all" : "Select all"}
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {allCandidates.map(member => {
                  const selected = assignedTo.includes(member.userId);
                  return (
                    <button
                      key={member.userId}
                      onClick={() => toggleAssignee(member.userId)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors ${
                        selected ? "bg-indigo-500/10 border border-indigo-500/20" : "bg-white/[0.03] border border-white/[0.05]"
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 transition-all ${
                        selected ? "bg-indigo-600 border-indigo-500" : "border-white/20"
                      }`}>
                        {selected && <Check size={8} className="text-white" />}
                      </div>
                      <div className={`w-7 h-7 rounded-lg ${member.accent} flex items-center justify-center shrink-0`}>
                        <span className="text-[9px] font-bold text-white">{member.initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-medium transition-colors ${selected ? "text-white/80" : "text-white/40"}`}>{member.name}</p>
                        <p className="text-[9px] text-white/20 capitalize">{member.role}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-white/[0.06] flex gap-2">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/40 text-[11px] font-semibold hover:text-white/60 transition-colors">
              Cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleConfirm}
              disabled={!canSubmit}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-35 text-white text-[12px] font-bold transition-colors"
            >
              <Save size={13} /> Create Assessment
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
