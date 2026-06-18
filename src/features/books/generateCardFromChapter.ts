/* ══════════════════════════════════════════════════════════════
   GENERATE CARD FROM CHAPTER — Phase 6
   Creates a CognitiveCardData from a processed chapter
   and adds it to cardsStore.
   ══════════════════════════════════════════════════════════════ */

import type { Book, Chapter } from "./booksStore";
import type { CognitiveCardData } from "../cards/types";
import { addCard } from "../cards/cardsStore";

const ACCENT_CYCLE = [
  { accent: "bg-sky-500",     gradientBg: "bg-gradient-to-br from-sky-950/70 to-sky-900/40",     textAccent: "text-sky-400"     },
  { accent: "bg-violet-500",  gradientBg: "bg-gradient-to-br from-violet-950/70 to-violet-900/40", textAccent: "text-violet-400"  },
  { accent: "bg-teal-500",    gradientBg: "bg-gradient-to-br from-teal-950/70 to-teal-900/40",    textAccent: "text-teal-400"    },
  { accent: "bg-amber-500",   gradientBg: "bg-gradient-to-br from-amber-950/70 to-amber-900/40",  textAccent: "text-amber-400"   },
  { accent: "bg-indigo-500",  gradientBg: "bg-gradient-to-br from-indigo-950/70 to-indigo-900/40",textAccent: "text-indigo-400"  },
  { accent: "bg-emerald-500", gradientBg: "bg-gradient-to-br from-emerald-950/70 to-emerald-900/40",textAccent: "text-emerald-400"},
];

let _idx = 0;

export function generateCardFromChapter(book: Book, chapter: Chapter): CognitiveCardData {
  if (!chapter.aiConcepts?.length) {
    throw new Error("Chapter must have AI concepts before generating a card");
  }

  const accent   = ACCENT_CYCLE[_idx % ACCENT_CYCLE.length];
  _idx++;

  const cardId     = `book-card-${book.id}-${chapter.id}`;
  const description = chapter.aiSummary
    ? chapter.aiSummary.replace(/\*\*[^*]+\*\*/g, m => m.replace(/\*\*/g, "")).slice(0, 220).trimEnd()
    : `Chapter ${chapter.id} of ${book.title} — pages ${chapter.pageStart}–${chapter.pageEnd}.`;

  const card: CognitiveCardData = {
    id:         cardId,
    userId:     "u-francis",
    title:      chapter.title,
    category:   book.title,
    subject:    `${book.author} · pp. ${chapter.pageStart}–${chapter.pageEnd}`,
    difficulty: 3,
    tags:       [book.title, chapter.title, book.author].map(s => s.split(" ")[0]),
    description,
    examples:   [],
    notesLink:  null,
    concepts:   chapter.aiConcepts.map((c, i) => ({ ...c, order: i + 1 })),
    testConfig: {
      timeLimitSeconds: 90 + chapter.aiConcepts.length * 10,
      allowVoice:  true,
      allowVideo:  false,
      allowTyping: true,
      revealMode:  "blur",
      scoringMode: "standard",
    },
    mastery: { score: 0, lastTested: null, streak: 0, attempts: 0, history: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    source:    "ai",
    version:   1,
    ai: {
      generatedFrom: `${book.id}/${chapter.id}`,
      modelVersion:  "p1-books-v1",
      autoImprove:   true,
      suggestions:   [],
    },
    ...accent,
  };

  addCard(card);
  return card;
}
