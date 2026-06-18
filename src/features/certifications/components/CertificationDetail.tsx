/* ══════════════════════════════════════════════════════════════
   CertificationDetail — 3 tabs: Syllabus · Readiness · Mock Exams
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, BookOpen, Brain, ClipboardList,
  CheckCircle2, Circle, Zap, BookMarked, StickyNote,
  LayoutGrid, Users, Share2, Check,
} from "lucide-react";
import type { Certification, ChapterRef } from "../certificationsStore";
import { computeReadiness } from "../readinessEngine";
import { useCardsStore } from "../../cards/cardsStore";
import { useGroupsStore } from "../../groups/groupsStore";
import ReadinessView   from "./ReadinessView";
import MockExamConfigModal, { type MockExamConfig } from "./MockExamConfigModal";
import MockExamView    from "./MockExamView";
import SectionLabel    from "../../cards/components/shared/SectionLabel";

// ── Tabs ──────────────────────────────────────────────────────────

type Tab = "syllabus" | "readiness" | "exams";
const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "syllabus",  label: "Syllabus",  icon: <BookOpen size={10} /> },
  { key: "readiness", label: "Readiness", icon: <Brain size={10} />    },
  { key: "exams",     label: "Mock Exams", icon: <ClipboardList size={10} /> },
];

// ── Mastery badge ─────────────────────────────────────────────────

function MasteryBadge({ score, attempts }: { score: number; attempts: number }) {
  if (attempts === 0) return (
    <span className="flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded border text-white/30 bg-white/[0.04] border-white/[0.08]">
      <Circle size={7} /> Not started
    </span>
  );
  if (score >= 75) return (
    <span className="flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
      <CheckCircle2 size={7} /> Mastered
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded border text-amber-400 bg-amber-500/10 border-amber-500/20">
      <Zap size={7} /> In progress
    </span>
  );
}

// ── Source icon ───────────────────────────────────────────────────

const SOURCE_ICON: Record<ChapterRef["sourceType"], React.ReactNode> = {
  book: <BookMarked size={10} className="text-amber-400" />,
  note: <StickyNote size={10} className="text-sky-400" />,
  card: <LayoutGrid size={10} className="text-indigo-400" />,
};

const SOURCE_LABEL: Record<ChapterRef["sourceType"], string> = {
  book: "Book",
  note: "Note",
  card: "Card",
};

// ── Group study share button ──────────────────────────────────────

function GroupStudyButton({ cert }: { cert: Certification }) {
  const groupsStore = useGroupsStore();
  const [open,   setOpen]   = useState(false);
  const [shared, setShared] = useState<string | null>(null);

  const handle = (groupId: string) => {
    groupsStore.addActivity(groupId, {
      type:         "note_shared",
      userId:       "u-francis",
      userName:     "Francis",
      userInitials: "FR",
      userAccent:   "bg-indigo-500",
      message:      `Francis started a group study session for "${cert.title}"`,
      timestamp:    new Date(),
      meta:         { cardTitle: cert.title },
    });
    setShared(groupId);
    setTimeout(() => { setShared(null); setOpen(false); }, 1400);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white/35 hover:text-white/60 transition-all text-[9px] font-bold"
      >
        <Users size={10} /> Group Study
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute top-full right-0 mt-1.5 z-40 w-52 flex flex-col rounded-2xl border border-white/[0.08] bg-[#13151c] overflow-hidden"
            style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.65)" }}
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.96,  y: -4 }}
            transition={{ duration: 0.14 }}
          >
            <div className="px-3 py-2 border-b border-white/[0.06]">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">Post to group</p>
            </div>
            {groupsStore.groups.filter(g => g.localUserRole !== null).map(group => {
              const done = shared === group.id;
              return (
                <button key={group.id} onClick={() => handle(group.id)} disabled={!!shared}
                  className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.04] transition-colors text-left">
                  <span className="text-[14px]">{group.emoji}</span>
                  <span className="flex-1 text-[11px] font-medium text-white/70 truncate">{group.name}</span>
                  {done && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check size={9} className="text-emerald-400" />
                    </motion.div>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Syllabus tab ──────────────────────────────────────────────────

function SyllabusTab({ cert, cards }: { cert: Certification; cards: ReturnType<typeof useCardsStore>["cards"] }) {
  const cardMap = new Map(cards.map(c => [c.id, c]));

  return (
    <div className="flex flex-col gap-4">
      {cert.syllabus.map((sec, si) => (
        <motion.div
          key={sec.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: si * 0.06 }}
          className="flex flex-col gap-0 rounded-2xl border border-white/[0.06] bg-[#0f1117] overflow-hidden"
          style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.04) inset" }}
        >
          {/* Section header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.05]">
            <span className="text-[9px] font-mono text-white/20 w-4">{si + 1}</span>
            <h4 className="text-[12px] font-bold text-white/80 flex-1">{sec.title}</h4>
            <SectionLabel>{sec.chapters.length} chapters</SectionLabel>
          </div>

          {/* Chapter rows */}
          {sec.chapters.map((ref, ci) => {
            const card = ref.sourceType === "card" ? cardMap.get(ref.sourceId) : undefined;
            const mastery   = card?.mastery ?? null;
            const score     = mastery?.score     ?? 0;
            const attempts  = mastery?.attempts  ?? 0;

            return (
              <div
                key={ref.id}
                className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                  ci < sec.chapters.length - 1 ? "border-b border-white/[0.04]" : ""
                }`}
              >
                <div className="mt-0.5 shrink-0">{SOURCE_ICON[ref.sourceType]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-white/75 leading-snug">{ref.title}</p>
                  {ref.description && (
                    <p className="text-[10px] text-white/30 mt-0.5 leading-snug">{ref.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">{SOURCE_LABEL[ref.sourceType]}</span>
                    {card && (
                      <>
                        <span className="text-white/15">·</span>
                        <span className="text-[8px] text-white/25">{card.concepts.length} concepts</span>
                      </>
                    )}
                  </div>
                </div>
                <MasteryBadge score={score} attempts={attempts} />
              </div>
            );
          })}
        </motion.div>
      ))}
    </div>
  );
}

// ── Mock Exams tab ────────────────────────────────────────────────

function MockExamsTab({ cert, cards }: {
  cert:  Certification;
  cards: ReturnType<typeof useCardsStore>["cards"];
}) {
  const [configOpen,  setConfigOpen]  = useState(false);
  const [activeConfig, setActiveConfig] = useState<MockExamConfig | null>(null);

  if (activeConfig) {
    return (
      <MockExamView
        cert={cert}
        cards={cards}
        config={activeConfig}
        onBack={() => setActiveConfig(null)}
      />
    );
  }

  const totalChapters = cert.syllabus.reduce((s, sec) => s + sec.chapters.length, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* CTA hero */}
      <div
        className="relative flex flex-col items-center gap-4 p-5 rounded-2xl border border-amber-500/15"
        style={{ background: "linear-gradient(135deg, rgba(217,119,6,0.07) 0%, rgba(0,0,0,0) 70%)" }}
      >
        <div className="absolute top-0 left-5 right-5 h-[2px] rounded-b-full bg-amber-500/40" />
        <ClipboardList size={24} className="text-amber-400" />
        <div className="text-center">
          <p className="text-[13px] font-bold text-white/80">Mock Exam</p>
          <p className="text-[10px] text-white/35 mt-1">
            {totalChapters} chapters · {cert.syllabus.length} sections · Keyword-scored
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setConfigOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold transition-colors"
        >
          <ClipboardList size={12} /> Configure Exam
        </motion.button>
      </div>

      {/* What to expect */}
      <div className="flex flex-col gap-2 p-4 rounded-2xl border border-white/[0.06] bg-[#0f1117]">
        <SectionLabel>How mock exams work</SectionLabel>
        {[
          "Questions are drawn from all linked cards, notes, and book chapters",
          "Type a natural explanation — the engine detects key concept terms",
          "Missed concepts are flagged for focused follow-up study",
          "Scores feed back into your overall readiness calculation",
        ].map((txt, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 mt-1.5 shrink-0" />
            <p className="text-[11px] text-white/50 leading-relaxed">{txt}</p>
          </div>
        ))}
      </div>

      {configOpen && (
        <MockExamConfigModal
          cert={cert}
          onLaunch={config => {
            setConfigOpen(false);
            setActiveConfig(config);
          }}
          onClose={() => setConfigOpen(false)}
        />
      )}
    </div>
  );
}

// ── Main CertificationDetail ──────────────────────────────────────

interface Props {
  cert:   Certification;
  onBack: () => void;
}

export default function CertificationDetail({ cert, onBack }: Props) {
  const { cards } = useCardsStore();
  const [tab, setTab] = useState<Tab>("syllabus");

  const readiness = computeReadiness(cert, cards);

  const tabBadge: Partial<Record<Tab, string>> = {
    readiness: String(readiness.readinessScore) + "%",
  };

  const totalChapters = cert.syllabus.reduce((s, sec) => s + sec.chapters.length, 0);

  return (
    <div className="flex flex-col gap-0 h-full">

      {/* Header */}
      <div className="flex items-start gap-3 pb-4">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center hover:bg-white/10 transition-colors shrink-0 mt-0.5"
        >
          <ArrowLeft size={13} className="text-white/50" />
        </button>
        <div className="flex-1 min-w-0 flex items-start gap-3">
          <div
            className="w-9 h-11 rounded-xl shrink-0"
            style={{ background: cert.cover ?? "linear-gradient(135deg,#1e293b,#0f172a)" }}
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-[14px] font-bold text-white/90 leading-snug">{cert.title}</h2>
            <p className="text-[10px] text-white/35 mt-0.5">{cert.provider} · {totalChapters} chapters</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <GroupStudyButton cert={cert} />
          <button className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center text-white/25 hover:text-white/50 transition-colors">
            <Share2 size={13} />
          </button>
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
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all relative ${
                tab === t.key ? "bg-indigo-600 text-white" : "text-white/35 hover:text-white/55"
              }`}
            >
              {t.icon} {t.label}
              {badge && (
                <span className={`absolute -top-1 -right-0.5 text-[7px] font-bold px-1 py-px rounded-full ${
                  tab === t.key ? "bg-white/20 text-white" : "bg-indigo-500/20 text-indigo-400"
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
            {tab === "syllabus"  && <SyllabusTab  cert={cert} cards={cards} />}
            {tab === "readiness" && <ReadinessView cert={cert} result={readiness} />}
            {tab === "exams"     && <MockExamsTab  cert={cert} cards={cards} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
