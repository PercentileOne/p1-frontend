/* ══════════════════════════════════════════════════════════════
   AI NOTES TAB — Phase 12
   Generate structured AI note, lecture reconstruction, pipeline
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Brain, LayoutGrid, BookOpen, Loader2,
  CheckCircle, ChevronDown, ChevronUp, Wand2, RefreshCw, Mic,
} from "lucide-react";
import {
  generate, extractConcepts, generateCard,
  PIPELINE_LABELS, type GenerateMode, type PipelineStep,
} from "../aiNotesEngine";
import type { Note, NotesStore } from "../notesStore";

interface Props {
  note:  Note;
  store: NotesStore;
}

// ── Mode options ────────────────────────────────────────────────────

const GENERATE_OPTIONS: { mode: GenerateMode; label: string; desc: string; icon: React.ReactNode }[] = [
  { mode: "all",     label: "Generate from All",     desc: "Title + subject + content + voice + OCR", icon: <Wand2 size={12} />     },
  { mode: "content", label: "Generate from Content", desc: "Expand and structure your raw notes",      icon: <Sparkles size={12} />  },
  { mode: "lecture", label: "Reconstruct Lecture",   desc: "Full lecture-style structured explanation", icon: <BookOpen size={12} />  },
  { mode: "subject", label: "Generate from Subject", desc: "Build from the subject topic only",         icon: <Brain size={12} />     },
  { mode: "title",   label: "Generate from Title",   desc: "Minimal — just from note title",            icon: <LayoutGrid size={12} />},
];

// ── Pipeline step tracker ──────────────────────────────────────────

const PIPELINE_STEPS: PipelineStep[] = ["detecting", "expanding", "structuring", "concepts", "card", "done"];

function PipelineProgress({ step }: { step: PipelineStep | null }) {
  if (!step) return null;
  const idx = PIPELINE_STEPS.indexOf(step);
  return (
    <div className="flex flex-col gap-2 py-3">
      {PIPELINE_STEPS.filter(s => s !== "done").map((s, i) => {
        const done   = i < idx;
        const active = s === step;
        return (
          <div key={s} className="flex items-center gap-2.5">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
              done   ? "bg-emerald-500/20 border border-emerald-500/35" :
              active ? "bg-violet-500/20 border border-violet-500/35 animate-pulse" :
                       "bg-white/[0.04] border border-white/[0.07]"
            }`}>
              {done   ? <CheckCircle size={9} className="text-emerald-400" /> :
               active ? <Loader2 size={9} className="text-violet-400 animate-spin" /> :
                        <span className="w-1.5 h-1.5 rounded-full bg-white/10" />}
            </div>
            <p className={`text-[12px] ${
              active ? "text-white font-medium" : done ? "text-slate-400" : "text-slate-600"
            }`}>
              {PIPELINE_LABELS[s]}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── Rendered AI content ────────────────────────────────────────────

function RenderedContent({ content }: { content: string }) {
  const [collapsed, setCollapsed] = useState(false);

  const lines = content.split("\n");
  const rendered = lines.map((line, i) => {
    if (line.startsWith("# ")) return (
      <h1 key={i} className="text-[17px] font-black text-white mt-3 mb-1 leading-tight">
        {line.slice(2)}
      </h1>
    );
    if (line.startsWith("## ")) return (
      <h2 key={i} className="text-[14px] font-bold text-slate-200 mt-4 mb-1.5 leading-snug border-b border-white/[0.06] pb-1">
        {line.slice(3)}
      </h2>
    );
    if (line.startsWith("### ")) return (
      <h3 key={i} className="text-[12px] font-bold text-indigo-300 mt-3 mb-1">
        {line.slice(4)}
      </h3>
    );
    if (line.startsWith("---")) return (
      <hr key={i} className="border-white/[0.07] my-2" />
    );
    if (line.startsWith("- ") || line.startsWith("✓ ")) return (
      <div key={i} className="flex items-start gap-2 my-0.5">
        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${line.startsWith("✓") ? "bg-emerald-500" : "bg-indigo-500/60"}`} />
        <p className="text-[12.5px] text-slate-300 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>') }}
        />
      </div>
    );
    if (line.startsWith("```")) return (
      <div key={i} className="my-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07] font-mono text-[11px] text-slate-400">
        {line.slice(3)}
      </div>
    );
    if (line.trim() === "") return <div key={i} className="h-1.5" />;
    if (line.startsWith("*") && line.endsWith("*")) return (
      <p key={i} className="text-[11px] text-slate-500 italic my-0.5">{line.slice(1, -1)}</p>
    );
    return (
      <p key={i} className="text-[12.5px] text-slate-300 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: line.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>') }}
      />
    );
  });

  return (
    <div
      className="relative rounded-2xl border border-violet-500/15 bg-gradient-to-br from-violet-950/30 to-indigo-950/20 p-5"
      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05) inset" }}
    >
      <div className="absolute top-0 left-4 right-4 h-[2px] rounded-b-full bg-gradient-to-r from-violet-500/60 to-indigo-500/60" />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Sparkles size={11} className="text-violet-400" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400/70">P1 AI Notes</p>
        </div>
        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          {collapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-0.5">{rendered}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────

export default function AINotesTab({ note, store }: Props) {
  const [pipelineStep,   setPipelineStep]   = useState<PipelineStep | null>(null);
  const [selectedMode,   setSelectedMode]   = useState<GenerateMode>("all");
  const [showOptions,    setShowOptions]    = useState(false);
  const [conceptsDone,   setConceptsDone]   = useState(false);
  const [cardDone,       setCardDone]       = useState(false);

  const liveNote = store.getNote(note.id) ?? note;
  const isRunning = pipelineStep !== null && pipelineStep !== "done";

  async function handleGenerate() {
    setConceptsDone(false);
    setCardDone(false);
    setShowOptions(false);
    setPipelineStep("detecting");

    // Step 1+2+3 — generate content
    await new Promise(r => setTimeout(r, 400));
    setPipelineStep("expanding");
    const result = await generate(liveNote, selectedMode);
    store.setAIGeneratedContent(liveNote.id, result.aiGeneratedContent);
    if (!liveNote.subject) store.setSubject(liveNote.id, result.detectedSubject);

    // Step 4 — concepts
    setPipelineStep("concepts");
    const concepts = await extractConcepts(result.aiGeneratedContent);
    store.setAIConcepts(liveNote.id, concepts);
    setConceptsDone(true);

    // Step 5 — card
    setPipelineStep("card");
    const cardId = await generateCard({ id: liveNote.id, title: liveNote.title, subject: result.detectedSubject, aiGeneratedContent: result.aiGeneratedContent });
    store.setAICardId(liveNote.id, cardId);
    setCardDone(true);

    setPipelineStep("done");
    setTimeout(() => setPipelineStep(null), 800);
  }

  // Empty state
  if (!liveNote.aiGeneratedContent && !isRunning) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}>
            <Sparkles size={22} className="text-violet-400" />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-bold text-white">AI Notes Engine</p>
            <p className="text-[12px] text-slate-500 mt-1 leading-relaxed max-w-[260px]">
              Transform your raw notes into structured, high-quality study material
            </p>
          </div>
        </div>

        {/* Voice shortcut — shown when note has a transcript */}
        {liveNote.voiceTranscript && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { setSelectedMode("lecture"); setTimeout(handleGenerate, 0); }}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-rose-500/25 bg-gradient-to-r from-rose-950/40 to-[#0d0e14] text-left transition-all hover:border-rose-500/40"
            style={{ boxShadow: "0 4px 16px rgba(239,68,68,0.1)" }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <Mic size={14} className="text-rose-400" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-bold text-white">Reconstruct Lecture from Voice</p>
              <p className="text-[10px] text-rose-400/60 mt-0.5">Use your voice transcript as the primary source</p>
            </div>
            <Sparkles size={13} className="text-rose-400/60 shrink-0" />
          </motion.button>
        )}

        {/* Generate options */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {liveNote.voiceTranscript ? "Or generate from:" : "Generation mode"}
          </p>
          {GENERATE_OPTIONS.map(opt => (
            <button
              key={opt.mode}
              onClick={() => setSelectedMode(opt.mode)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                selectedMode === opt.mode
                  ? "bg-violet-500/12 border-violet-500/30 text-white"
                  : "bg-white/[0.02] border-white/[0.07] text-slate-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <span className={selectedMode === opt.mode ? "text-violet-400" : "text-slate-600"}>{opt.icon}</span>
              <div>
                <p className="text-[12px] font-semibold">{opt.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</p>
              </div>
              {selectedMode === opt.mode && <CheckCircle size={13} className="ml-auto text-violet-400" />}
            </button>
          ))}
        </div>  {/* end generate options */}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleGenerate}
          className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-[13px] font-bold transition-all shadow-lg shadow-violet-900/30"
        >
          <Sparkles size={14} />
          {selectedMode === "lecture" ? "Reconstruct Lecture" : "Generate AI Notes"}
        </motion.button>
      </div>
    );
  }

  // Running pipeline
  if (isRunning) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-3 py-4">
          <motion.div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Sparkles size={18} className="text-violet-400" />
          </motion.div>
          <div className="text-center">
            <p className="text-[13px] font-bold text-white">P1 AI is working…</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{PIPELINE_LABELS[pipelineStep!]}</p>
          </div>
        </div>
        <PipelineProgress step={pipelineStep} />
      </div>
    );
  }

  // Done — show content
  return (
    <div className="flex flex-col gap-4">
      {liveNote.aiGeneratedContent && <RenderedContent content={liveNote.aiGeneratedContent} />}

      {/* Post-gen stats */}
      <div className="flex gap-2 flex-wrap">
        {conceptsDone && liveNote.aiConcepts?.length && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400">
            <Brain size={10} />
            {liveNote.aiConcepts.length} concepts extracted
          </div>
        )}
        {cardDone && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400">
            <LayoutGrid size={10} />
            Card generated
          </div>
        )}
      </div>

      {/* Regenerate options */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setShowOptions(o => !o)}
          className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors w-fit"
        >
          <RefreshCw size={10} />
          Regenerate {showOptions ? "▴" : "▾"}
        </button>

        <AnimatePresence>
          {showOptions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden flex flex-col gap-1"
            >
              {GENERATE_OPTIONS.map(opt => (
                <button
                  key={opt.mode}
                  onClick={() => { setSelectedMode(opt.mode); handleGenerate(); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-[11px] text-slate-400 hover:text-white transition-all text-left"
                >
                  <span className="text-slate-600">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
