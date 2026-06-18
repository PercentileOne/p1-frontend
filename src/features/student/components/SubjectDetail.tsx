/* ══════════════════════════════════════════════════════════════
   SubjectDetail — 4 tabs: Topics · Readiness · Homework · Daily
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Brain, Sparkles, CheckCircle2, AlertTriangle,
  Clock, BookOpen, Flame, ChevronRight, TrendingUp, Calendar,
  Smile, Meh, Frown, Check, XCircle,
} from "lucide-react";
import type { Subject, Subtopic } from "../subjectsStore";
import { computeStudentReadiness } from "../subjectsStore";
import type { HomeworkItem } from "../homeworkStore";
import type { DailyLearningEntry } from "../dailyLearningStore";
import SectionLabel from "../../cards/components/shared/SectionLabel";

type Tab = "topics" | "readiness" | "homework" | "daily";
const TABS: { key: Tab; label: string }[] = [
  { key: "topics",    label: "Topics"    },
  { key: "readiness", label: "Readiness" },
  { key: "homework",  label: "Homework"  },
  { key: "daily",     label: "Daily"     },
];

// ── Readiness ring ────────────────────────────────────────────────

function SmallRing({ score, size = 40 }: { score: number; size?: number }) {
  const r    = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const color = score >= 75 ? "#10b981" : score >= 55 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - score / 100) }}
        transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
      />
    </svg>
  );
}

// ── Topics tab ────────────────────────────────────────────────────

function TopicsTab({ subject, onStudy }: { subject: Subject; onStudy: (st: Subtopic) => void }) {
  const [openTopic, setOpenTopic] = useState<string | null>(subject.topics[0]?.id ?? null);

  return (
    <div className="flex flex-col gap-2">
      {subject.topics.map(topic => {
        const open = openTopic === topic.id;
        const avgScore = Math.round(topic.subtopics.reduce((s, st) => s + st.readinessScore, 0) / (topic.subtopics.length || 1));
        return (
          <div key={topic.id} className="rounded-2xl border border-white/[0.06] bg-[#0f1117] overflow-hidden">
            <button
              onClick={() => setOpenTopic(open ? null : topic.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-white/80">{topic.title}</p>
                <p className="text-[9px] text-white/30 mt-0.5">{topic.subtopics.length} subtopics</p>
              </div>
              <div className="relative shrink-0">
                <SmallRing score={avgScore} size={36} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[8px] font-black" style={{ color: avgScore >= 75 ? "#10b981" : avgScore >= 55 ? "#f59e0b" : "#ef4444" }}>{avgScore}</span>
                </div>
              </div>
              <ChevronRight size={11} className={`text-white/20 transition-transform shrink-0 ${open ? "rotate-90" : ""}`} />
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3 flex flex-col gap-2 border-t border-white/[0.05]">
                    {topic.subtopics.map(st => {
                      const score = st.readinessScore;
                      const color = score >= 75 ? "#10b981" : score >= 55 ? "#f59e0b" : "#ef4444";
                      return (
                        <div key={st.id} className="flex items-center gap-2.5 py-1.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] text-white/65">{st.title}</span>
                              <span className="text-[9px] font-bold" style={{ color }}>{score}%</span>
                            </div>
                            <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${score}%` }}
                                transition={{ duration: 0.7 }}
                              />
                            </div>
                            {st.lastStudied && (
                              <p className="text-[8px] text-white/20 mt-0.5">
                                Last studied: {st.lastStudied.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => onStudy(st)}
                            className="shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-bold text-indigo-400 bg-indigo-500/15 border border-indigo-500/20 hover:bg-indigo-500/25 transition-colors"
                          >
                            Study
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ── Readiness tab ─────────────────────────────────────────────────

function ReadinessTab({ subject }: { subject: Subject }) {
  const result = computeStudentReadiness(subject.id);
  const size   = 120;
  const r      = 48;
  const circ   = 2 * Math.PI * r;
  const color  = result.readinessScore >= 75 ? "#10b981" : result.readinessScore >= 55 ? "#f59e0b" : "#6366f1";

  return (
    <div className="flex flex-col gap-4">
      {/* Big ring */}
      <div className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-white/[0.06] bg-[#0f1117]"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.07) 0%, rgba(0,0,0,0) 70%)" }}>
        <div className="relative">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={8} />
            <motion.circle
              cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: circ * (1 - result.readinessScore / 100) }}
              transition={{ duration: 1.3, ease: [0.4, 0, 0.2, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[26px] font-black" style={{ color }}>{result.readinessScore}%</span>
            <span className="text-[8px] text-white/30">readiness</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <TrendingUp size={12} className="text-indigo-400" />
          <span className="text-[11px] text-white/55">Predicted grade:</span>
          <span className="text-[16px] font-black ml-1" style={{ color: parseInt(result.predictedGrade) >= 6 ? "#10b981" : parseInt(result.predictedGrade) >= 4 ? "#f59e0b" : "#ef4444" }}>
            {result.predictedGrade}
          </span>
        </div>
      </div>

      {/* Topic scores */}
      <div className="flex flex-col gap-2 p-4 rounded-2xl border border-white/[0.06] bg-[#0f1117]">
        <SectionLabel>Topic breakdown</SectionLabel>
        <div className="flex flex-col gap-2.5">
          {result.topicScores.map(ts => {
            const c = ts.score >= 75 ? "#10b981" : ts.score >= 55 ? "#f59e0b" : "#ef4444";
            return (
              <div key={ts.topicId}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-white/65">{ts.title}</span>
                  <span className="text-[10px] font-bold" style={{ color: c }}>{ts.score}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: c }}
                    initial={{ width: 0 }} animate={{ width: `${ts.score}%` }} transition={{ duration: 0.8 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weak subtopics */}
      {result.weakSubtopics.length > 0 && (
        <div className="p-4 rounded-2xl border border-red-500/15 bg-red-950/15 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={11} className="text-red-400" />
            <SectionLabel className="text-red-400/80">Focus areas</SectionLabel>
          </div>
          {result.weakSubtopics.map(st => (
            <div key={st.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-red-500/10">
              <XCircle size={9} className="text-red-400/60 shrink-0" />
              <span className="flex-1 text-[10px] text-white/55">{st.title}</span>
              <span className="text-[9px] font-bold text-red-400">{st.readinessScore}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Recommended plan */}
      {result.recommendedPlan.length > 0 && (
        <div className="p-4 rounded-2xl border border-indigo-500/15 bg-indigo-950/15 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Brain size={11} className="text-indigo-400" />
            <SectionLabel className="text-indigo-400/80">Recommended study order</SectionLabel>
          </div>
          {result.recommendedPlan.map((item, i) => (
            <div key={item.subtopicId} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-indigo-500/10">
              <span className="text-[9px] font-bold text-indigo-400/50 w-4">{i + 1}</span>
              <span className="text-[10px] text-white/60">{item.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Strong subtopics */}
      {result.strongSubtopics.length > 0 && (
        <div className="p-4 rounded-2xl border border-emerald-500/15 bg-emerald-950/10 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Flame size={11} className="text-emerald-400" />
            <SectionLabel className="text-emerald-400/80">Strong areas</SectionLabel>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {result.strongSubtopics.map(st => (
              <span key={st.id} className="flex items-center gap-1 text-[9px] text-emerald-300/60 bg-emerald-500/08 border border-emerald-500/12 px-2 py-0.5 rounded-full">
                <Check size={8} /> {st.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Homework tab ──────────────────────────────────────────────────

function HomeworkTab({
  homework, subject, onToggle,
}: {
  homework: HomeworkItem[];
  subject:  Subject;
  onToggle: (id: string) => void;
}) {
  const subjectHW = homework.filter(h => h.subjectId === subject.id);

  if (subjectHW.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <CheckCircle2 size={24} className="text-white/20" />
        <p className="text-[12px] text-white/30">No homework for {subject.name}</p>
        <p className="text-[10px] text-white/20">Import homework using the button above</p>
      </div>
    );
  }

  const pending   = subjectHW.filter(h => !h.completed);
  const completed = subjectHW.filter(h =>  h.completed);

  return (
    <div className="flex flex-col gap-3">
      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Pending ({pending.length})</SectionLabel>
          {pending.map(hw => {
            const overdue = hw.dueDate && hw.dueDate < new Date();
            return (
              <div key={hw.id} className={`flex gap-3 p-3.5 rounded-2xl border ${
                overdue ? "border-red-500/15 bg-red-950/10" : "border-white/[0.06] bg-[#0f1117]"
              }`}>
                <button
                  onClick={() => onToggle(hw.id)}
                  className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center shrink-0 mt-0.5 hover:border-indigo-500/40 transition-colors"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-white/80">{hw.title}</p>
                  {hw.dueDate && (
                    <p className={`text-[9px] mt-0.5 flex items-center gap-1 ${overdue ? "text-red-400" : "text-white/30"}`}>
                      <Clock size={8} />
                      {overdue ? "Overdue — " : "Due "}
                      {hw.dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  )}
                  {hw.aiSummary && (
                    <p className="text-[10px] text-white/40 mt-1.5 line-clamp-2">{hw.aiSummary}</p>
                  )}
                  {hw.aiConcepts && hw.aiConcepts.length > 0 && (
                    <p className="text-[9px] text-emerald-400/60 mt-1 flex items-center gap-1">
                      <Brain size={8} /> {hw.aiConcepts.length} concepts ready to study
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {completed.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Completed ({completed.length})</SectionLabel>
          {completed.map(hw => (
            <div key={hw.id} className="flex gap-3 p-3.5 rounded-2xl border border-white/[0.04] opacity-50">
              <button
                onClick={() => onToggle(hw.id)}
                className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5"
              >
                <CheckCircle2 size={10} className="text-emerald-400" />
              </button>
              <p className="text-[11px] text-white/40 line-through">{hw.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Daily Learning tab ────────────────────────────────────────────

function DailyTab({ entries, subject }: { entries: DailyLearningEntry[]; subject: Subject }) {
  const subjectEntries = entries.filter(e => e.subjectId === subject.id);

  const MOOD_ICON: Record<DailyLearningEntry["mood"], React.ReactNode> = {
    great: <Smile size={12} className="text-emerald-400" />,
    okay:  <Meh   size={12} className="text-amber-400"  />,
    hard:  <Frown size={12} className="text-red-400"    />,
  };

  if (subjectEntries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <BookOpen size={24} className="text-white/20" />
        <p className="text-[12px] text-white/30">No daily logs for {subject.name}</p>
        <p className="text-[10px] text-white/20">Log what you learned today with the button above</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {subjectEntries.map((entry, i) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="relative p-4 rounded-2xl border border-white/[0.06] bg-[#0f1117]"
        >
          <div className="absolute top-0 left-4 right-4 h-[2px] rounded-b-full bg-indigo-500/20" />

          <div className="flex items-start gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
              {MOOD_ICON[entry.mood]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-white/75">{entry.topicTitle}</p>
              <p className="text-[9px] text-white/30 flex items-center gap-1 mt-0.5">
                <Calendar size={8} />
                {entry.date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
              </p>
            </div>
          </div>

          <p className="text-[10px] text-white/50 leading-relaxed line-clamp-3">{entry.summary.replace(/\*\*([^*]+)\*\*/g, "$1")}</p>

          {entry.concepts.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <Sparkles size={8} className="text-violet-400/60" />
              <SectionLabel>{entry.concepts.length} concepts</SectionLabel>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ── Main SubjectDetail ────────────────────────────────────────────

interface Props {
  subject:         Subject;
  homework:        HomeworkItem[];
  dailyEntries:    DailyLearningEntry[];
  onBack:          () => void;
  onStudySubtopic: (st: Subtopic) => void;
  onToggleHW:      (id: string) => void;
}

export default function SubjectDetail({
  subject, homework, dailyEntries, onBack, onStudySubtopic, onToggleHW,
}: Props) {
  const [tab, setTab] = useState<Tab>("topics");

  const hwCount = homework.filter(h => h.subjectId === subject.id && !h.completed).length;
  const dlCount = dailyEntries.filter(e => e.subjectId === subject.id).length;

  const tabBadge: Partial<Record<Tab, string>> = {
    homework: hwCount > 0 ? String(hwCount) : undefined,
    daily:    dlCount > 0 ? String(dlCount) : undefined,
  };

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
        >
          <ArrowLeft size={13} className="text-white/50" />
        </button>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: subject.color + "20", border: `1px solid ${subject.color}30` }}
        >
          <span className="text-[16px]">{subject.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[14px] font-bold text-white/90">{subject.name}</h2>
          <p className="text-[10px] text-white/35">{subject.examBoard} · {subject.level}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06] mb-4">
        {TABS.map(t => {
          const badge = tabBadge[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 relative py-1.5 rounded-xl text-[10px] font-semibold transition-all ${
                tab === t.key ? "bg-indigo-600 text-white" : "text-white/35 hover:text-white/55"
              }`}
            >
              {t.label}
              {badge && (
                <span className={`absolute -top-1 -right-0.5 text-[7px] font-bold px-1 py-px rounded-full ${
                  tab === t.key ? "bg-white/20 text-white" : "bg-amber-500/20 text-amber-400"
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
            {tab === "topics"    && <TopicsTab    subject={subject} onStudy={onStudySubtopic} />}
            {tab === "readiness" && <ReadinessTab subject={subject} />}
            {tab === "homework"  && <HomeworkTab  homework={homework} subject={subject} onToggle={onToggleHW} />}
            {tab === "daily"     && <DailyTab     entries={dailyEntries} subject={subject} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
