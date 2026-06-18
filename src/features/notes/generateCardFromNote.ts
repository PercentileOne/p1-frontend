/* ══════════════════════════════════════════════════════════════
   GENERATE CARD FROM NOTE — Phase 5
   Creates a full CognitiveCardData from an AI-analysed note,
   adds it to cardsStore, and returns the new card ID.
   ══════════════════════════════════════════════════════════════ */

import type { Note } from "./notesStore";
import type { CognitiveCardData } from "../cards/types";
import { addCard } from "../cards/cardsStore";

// Accent palette — cycles based on note position
const ACCENT_CYCLE = [
  { accent: "bg-violet-500", gradientBg: "bg-gradient-to-br from-violet-950/70 to-violet-900/40", textAccent: "text-violet-400" },
  { accent: "bg-indigo-500", gradientBg: "bg-gradient-to-br from-indigo-950/70 to-indigo-900/40", textAccent: "text-indigo-400" },
  { accent: "bg-sky-500",    gradientBg: "bg-gradient-to-br from-sky-950/70 to-sky-900/40",    textAccent: "text-sky-400"    },
  { accent: "bg-emerald-500",gradientBg: "bg-gradient-to-br from-emerald-950/70 to-emerald-900/40",textAccent: "text-emerald-400"},
  { accent: "bg-amber-500",  gradientBg: "bg-gradient-to-br from-amber-950/70 to-amber-900/40",  textAccent: "text-amber-400"  },
  { accent: "bg-rose-500",   gradientBg: "bg-gradient-to-br from-rose-950/70 to-rose-900/40",   textAccent: "text-rose-400"   },
];

let _accentIdx = 0;

export function generateCardFromNote(note: Note): CognitiveCardData {
  if (!note.aiConcepts?.length) {
    throw new Error("Note must have AI concepts before generating a card");
  }

  const accent = ACCENT_CYCLE[_accentIdx % ACCENT_CYCLE.length];
  _accentIdx++;

  // Derive category from tags (fall back to "Notes")
  const category = note.tags[0] ?? "Notes";
  const subject  = note.tags[1] ?? "Study Notes";

  // Build description from aiSummary or first 180 chars of content
  const description = note.aiSummary
    ? note.aiSummary.replace(/\*\*[^*]+\*\*/g, w => w.replace(/\*\*/g, "")).slice(0, 220).trimEnd()
    : note.content.slice(0, 220).replace(/[#*\-]/g, "").trim();

  const cardId = `note-card-${note.id}`;

  const card: CognitiveCardData = {
    id:       cardId,
    userId:   "u-francis",
    title:    note.title,
    category,
    subject,
    difficulty: 3,
    tags:       note.tags,
    description,
    examples:   [],
    notesLink:  note.id,  // link back to source note
    concepts:   note.aiConcepts.map((c, i) => ({ ...c, order: i + 1 })),
    testConfig: {
      timeLimitSeconds: 90 + note.aiConcepts.length * 10,
      allowVoice:  true,
      allowVideo:  false,
      allowTyping: true,
      revealMode:  "blur",
      scoringMode: "standard",
    },
    mastery: {
      score:      0,
      lastTested: null,
      streak:     0,
      attempts:   0,
      history:    [],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    source:    "notes",
    version:   1,
    ai: {
      generatedFrom: note.id,
      modelVersion:  "p1-notes-v1",
      autoImprove:   true,
      suggestions:   [],
    },
    ...accent,
  };

  addCard(card);
  return card;
}
