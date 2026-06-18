/* ══════════════════════════════════════════════════════════════
   ScanUploadModal — upload image or PDF → mock OCR → save note
   ══════════════════════════════════════════════════════════════ */

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Scan, FileText, CheckCircle2, Save, FileImage, FileDown } from "lucide-react";
import type { Note, NoteSourceType } from "../notesStore";
import { extractTextMock } from "../mockOCR";
import SectionLabel from "../../cards/components/shared/SectionLabel";

interface Props {
  onConfirm: (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => void;
  onClose:   () => void;
}

type Step = "upload" | "extracting" | "review";

export default function ScanUploadModal({ onConfirm, onClose }: Props) {
  const [step,        setStep]       = useState<Step>("upload");
  const [fileName,    setFileName]   = useState("");
  const [sourceType,  setSourceType] = useState<NoteSourceType>("scan");
  const [extractedText, setExtractedText] = useState("");
  const [title,       setTitle]      = useState("");
  const [dragOver,    setDragOver]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const isPDF   = file.name.endsWith(".pdf");
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
    setSourceType(isPDF ? "pdf" : isImage ? "image" : "scan");
    setTitle(file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
    setStep("extracting");
    const text = await extractTextMock(file.name);
    setExtractedText(text);
    setStep("review");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSave = () => {
    onConfirm({
      title: title.trim() || fileName || "Scanned Note",
      content: extractedText,
      sourceType,
      tags: [],
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
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
          <div className="absolute top-0 left-5 right-5 h-[2px] rounded-b-full bg-gradient-to-r from-sky-500 to-indigo-500 opacity-70" />

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-white/90">Scan / Upload</h3>
              <p className="text-[10px] text-white/35 mt-0.5">PDF, image, or handwritten notes</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-xl bg-white/[0.05] flex items-center justify-center hover:bg-white/10 transition-colors">
              <X size={12} className="text-white/40" />
            </button>
          </div>

          <AnimatePresence mode="wait">

            {/* Step: Upload */}
            {step === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.txt,.md,image/*"
                  className="hidden"
                  onChange={handleInputChange}
                />

                {/* Drop zone */}
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
                    <p className="text-[13px] font-semibold text-white/65">Drop file or click to upload</p>
                    <p className="text-[10px] text-white/25 mt-1">PDF, PNG, JPG, WEBP — up to 20MB</p>
                  </div>
                </motion.div>

                {/* File type hints */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: <FileDown  size={13} className="text-amber-400"  />, label: "PDF",    sub: "Lecture slides, textbooks" },
                    { icon: <FileImage size={13} className="text-violet-400" />, label: "Image",  sub: "Handwritten notes, photos" },
                    { icon: <FileText  size={13} className="text-sky-400"    />, label: "Text",   sub: ".txt, .md files"           },
                  ].map(item => (
                    <div key={item.label} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      {item.icon}
                      <span className="text-[10px] font-semibold text-white/55">{item.label}</span>
                      <span className="text-[8px] text-white/25 text-center">{item.sub}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step: Extracting */}
            {step === "extracting" && (
              <motion.div
                key="extracting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-5 py-8"
              >
                <div className="relative w-16 h-16">
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-sky-500/30 border-t-sky-400"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  />
                  <div className="absolute inset-2 rounded-full bg-sky-600/15 flex items-center justify-center">
                    <Scan size={16} className="text-sky-400" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-semibold text-white/75">Extracting text…</p>
                  <p className="text-[10px] text-white/30 mt-1">"{fileName}"</p>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
                    initial={{ width: "0%" }}
                    animate={{ width: "85%" }}
                    transition={{ duration: 1.6, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            )}

            {/* Step: Review */}
            {step === "review" && (
              <motion.div
                key="review"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4"
              >
                {/* Success banner */}
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-300">Text extracted successfully</p>
                    <p className="text-[9px] text-emerald-400/60">"{fileName}" · {extractedText.split(/\s+/).length} words</p>
                  </div>
                </div>

                {/* Title */}
                <div className="flex flex-col gap-1">
                  <SectionLabel>Note title</SectionLabel>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[13px] font-semibold text-white/80 placeholder-white/30 outline-none focus:border-indigo-500/40 transition-colors"
                  />
                </div>

                {/* Extracted text — editable */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <SectionLabel>Extracted text</SectionLabel>
                    <SectionLabel className="text-white/20">Edit before saving</SectionLabel>
                  </div>
                  <textarea
                    value={extractedText}
                    onChange={e => setExtractedText(e.target.value)}
                    rows={7}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[11px] text-white/60 outline-none focus:border-indigo-500/40 transition-colors resize-none font-mono leading-relaxed"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep("upload")}
                    className="px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/40 text-[11px] font-semibold hover:text-white/60 transition-colors"
                  >
                    Re-scan
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-bold transition-colors"
                  >
                    <Save size={13} />
                    Save Note
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
