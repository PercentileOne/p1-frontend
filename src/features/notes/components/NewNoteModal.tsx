/* ══════════════════════════════════════════════════════════════
   NewNoteModal — create a typed or voice note
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Plus, Mic, CheckCircle } from "lucide-react";
import type { Note } from "../notesStore";
import SectionLabel from "../../cards/components/shared/SectionLabel";
import VoiceNoteRecorder, { type VoiceResult } from "./VoiceNoteRecorder";

interface Props {
  onConfirm: (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => void;
  onClose:   () => void;
}

export default function NewNoteModal({ onConfirm, onClose }: Props) {
  const [title,       setTitle]       = useState("");
  const [subject,     setSubject]     = useState("");
  const [content,     setContent]     = useState("");
  const [tagInput,    setTagInput]    = useState("");
  const [tags,        setTags]        = useState<string[]>([]);
  const [showVoice,   setShowVoice]   = useState(false);
  const [voiceResult, setVoiceResult] = useState<VoiceResult | null>(null);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
  };

  const valid = title.trim().length >= 2 && content.trim().length >= 10;

  const handleVoiceSave = (result: VoiceResult) => {
    setContent(prev => prev ? prev + "\n\n" + result.transcript : result.transcript);
    setVoiceResult(result);
    setShowVoice(false);
  };

  const handleSave = () => {
    if (!valid) return;
    onConfirm({
      title:           title.trim(),
      subject:         subject.trim() || null,
      content:         content.trim(),
      tags,
      sourceType:      voiceResult ? "voice" : "typed",
      hasVoice:        !!voiceResult,
      audioUrl:        voiceResult?.audioUrl   ?? undefined,
      duration:        voiceResult?.duration   ?? undefined,
      voiceTranscript: voiceResult?.transcript ?? undefined,
    });
  };

  return (
    <>
    {showVoice && (
      <VoiceNoteRecorder
        onSave={handleVoiceSave}
        onClose={() => setShowVoice(false)}
      />
    )}
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative w-full max-w-md flex flex-col gap-4 p-5 rounded-3xl border border-white/[0.08] bg-[#0f1117]"
          style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.75), 0 1px 0 rgba(255,255,255,0.06) inset" }}
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{   opacity: 0, scale: 0.94,  y: 12 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Accent bar */}
          <div className="absolute top-0 left-5 right-5 h-[2px] rounded-b-full bg-gradient-to-r from-indigo-500 to-violet-500 opacity-70" />

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-white/90">New Note</h3>
              <p className="text-[11px] text-white/40 mt-0.5">Write and save your study notes</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-xl bg-white/[0.05] flex items-center justify-center hover:bg-white/10 transition-colors">
              <X size={12} className="text-white/40" />
            </button>
          </div>

          {/* Voice attached badge */}
          {voiceResult && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <CheckCircle size={12} className="text-rose-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-rose-300">
                  Voice recording attached · {Math.floor(voiceResult.duration / 60)}:{String(voiceResult.duration % 60).padStart(2, "0")}
                </p>
                <p className="text-[10px] text-rose-400/60 truncate mt-0.5">{voiceResult.transcript.slice(0, 70)}…</p>
              </div>
              <button
                onClick={() => setVoiceResult(null)}
                className="text-white/20 hover:text-rose-400 transition-colors shrink-0"
                aria-label="Remove voice recording"
              >
                <X size={11} />
              </button>
            </div>
          )}

          {/* Title */}
          <div className="flex flex-col gap-1">
            <SectionLabel>Title</SectionLabel>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Note title…"
              maxLength={80}
              autoFocus
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[14px] font-semibold text-white/85 placeholder-white/30 outline-none focus:border-indigo-500/40 transition-colors"
            />
          </div>

          {/* Subject */}
          <div className="flex flex-col gap-1">
            <SectionLabel>Subject <span className="text-white/20 font-normal">(optional)</span></SectionLabel>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Photosynthesis, Vertical Slice Architecture, Macbeth Act 2"
              maxLength={100}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[13px] text-white/75 placeholder-white/30 outline-none focus:border-indigo-500/40 transition-colors"
            />
          </div>

          {/* Content */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <SectionLabel>Content</SectionLabel>
              <button
                type="button"
                onClick={() => setShowVoice(true)}
                className={`flex items-center gap-1 text-[10px] transition-colors ${
                  voiceResult
                    ? "text-rose-400/60 hover:text-rose-400"
                    : "text-rose-400/70 hover:text-rose-400"
                }`}
              >
                <Mic size={10} />
                {voiceResult ? "Add more voice" : "Voice note"}
              </button>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={`Write your notes here…\n\n# Headings and **bold** are supported\n- Bullet points work great too`}
              rows={7}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[13px] text-white/70 placeholder-white/30 outline-none focus:border-indigo-500/40 transition-colors resize-none font-mono leading-relaxed"
            />
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <SectionLabel>Tags</SectionLabel>
            <div className="flex flex-wrap gap-1.5 mb-1">
              {tags.map(t => (
                <span key={t} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border border-indigo-500/25 text-indigo-400 bg-indigo-500/10">
                  {t}
                  <button onClick={() => removeTag(t)} className="text-indigo-400/50 hover:text-rose-400 transition-colors">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add tag… (Enter or comma)"
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-[11px] text-white/65 placeholder-white/30 outline-none focus:border-indigo-500/40 transition-colors"
              />
              <button
                onClick={addTag}
                className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/25 flex items-center justify-center text-indigo-400 hover:bg-indigo-600/30 transition-colors"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/40 text-[11px] font-semibold hover:text-white/60 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!valid}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold transition-all ${
                valid
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30"
                  : "bg-white/[0.05] text-white/20 cursor-not-allowed"
              }`}
            >
              <Save size={13} />
              Save Note
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
    </>
  );
}
