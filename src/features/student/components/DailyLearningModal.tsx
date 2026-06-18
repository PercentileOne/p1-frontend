/* ══════════════════════════════════════════════════════════════
   DailyLearningModal — "What I Learned Today"
   Notes/photo → OCR → detect → summary → concepts → card
   ══════════════════════════════════════════════════════════════ */

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, CheckCircle2, Brain, Upload, Save, Smile, Meh, Frown } from "lucide-react";
import {
  ocrExtractMock, detectSubjectMock, detectTopicMock,
  generateSummaryFromNotesMock, extractConceptsFromNotesMock,
} from "../mockDetect";
import { useSubjectsStore } from "../subjectsStore";
import type { Concept } from "../../cards/types";
import type { DailyLearningEntry } from "../dailyLearningStore";
import SectionLabel from "../../cards/components/shared/SectionLabel";

type Step    = "input" | "processing" | "review" | "saving";
type Mood    = DailyLearningEntry["mood"];
type InputKind = "type" | "upload";

const MOOD_META: Record<Mood, { icon: React.ReactNode; label: string; color: string }> = {
  great: { icon: <Smile  size={16} />, label: "Got it!",    color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/25" },
  okay:  { icon: <Meh    size={16} />, label: "Sort of…",   color: "text-amber-400   bg-amber-500/15   border-amber-500/25"  },
  hard:  { icon: <Frown  size={16} />, label: "Struggled",  color: "text-red-400     bg-red-500/15     border-red-500/25"    },
};

interface Props {
  onConfirm: (data: Omit<DailyLearningEntry, "id">) => void;
  onClose:   () => void;
}

export default function DailyLearningModal({ onConfirm, onClose }: Props) {
  const { subjects } = useSubjectsStore();

  const [step,       setStep]      = useState<Step>("input");
  const [kind,       setKind]      = useState<InputKind>("type");
  const [notes,      setNotes]     = useState("");
  const [fileName,   setFileName]  = useState("");
  const [summary,    setSummary]   = useState("");
  const [concepts,   setConcepts]  = useState<Concept[]>([]);
  const [subjectId,  setSubjectId] = useState(subjects[0]?.id ?? "");
  const [topicId,    setTopicId]   = useState(subjects[0]?.topics[0]?.id ?? "");
  const [mood,       setMood]      = useState<Mood>("okay");
  const fileRef = useRef<HTMLInputElement>(null);

  const activeSubject = subjects.find(s => s.id === subjectId);
  const activeTopic   = activeSubject?.topics.find(t => t.id === topicId);

  const processText = async (text: string) => {
    setStep("processing");
    const { subjectId: detSubj } = await detectSubjectMock(text);
    const { topicId:   detTopic } = await detectTopicMock(text, detSubj);
    const detSubject = subjects.find(s => s.id === detSubj);
    const sum  = await generateSummaryFromNotesMock(text, detSubject?.name ?? activeSubject?.name ?? "Subject");
    const cons = await extractConceptsFromNotesMock(text, `dl-${Date.now()}`);
    setSummary(sum);
    setConcepts(cons);
    if (detSubj) setSubjectId(detSubj);
    if (detTopic) setTopicId(detTopic);
    setStep("review");
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const text = await ocrExtractMock(file.name);
    setNotes(text);
    await processText(text);
  };

  const handleProcess = () => {
    if (!notes.trim()) return;
    processText(notes);
  };

  const handleSave = () => {
    setStep("saving");
    const topicTitle = activeTopic?.title ?? "General";
    setTimeout(() => {
      onConfirm({
        date:        new Date(),
        subjectId,
        subjectName: activeSubject?.name ?? "Subject",
        topicId,
        topicTitle,
        rawNotes:    notes,
        summary,
        concepts,
        mood,
      });
    }, 400);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative w-full max-w-md flex flex-col rounded-3xl border border-white/[0.08] bg-[#0f1117] overflow-hidden max-h-[90vh]"
          style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.75), 0 1px 0 rgba(255,255,255,0.06) inset" }}
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{   opacity: 0, scale: 0.94,  y: 12 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="absolute top-0 left-5 right-5 h-[2px] rounded-b-full bg-gradient-to-r from-indigo-500 to-violet-500 opacity-70" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <div>
              <h3 className="text-[14px] font-bold text-white/90">What I Learned Today</h3>
              <p className="text-[10px] text-white/35 mt-0.5">Log today's lesson — build your knowledge base</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-xl bg-white/[0.05] flex items-center justify-center hover:bg-white/10 transition-colors">
              <X size={12} className="text-white/40" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-5 flex flex-col gap-4">
            <AnimatePresence mode="wait">

              {/* Input step */}
              {step === "input" && (
                <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">

                  {/* Subject + topic */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <SectionLabel>Subject</SectionLabel>
                      <select value={subjectId} onChange={e => setSubjectId(e.target.value)}
                        className="bg-[#0a0b10] border border-white/[0.08] rounded-xl px-2.5 py-2 text-[11px] text-white/60 outline-none">
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <SectionLabel>Topic</SectionLabel>
                      <select value={topicId} onChange={e => setTopicId(e.target.value)}
                        className="bg-[#0a0b10] border border-white/[0.08] rounded-xl px-2.5 py-2 text-[11px] text-white/60 outline-none">
                        {activeSubject?.topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Input kind toggle */}
                  <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    {(["type","upload"] as InputKind[]).map(k => (
                      <button
                        key={k}
                        onClick={() => setKind(k)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                          kind === k ? "bg-indigo-600 text-white" : "text-white/35 hover:text-white/55"
                        }`}
                      >
                        {k === "type" ? "✍️ Type notes" : "📷 Upload photo"}
                      </button>
                    ))}
                  </div>

                  {kind === "type" ? (
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Write what you learned today… key terms, examples, things that confused you, teacher explanations…"
                      rows={6}
                      className="w-full resize-none bg-white/[0.04] border border-white/[0.08] rounded-2xl px-3.5 py-3 text-[12px] text-white/75 placeholder-white/20 outline-none focus:border-indigo-500/40 transition-colors"
                    />
                  ) : (
                    <div>
                      <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                      <motion.div
                        onClick={() => fileRef.current?.click()}
                        className="rounded-2xl border-2 border-dashed border-white/[0.10] hover:border-indigo-500/40 p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors"
                        style={{ background: "rgba(99,102,241,0.03)" }}
                      >
                        <Upload size={24} className="text-indigo-400/60" />
                        <p className="text-[11px] text-white/40">Tap to upload notes photo or PDF</p>
                        {fileName && <p className="text-[9px] text-indigo-400/70">{fileName} ✓</p>}
                      </motion.div>
                    </div>
                  )}

                  {/* Mood */}
                  <div className="flex flex-col gap-1.5">
                    <SectionLabel>How did today's lesson feel?</SectionLabel>
                    <div className="flex gap-2">
                      {(Object.entries(MOOD_META) as [Mood, typeof MOOD_META[Mood]][]).map(([m, meta]) => (
                        <button
                          key={m}
                          onClick={() => setMood(m)}
                          className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all ${
                            mood === m ? meta.color : "text-white/20 bg-white/[0.03] border-white/[0.06]"
                          }`}
                        >
                          {meta.icon}
                          <span className="text-[9px] font-semibold">{meta.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleProcess}
                    disabled={kind === "type" && !notes.trim()}
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white text-[12px] font-bold transition-colors"
                  >
                    <Sparkles size={13} /> Generate Summary & Concepts
                  </motion.button>
                </motion.div>
              )}

              {/* Processing */}
              {step === "processing" && (
                <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-5 py-8">
                  <div className="relative w-16 h-16">
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-indigo-500/30 border-t-indigo-400"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="absolute inset-2 rounded-full bg-indigo-600/15 flex items-center justify-center">
                      <Brain size={16} className="text-indigo-400" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-semibold text-white/75">Analysing your notes…</p>
                    <p className="text-[10px] text-white/30 mt-1">Extracting key concepts</p>
                  </div>
                  <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                      initial={{ width: "0%" }}
                      animate={{ width: "85%" }}
                      transition={{ duration: 2.5, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>
              )}

              {/* Review */}
              {step === "review" && (
                <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    <p className="text-[11px] font-semibold text-emerald-300">
                      {activeSubject?.name} · {activeTopic?.title} · {concepts.length} concepts
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={10} className="text-violet-400" />
                      <SectionLabel className="text-violet-400/70">Summary</SectionLabel>
                    </div>
                    <div className="p-3 rounded-xl bg-violet-500/05 border border-violet-500/10 text-[10px] text-white/55 leading-relaxed">
                      {summary.replace(/\*\*([^*]+)\*\*/g, "$1").slice(0, 260)}…
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <Brain size={10} className="text-emerald-400" />
                      <SectionLabel className="text-emerald-400/70">Concepts ({concepts.length})</SectionLabel>
                    </div>
                    <div className="flex flex-col gap-1">
                      {concepts.map(c => (
                        <div key={c.id} className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                          <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                          <span className="text-[10px] text-white/55 leading-snug">{c.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mood reminder */}
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <span className="text-[14px]">{mood === "great" ? "😊" : mood === "okay" ? "😐" : "😓"}</span>
                    <span className="text-[10px] text-white/40">{MOOD_META[mood].label} — logged</span>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSave}
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-bold transition-colors"
                  >
                    <Save size={13} /> Save Today's Learning
                  </motion.button>
                </motion.div>
              )}

              {/* Saving */}
              {step === "saving" && (
                <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-8">
                  <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
                    <CheckCircle2 size={40} className="text-emerald-400" />
                  </motion.div>
                  <p className="text-[13px] font-semibold text-white/75">Learning logged! 🎉</p>
                  <p className="text-[10px] text-white/30">Your concepts are ready to study</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
