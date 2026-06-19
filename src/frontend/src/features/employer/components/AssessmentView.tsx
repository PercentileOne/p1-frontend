/* ══════════════════════════════════════════════════════════════
   AssessmentView — multi-section timed exam with concept scoring
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Clock, CheckCircle2, XCircle, Brain,
  Trophy, AlertTriangle, Flame, ChevronRight, BarChart3,
} from "lucide-react";
import type { Assessment, AssessmentSection, AssessmentResult } from "../employerStore";
import type { Concept } from "../../cards/types";
import SectionLabel from "../../cards/components/shared/SectionLabel";

// ── Per-concept question ──────────────────────────────────────────

interface Question {
  sectionId:  string;
  sectionTitle: string;
  concept:    Concept;
  answer:     string;
  hit:        boolean | null;
}

function buildQuestions(sections: AssessmentSection[]): Question[] {
  return sections.flatMap(sec =>
    sec.concepts.map(c => ({
      sectionId:    sec.id,
      sectionTitle: sec.title,
      concept:      c,
      answer:       "",
      hit:          null,
    }))
  );
}

function scoreColor(n: number) {
  return n >= 80 ? "text-emerald-400" : n >= 60 ? "text-amber-400" : "text-red-400";
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

// ── Timer bar ──────────────────────────────────────────────────────

function TimerBar({ remaining, total }: { remaining: number; total: number }) {
  const pct   = (remaining / total) * 100;
  const color = pct > 50 ? "#6366f1" : pct > 20 ? "#f59e0b" : "#ef4444";
  const mins  = Math.floor(remaining / 60);
  const secs  = remaining % 60;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock size={10} className="text-white/40" />
          <span className="text-[10px] font-mono text-white/55">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </span>
        </div>
        <SectionLabel>{Math.round(pct)}% remaining</SectionLabel>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Section progress ──────────────────────────────────────────────

function SectionProgress({
  sections, currentSectionId, questionIdx, totalQuestions,
}: {
  sections: AssessmentSection[];
  currentSectionId: string;
  questionIdx: number;
  totalQuestions: number;
}) {
  return (
    <div className="flex items-center gap-1">
      {sections.map((sec, i) => {
        const isCurrent = sec.id === currentSectionId;
        const isPast    = sections.findIndex(s => s.id === currentSectionId) > i;
        return (
          <div key={sec.id} className="flex items-center gap-1 flex-1 min-w-0">
            <div className={`flex-1 h-1.5 rounded-full transition-all ${
              isPast    ? "bg-indigo-500" :
              isCurrent ? "bg-indigo-400" :
                          "bg-white/[0.08]"
            }`} />
            {i < sections.length - 1 && <ChevronRight size={8} className="text-white/15 shrink-0" />}
          </div>
        );
      })}
      <SectionLabel className="ml-2 shrink-0">{questionIdx + 1}/{totalQuestions}</SectionLabel>
    </div>
  );
}

// ── Results screen ────────────────────────────────────────────────

function ResultsScreen({
  questions, assessment, timeUsed, onDone,
}: {
  questions:  Question[];
  assessment: Assessment;
  timeUsed:   number;
  onDone:     (result: Omit<AssessmentResult, "userId" | "userName" | "userInitials" | "userAccent" | "date">) => void;
}) {
  const answered = questions.filter(q => q.hit !== null);
  const hits     = answered.filter(q => q.hit === true);
  const misses   = answered.filter(q => q.hit === false);
  const score    = answered.length === 0 ? 0 : Math.round((hits.length / answered.length) * 100);

  // Per-section scores
  const sectionScores = assessment.sections.map(sec => {
    const qs    = answered.filter(q => q.sectionId === sec.id);
    const secHits = qs.filter(q => q.hit).length;
    return {
      sectionId: sec.id,
      score:     qs.length === 0 ? 0 : Math.round((secHits / qs.length) * 100),
    };
  });

  const weakConcepts:   Concept[] = misses.map(q => q.concept);
  const strongConcepts: Concept[] = hits.map(q => q.concept);

  useEffect(() => {
    // Auto-fire after a brief display delay so parent can save
    const t = setTimeout(() => {
      onDone({ score, sectionScores, timeUsed, weakConcepts, strongConcepts });
    }, 200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const label = score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 50 ? "Developing" : "Needs Work";

  return (
    <div className="flex flex-col gap-5">

      {/* Hero score */}
      <div
        className="relative flex flex-col items-center gap-4 p-6 rounded-2xl border border-white/[0.06]"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(0,0,0,0) 70%)" }}
      >
        <div className="absolute top-0 left-4 right-4 h-[2px] rounded-b-full bg-gradient-to-r from-indigo-500 to-violet-500 opacity-60" />
        <Trophy size={28} className="text-amber-400" />
        <div className="text-center">
          <motion.span
            className={`text-[40px] font-black leading-none ${scoreColor(score)}`}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
          >
            {score}%
          </motion.span>
          <p className="text-[12px] font-bold text-white/55 mt-1">{label}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 w-full">
          {[
            { icon: <Brain size={10} className="text-indigo-400" />,    label: "Questions", value: String(answered.length) },
            { icon: <CheckCircle2 size={10} className="text-emerald-400" />, label: "Correct", value: String(hits.length)  },
            { icon: <Clock size={10} className="text-sky-400" />,        label: "Time",      value: fmt(timeUsed)          },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              {s.icon}
              <span className="text-[13px] font-bold text-white/80">{s.value}</span>
              <SectionLabel>{s.label}</SectionLabel>
            </div>
          ))}
        </div>
      </div>

      {/* Per-section breakdown */}
      <div className="p-4 rounded-2xl border border-white/[0.06] bg-[#0f1117] flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={11} className="text-white/30" />
          <SectionLabel>Section breakdown</SectionLabel>
        </div>
        {sectionScores.map((ss, i) => {
          const sec = assessment.sections.find(s => s.id === ss.sectionId);
          const color = ss.score >= 80 ? "#10b981" : ss.score >= 60 ? "#f59e0b" : "#ef4444";
          return (
            <div key={ss.sectionId} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/65">{sec?.title ?? `Section ${i + 1}`}</span>
                <span className="text-[10px] font-bold" style={{ color }}>{ss.score}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${ss.score}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Missed */}
      {weakConcepts.length > 0 && (
        <div className="p-4 rounded-2xl border border-red-500/15 bg-red-950/15 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={11} className="text-red-400" />
            <SectionLabel className="text-red-400/80">Focus these concepts</SectionLabel>
          </div>
          {weakConcepts.map(c => (
            <div key={c.id} className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-red-500/10">
              <XCircle size={9} className="text-red-400/50 mt-0.5 shrink-0" />
              <span className="text-[10px] text-white/55 leading-snug">{c.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Strong */}
      {strongConcepts.length > 0 && (
        <div className="p-4 rounded-2xl border border-emerald-500/15 bg-emerald-950/10 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Flame size={11} className="text-emerald-400" />
            <SectionLabel className="text-emerald-400/80">Strong areas</SectionLabel>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {strongConcepts.map(c => (
              <span key={c.id} className="text-[9px] text-emerald-300/60 bg-emerald-500/08 border border-emerald-500/12 px-2 py-0.5 rounded-full">
                {c.text.split(" ").slice(0, 5).join(" ")}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main AssessmentView ───────────────────────────────────────────

type Phase = "intro" | "exam" | "results";

interface Props {
  assessment:  Assessment;
  onBack:      () => void;
  onComplete:  (result: Omit<AssessmentResult, "userId" | "userName" | "userInitials" | "userAccent" | "date">) => void;
}

const SECTION_TIME = 300; // 5 min per section

export default function AssessmentView({ assessment, onBack, onComplete }: Props) {
  const totalTime = assessment.sections.length * SECTION_TIME;

  const [phase,     setPhase]     = useState<Phase>("intro");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current,   setCurrent]   = useState(0);
  const [remaining, setRemaining] = useState(totalTime);
  const [startTime, setStartTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startExam = () => {
    const qs = buildQuestions(assessment.sections);
    setQuestions(qs);
    setCurrent(0);
    setRemaining(totalTime);
    setStartTime(Date.now());
    setPhase("exam");
  };

  useEffect(() => {
    if (phase !== "exam") return;
    timerRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(timerRef.current!);
          setPhase("results");
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase]);

  const handleAnswer = (answer: string, hit: boolean) => {
    setQuestions(prev => prev.map((q, i) =>
      i === current ? { ...q, answer, hit } : q
    ));
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
    } else {
      clearInterval(timerRef.current!);
      setPhase("results");
    }
  };

  // ── Intro ──
  if (phase === "intro") {
    const totalConcepts = assessment.sections.reduce((s, sec) => s + sec.concepts.length, 0);
    return (
      <div className="flex flex-col gap-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/55 transition-colors w-fit">
          <ArrowLeft size={12} /> Back
        </button>
        <div
          className="relative p-5 rounded-2xl border border-indigo-500/15 flex flex-col gap-4"
          style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.07) 0%, rgba(0,0,0,0) 70%)" }}
        >
          <div className="absolute top-0 left-5 right-5 h-[2px] rounded-b-full bg-indigo-500/40" />
          <div className="text-center">
            <Trophy size={28} className="text-indigo-400 mx-auto mb-2" />
            <h3 className="text-[15px] font-bold text-white/90">{assessment.title}</h3>
            <p className="text-[10px] text-white/40 mt-1">{assessment.description}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Sections",  value: String(assessment.sections.length) },
              { label: "Concepts",  value: String(totalConcepts) },
              { label: "Time",      value: `${Math.round(totalTime / 60)}m` },
            ].map(s => (
              <div key={s.label} className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-center">
                <p className="text-[13px] font-bold text-white/80">{s.value}</p>
                <SectionLabel>{s.label}</SectionLabel>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            {assessment.sections.map((sec, i) => (
              <div key={sec.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <span className="text-[9px] font-mono text-white/20 w-4">{i + 1}</span>
                <span className="flex-1 text-[11px] text-white/65">{sec.title}</span>
                <span className="text-[9px] text-white/30">{sec.concepts.length} concepts</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/30 text-center">Type keyword-rich answers — the engine detects concept terms automatically.</p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={startExam}
            className="py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-bold transition-colors"
          >
            Begin Assessment
          </motion.button>
        </div>
      </div>
    );
  }

  // ── Exam ──
  if (phase === "exam" && questions[current]) {
    const q = questions[current];
    const currentSection = assessment.sections.find(s => s.id === q.sectionId);

    return (
      <QuestionExamView
        question={q}
        questionIndex={current}
        totalQuestions={questions.length}
        sections={assessment.sections}
        remaining={remaining}
        totalTime={totalTime}
        currentSection={currentSection}
        onAnswer={handleAnswer}
      />
    );
  }

  // ── Results ──
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  return (
    <ResultsScreen
      questions={questions}
      assessment={assessment}
      timeUsed={elapsed}
      onDone={onComplete}
    />
  );
}

// ── QuestionExamView (extracted to avoid hook-in-conditional) ─────

function QuestionExamView({
  question, questionIndex, totalQuestions,
  sections, remaining, totalTime, currentSection, onAnswer,
}: {
  question:        Question;
  questionIndex:   number;
  totalQuestions:  number;
  sections:        AssessmentSection[];
  remaining:       number;
  totalTime:       number;
  currentSection?: AssessmentSection;
  onAnswer:        (answer: string, hit: boolean) => void;
}) {
  const [text,     setText]     = useState("");
  const [revealed, setRevealed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset on question change
  useEffect(() => {
    setText("");
    setRevealed(false);
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [question.concept.id]);

  const submit = () => {
    if (!text.trim()) return;
    const lower = text.toLowerCase();
    const hit   = question.concept.keywords.some(kw => lower.includes(kw.toLowerCase()));
    setRevealed(true);
    setTimeout(() => onAnswer(text, hit), 850);
  };

  return (
    <div className="flex flex-col gap-4">
      <TimerBar remaining={remaining} total={totalTime} />
      <SectionProgress
        sections={sections}
        currentSectionId={question.sectionId}
        questionIdx={questionIndex}
        totalQuestions={totalQuestions}
      />

      {/* Section badge */}
      {currentSection && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          <Brain size={10} className="text-indigo-400 shrink-0" />
          <span className="text-[10px] text-white/40">{currentSection.title}</span>
          <span className="ml-auto text-[8px] text-white/20 capitalize">{currentSection.difficulty}</span>
        </div>
      )}

      {/* Concept prompt */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.concept.id}
          initial={{ opacity: 0, x: 16  }}
          animate={{ opacity: 1, x:  0  }}
          exit={{   opacity: 0, x: -16 }}
          transition={{ duration: 0.18 }}
          className="relative p-4 rounded-2xl border border-white/[0.08] bg-[#13151c]"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05) inset" }}
        >
          <div className="absolute top-0 left-4 right-4 h-[2px] rounded-b-full bg-indigo-500/30" />
          <p className="text-[11px] text-white/40 mb-2">Explain the concept:</p>
          <p className="text-[14px] font-bold text-white/90 leading-snug">"{question.concept.text}"</p>
          <div className="flex items-center gap-2 mt-2">
            <SectionLabel className="text-white/20">Difficulty {question.concept.difficulty}</SectionLabel>
            <SectionLabel className="text-white/20">·</SectionLabel>
            <SectionLabel className="text-white/20">Weight {question.concept.weight}×</SectionLabel>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Answer */}
      <textarea
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) submit(); }}
        disabled={revealed}
        placeholder="Type your answer… (Ctrl+Enter to submit)"
        rows={4}
        className={`w-full resize-none bg-[#0f1117] border rounded-2xl px-3.5 py-3 text-[12px] text-white/75 placeholder-white/20 outline-none transition-all ${
          revealed
            ? "border-white/[0.04] opacity-55"
            : "border-white/[0.08] focus:border-indigo-500/40"
        }`}
      />

      {/* Feedback */}
      <AnimatePresence>
        {revealed && (() => {
          const hit = question.concept.keywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`flex items-center gap-3 p-3 rounded-2xl border ${
                hit ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"
              }`}
            >
              {hit
                ? <><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /><p className="text-[11px] text-emerald-300">Correct — keywords detected</p></>
                : <><XCircle     size={14} className="text-red-400 shrink-0"     /><p className="text-[11px] text-red-300">Missed — concept not covered</p></>
              }
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {!revealed && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={submit}
          disabled={!text.trim()}
          className="py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white text-[12px] font-bold transition-colors"
        >
          Submit Answer
        </motion.button>
      )}
    </div>
  );
}
