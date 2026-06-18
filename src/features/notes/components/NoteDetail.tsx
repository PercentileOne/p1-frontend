/* ══════════════════════════════════════════════════════════════
   NoteDetail — 3 tabs: Note · AI Summary · Concepts
   Full editing, AI generation, card creation, group sharing
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Save, Sparkles, Brain, LayoutGrid,
  CheckCircle2, ExternalLink,
  Plus, Check, ChevronDown, Share2, Wand2, Mic,
  Play, Pause, ChevronUp,
} from "lucide-react";
import type { Note } from "../notesStore";
import type { NotesStore } from "../notesStore";
import { generateSummaryMock, extractConceptsMock } from "../mockOCR";
import { generateCardFromNote } from "../generateCardFromNote";
import { useGroupsStore } from "../../groups/groupsStore";
import AddToCertButton from "../../certifications/components/AddToCertButton";
import SectionLabel from "../../cards/components/shared/SectionLabel";
import AINotesTab from "./AINotesTab";

type Tab = "note" | "summary" | "concepts" | "ai-notes";
const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "note",     label: "Note",        icon: null },
  { key: "summary",  label: "AI Summary",  icon: <Sparkles size={10} /> },
  { key: "concepts", label: "Concepts",    icon: <Brain    size={10} /> },
  { key: "ai-notes", label: "AI Notes",    icon: <Wand2    size={10} /> },
];

// ── Share to Group inline picker ──────────────────────────────────
function ShareNoteButton({ noteTitle, noteId }: { noteTitle: string; noteId: string }) {
  const groupsStore = useGroupsStore();
  const [open,   setOpen]   = useState(false);
  const [shared, setShared] = useState<string | null>(null);

  const handle = (groupId: string) => {
    groupsStore.addActivity(groupId, {
      type: "note_shared", userId: "u-francis", userName: "Francis",
      userInitials: "FR", userAccent: "bg-indigo-500",
      message: `Francis shared a note: "${noteTitle}"`,
      timestamp: new Date(),
      meta: { cardTitle: noteTitle },
    });
    setShared(groupId);
    setTimeout(() => { setShared(null); setOpen(false); }, 1400);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/60 hover:bg-white/[0.07] transition-all text-[10px] font-medium"
      >
        <Share2 size={10} />
        Share
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute top-full left-0 mt-1.5 z-40 w-52 flex flex-col rounded-2xl border border-white/[0.08] bg-[#13151c] overflow-hidden"
            style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.05) inset" }}
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.96,  y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <div className="px-3 py-2 border-b border-white/[0.06]">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/45">Share note to group</p>
            </div>
            {groupsStore.groups.filter(g => g.localUserRole !== null).map(group => {
              const done = shared === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => handle(group.id)}
                  disabled={!!shared}
                  className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.04] transition-colors text-left"
                >
                  <span className="text-[14px]">{group.emoji}</span>
                  <span className="flex-1 text-[11px] font-medium text-white/70 truncate">{group.name}</span>
                  {done && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check size={9} className="text-emerald-400" />
                    </motion.div>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── AI Summary tab ────────────────────────────────────────────────
function SummaryTab({ note, store }: { note: Note; store: NotesStore }) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const summary = await generateSummaryMock(note.content);
      store.setAISummary(note.id, summary);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="relative w-12 h-12">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-violet-500/30 border-t-violet-400"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-2 rounded-full bg-violet-600/10 flex items-center justify-center">
            <Sparkles size={14} className="text-violet-400" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-[12px] font-semibold text-white/65">Generating summary…</p>
          <p className="text-[11px] text-white/45 mt-0.5">P1 Agent is reading your note</p>
        </div>
      </div>
    );
  }

  if (!note.aiSummary) {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <div className="w-12 h-12 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center">
          <Sparkles size={18} className="text-violet-400" />
        </div>
        <div className="text-center">
          <p className="text-[13px] font-semibold text-white/65">No summary yet</p>
          <p className="text-[11px] text-white/45 mt-1 leading-relaxed max-w-[200px]">
            P1 Agent will read your note and generate a structured summary
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleGenerate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[12px] font-bold transition-colors"
        >
          <Sparkles size={13} />
          Generate Summary
        </motion.button>
      </div>
    );
  }

  // Render summary — convert **bold** and line breaks
  const renderSummary = (text: string) =>
    text.split("\n\n").map((para, i) => (
      <p
        key={i}
        className="text-[12px] text-white/65 leading-relaxed"
        dangerouslySetInnerHTML={{
          __html: para.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white/85 font-semibold">$1</strong>'),
        }}
      />
    ));

  return (
    <div className="flex flex-col gap-4">
      {/* Summary card */}
      <div
        className="relative p-4 rounded-2xl border border-violet-500/15 bg-gradient-to-br from-violet-950/40 to-violet-900/20 flex flex-col gap-3"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.05) inset" }}
      >
        <div className="absolute top-0 left-4 right-4 h-[2px] rounded-b-full bg-violet-500/40" />
        <div className="flex items-center gap-2">
          <Sparkles size={11} className="text-violet-400" />
          <SectionLabel className="text-violet-400/70">P1 Agent Summary</SectionLabel>
        </div>
        <div className="flex flex-col gap-2.5">
          {renderSummary(note.aiSummary)}
        </div>
      </div>

      {/* Regenerate */}
      <button
        onClick={handleGenerate}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white/35 hover:text-white/55 text-[10px] font-medium transition-colors w-fit"
      >
        <Sparkles size={10} />
        Regenerate summary
      </button>
    </div>
  );
}

