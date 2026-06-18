/* ══════════════════════════════════════════════════════════════
   NotesList — grid of notes + search + CTAs
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Upload, FileText, Mic, FileImage, FileDown,
  Keyboard, Search, Trash2, Sparkles, Brain,
} from "lucide-react";
import type { Note, NoteSourceType } from "../notesStore";
import SectionLabel from "../../cards/components/shared/SectionLabel";

function relativeTime(date: Date): string {
  const h = (Date.now() - date.getTime()) / 3_600_000;
  if (h < 1)   return `${Math.round(h * 60)}m ago`;
  if (h < 24)  return `${Math.round(h)}h ago`;
  if (h < 168) return `${Math.round(h / 24)}d ago`;
  return `${Math.round(h / 168)}w ago`;
}

const SOURCE_META: Record<NoteSourceType, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  typed:  { icon: <Keyboard  size={10} />, color: "text-indigo-400", bg: "bg-indigo-500/15 border-indigo-500/25", label: "Typed"    },
  voice:  { icon: <Mic       size={10} />, color: "text-rose-400",   bg: "bg-rose-500/15   border-rose-500/25",   label: "Voice"    },
  scan:   { icon: <Mic       size={10} />, color: "text-sky-400",    bg: "bg-sky-500/15    border-sky-500/25",    label: "Scan"     },
  pdf:    { icon: <FileDown  size={10} />, color: "text-amber-400",  bg: "bg-amber-500/15  border-amber-500/25",  label: "PDF"      },
  image:  { icon: <FileImage size={10} />, color: "text-violet-400", bg: "bg-violet-500/15 border-violet-500/25", label: "Image"    },
  import: { icon: <FileText  size={10} />, color: "text-emerald-400",bg: "bg-emerald-500/15 border-emerald-500/25",label: "Import"  },
  mixed:  { icon: <Sparkles  size={10} />, color: "text-violet-400", bg: "bg-violet-500/15 border-violet-500/25", label: "Mixed"    },
};

interface Props {
  notes:          Note[];
  onSelect:       (note: Note) => void;
  onNewNote:      () => void;
  onScanUpload:   () => void;
  onDelete:       (id: string) => void;
}

export default function NotesList({ notes, onSelect, onNewNote, onScanUpload, onDelete }: Props) {
  const [search, setSearch] = useState("");

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase()) ||
    n.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const withCard    = notes.filter(n => n.aiCardId).length;
  const withConcepts = notes.filter(n => n.aiConcepts?.length).length;

  return (
    <div className="flex flex-col gap-5 px-1 py-2">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-white/90">Study Notes</h2>
          <p className="text-[12px] text-white/50 mt-0.5">Write, scan, and convert to cards</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onScanUpload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/50 hover:text-white/70 text-[10px] font-semibold transition-colors"
          >
            <Upload size={11} />
            Scan
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onNewNote}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-colors"
          >
            <Plus size={11} />
            New Note
          </motion.button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: <FileText size={12} className="text-indigo-400" />,   label: "Notes",    value: String(notes.length) },
          { icon: <Brain    size={12} className="text-violet-400" />,   label: "Analysed", value: String(withConcepts) },
          { icon: <Sparkles size={12} className="text-amber-400" />,    label: "Cards made", value: String(withCard) },
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

      {/* Search */}
      <div className="relative">
        <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes…"
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-8 pr-4 py-2.5 text-[12px] text-white/75 placeholder-white/30 outline-none focus:border-indigo-500/40 transition-colors"
        />
      </div>

      {/* Notes list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
            <FileText size={18} className="text-white/20" />
          </div>
          <p className="text-[13px] text-white/50">{search ? "No notes match your search" : "No notes yet"}</p>
          {!search && (
            <button onClick={onNewNote} className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
              Create your first note →
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((note, i) => {
            const src    = SOURCE_META[note.sourceType];
            const hasAI  = note.aiSummary || note.aiConcepts?.length;
            const hasCard = !!note.aiCardId;
            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -2 }}
                className="flex items-start gap-3 p-4 rounded-2xl border border-white/[0.06] bg-[#0f1117] cursor-pointer"
                style={{ boxShadow: "0 10px 36px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06) inset" }}
                onClick={() => onSelect(note)}
              >
                {/* Source icon */}
                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${src.bg} ${src.color}`}>
                  {src.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[13px] font-semibold text-white/90 truncate">{note.title}</p>
                    {hasCard && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border text-amber-400 bg-amber-500/10 border-amber-500/20 shrink-0">
                        Card ✓
                      </span>
                    )}
                    {hasAI && !hasCard && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border text-violet-400 bg-violet-500/10 border-violet-500/20 shrink-0">
                        AI ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-white/50 line-clamp-2 leading-relaxed mt-1">{note.content.replace(/[#*\-\[\]]/g, "").trim()}</p>
                  <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${src.bg} ${src.color}`}>
                      {src.label}
                    </span>
                    {note.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border border-white/[0.08] text-white/40 bg-white/[0.03]">
                        {tag}
                      </span>
                    ))}
                    <span className="text-[10px] text-white/35 ml-auto">{relativeTime(note.updatedAt)}</span>
                  </div>
                </div>

                <button
                  onClick={e => { e.stopPropagation(); onDelete(note.id); }}
                  className="text-white/15 hover:text-rose-400 transition-colors shrink-0 mt-0.5"
                >
                  <Trash2 size={11} />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
