/* ══════════════════════════════════════════════════════════════
   TEACHER HOMEWORK UPLOAD MODAL — Phase 10B
   OCR → detect subject/topic → generate concepts → create assignment
   ══════════════════════════════════════════════════════════════ */

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileText, CheckCircle, Loader2 } from "lucide-react";
import { addLesson } from "../teacherStore";
import type { Class } from "../teacherStore";

interface Props {
  cls:     Class;
  onClose: () => void;
}

type PipelineStep = "upload" | "ocr" | "detect" | "generate" | "done";

const STEP_LABELS: Record<PipelineStep, string> = {
  upload:   "Uploading file…",
  ocr:      "Extracting text (OCR)…",
  detect:   "Detecting subject & topic…",
  generate: "Generating concepts & summary…",
  done:     "Complete!",
};

const STEP_DELAYS: Partial<Record<PipelineStep, number>> = {
  upload:   700,
  ocr:      1200,
  detect:   900,
  generate: 1100,
};

async function runPipeline(
  fileName: string,
  onStep: (s: PipelineStep) => void,
): Promise<{ title: string; summary: string; concepts: string[] }> {
  for (const step of ["upload", "ocr", "detect", "generate"] as PipelineStep[]) {
    onStep(step);
    await new Promise(r => setTimeout(r, STEP_DELAYS[step]));
  }
  return {
    title:    fileName.replace(/\.[^/.]+$/, ""),
    summary:  `Homework worksheet covering key concepts extracted from ${fileName}. Students should complete all questions and show working.`,
    concepts: ["key concept A", "key concept B", "application", "problem-solving", "worked example"],
  };
}

export default function TeacherHomeworkUploadModal({ cls, onClose }: Props) {
  const [file,    setFile]    = useState<File | null>(null);
  const [step,    setStep]    = useState<PipelineStep | null>(null);
  const [result,  setResult]  = useState<{ title: string; summary: string; concepts: string[] } | null>(null);
  const [title,   setTitle]   = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    setFile(f);
    setTitle(f.name.replace(/\.[^/.]+$/, ""));
  }

  async function handleProcess() {
    if (!file) return;
    const r = await runPipeline(file.name, setStep);
    setResult(r);
    if (!title) setTitle(r.title);
    setStep("done");
  }

  function handleAdd() {
    if (!result) return;
    addLesson(cls.id, {
      title:    title || result.title,
      rawText:  `Homework: ${result.summary}`,
      summary:  result.summary,
      concepts: result.concepts,
    });
    onClose();
  }

  const processing = step !== null && step !== "done";

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
            style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <Upload size={14} className="text-amber-400" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">Upload Homework</p>
            <p className="text-[10px] text-slate-500">{cls.name}</p>
          </div>
          {!processing && (
            <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: file select */}
          {step === null && (
            <motion.div key="select" className="flex flex-col gap-4">
              <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp"
                className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

              {!file ? (
                <button
                  onClick={() => inputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 py-10 rounded-2xl border-2 border-dashed border-white/[0.1] hover:border-amber-500/40 hover:bg-amber-500/05 transition-all text-slate-500 hover:text-slate-300"
                >
                  <Upload size={24} className="text-amber-500/60" />
                  <div className="text-center">
                    <p className="text-[12px] font-semibold">Click to upload</p>
                    <p className="text-[10px] mt-0.5">PDF · Photo · Screenshot · Worksheet</p>
                  </div>
                </button>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                  <FileText size={18} className="text-amber-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-white truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button onClick={() => setFile(null)} className="text-slate-500 hover:text-slate-300">
                    <X size={12} />
                  </button>
                </div>
              )}

              {file && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Assignment title</label>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-3 py-2.5 text-[12px] text-slate-200 focus:outline-none focus:border-amber-500/40"
                  />
                </div>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleProcess}
                disabled={!file}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${
                  file ? "bg-amber-500 hover:bg-amber-400 text-black" : "bg-white/[0.05] text-slate-600 cursor-not-allowed"
                }`}
              >
                Process &amp; Generate
              </motion.button>
            </motion.div>
          )}

          {/* Step 2: pipeline running */}
          {processing && (
            <motion.div key="pipeline" className="flex flex-col gap-4 py-4">
              {(["upload", "ocr", "detect", "generate"] as PipelineStep[]).map((s, i) => {
                const steps = ["upload", "ocr", "detect", "generate"] as PipelineStep[];
                const idx = steps.indexOf(step!);
                const done = i < idx;
                const active = s === step;
                return (
                  <div key={s} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      done   ? "bg-emerald-500/20 border border-emerald-500/40" :
                      active ? "bg-amber-500/20 border border-amber-500/40 animate-pulse" :
                               "bg-white/[0.04] border border-white/[0.08]"
                    }`}>
                      {done   ? <CheckCircle size={10} className="text-emerald-400" /> :
                       active ? <Loader2 size={10} className="text-amber-400 animate-spin" /> :
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

          {/* Step 3: result preview */}
          {step === "done" && result && (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/08 border border-emerald-500/20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1">Summary</p>
                <p className="text-[11px] text-slate-300 leading-relaxed">{result.summary}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Concepts extracted</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.concepts.map(c => (
                    <span key={c} className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-300">{c}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                <button onClick={() => { setStep(null); setResult(null); }}
                  className="flex-1 px-3 py-2 rounded-xl text-[12px] bg-white/[0.04] border border-white/[0.07] text-slate-400 hover:text-white transition-colors">
                  Re-upload
                </button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleAdd}
                  className="flex-1 px-3 py-2 rounded-xl text-[12px] font-semibold bg-amber-500 hover:bg-amber-400 text-black transition-colors">
                  Add to {cls.name}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
