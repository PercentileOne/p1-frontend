import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Plus, ChevronDown, ChevronUp, Save, Send,
  ArrowLeft, Sparkles, Trash2, GripVertical,
} from "lucide-react";
import BackToCockpit from "../components/BackToCockpit";
import { ALL_CATEGORIES } from "../lib/storiesData";
import type { StoryCategory } from "../lib/storiesData";

/* ══════════════════════════════════════════════════════════════
   P1 STORY CREATE
   ══════════════════════════════════════════════════════════════ */

interface DraftChapter {
  id: string;
  title: string;
  content: string;
  expanded: boolean;
}

function mkId(): string {
  return Math.random().toString(36).slice(2, 9);
}

const ACCENT_OPTIONS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#22c55e", "#10b981", "#3b82f6", "#14b8a6",
];

function ChapterBlock({ ch, index, total, onChange, onRemove, onMove }: {
  ch: DraftChapter;
  index: number;
  total: number;
  onChange: (id: string, field: keyof DraftChapter, value: string | boolean) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25 }}
      className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl overflow-hidden"
      style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.35)" }}
    >
      {/* Chapter header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
        <GripVertical size={12} className="text-slate-700 cursor-grab" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 w-16">
          Ch. {index + 1}
        </span>
        <input
          value={ch.title}
          onChange={e => onChange(ch.id, "title", e.target.value)}
          placeholder="Chapter title…"
          className="flex-1 bg-transparent text-[13px] font-semibold text-white placeholder:text-slate-700 focus:outline-none"
        />
        <div className="flex items-center gap-1">
          {index > 0 && (
            <button onClick={() => onMove(ch.id, -1)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.04] transition-all">
              <ChevronUp size={11} />
            </button>
          )}
          {index < total - 1 && (
            <button onClick={() => onMove(ch.id, 1)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.04] transition-all">
              <ChevronDown size={11} />
            </button>
          )}
          <button onClick={() => onChange(ch.id, "expanded", !ch.expanded)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.04] transition-all">
            {ch.expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          {total > 1 && (
            <button onClick={() => onRemove(ch.id)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/[0.08] transition-all">
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Chapter body */}
      <AnimatePresence initial={false}>
        {ch.expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="p-4">
              <textarea
                value={ch.content}
                onChange={e => onChange(ch.id, "content", e.target.value)}
                placeholder="Write this chapter… Use blank lines to separate paragraphs."
                rows={12}
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-slate-300 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/30 resize-y leading-[1.85] transition-colors"
                style={{ minHeight: "200px" }}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-slate-700">{ch.content.length} characters</span>
                <span className="text-[10px] text-slate-700">~{Math.max(1, Math.ceil(ch.content.split(" ").length / 200))} min read</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function StoryCreatePage() {
  const navigate = useNavigate();

  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [category,    setCategory]    = useState<StoryCategory | "">("");
  const [accent,      setAccent]      = useState(ACCENT_OPTIONS[0]);
  const [tags,        setTags]        = useState("");
  const [chapters,    setChapters]    = useState<DraftChapter[]>([
    { id: mkId(), title: "", content: "", expanded: true },
  ]);
  const [saving,      setSaving]      = useState(false);
  const [published,   setPublished]   = useState(false);

  const totalWords = chapters.reduce((acc, ch) => acc + ch.content.split(/\s+/).filter(Boolean).length, 0);
  const isReady = title.trim().length > 3 && category && chapters.some(ch => ch.content.trim().length > 50);

  function updateChapter(id: string, field: keyof DraftChapter, value: string | boolean) {
    setChapters(prev => prev.map(ch => ch.id === id ? { ...ch, [field]: value } : ch));
  }
  function removeChapter(id: string) {
    setChapters(prev => prev.filter(ch => ch.id !== id));
  }
  function moveChapter(id: string, dir: -1 | 1) {
    setChapters(prev => {
      const idx = prev.findIndex(ch => ch.id === id);
      if (idx + dir < 0 || idx + dir >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]];
      return arr;
    });
  }
  function addChapter() {
    setChapters(prev => [...prev.map(ch => ({ ...ch, expanded: false })),
      { id: mkId(), title: "", content: "", expanded: true }]);
  }
  function handleSave(publish: boolean) {
    setSaving(true);
    setTimeout(() => { setSaving(false); setPublished(publish); }, 1200);
  }

  if (published) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="text-5xl mb-4">✨</div>
          <h2 className="text-xl font-bold text-white mb-2">Story Published!</h2>
          <p className="text-[13px] text-slate-400 mb-6">Your story is now live on P1.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate("/stories")}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-semibold transition-colors">
              Back to Stories
            </button>
            <button onClick={() => { setPublished(false); }}
              className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-[12px] font-semibold transition-colors border border-white/[0.08]">
              Keep Editing
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-6 py-3">
          <BackToCockpit />
          <button onClick={() => navigate("/stories")} className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft size={12} /> Stories
          </button>
          <span className="text-slate-700">/</span>
          <div className="flex items-center gap-2">
            <BookOpen size={13} className="text-indigo-400" />
            <span className="text-[12px] font-bold text-white">Write a Story</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-slate-600">{totalWords} words · {chapters.length} chapter{chapters.length !== 1 ? "s" : ""}</span>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-[11px] font-semibold transition-all border border-white/[0.08] disabled:opacity-50"
            >
              <Save size={11} /> {saving ? "Saving…" : "Save Draft"}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={!isReady || saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={11} /> Publish
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">

          {/* Story meta */}
          <div className="bg-[#1c1f2e] border border-white/[0.07] rounded-2xl p-6 mb-6"
            style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
            <div className="flex items-center gap-1.5 mb-5">
              <Sparkles size={12} className="text-indigo-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Story Details</span>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">Title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="What's your story called?"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-[15px] font-semibold text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/40 transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="A short description to hook readers…"
                  rows={2}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-[13px] text-slate-300 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/40 transition-colors resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as StoryCategory)}
                    style={{ colorScheme: "dark", backgroundColor: "#1c1f2e" }}
                    className="w-full px-3 py-2.5 border border-white/[0.08] rounded-xl text-[12px] text-slate-300 focus:outline-none focus:border-indigo-500/40 transition-colors"
                  >
                    <option value="">Select a category…</option>
                    {ALL_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">Tags (comma separated)</label>
                  <input
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder="resilience, career, growth…"
                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-[12px] text-slate-300 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/40 transition-colors"
                  />
                </div>
              </div>

              {/* Accent color */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">Story Colour</label>
                <div className="flex gap-2">
                  {ACCENT_OPTIONS.map(color => (
                    <button key={color} onClick={() => setAccent(color)}
                      className="w-7 h-7 rounded-lg transition-all border-2"
                      style={{
                        background: color,
                        borderColor: accent === color ? "white" : "transparent",
                        boxShadow: accent === color ? `0 0 0 1px ${color}` : "none",
                      }}
                    />
                  ))}
                  <div className="flex-1 h-7 rounded-lg border border-white/[0.08] px-2 flex items-center"
                    style={{ background: accent + "18" }}>
                    <span className="text-[10px] font-semibold" style={{ color: accent }}>
                      Preview colour
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chapters */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={12} className="text-slate-500" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">Chapters</span>
              <span className="text-[10px] text-slate-700">({chapters.length})</span>
            </div>
            <button onClick={addChapter}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/25 text-indigo-400 text-[11px] font-semibold hover:bg-indigo-600/30 transition-colors">
              <Plus size={11} /> Add Chapter
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {chapters.map((ch, i) => (
                <ChapterBlock
                  key={ch.id}
                  ch={ch}
                  index={i}
                  total={chapters.length}
                  onChange={updateChapter}
                  onRemove={removeChapter}
                  onMove={moveChapter}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Add chapter button at bottom */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={addChapter}
            className="w-full mt-4 py-4 rounded-2xl border border-dashed border-white/[0.1] text-[12px] font-semibold text-slate-600 hover:text-slate-400 hover:border-white/[0.2] transition-all flex items-center justify-center gap-2"
          >
            <Plus size={13} /> Add another chapter
          </motion.button>

          {/* Validation hint */}
          {!isReady && (title || category || chapters.some(ch => ch.content)) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-amber-500/[0.08] border border-amber-500/15 text-[11px] text-amber-400">
              <Sparkles size={10} />
              {!title.trim() ? "Add a story title to continue." :
               !category    ? "Select a category for your story." :
               "Write at least 50 characters in a chapter to publish."}
            </motion.div>
          )}
        </div>
        <div className="h-12" />
      </div>
    </div>
  );
}