// ── Concepts tab ──────────────────────────────────────────────────
function ConceptsTab({
  note, store, onViewCard,
}: {
  note:       Note;
  store:      NotesStore;
  onViewCard: (cardId: string) => void;
}) {
  const [loading,       setLoading]       = useState(false);
  const [generating,    setGenerating]    = useState(false);
  const [cardCreated,   setCardCreated]   = useState(false);

  const handleExtract = async () => {
    setLoading(true);
    try {
      const concepts = await extractConceptsMock(note.content, note.id);
      store.setAIConcepts(note.id, concepts);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCard = async () => {
    if (!note.aiConcepts?.length) return;
    setGenerating(true);
    await new Promise(r => setTimeout(r, 800)); // brief confirmation delay
    try {
      const card = generateCardFromNote(note);
      store.setAICardId(note.id, card.id);
      setCardCreated(true);
      setTimeout(() => setCardCreated(false), 2000);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="relative w-12 h-12">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-emerald-500/30 border-t-emerald-400"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-2 rounded-full bg-emerald-600/10 flex items-center justify-center">
            <Brain size={14} className="text-emerald-400" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-[12px] font-semibold text-white/65">Extracting concepts…</p>
          <p className="text-[10px] text-white/30 mt-0.5">Identifying testable knowledge points</p>
        </div>
      </div>
    );
  }

  if (!note.aiConcepts?.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
          <Brain size={18} className="text-emerald-400" />
        </div>
        <div className="text-center">
          <p className="text-[13px] font-semibold text-white/65">No concepts extracted yet</p>
          <p className="text-[10px] text-white/30 mt-1 leading-relaxed max-w-[210px]">
            P1 Agent will identify the key testable concepts in your note
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleExtract}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-bold transition-colors"
        >
          <Brain size={13} />
          Extract Concepts
        </motion.button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Concept count badge */}
      <div className="flex items-center justify-between">
        <SectionLabel>{note.aiConcepts.length} concepts extracted</SectionLabel>
        <button
          onClick={handleExtract}
          className="text-[9px] text-white/25 hover:text-white/45 transition-colors"
        >
          Re-extract
        </button>
      </div>

      {/* Concept rows */}
      <div className="flex flex-col gap-1.5">
        {note.aiConcepts.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.06] bg-[#0f1117]"
          >
            <div className="w-5 h-5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0 mt-px">
              <CheckCircle2 size={10} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-white/75 leading-snug">{c.text}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[8px] text-white/25">Weight ×{c.weight}</span>
                <span className="text-[8px] text-white/20">·</span>
                <span className="text-[8px] text-white/25">Diff {c.difficulty}/5</span>
                {c.aiGenerated && (
                  <span className="text-[8px] text-violet-400/50 flex items-center gap-0.5">
                    <Sparkles size={7} /> AI
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Card CTA */}
      {note.aiCardId ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <CheckCircle2 size={13} className="text-amber-400 shrink-0" />
            <p className="text-[11px] text-amber-300/80 flex-1">Card already created from this note</p>
          </div>
          <button
            onClick={() => onViewCard(note.aiCardId!)}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/55 hover:text-white/75 text-[12px] font-semibold transition-colors"
          >
            <ExternalLink size={13} />
            View Card
          </button>
        </div>
      ) : (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleCreateCard}
          disabled={generating}
          className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-bold transition-all ${
            generating || cardCreated
              ? "bg-emerald-600/20 border border-emerald-500/25 text-emerald-400"
              : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-900/30"
          }`}
        >
          <AnimatePresence mode="wait">
            {cardCreated ? (
              <motion.span key="done" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                <CheckCircle2 size={14} /> Card created!
              </motion.span>
            ) : generating ? (
              <motion.span key="gen" className="flex items-center gap-2">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                  <Sparkles size={14} />
                </motion.div>
                Creating card…
              </motion.span>
            ) : (
              <motion.span key="idle" className="flex items-center gap-2">
                <LayoutGrid size={14} />
                Create Card from Concepts
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      )}

      {/* Stub: Create room from note */}
      <button
        disabled
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.03] border border-dashed border-white/[0.08] text-white/20 text-[11px] font-medium cursor-not-allowed"
      >
        <ChevronDown size={11} className="rotate-[-90deg]" />
        Create Room from Note — Phase 7
      </button>
    </div>
  );
}

// ── Voice section (shown inside NoteTab when note has audio) ─────

function VoiceSection({
  note, store, onGoToAINotes,
}: {
  note:          Note;
  store:         NotesStore;
  onGoToAINotes: () => void;
}) {
  const [playing,        setPlaying]        = useState(false);
  const [currentTime,    setCurrentTime]    = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [editTranscript, setEditTranscript] = useState(false);
  const [transcriptEdit, setTranscriptEdit] = useState(note.voiceTranscript ?? "");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function fmtTime(s: number) {
    const m   = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (Math.floor(s) % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  const totalSecs = note.duration ?? 0;
  const progress  = totalSecs > 0 ? (currentTime / totalSecs) * 100 : 0;

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); }
    else         { audioRef.current.play().catch(() => {}); }
    setPlaying(p => !p);
  }

  function handleScrub(e: React.ChangeEvent<HTMLInputElement>) {
    const t = Number(e.target.value);
    setCurrentTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  }

  function saveTranscript() {
    store.setVoiceTranscript(note.id, transcriptEdit);
    setEditTranscript(false);
  }

  const hasAudio = !!note.audioUrl;

  return (
    <div
      className="relative rounded-2xl border border-rose-500/15 bg-gradient-to-br from-rose-950/25 to-[#0d0e14] p-4 flex flex-col gap-3"
      style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05) inset" }}
    >
      {/* Accent */}
      <div className="absolute top-0 left-4 right-4 h-[2px] rounded-b-full bg-gradient-to-r from-rose-600/70 to-orange-500/50" />

      {/* Header row */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <Mic size={12} className="text-rose-400" />
        </div>
        <div className="flex-1">
          <p className="text-[12px] font-bold text-white/85">Voice Note</p>
          {totalSecs > 0 && (
            <p className="text-[10px] text-rose-400/60 mt-0.5">{fmtTime(totalSecs)} recorded</p>
          )}
        </div>
      </div>

      {/* Audio player */}
      {hasAudio && (
        <>
          {/* Hidden native audio element */}
          <audio
            ref={audioRef}
            src={note.audioUrl}
            onTimeUpdate={e => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
            onEnded={() => { setPlaying(false); setCurrentTime(0); }}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-rose-500 hover:bg-rose-400 transition-colors shrink-0"
            >
              {playing
                ? <Pause size={14} className="text-white" />
                : <Play  size={14} className="text-white fill-white" />
              }
            </button>
            <div className="flex-1 flex flex-col gap-1">
              <input
                type="range"
                min={0}
                max={totalSecs || 1}
                step={0.1}
                value={currentTime}
                onChange={handleScrub}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-rose-500"
                style={{ background: `linear-gradient(to right, #f43f5e ${progress}%, rgba(255,255,255,0.08) ${progress}%)` }}
              />
              <div className="flex justify-between">
                <span className="text-[9px] text-white/30">{fmtTime(currentTime)}</span>
                <span className="text-[9px] text-white/30">{fmtTime(totalSecs)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        {note.voiceTranscript && (
          <button
            onClick={() => setShowTranscript(s => !s)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[10px] text-white/50 hover:text-white/75 transition-colors"
          >
            {showTranscript ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            {showTranscript ? "Hide transcript" : "View transcript"}
          </button>
        )}
        <button
          onClick={onGoToAINotes}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-300 hover:bg-violet-500/20 transition-colors"
        >
          <Sparkles size={10} />
          Regenerate AI Notes from Voice
        </button>
      </div>

      {/* Transcript */}
      <AnimatePresence>
        {showTranscript && note.voiceTranscript && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.06] pt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <SectionLabel>Transcript</SectionLabel>
                <button
                  onClick={() => { setEditTranscript(e => !e); setTranscriptEdit(note.voiceTranscript ?? ""); }}
                  className="text-[10px] text-white/30 hover:text-white/55 transition-colors"
                >
                  {editTranscript ? "Cancel" : "Edit"}
                </button>
              </div>
              {editTranscript ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={transcriptEdit}
                    onChange={e => setTranscriptEdit(e.target.value)}
                    rows={5}
                    autoFocus
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[12px] text-white/70 placeholder-white/25 outline-none focus:border-violet-500/40 transition-colors resize-none leading-relaxed"
                  />
                  <button
                    onClick={saveTranscript}
                    className="self-end flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/25 text-[10px] text-emerald-400 hover:bg-emerald-600/30 transition-colors"
                  >
                    <CheckCircle2 size={10} />
                    Save transcript
                  </button>
                </div>
              ) : (
                <p className="text-[12px] text-slate-300 leading-relaxed">
                  {note.voiceTranscript}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Note editing tab ──────────────────────────────────────────────
function NoteTab({
  note, store, onViewCard, onGoToAINotes,
}: {
  note:          Note;
  store:         NotesStore;
  onViewCard:    (cardId: string) => void;
  onGoToAINotes: () => void;
}) {
  const [content,  setContent]  = useState(note.content);
  const [tagInput, setTagInput] = useState("");
  const [tags,     setTags]     = useState<string[]>(note.tags);
  const [saved,    setSaved]    = useState(false);

  // Stay in sync if note changes
  useEffect(() => {
    setContent(note.content);
    setTags(note.tags);
  }, [note.id]);

  const handleSave = () => {
    store.updateNote(note.id, { content, tags });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput("");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Voice section — shown when note has audio or transcript */}
      {(note.hasVoice || note.voiceTranscript || note.audioUrl) && (
        <VoiceSection note={note} store={store} onGoToAINotes={onGoToAINotes} />
      )}

      {/* Content editor */}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={12}
        className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-3 text-[14px] text-white/75 placeholder-white/30 outline-none focus:border-indigo-500/40 transition-colors resize-none font-mono leading-relaxed"
      />

      {/* Tags */}
      <div className="flex flex-col gap-1.5">
        <SectionLabel>Tags</SectionLabel>
        <div className="flex flex-wrap gap-1.5 mb-1">
          {tags.map(t => (
            <span key={t} className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border border-indigo-500/25 text-indigo-400 bg-indigo-500/10">
              {t}
              <button onClick={() => setTags(prev => prev.filter(x => x !== t))} className="text-indigo-400/50 hover:text-rose-400 transition-colors">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
            placeholder="Add tag…"
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[11px] text-white/60 placeholder-white/30 outline-none focus:border-indigo-500/40 transition-colors"
          />
          <button onClick={addTag} className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/25 text-indigo-400 text-[10px] font-medium hover:bg-indigo-600/30 transition-colors">
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-2">
        <ShareNoteButton noteTitle={note.title} noteId={note.id} />
        <AddToCertButton sourceType="note" sourceId={note.id} title={note.title} description={note.content.slice(0, 80)} />
        {note.aiCardId && (
          <button
            onClick={() => onViewCard(note.aiCardId!)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium hover:bg-amber-500/15 transition-colors"
          >
            <ExternalLink size={10} />
            View Card
          </button>
        )}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleSave}
          className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all ${
            saved
              ? "bg-emerald-600/20 border border-emerald-500/25 text-emerald-400"
              : "bg-indigo-600 hover:bg-indigo-500 text-white"
          }`}
        >
          {saved ? <><CheckCircle2 size={12} /> Saved</> : <><Save size={12} /> Save</>}
        </motion.button>
      </div>
    </div>
  );
}

// ── Main NoteDetail ───────────────────────────────────────────────

interface Props {
  note:       Note;
  store:      NotesStore;
  onBack:     () => void;
  onViewCard: (cardId: string) => void;
}

export default function NoteDetail({ note, store, onBack, onViewCard }: Props) {
  const [tab, setTab] = useState<Tab>("note");

  // Get live note from store on each render
  const liveNote = store.getNote(note.id) ?? note;

  // Badge counts for tabs
  const summaryBadge  = liveNote.aiSummary ? "✓" : null;
  const conceptsBadge = liveNote.aiConcepts?.length ? String(liveNote.aiConcepts.length) : null;
  const noteBadge     = liveNote.hasVoice ? "🎙" : null;

  return (
    <div className="flex flex-col gap-0 h-full">

      {/* Header */}
      <div className="flex items-start gap-3 pb-4">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center hover:bg-white/10 transition-colors shrink-0 mt-0.5"
        >
          <ArrowLeft size={13} className="text-white/50" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-bold text-white/92 leading-snug">{liveNote.title}</h2>
          <p className="text-[11px] text-white/45 mt-1 capitalize">
            {liveNote.subject && <span className="text-indigo-400/60">{liveNote.subject} · </span>}
            {liveNote.sourceType} · {liveNote.updatedAt.toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06] mb-4">
        {TABS.map(t => {
          const badge = t.key === "note" ? noteBadge : t.key === "summary" ? summaryBadge : t.key === "concepts" ? conceptsBadge : null;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-semibold transition-all relative ${
                tab === t.key ? "bg-indigo-600 text-white" : "text-white/35 hover:text-white/55"
              }`}
            >
              {t.icon}
              {t.label}
              {badge && (
                <span className={`absolute -top-1 -right-0.5 text-[7px] font-bold px-1 py-px rounded-full ${
                  tab === t.key ? "bg-white/20 text-white" : "bg-emerald-500/20 text-emerald-400"
                }`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {tab === "note"     && <NoteTab      note={liveNote} store={store} onViewCard={onViewCard} onGoToAINotes={() => setTab("ai-notes")} />}
            {tab === "summary"  && <SummaryTab   note={liveNote} store={store} />}
            {tab === "concepts" && <ConceptsTab  note={liveNote} store={store} onViewCard={onViewCard} />}
            {tab === "ai-notes" && <AINotesTab   note={liveNote} store={store} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
