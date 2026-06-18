/* ══════════════════════════════════════════════════════════════
   LESSON INGESTION MODAL — Phase 10B
   Upload slides/notes/photos → OCR → summarise → generate cards
   ══════════════════════════════════════════════════════════════ */

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, FileText, CheckCircle, Loader2, Image, Presentation } from "lucide-react";
import { addLesson } from "../teacherStore";
import type { Class } from "../teacherStore";

interface Props {
  cls:     Class;
  onClose: () => void;
}

type UploadType = "slides" | "notes" | "photo";
type PipelineStep = "upload" | "ocr" | "summarise" | "concepts" | "cards" | "done";

const STEP_LABELS: Record<PipelineStep, string> = {
  upload:    "Uploading…",
  ocr:       "Extracting text (OCR)…",
  summarise: "Summarising lesson…",
  concepts:  "Extracting key concepts…",
  cards:     "Generating learn mode cards…",
  done:      "Lesson ready!",
};

const STEP_ORDER: PipelineStep[] = ["upload", "ocr", "summarise", "concepts", "cards"];

const UPLOAD_OPTIONS: { type: UploadType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: "slides", label: "Slides",     icon: <Presentation size={14} />, desc: "PowerPoint, PDF, Google Slides export" },
  { type: "notes",  label: "Notes",      icon: <FileText size={14} />,     desc: "Teacher notes, Word doc, typed text"  },
  { type: "photo",  label: "Board photo",icon: <Image size={14} />,        desc: "Whiteboard, blackboard, flip chart"   },
];

function mockSummary(title: string, uploadType: UploadType): { summary: string; concepts: string[] } {
  const base: Record<UploadType, { summary: string; concepts: string[] }> = {
    slides: {
      summary:  `Lesson slides covering ${title}. Key points extracted from each slide including definitions, diagrams, and worked examples. Students should review alongside their notes.`,
      concepts: ["slide concept 1", "definition", "worked example", "diagram labels", "key formula", "exam technique"],
    },
    notes: {
      summary:  `Teacher notes for ${title}. Includes learning objectives, explanation sequence, common misconceptions, and suggested student activities.`,
      concepts: ["learning objective", "misconception", "explanation", "student activity", "assessment point"],
    },
    photo: {
      summary:  `Board work from lesson on ${title}. Captured teacher explanations, diagrams, and student contributions from the board.`,
      concepts: ["board diagram", "teacher explanation", "class discussion", "key term", "worked example"],
    },
  };
  return base[uploadType];
}

async function runIngestion(
  title: string,
  uploadType: UploadType,
  onStep: (s: PipelineStep) => void,
): Promise<{ summary: string; concepts: string[] }> {
  const delays: Partial<Record<PipelineStep, number>> = {
    upload: 600, ocr: 1400, summarise: 1000, concepts: 800, cards: 900,
  };
  for (const s of STEP_ORDER) {
    onStep(s);
    await new Promise(r => setTimeout(r, delays[s]));
  }
  return mockSummary(title, uploadType);
}

export default function LessonIngestionModal({ cls, onClose }: Props) {
  const [file,       setFile]       = useState<File | null>(null);
  const [title,      setTitle]      = useState("");
  const [uploadType, setUploadType] = useState<UploadType>("slides");
  const [step,       setStep]       = useState<PipelineStep | null>(null);
  const [result,     setResult]     = useState<{ summary: string; concepts: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processing = step !== null && step !== "done";

  function handleFile(f: File) {
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
  }

  async function handleProcess() {
    if (!file && !title) return;
    const r = await runIngestion(title || "this lesson", uploadType, setStep);
    setResult(r);
    setStep("done");
  }

  function handleAdd() {
    if (!result) return;
    addLesson(cls.id, {
      title:    title || "Untitled Lesson",
      rawText:  result.summary,
      summary:  result.summary,
      concepts: result.concepts,
    });
    onClose();
  }

  const currentIdx = step ? STEP_ORDER.indexOf(step) : -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={e => { if (e.target === e.currentTarget && !processing) onClose(); }}
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
            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}>
            <BookOpen size={14} className="text-violet-400" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">Ingest Lesson</p>
            <p className="text-[10px] text-slate-500">{cls.name}</p>
          </div>
          {!processing && (
            <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* Upload form */}
          {step === null && (
            <motion.div key="form" className="flex flex-col gap-3">
              <input ref={inputRef} type="file" accept=".pdf,.pptx,.docx,.png,.jpg,.jpeg,.webp"
                className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

              {/* Upload type selector */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Source type</label>
                <div className="flex gap-1.5">
                  {UPLOAD_OPTIONS.map(opt => (
                    <button
                      key={opt.type}
                      onClick={() => setUploadType(opt.type)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[10px] transition-all ${
                        uploadType === opt.type
                          ? "bg-violet-500/15 border-violet-500/35 text-white"
                          : "bg-white/[0.03] border-white/[0.07] text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <span className={uploadType === opt.type ? "text-violet-400" : "text-slate-600"}>{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* File drop zone */}
              {!file ? (
                <button
                  onClick={() => inputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border-2 border-dashed border-white/[0.1] hover:border-violet-500/40 hover:bg-violet-500/05 transition-all text-slate-500"
                >
                  <BookOpen size={20} className="text-violet-500/60" />
                  <p className="text-[11px]">Click to upload {UPLOAD_OPTIONS.find(o => o.type === uploadType)?.desc}</p>
                </button>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                  <FileText size={16} className="text-violet-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-white truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button onClick={() => setFile(null)} className="text-slate-500 hover:text-slate-300"><X size={12} /></button>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Lesson title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Intro to Algorithms"
                  className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-3 py-2.5 text-[12px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/40"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleProcess}
                disabled={!file && !title.trim()}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${
                  file || title.trim()
                    ? "bg-violet-600 hover:bg-violet-500 text-white"
                    : "bg-white/[0.05] text-slate-600 cursor-not-allowed"
                }`}
              >
                Ingest &amp; Generate
              </motion.button>
            </motion.div>
          )}

          {/* Pipeline */}
          {processing && (
            <motion.div key="pipeline" className="flex flex-col gap-3 py-4">
              {STEP_ORDER.map((s, i) => {
                const done   = i < currentIdx;
                const active = s === step;
                return (
                  <div key={s} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      done   ? "bg-emerald-500/20 border border-emerald-500/40" :
                      active ? "bg-violet-500/20 border border-violet-500/40 animate-pulse" :
                               "bg-white/[0.04] border border-white/[0.08]"
                    }`}>
                      {done   ? <CheckCircle size={10} className="text-emerald-400" /> :
                       active ? <Loader2 size={10} className="text-violet-400 animate-spin" /> :
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />}
                    </div>
                    <p className={`text-[12px] ${active ? "text-white font-medium" : done ? "text-slate-400" : "text-slate-600"}`}>
                      {STEP_LABELS[s]}
                    </p>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Result */}
          {step === "done" && result && (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
              <div className="p-3 rounded-xl bg-violet-500/08 border border-violet-500/20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-1">Lesson summary</p>
                <p className="text-[11px] text-slate-300 leading-relaxed">{result.summary}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Concepts extracted</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.concepts.map(c => (
                    <span key={c} className="px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-300">{c}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                <button onClick={() => { setStep(null); setResult(null); setFile(null); }}
                  className="flex-1 px-3 py-2 rounded-xl text-[12px] bg-white/[0.04] border border-white/[0.07] text-slate-400 hover:text-white transition-colors">
                  Re-upload
                </button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleAdd}
                  className="flex-1 px-3 py-2 rounded-xl text-[12px] font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors">
                  Add to Lessons
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
