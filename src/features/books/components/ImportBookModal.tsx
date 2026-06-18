/* ══════════════════════════════════════════════════════════════
   ImportBookModal — upload PDF → metadata → chapter preview → save
   4-step flow
   ══════════════════════════════════════════════════════════════ */

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, BookOpen, CheckCircle2, Save, Layers, FileDown } from "lucide-react";
import type { Book, Chapter } from "../booksStore";
import { extractPdfMetadataMock, extractChaptersMock } from "../mockPipeline";
import SectionLabel from "../../cards/components/shared/SectionLabel";

type Step = "upload" | "extracting" | "preview" | "saving";

interface Props {
  onConfirm: (book: Omit<Book, "id" | "createdAt">) => void;
  onClose:   () => void;
}

const COVER_GRADIENTS = [
  "linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)",
  "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
  "linear-gradient(135deg, #0d2818 0%, #1a3d2b 100%)",
  "linear-gradient(135deg, #2d1b4e 0%, #1a0d30 100%)",
  "linear-gradient(135deg, #3d1a00 0%, #1f0d00 100%)",
];
let _coverIdx = 0;

export default function ImportBookModal({ onConfirm, onClose }: Props) {
  const [step,      setStep]     = useState<Step>("upload");
  const [fileName,  setFileName] = useState("");
  const [title,     setTitle]    = useState("");
  const [author,    setAuthor]   = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [chapters,  setChapters] = useState<Array<{ id: string; title: string; pageStart: number; pageEnd: number }>>([]);
  const [dragOver,  setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setStep("extracting");
    const meta = await extractPdfMetadataMock(file.name);
    const chaps = await extractChaptersMock(file.name, meta.pageCount);
    setTitle(meta.title);
    setAuthor(meta.author);
    setPageCount(meta.pageCount);
    setChapters(chaps);
    setStep("preview");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) handleFile(f);
  };

  const handleSave = () => {
    setStep("saving");
    const cover = COVER_GRADIENTS[_coverIdx++ % COVER_GRADIENTS.length];
    setTimeout(() => {
      onConfirm({
        title:      title.trim() || fileName,
        author:     author.trim() || "Unknown Author",
        cover,
        sourceType: "pdf",
        chapters:   chapters.map(c => ({ ...c })),
      });
    }, 600);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-md flex flex-col gap-5 p-5 rounded-3xl border border-white/[0.08] bg-[#0f1117]"
          style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.75), 0 1px 0 rgba(255,255,255,0.06) inset" }}
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{   opacity: 0, scale: 0.94,  y: 12 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="absolute top-0 left-5 right-5 h-[2px] rounded-b-full bg-gradient-to-r from-indigo-500 to-violet-500 opacity-70" />

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-white/90">Import Book</h3>
              <p className="text-[10px] text-white/35 mt-0.5">PDF, EPUB, or plain text</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-xl bg-white/[0.05] flex items-center justify-center hover:bg-white/10 transition-colors">
              <X size={12} className="text-white/40" />
            </button>
          </div>

          <AnimatePresence mode="wait">

            {/* Step: Upload */}
            {step === "upload" && (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
                <input ref={fileRef} type="file" accept=".pdf,.epub,.txt" className="hidden" onChange={handleInputChange} />

                <motion.div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  animate={{ borderColor: dragOver ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.10)" }}
                  className="rounded-2xl border-2 border-dashed p-10 flex flex-col items-center gap-4 cursor-pointer hover:border-indigo-500/40 transition-colors"
                  style={{ background: "rgba(99,102,241,0.03)" }}
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center">
                    <Upload size={20} className="text-indigo-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-semibold text-white/65">Drop your book here or click to upload</p>
                    <p className="text-[10px] text-white/25 mt-1">PDF · EPUB · TXT</p>
                  </div>
                </motion.div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: <FileDown size={13} className="text-amber-400" />, label: "PDF", sub: "Most textbooks" },
                    { icon: <BookOpen size={13} className="text-sky-400"   />, label: "EPUB", sub: "eBook format" },
                    { icon: <Layers   size={13} className="text-indigo-400"/>, label: "TXT", sub: "Plain text" },
                  ].map(f => (
                    <div key={f.label} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      {f.icon}
                      <span className="text-[10px] font-semibold text-white/55">{f.label}</span>
                      <span className="text-[8px] text-white/25">{f.sub}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step: Extracting */}
            {step === "extracting" && (
              <motion.div key="extracting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5 py-8">
                <div className="relative w-16 h-16">
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-indigo-500/30 border-t-indigo-400"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  />
                  <div className="absolute inset-2 rounded-full bg-indigo-600/15 flex items-center justify-center">
                    <BookOpen size={16} className="text-indigo-400" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-semibold text-white/75">Analysing book…</p>
                  <p className="text-[10px] text-white/30 mt-1">Extracting metadata and chapters</p>
                </div>
                <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                    initial={{ width: "0%" }}
                    animate={{ width: "80%" }}
                    transition={{ duration: 2.2, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            )}

            {/* Step: Preview */}
            {step === "preview" && (
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">

                {/* Success banner */}
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-300">Book analysed — {chapters.length} chapters found</p>
                    <p className="text-[9px] text-emerald-400/60">"{fileName}" · {pageCount} pages</p>
                  </div>
                </div>

                {/* Editable metadata */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <SectionLabel>Title</SectionLabel>
                    <input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-2.5 py-2 text-[12px] font-semibold text-white/80 outline-none focus:border-indigo-500/40 transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <SectionLabel>Author</SectionLabel>
                    <input
                      value={author}
                      onChange={e => setAuthor(e.target.value)}
                      placeholder="Author name"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-2.5 py-2 text-[12px] text-white/65 placeholder-white/20 outline-none focus:border-indigo-500/40 transition-colors"
                    />
                  </div>
                </div>

                {/* Chapter list preview */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <SectionLabel>Chapters detected</SectionLabel>
                    <SectionLabel className="text-white/20">{chapters.length} chapters</SectionLabel>
                  </div>
                  <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto pr-0.5">
                    {chapters.map((ch, i) => (
                      <motion.div
                        key={ch.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.04]"
                      >
                        <span className="text-[9px] text-white/20 font-mono w-4 shrink-0">{i + 1}</span>
                        <span className="flex-1 text-[11px] text-white/65 truncate">{ch.title}</span>
                        <span className="text-[9px] text-white/25 tabular-nums shrink-0">pp.{ch.pageStart}–{ch.pageEnd}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setStep("upload")} className="px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/40 text-[11px] font-semibold hover:text-white/60 transition-colors">
                    Re-upload
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-bold transition-colors"
                  >
                    <Save size={13} />
                    Import Book
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step: Saving */}
            {step === "saving" && (
              <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 py-8">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                >
                  <CheckCircle2 size={40} className="text-emerald-400" />
                </motion.div>
                <div className="text-center">
                  <p className="text-[13px] font-semibold text-white/75">Book imported!</p>
                  <p className="text-[10px] text-white/30 mt-1">{chapters.length} chapters ready to process</p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
