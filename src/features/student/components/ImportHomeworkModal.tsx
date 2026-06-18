/* ══════════════════════════════════════════════════════════════
   ImportHomeworkModal — photo/PDF → OCR → detect → concepts → card
   ══════════════════════════════════════════════════════════════ */

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Upload, CheckCircle2, Brain, Sparkles, Save,
  Image, FileText, Camera,
} from "lucide-react";
import {
  ocrExtractMock, detectSubjectMock, detectTopicMock,
  generateSummaryFromNotesMock, extractConceptsFromNotesMock,
} from "../mockDetect";
import { useSubjectsStore } from "../subjectsStore";
import type { Concept } from "../../cards/types";
import SectionLabel from "../../cards/components/shared/SectionLabel";

type Step = "upload" | "ocr" | "detecting" | "review" | "saving";

interface Props {
  onConfirm: (data: {
    subjectId:  string; topicId: string; subtopicId: string;
    title: string; rawText: string; aiSummary: string; aiConcepts: Concept[];
    dueDate: Date | null;
  }) => void;
  onClose: () => void;
}

function ProgressStep({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
        done   ? "bg-emerald-500/20 border border-emerald-500/30" :
        active ? "bg-indigo-500/20  border border-indigo-500/40 ring-2 ring-indigo-500/20" :
                 "bg-white/[0.04]   border border-white/[0.08]"
      }`}>
        {done
          ? <CheckCircle2 size={11} className="text-emerald-400" />
          : active
            ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <Sparkles size={9} className="text-indigo-400" />
              </motion.div>
            : <div className="w-2 h-2 rounded-full bg-white/10" />
        }
      </div>
      <span className={`text-[10px] font-medium transition-colors ${
        done ? "text-emerald-400" : active ? "text-white/75" : "text-white/25"
      }`}>{label}</span>
    </div>
  );
}

export default function ImportHomeworkModal({ onConfirm, onClose }: Props) {
  const { subjects } = useSubjectsStore();

  const [step,         setStep]        = useState<Step>("upload");
  const [fileName,     setFileName]    = useState("");
  const [rawText,      setRawText]     = useState("");
  const [summary,      setSummary]     = useState("");
  const [concepts,     setConcepts]    = useState<Concept[]>([]);
  const [subjectId,    setSubjectId]   = useState("");
  const [topicId,      setTopicId]     = useState("");
  const [subtopicId,   setSubtopicId]  = useState("");
  const [title,        setTitle]       = useState("");
  const [dueDate,      setDueDate]     = useState("");
  const [dragOver,     setDragOver]    = useState(false);
  const [confidence,   setConfidence]  = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const activeSubject  = subjects.find(s => s.id === subjectId);
  const activeTopic    = activeSubject?.topics.find(t => t.id === topicId);


  const processFile = async (file: File) => {
    setFileName(file.name);
    setStep("ocr");

    const text = await ocrExtractMock(file.name);
    setRawText(text);
    setStep("detecting");

    const { subjectId: detSubj, confidence: conf } = await detectSubjectMock(text);
    const { topicId: detTopic } = await detectTopicMock(text, detSubj);

    setSubjectId(detSubj);
    setTopicId(detTopic);
    setConfidence(conf);

    const detSubject = subjects.find(s => s.id === detSubj);
    const sum = await generateSummaryFromNotesMock(text, detSubject?.name ?? "Subject");
    const cons = await extractConceptsFromNotesMock(text, `hw-${Date.now()}`);
    setSummary(sum);
    setConcepts(cons);
    setTitle(file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));

    // Pick first subtopic of detected topic
    const detTopicObj = detSubject?.topics.find(t => t.id === detTopic);
    if (detTopicObj?.subtopics[0]) setSubtopicId(detTopicObj.subtopics[0].id);

    setStep("review");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0]; if (f) processFile(f);
  };

  const handleSave = () => {
    setStep("saving");
    setTimeout(() => {
      onConfirm({
        subjectId, topicId, subtopicId,
        title: title.trim() || fileName,
        rawText, aiSummary: summary, aiConcepts: concepts,
        dueDate: dueDate ? new Date(dueDate) : null,
      });
    }, 500);
  };

  const isProcessing = step === "ocr" || step === "detecting";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative w-full max-w-md flex flex-col rounded-3xl border border-white/[0.08] bg-[#0f1117] overflow-hidden max-h-[88vh]"
          style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.75), 0 1px 0 rgba(255,255,255,0.06) inset" }}
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{   opacity: 0, scale: 0.94,  y: 12 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="absolute top-0 left-5 right-5 h-[2px] rounded-b-full bg-gradient-to-r from-amber-500 to-orange-500 opacity-70" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <div>
              <h3 className="text-[14px] font-bold text-white/90">Import Homework</h3>
              <p className="text-[10px] text-white/35 mt-0.5">Photo, PDF, or scan</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-xl bg-white/[0.05] flex items-center justify-center hover:bg-white/10 transition-colors">
              <X size={12} className="text-white/40" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-5 flex flex-col gap-4">
            <AnimatePresence mode="wait">

              {/* Upload */}
              {step === "upload" && (
                <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
                  <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />

                  <motion.div
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    animate={{ borderColor: dragOver ? "rgba(245,158,11,0.6)" : "rgba(255,255,255,0.10)" }}
                    className="rounded-2xl border-2 border-dashed p-10 flex flex-col items-center gap-4 cursor-pointer hover:border-amber-500/40 transition-colors"
                    style={{ background: "rgba(245,158,11,0.03)" }}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                      <Upload size={20} className="text-amber-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-[13px] font-semibold text-white/65">Drop homework here or tap to upload</p>
                      <p className="text-[10px] text-white/25 mt-1">Photo · PDF · Scan</p>
                    </div>
                  </motion.div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: <Camera size={13} className="text-amber-400" />,  label: "Photo",  sub: "Camera shot" },
                      { icon: <Image  size={13} className="text-sky-400"   />,  label: "Image",  sub: "JPG / PNG" },
                      { icon: <FileText size={13} className="text-violet-400" />, label: "PDF",  sub: "Scan or file" },
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

              {/* Processing */}
              {isProcessing && (
                <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 py-4">
                  <div className="flex flex-col gap-2.5">
                    <ProgressStep label="Extract text (OCR)" done={step === "detecting"} active={step === "ocr"} />
                    <ProgressStep label="Detect subject & topic" done={false} active={step === "detecting"} />
                    <ProgressStep label="Generate summary & concepts" done={false} active={false} />
                  </div>
                  <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                      initial={{ width: "0%" }}
                      animate={{ width: step === "ocr" ? "35%" : "70%" }}
                      transition={{ duration: 1.8, ease: "easeOut" }}
                    />
                  </div>
                  <p className="text-[11px] text-white/35 text-center">
                    {step === "ocr" ? "Reading your homework…" : "Identifying subject and topic…"}
                  </p>
                </motion.div>
              )}

              {/* Review */}
              {step === "review" && (
                <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">

                  {/* Detection badge */}
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-[11px] font-semibold text-emerald-300">Subject detected — {confidence}% confidence</p>
                      <p className="text-[9px] text-emerald-400/60">{activeSubject?.name} · {activeTopic?.title}</p>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="flex flex-col gap-1">
                    <SectionLabel>Title</SectionLabel>
                    <input value={title} onChange={e => setTitle(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-[12px] font-semibold text-white/80 outline-none focus:border-amber-500/40 transition-colors" />
                  </div>

                  {/* Due date */}
                  <div className="flex flex-col gap-1">
                    <SectionLabel>Due date (optional)</SectionLabel>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-[11px] text-white/55 outline-none focus:border-amber-500/40 transition-colors" />
                  </div>

                  {/* Subject / topic overrides */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <SectionLabel>Subject</SectionLabel>
                      <select value={subjectId} onChange={e => setSubjectId(e.target.value)}
                        className="bg-[#0a0b10] border border-white/[0.08] rounded-xl px-2.5 py-2 text-[11px] text-white/60 outline-none">
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <SectionLabel>Topic</SectionLabel>
                      <select value={topicId} onChange={e => { setTopicId(e.target.value); setSubtopicId(""); }}
                        className="bg-[#0a0b10] border border-white/[0.08] rounded-xl px-2.5 py-2 text-[11px] text-white/60 outline-none">
                        {activeSubject?.topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Subtopic */}
                  <div className="flex flex-col gap-1">
                    <SectionLabel>Subtopic</SectionLabel>
                    <select value={subtopicId} onChange={e => setSubtopicId(e.target.value)}
                      className="w-full bg-[#0a0b10] border border-white/[0.08] rounded-xl px-2.5 py-2 text-[11px] text-white/60 outline-none">
                      <option value="">— select subtopic —</option>
                      {activeTopic?.subtopics.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                  </div>

                  {/* AI Summary preview */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={10} className="text-violet-400" />
                      <SectionLabel className="text-violet-400/70">AI Summary</SectionLabel>
                    </div>
                    <div className="p-3 rounded-xl bg-violet-500/05 border border-violet-500/10 text-[10px] text-white/55 leading-relaxed line-clamp-3">
                      {summary}
                    </div>
                  </div>

                  {/* Concept count */}
                  <div className="flex items-center gap-2">
                    <Brain size={10} className="text-emerald-400" />
                    <SectionLabel className="text-emerald-400/70">{concepts.length} concepts extracted</SectionLabel>
                    <div className="flex flex-wrap gap-1 ml-1">
                      {concepts.slice(0, 2).map(c => (
                        <span key={c.id} className="text-[8px] text-white/30 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded-full truncate max-w-[120px]">
                          {c.text.split(" ").slice(0, 4).join(" ")}…
                        </span>
                      ))}
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSave}
                    disabled={!subjectId || !topicId}
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-white text-[12px] font-bold transition-colors"
                  >
                    <Save size={13} /> Save Homework
                  </motion.button>
                </motion.div>
              )}

              {/* Saving */}
              {step === "saving" && (
                <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-8">
                  <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
                    <CheckCircle2 size={40} className="text-emerald-400" />
                  </motion.div>
                  <p className="text-[13px] font-semibold text-white/75">Homework saved!</p>
                  <p className="text-[10px] text-white/30">{concepts.length} concepts ready to study</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}