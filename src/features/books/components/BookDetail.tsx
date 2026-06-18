/* ══════════════════════════════════════════════════════════════
   BookDetail — 3 tabs: Chapters · Summaries · Cards
   Per-chapter pipeline: Extract Text → Summarise → Extract Concepts → Create Card
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, FileText, Sparkles, Brain, LayoutGrid,
  CheckCircle2, ChevronRight, Share2, Check,
  BookOpen, Layers, Send, ChevronDown, ExternalLink,
} from "lucide-react";
import type { Book, Chapter, BooksStore } from "../booksStore";
import {
  extractChapterTextMock,
  generateChapterSummaryMock,
  extractChapterConceptsMock,
} from "../mockPipeline";
import { generateCardFromChapter } from "../generateCardFromChapter";
import { useGroupsStore } from "../../groups/groupsStore";
import { useNotesStore } from "../../notes/notesStore";
import AddToCertButton from "../../certifications/components/AddToCertButton";
import SectionLabel from "../../cards/components/shared/SectionLabel";

type Tab = "chapters" | "summaries" | "cards";
const TABS: { key: Tab; label: string }[] = [
  { key: "chapters",  label: "Chapters"  },
  { key: "summaries", label: "Summaries" },
  { key: "cards",     label: "Cards"     },
];

// ── Pipeline step types ───────────────────────────────────────────
type PipelineStep = "text" | "summary" | "concepts" | "card";

function pipelineState(ch: Chapter): {
  nextStep: PipelineStep | null;
  doneSteps: PipelineStep[];
} {
  const done: PipelineStep[] = [];
  if (ch.rawText)    done.push("text");
  if (ch.aiSummary)  done.push("summary");
  if (ch.aiConcepts?.length) done.push("concepts");
  if (ch.aiCardId)   done.push("card");

  let next: PipelineStep | null = null;
  if (!ch.rawText)          next = "text";
  else if (!ch.aiSummary)   next = "summary";
  else if (!ch.aiConcepts?.length) next = "concepts";
  else if (!ch.aiCardId)    next = "card";

  return { nextStep: next, doneSteps: done };
}

const STEP_META: Record<PipelineStep, { icon: React.ReactNode; label: string; loadingLabel: string; color: string }> = {
  text:     { icon: <FileText  size={10} />, label: "Extract Text",     loadingLabel: "Extracting…",   color: "text-sky-400    bg-sky-500/15    border-sky-500/25"    },
  summary:  { icon: <Sparkles  size={10} />, label: "Summarise",        loadingLabel: "Summarising…",  color: "text-violet-400 bg-violet-500/15 border-violet-500/25" },
  concepts: { icon: <Brain     size={10} />, label: "Extract Concepts", loadingLabel: "Extracting…",   color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/25"},
  card:     { icon: <LayoutGrid size={10} />, label: "Create Card",      loadingLabel: "Creating…",     color: "text-amber-400  bg-amber-500/15  border-amber-500/25"  },
};

// ── Share to Group picker ─────────────────────────────────────────
function ShareChapterButton({ chapterTitle, bookTitle }: { chapterTitle: string; bookTitle: string }) {
  const groupsStore = useGroupsStore();
  const [open,   setOpen]   = useState(false);
  const [shared, setShared] = useState<string | null>(null);

  const handle = (groupId: string) => {
    groupsStore.addActivity(groupId, {
      type: "note_shared", userId: "u-francis", userName: "Francis",
      userInitials: "FR", userAccent: "bg-indigo-500",
      message: `Francis shared Chapter "${chapterTitle}" from "${bookTitle}"`,
      timestamp: new Date(),
      meta: { cardTitle: chapterTitle },
    });
    setShared(groupId);
    setTimeout(() => { setShared(null); setOpen(false); }, 1400);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/30 hover:text-white/55 transition-all text-[9px] font-medium"
      >
        <Share2 size={9} /> Share
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
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">Share to group</p>
            </div>
            {groupsStore.groups.filter(g => g.localUserRole !== null).map(group => {
              const done = shared === group.id;
              return (
                <button key={group.id} onClick={() => handle(group.id)} disabled={!!shared}
                  className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.04] transition-colors text-left">
                  <span className="text-[14px]">{group.emoji}</span>
                  <span className="flex-1 text-[11px] font-medium text-white/70 truncate">{group.name}</span>
                  {done && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center"><Check size={9} className="text-emerald-400" /></motion.div>}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Chapters tab ──────────────────────────────────────────────────
function ChaptersTab({ book, store }: { book: Book; store: BooksStore }) {
  const notesStore = useNotesStore();
  const [loading, setLoading] = useState<Record<string, PipelineStep | null>>({});

  const setChapterLoading = (chId: string, step: PipelineStep | null) =>
    setLoading(prev => ({ ...prev, [chId]: step }));

  const runStep = async (ch: Chapter, step: PipelineStep) => {
    setChapterLoading(ch.id, step);
    try {
      if (step === "text") {
        const text = await extractChapterTextMock(book.id, ch.id, ch.title);
        store.updateChapter(book.id, ch.id, { rawText: text });

      } else if (step === "summary") {
        const summary = await generateChapterSummaryMock(ch.rawText ?? ch.title, ch.title);
        store.updateChapter(book.id, ch.id, { aiSummary: summary });

      } else if (step === "concepts") {
        const concepts = await extractChapterConceptsMock(ch.rawText ?? ch.title, ch.id);
        store.updateChapter(book.id, ch.id, { aiConcepts: concepts });

      } else if (step === "card") {
        // Need fresh chapter data from store
        const freshBook = store.getBook(book.id);
        const freshCh   = freshBook?.chapters.find(c => c.id === ch.id) ?? ch;
        const card = generateCardFromChapter(freshBook ?? book, freshCh);
        store.updateChapter(book.id, ch.id, { aiCardId: card.id });
      }
    } finally {
      setChapterLoading(ch.id, null);
    }
  };

  const sendToNotes = (ch: Chapter) => {
    notesStore.addNote({
      title:      ch.title,
      content:    ch.rawText ?? `Chapter from "${book.title}" (${book.author})\nPages ${ch.pageStart}–${ch.pageEnd}`,
      sourceType: "import",
      tags:       [book.title.split(" ")[0], ch.title.split(" ")[0]],
      aiSummary:  ch.aiSummary,
      aiConcepts: ch.aiConcepts,
    });
  };

  // Use live data from store
  const liveBook = store.getBook(book.id) ?? book;

  return (
    <div className="flex flex-col gap-2">
      {liveBook.chapters.map((ch, i) => {
        const { nextStep, doneSteps } = pipelineState(ch);
        const isLoading = loading[ch.id] != null;
        const currentLoad = loading[ch.id];
        const allDone = nextStep === null;

        return (
          <motion.div
            key={ch.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`p-3.5 rounded-2xl border transition-colors ${
              allDone ? "border-amber-500/15 bg-amber-500/05" : "border-white/[0.06] bg-[#0f1117]"
            }`}
          >
            {/* Chapter header */}
            <div className="flex items-start gap-2.5 mb-2.5">
              <span className="text-[9px] text-white/20 font-mono mt-1 shrink-0 w-4">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-white/80 leading-snug">{ch.title}</p>
                <p className="text-[9px] text-white/25 mt-0.5">pp. {ch.pageStart}–{ch.pageEnd}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <AddToCertButton
                  sourceType="book"
                  sourceId={book.id}
                  chapterId={ch.id}
                  title={ch.title}
                  description={`pp. ${ch.pageStart}–${ch.pageEnd}`}
                />
                {ch.rawText && (
                  <button
                    onClick={() => sendToNotes(ch)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/30 hover:text-white/55 transition-all text-[9px] font-medium"
                  >
                    <Send size={9} /> Notes
                  </button>
                )}
                <ShareChapterButton chapterTitle={ch.title} bookTitle={book.title} />
              </div>
            </div>

            {/* Pipeline progress dots */}
            <div className="flex items-center gap-1.5 mb-2.5">
              {(["text","summary","concepts","card"] as PipelineStep[]).map(step => {
                const done = doneSteps.includes(step);
                const active = currentLoad === step;
                return (
                  <div key={step} className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full transition-all ${
                      active ? "bg-indigo-400 scale-125" :
                      done   ? "bg-emerald-400" :
                               "bg-white/10"
                    }`} />
                    {step !== "card" && <div className="w-4 h-px bg-white/[0.06]" />}
                  </div>
                );
              })}
              <span className="ml-1 text-[8px] text-white/20">
                {doneSteps.length}/4
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Done steps — green badges */}
              {doneSteps.map(step => {
                const meta = STEP_META[step];
                return (
                  <span key={step} className="flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                    <CheckCircle2 size={8} /> {meta.label}
                  </span>
                );
              })}

              {/* Next step button */}
              {nextStep && !allDone && (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => runStep(ch, nextStep)}
                  disabled={isLoading}
                  className={`flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-lg border transition-all ${
                    isLoading
                      ? "text-white/30 bg-white/[0.04] border-white/[0.08]"
                      : `${STEP_META[nextStep].color}`
                  }`}
                >
                  {isLoading ? (
                    <>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                        <Sparkles size={9} />
                      </motion.div>
                      {STEP_META[nextStep].loadingLabel}
                    </>
                  ) : (
                    <>
                      {STEP_META[nextStep].icon}
                      {STEP_META[nextStep].label}
                      <ChevronRight size={9} />
                    </>
                  )}
                </motion.button>
              )}

              {/* All done → view card */}
              {allDone && ch.aiCardId && (
                <span className="text-[9px] text-amber-400/80 flex items-center gap-1">
                  <CheckCircle2 size={10} /> Card ready
                </span>
              )}

              {/* Create Room from Chapter stub */}
              <button disabled className="ml-auto text-[8px] text-white/15 flex items-center gap-1 cursor-not-allowed">
                <ChevronDown size={8} className="rotate-[-90deg]" /> Room — Phase 7
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Summaries tab ─────────────────────────────────────────────────
function SummariesTab({ book, store }: { book: Book; store: BooksStore }) {
  const liveBook = store.getBook(book.id) ?? book;
  const withSummaries = liveBook.chapters.filter(c => c.aiSummary);

  if (withSummaries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
          <Sparkles size={18} className="text-white/20" />
        </div>
        <p className="text-[12px] text-white/35">No summaries generated yet</p>
        <p className="text-[10px] text-white/20">Extract text and summarise chapters from the Chapters tab</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {withSummaries.map((ch, i) => (
        <motion.div
          key={ch.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="relative p-4 rounded-2xl border border-violet-500/15 bg-gradient-to-br from-violet-950/30 to-violet-900/15"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.04) inset" }}
        >
          <div className="absolute top-0 left-4 right-4 h-[2px] rounded-b-full bg-violet-500/30" />

          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={10} className="text-violet-400" />
            <SectionLabel className="text-violet-400/70">{ch.title}</SectionLabel>
            <span className="ml-auto text-[8px] text-white/20">pp. {ch.pageStart}–{ch.pageEnd}</span>
          </div>

          <div className="flex flex-col gap-2">
            {(ch.aiSummary ?? "").split("\n\n").map((para, j) => (
              <p
                key={j}
                className="text-[11px] text-white/60 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: para.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white/85 font-semibold">$1</strong>'),
                }}
              />
            ))}
          </div>

          {ch.aiConcepts?.length && (
            <div className="mt-3 pt-2.5 border-t border-white/[0.05] flex items-center gap-2">
              <Brain size={10} className="text-emerald-400/60" />
              <SectionLabel>{ch.aiConcepts.length} concepts extracted</SectionLabel>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ── Cards tab ─────────────────────────────────────────────────────
function CardsTab({ book, store }: { book: Book; store: BooksStore }) {
  const liveBook = store.getBook(book.id) ?? book;
  const withCards = liveBook.chapters.filter(c => c.aiCardId);

  if (withCards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
          <LayoutGrid size={18} className="text-white/20" />
        </div>
        <p className="text-[12px] text-white/35">No cards generated yet</p>
        <p className="text-[10px] text-white/20">Complete the pipeline in the Chapters tab to create cards</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SectionLabel>{withCards.length} card{withCards.length !== 1 ? "s" : ""} from this book</SectionLabel>
        <SectionLabel className="text-white/20">{liveBook.chapters.length - withCards.length} chapters remaining</SectionLabel>
      </div>

      {withCards.map((ch, i) => {
        const conceptCount = ch.aiConcepts?.length ?? 0;
        return (
          <motion.div
            key={ch.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="relative p-3.5 rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-950/25 to-amber-900/10"
            style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.04) inset" }}
          >
            <div className="absolute top-0 left-4 right-4 h-[2px] rounded-b-full bg-amber-500/25" />

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0">
                <LayoutGrid size={12} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-white/80">{ch.title}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[9px] text-white/30">
                  <BookOpen size={9} />
                  <span>{book.title}</span>
                  <span>·</span>
                  <Brain size={9} />
                  <span>{conceptCount} concepts</span>
                </div>
              </div>
              <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/25 text-indigo-400 text-[9px] font-bold hover:bg-indigo-600/30 transition-colors shrink-0">
                <ExternalLink size={9} /> Cards
              </button>
            </div>

            {/* Concept preview pills */}
            {ch.aiConcepts && ch.aiConcepts.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1">
                {ch.aiConcepts.slice(0, 3).map(c => (
                  <span key={c.id} className="text-[8px] text-white/35 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded-full truncate max-w-[180px]">
                    {c.text.split(" ").slice(0, 5).join(" ")}…
                  </span>
                ))}
                {(ch.aiConcepts?.length ?? 0) > 3 && (
                  <span className="text-[8px] text-white/20 px-1.5 py-0.5">+{ch.aiConcepts!.length - 3} more</span>
                )}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Main BookDetail ───────────────────────────────────────────────

interface Props {
  book:   Book;
  store:  BooksStore;
  onBack: () => void;
}

export default function BookDetail({ book, store, onBack }: Props) {
  const [tab, setTab] = useState<Tab>("chapters");

  const liveBook = store.getBook(book.id) ?? book;
  const summaryCount = liveBook.chapters.filter(c => c.aiSummary).length;
  const cardCount    = liveBook.chapters.filter(c => c.aiCardId).length;

  const tabBadge: Partial<Record<Tab, string>> = {
    summaries: summaryCount > 0 ? String(summaryCount) : undefined,
    cards:     cardCount    > 0 ? String(cardCount)    : undefined,
  };

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
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Mini cover */}
          <div
            className="w-8 h-11 rounded-lg shrink-0"
            style={{ background: liveBook.cover ?? "linear-gradient(135deg,#1e293b,#0f172a)" }}
          />
          <div className="min-w-0">
            <h2 className="text-[14px] font-bold text-white/90 leading-snug truncate">{liveBook.title}</h2>
            <p className="text-[10px] text-white/35 mt-0.5">{liveBook.author} · {liveBook.chapters.length} chapters</p>
          </div>
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
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-semibold transition-all relative ${
                tab === t.key ? "bg-indigo-600 text-white" : "text-white/35 hover:text-white/55"
              }`}
            >
              {t.label}
              {badge && (
                <span className={`absolute -top-1 -right-0.5 text-[7px] font-bold px-1 py-px rounded-full ${
                  tab === t.key ? "bg-white/20 text-white" : "bg-emerald-500/20 text-emerald-400"
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
            {tab === "chapters"  && <ChaptersTab  book={liveBook} store={store} />}
            {tab === "summaries" && <SummariesTab book={liveBook} store={store} />}
            {tab === "cards"     && <CardsTab     book={liveBook} store={store} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
