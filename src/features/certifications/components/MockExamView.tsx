/* ══════════════════════════════════════════════════════════════
   MockExamView — timed exam session pulling from linked cards
   Uses mock transcript engine from cardsStore cards
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Clock, CheckCircle2, XCircle, Brain,
  AlertTriangle, BarChart3, Trophy, Flame,
} from "lucide-react";
import type { Certification } from "../certificationsStore";
import type { CognitiveCardData, Concept } from "../../cards/types";
import type { MockExamConfig } from "./MockExamConfigModal";
import SectionLabel from "../../cards/components/shared/SectionLabel";

// ── Types ──────────────────────────────────────────────────────────

interface ExamQuestion {
  id:           string;
  cardId:       string;
  cardTitle:    string;
  concept:      Concept;
  userAnswer:   string;
  hit:          boolean | null;
  timeUsed:     number;
}

type ExamPhase = "intro" | "question" | "results";

// ── Helpers ────────────────────────────────────────────────────────

function buildQuestions(
  cert: Certification,
  cards: CognitiveCardData[],
  config: MockExamConfig,
): ExamQuestion[] {
  const cardMap = new Map(cards.map(c => [c.id, c]));

  const pool: ExamQuestion[] = [];

  for (const sec of cert.syllabus) {
    if (!config.includedSections.includes(sec.id)) continue;
    for (const ref of sec.chapters) {
      const card = cardMap.get(ref.sourceId);
      if (!card) continue;
      for (const concept of card.concepts) {
        pool.push({
          id:         `q-${card.id}-${concept.id}`,
          cardId:     card.id,
          cardTitle:  ref.title,
          concept,
          userAnswer: "",
          hit:        null,
          timeUsed:   0,
        });
      }
    }
  }

  // Shuffle + limit
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, config.questionCount);
}

function scoreColor(pct: number) {
  if (pct >= 80) return "text-emerald-400";
  if (pct >= 55) return "text-amber-400";
  return "text-red-400";
}

// ── Timer bar ──────────────────────────────────────────────────────

function TimerBar({ remaining, total }: { remaining: number; total: number }) {
  const pct = (remaining / total) * 100;
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
        <SectionLabel>{Math.round(pct)}% time remaining</SectionLabel>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Question card ──────────────────────────────────────────────────

function QuestionCard({
  question, index, total,
  onAnswer,
}: {
  question:  ExamQuestion;
  index:     number;
  total:     number;
  onAnswer:  (answer: string, hit: boolean) => void;
}) {
  const [text,     setText]     = useState("");
  const [revealed, setRevealed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText("");
    setRevealed(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [question.id]);

  const submit = () => {
    if (!text.trim()) return;
    // Lightweight keyword matching (mirrors testStore logic)
    const lower  = text.toLowerCase();
    const hit    = question.concept.keywords.some(kw => lower.includes(kw.toLowerCase()));
    setRevealed(true);
    setTimeout(() => onAnswer(text, hit), 900);
  };

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, x: 20  }}
      animate={{ opacity: 1, x:  0  }}
      exit={{   opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-4"
    >
      {/* Progress */}
      <div className="flex items-center justify-between">
        <SectionLabel>Question {index + 1} of {total}</SectionLabel>
        <div className="flex gap-0.5">
          {Array.from({ length: total }, (_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all ${
              i < index   ? "w-3 bg-indigo-500" :
              i === index ? "w-4 bg-indigo-400" :
                            "w-2 bg-white/[0.08]"
            }`} />
          ))}
        </div>
      </div>

      {/* Chapter badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
        <Brain size={10} className="text-indigo-400 shrink-0" />
        <span className="text-[10px] text-white/40 truncate">{question.cardTitle}</span>
      </div>

      {/* Concept prompt */}
      <div
        className="relative p-4 rounded-2xl border border-white/[0.08] bg-[#13151c]"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05) inset" }}
      >
        <div className="absolute top-0 left-4 right-4 h-[2px] rounded-b-full bg-indigo-500/30" />
        <p className="text-[12px] font-semibold text-white/80 leading-relaxed">
          Explain the concept:
        </p>
        <p className="mt-2 text-[14px] font-bold text-white/90 leading-snug">
          "{question.concept.text}"
        </p>
        <div className="mt-2 flex items-center gap-2">
          <SectionLabel className="text-white/20">Difficulty {question.concept.difficulty}</SectionLabel>
          <SectionLabel className="text-white/20">·</SectionLabel>
          <SectionLabel className="text-white/20">Weight {question.concept.weight}×</SectionLabel>
        </div>
      </div>

      {/* Answer textarea */}
      <div className="relative">
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
              ? "border-white/[0.04] opacity-60"
              : "border-white/[0.08] focus:border-indigo-500/40"
          }`}
        />
        {revealed && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl">
            {/* handled by fade-out above */}
          </div>
        )}
      </div>

      {/* Feedback overlay */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-3 p-3 rounded-2xl border ${
              text && question.concept.keywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()))
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-red-500/10 border-red-500/20"
            }`}
          >
            {text && question.concept.keywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()))
              ? <><CheckCircle2 size={14} className="text-emerald-400 shrink-0" /><p className="text-[11px] text-emerald-300">Correct — keywords detected</p></>
              : <><XCircle     size={14} className="text-red-400 shrink-0"     /><p className="text-[11px] text-red-300">Missed — concept not covered</p></>
            }
          </motion.div>
        )}
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
    </motion.div>
  );
}

// ── Results view ───────────────────────────────────────────────────

function ResultsView({
  questions, config, cert, onRetry, onDone,
}: {
  questions: ExamQuestion[];
  config:    MockExamConfig;
  cert:      Certification;
  onRetry:   () => void;
  onDone:    () => void;
}) {
  const answered = questions.filter(q => q.hit !== null);
  const hits     = answered.filter(q => q.hit === true);
  const misses   = answered.filter(q => q.hit === false);
  const score    = answered.length === 0 ? 0 : Math.round((hits.length / answered.length) * 100);
  const label    = score >= 80 ? "Exam Ready" : score >= 60 ? "Good Progress" : "Needs More Study";

  return (
    <div className="flex flex-col gap-5">
      {/* Hero score */}
      <div
        className="relative flex flex-col items-center gap-3 p-6 rounded-2xl border border-white/[0.06]"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(0,0,0,0) 70%)" }}
      >
        <div className="absolute top-0 left-4 right-4 h-[2px] rounded-b-full bg-gradient-to-r from-amber-500 to-orange-500 opacity-60" />
        <Trophy size={28} className="text-amber-400" />
        <div className="text-center">
          <span className={`text-[42px] font-black leading-none ${scoreColor(score)}`}>{score}%</span>
          <p className="text-[12px] font-bold text-white/60 mt-1">{label}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 w-full mt-1">
          {[
            { label: "Answered", value: String(answered.length), icon: <Brain size={10} className="text-indigo-400" /> },
            { label: "Correct",  value: String(hits.length),    icon: <CheckCircle2 size={10} className="text-emerald-400" /> },
            { label: "Missed",   value: String(misses.length),  icon: <XCircle size={10} className="text-red-400" /> },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              {s.icon}
              <span className="text-[14px] font-black text-white/85">{s.value}</span>
              <SectionLabel>{s.label}</SectionLabel>
            </div>
          ))}
        </div>
      </div>

      {/* Missed concepts */}
      {misses.length > 0 && (
        <div className="p-4 rounded-2xl border border-red-500/15 bg-red-950/15">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={11} className="text-red-400" />
            <SectionLabel className="text-red-400/80">Missed concepts — study these</SectionLabel>
          </div>
          <div className="flex flex-col gap-1.5">
            {misses.map(q => (
              <div key={q.id} className="flex items-start gap-2 px-2.5 py-2 rounded-xl bg-white/[0.03] border border-red-500/10">
                <XCircle size={9} className="text-red-400/60 mt-0.5 shrink-0" />
                <span className="text-[11px] text-white/60 leading-snug">{q.concept.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correct concepts */}
      {hits.length > 0 && (
        <div className="p-4 rounded-2xl border border-emerald-500/15 bg-emerald-950/10">
          <div className="flex items-center gap-2 mb-3">
            <Flame size={11} className="text-emerald-400" />
            <SectionLabel className="text-emerald-400/80">Strong concepts</SectionLabel>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {hits.map(q => (
              <span key={q.id} className="text-[9px] text-emerald-300/60 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded-full">
                {q.concept.text.split(" ").slice(0, 5).join(" ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Score bar by question */}
      <div className="p-4 rounded-2xl border border-white/[0.06] bg-[#0f1117]">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={11} className="text-white/30" />
          <SectionLabel>Question breakdown</SectionLabel>
        </div>
        <div className="flex gap-1">
          {questions.map((q, i) => (
            <div
              key={q.id}
              className="flex-1 h-6 rounded-sm transition-all"
              style={{ background: q.hit === true ? "#10b981" : q.hit === false ? "#ef4444" : "rgba(255,255,255,0.06)" }}
              title={`Q${i + 1}: ${q.hit === true ? "Correct" : q.hit === false ? "Missed" : "Skipped"}`}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onRetry}
          className="flex-1 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-white/55 text-[11px] font-bold hover:text-white/75 transition-colors"
        >
          Retry Exam
        </button>
        <button
          onClick={onDone}
          className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-colors"
        >
          Back to Cert
        </button>
      </div>
    </div>
  );
}

// ── Main MockExamView ───────────────────────────────────────────────

interface Props {
  cert:    Certification;
  cards:   CognitiveCardData[];
  config:  MockExamConfig;
  onBack:  () => void;
}

export default function MockExamView({ cert, cards, config, onBack }: Props) {
  const totalSeconds = config.timeLimitMinutes * 60;

  const [phase,      setPhase]     = useState<ExamPhase>("intro");
  const [questions,  setQuestions] = useState<ExamQuestion[]>([]);
  const [current,    setCurrent]   = useState(0);
  const [remaining,  setRemaining] = useState(totalSeconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startExam = () => {
    const qs = buildQuestions(cert, cards, config);
    setQuestions(qs);
    setCurrent(0);
    setRemaining(totalSeconds);
    setPhase("question");
  };

  const handleAnswer = (answer: string, hit: boolean) => {
    setQuestions(prev => prev.map((q, i) =>
      i === current ? { ...q, userAnswer: answer, hit } : q
    ));
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
    } else {
      clearInterval(timerRef.current!);
      setPhase("results");
    }
  };

  // Timer tick
  useEffect(() => {
    if (phase !== "question") return;
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

  const retry = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("intro");
  };

  // ── Intro ──
  if (phase === "intro") {
    const questionCount = buildQuestions(cert, cards, config).length || config.questionCount;
    return (
      <div className="flex flex-col gap-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/55 transition-colors w-fit">
          <ArrowLeft size={12} /> Back
        </button>

        <div
          className="relative p-5 rounded-2xl border border-amber-500/15 flex flex-col gap-4"
          style={{ background: "linear-gradient(135deg, rgba(217,119,6,0.07) 0%, rgba(0,0,0,0) 70%)" }}
        >
          <div className="absolute top-0 left-5 right-5 h-[2px] rounded-b-full bg-amber-500/40" />
          <div className="text-center">
            <Trophy size={32} className="text-amber-400 mx-auto mb-2" />
            <h3 className="text-[15px] font-bold text-white/90">Mock Exam</h3>
            <p className="text-[11px] text-white/40 mt-0.5">{cert.title}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Questions",   value: String(questionCount) },
              { label: "Time limit",  value: `${config.timeLimitMinutes} min` },
              { label: "Difficulty",  value: config.difficulty },
              { label: "Sections",    value: String(config.includedSections.length) },
            ].map(s => (
              <div key={s.label} className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-center">
                <p className="text-[13px] font-bold text-white/80">{s.value}</p>
                <SectionLabel>{s.label}</SectionLabel>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/35 text-center leading-relaxed">
            Answers are scored by keyword matching — type natural explanations of each concept. The timer starts when you begin.
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={startExam}
            className="py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-[13px] font-bold transition-colors"
          >
            Begin Exam
          </motion.button>
        </div>
      </div>
    );
  }

  // ── Question ──
  if (phase === "question" && questions[current]) {
    return (
      <div className="flex flex-col gap-4">
        <TimerBar remaining={remaining} total={totalSeconds} />
        <AnimatePresence mode="wait">
          <QuestionCard
            key={questions[current].id}
            question={questions[current]}
            index={current}
            total={questions.length}
            onAnswer={handleAnswer}
          />
        </AnimatePresence>
      </div>
    );
  }

  // ── Results ──
  return (
    <ResultsView
      questions={questions}
      config={config}
      cert={cert}
      onRetry={retry}
      onDone={onBack}
    />
  );
}
