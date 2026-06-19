/* ══════════════════════════════════════════════════════════════
   BOOKS STORE — Phase 6
   Module-level singleton. Persists across route changes.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import type { Concept } from "../cards/types";

// ── Types ─────────────────────────────────────────────────────────

export interface Chapter {
  id:          string;
  title:       string;
  pageStart:   number;
  pageEnd:     number;
  rawText?:    string;
  aiSummary?:  string;
  aiConcepts?: Concept[];
  aiCardId?:   string;
}

export type BookSourceType = "pdf" | "epub" | "import";

export interface Book {
  id:         string;
  title:      string;
  author:     string;
  cover:      string | null;   // gradient CSS string for placeholder
  sourceType: BookSourceType;
  chapters:   Chapter[];
  createdAt:  Date;
}

// ── Pre-populated chapter data ────────────────────────────────────

const PP_CH1_TEXT = `The Pragmatic Philosophy

Software development is an art as much as a science. Pragmatic programmers are defined by their attitude, style, and approach to problem-solving.

**Care about your craft:** Why spend your life developing software unless you care about doing it well?

**Think! About your work:** Turn off the autopilot and take control. Think critically about what you're doing while you're doing it.

**Provide options, don't make lame excuses:** Instead of excuses, provide options. Don't say it can't be done — explain what can be done.

Key principles:
- Take responsibility for your actions and their outcomes
- Don't live with broken windows — fix bad designs, wrong decisions, and poor code when you see them
- Be a catalyst for change — show people what change can look like
- Remember the big picture — don't get so involved in the details that you forget to check what's around you
- Make quality a requirements issue — involve your users in trade-offs

**The Cat Ate My Source Code:** The greatest of all weaknesses is the fear of appearing weak. Team trust is the foundation of everything.`;

const PP_CH1_SUMMARY = `The Pragmatic Philosophy establishes the mindset that distinguishes pragmatic programmers from mere coders. At its core is **personal responsibility** — owning your decisions, actions, and outcomes without excuses. The "broken windows" metaphor is central: neglected code signals that no one cares, which invites further decay. Pragmatic programmers are **catalysts for change**, demonstrating what improvement looks like rather than waiting for permission. They maintain awareness of the **big picture** — never getting so lost in a task that they miss systemic problems. Quality is treated as a **requirements issue**, not an afterthought, and trade-offs are made explicit and discussed with stakeholders.`;

const PP_CH1_CONCEPTS: Concept[] = [
  { id: "pp-1-c1", text: "Personal responsibility means owning your actions and outcomes — no lame excuses", keywords: ["responsibility", "ownership", "no excuses", "accountable"], difficulty: 2, weight: 1.5, aiGenerated: true, order: 1 },
  { id: "pp-1-c2", text: "Broken Windows Theory: don't leave bad code unaddressed — neglect signals no one cares", keywords: ["broken windows", "neglect", "entropy", "technical debt"], difficulty: 2, weight: 2, aiGenerated: true, order: 2 },
  { id: "pp-1-c3", text: "Be a catalyst for change by showing examples of what improvement looks like", keywords: ["catalyst", "change", "demonstrate", "show don't tell"], difficulty: 3, weight: 1, aiGenerated: true, order: 3 },
  { id: "pp-1-c4", text: "Always maintain awareness of the big picture — don't lose sight of the whole system", keywords: ["big picture", "systems thinking", "context", "awareness"], difficulty: 2, weight: 1, aiGenerated: true, order: 4 },
  { id: "pp-1-c5", text: "Quality is a requirements issue — make trade-offs explicit with stakeholders", keywords: ["quality", "requirements", "trade-offs", "stakeholders"], difficulty: 3, weight: 1.5, aiGenerated: true, order: 5 },
];

const PP_CH2_SUMMARY = `A Pragmatic Approach covers the practical strategies that underpin all pragmatic development. **DRY (Don't Repeat Yourself)** is perhaps the most famous: every piece of knowledge should have a single, authoritative representation in the system. Duplication leads to maintenance nightmares. **Orthogonality** means components that don't rely on each other — changes in one don't ripple through the system. **Tracer bullets** are an alternative to heavy upfront design: build an end-to-end skeleton first, then flesh it out iteratively. **Prototyping** explores specific risks and unknowns with disposable code. **Domain languages** express intent at the problem level.`;

const PP_CH2_CONCEPTS: Concept[] = [
  { id: "pp-2-c1", text: "DRY (Don't Repeat Yourself): every piece of knowledge must have a single authoritative representation", keywords: ["dry", "don't repeat", "duplication", "single source"], difficulty: 2, weight: 2, aiGenerated: true, order: 1 },
  { id: "pp-2-c2", text: "Orthogonality: independent components that can change without rippling side-effects", keywords: ["orthogonal", "independence", "decoupled", "side effects"], difficulty: 3, weight: 1.5, aiGenerated: true, order: 2 },
  { id: "pp-2-c3", text: "Tracer bullets build a complete end-to-end skeleton before fleshing out details", keywords: ["tracer bullets", "skeleton", "end-to-end", "iterative"], difficulty: 3, weight: 1.5, aiGenerated: true, order: 3 },
  { id: "pp-2-c4", text: "Prototyping explores specific risks and unknowns with throwaway code", keywords: ["prototype", "risk", "throwaway", "explore"], difficulty: 2, weight: 1, aiGenerated: true, order: 4 },
];

const CC_CH1_TEXT = `Clean Code

There are two things to know about bad code: you will write it, and if you write enough of it, you will recognise it when you see it. Clean code is not just about aesthetics — it's about professional responsibility.

**What is clean code?**
- Bjarne Stroustrup: "I like my code to be elegant and efficient."
- Grady Booch: "Clean code reads like well-written prose."
- Dave Thomas: "Clean code can be read and enhanced by a developer other than its original author."
- Michael Feathers: "Clean code always looks like it was written by someone who cares."

**The Boy Scout Rule:** Leave the campground cleaner than you found it. If we all checked in code a little cleaner than when we checked it out, the code simply could not rot.

The total cost of owning a mess is significant. Productivity falls. Teams eventually demand rewrites. Rewrites are often just as messy.

**We are authors:** The ratio of time spent reading vs. writing code is well over 10:1. Making it easy to read makes it easier to write.`;

const CC_CH1_SUMMARY = `Clean Code establishes that **professional responsibility** includes writing readable, maintainable code — not just code that works. Four perspectives from industry leaders converge on the same insight: clean code is **elegant**, reads like **well-written prose**, can be maintained by **others**, and looks like it was written by **someone who cares**. The **Boy Scout Rule** operationalises continuous improvement: always leave the code a little cleaner than you found it. The economic argument is stark — messy code compounds over time, destroying team productivity. Since **we are authors** (the read-to-write ratio exceeds 10:1), optimising for readability is optimising for speed.`;

const CC_CH1_CONCEPTS: Concept[] = [
  { id: "cc-1-c1", text: "Clean code reads like well-written prose — intention and structure are immediately clear", keywords: ["clean code", "readable", "prose", "intention"], difficulty: 2, weight: 1.5, aiGenerated: true, order: 1 },
  { id: "cc-1-c2", text: "The Boy Scout Rule: always leave code cleaner than you found it", keywords: ["boy scout", "leave cleaner", "incremental improvement", "rot"], difficulty: 1, weight: 1.5, aiGenerated: true, order: 2 },
  { id: "cc-1-c3", text: "Developers are authors — code is read 10x more often than it is written", keywords: ["authors", "read-to-write", "10 to 1", "readability"], difficulty: 2, weight: 1, aiGenerated: true, order: 3 },
  { id: "cc-1-c4", text: "Messy code compounds over time, destroying team velocity and forcing rewrites", keywords: ["mess", "productivity", "rewrite", "velocity", "compound"], difficulty: 2, weight: 1, aiGenerated: true, order: 4 },
];

// ── Mock books ────────────────────────────────────────────────────

const BOOKS: Book[] = [
  {
    id: "book-pragmatic",
    title: "The Pragmatic Programmer",
    author: "Hunt & Thomas",
    cover: "linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)",
    sourceType: "pdf",
    createdAt: new Date("2026-06-01"),
    chapters: [
      { id: "pp-ch1", title: "A Pragmatic Philosophy",    pageStart: 1,   pageEnd: 28,  rawText: PP_CH1_TEXT, aiSummary: PP_CH1_SUMMARY, aiConcepts: PP_CH1_CONCEPTS, aiCardId: "book-card-book-pragmatic-pp-ch1" },
      { id: "pp-ch2", title: "A Pragmatic Approach",      pageStart: 29,  pageEnd: 72,  rawText: "Chapter 2 raw text extracted…", aiSummary: PP_CH2_SUMMARY, aiConcepts: PP_CH2_CONCEPTS },
      { id: "pp-ch3", title: "The Basic Tools",           pageStart: 73,  pageEnd: 110, rawText: "Chapter 3 raw text extracted…" },
      { id: "pp-ch4", title: "Pragmatic Paranoia",        pageStart: 111, pageEnd: 148 },
      { id: "pp-ch5", title: "Bend or Break",             pageStart: 149, pageEnd: 188 },
      { id: "pp-ch6", title: "Concurrency",               pageStart: 189, pageEnd: 224 },
      { id: "pp-ch7", title: "While You Are Coding",      pageStart: 225, pageEnd: 274 },
      { id: "pp-ch8", title: "Before the Project",        pageStart: 275, pageEnd: 308 },
    ],
  },
  {
    id: "book-clean-code",
    title: "Clean Code",
    author: "Robert C. Martin",
    cover: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
    sourceType: "pdf",
    createdAt: new Date("2026-06-05"),
    chapters: [
      { id: "cc-ch1", title: "Clean Code",                  pageStart: 1,   pageEnd: 18,  rawText: CC_CH1_TEXT, aiSummary: CC_CH1_SUMMARY, aiConcepts: CC_CH1_CONCEPTS },
      { id: "cc-ch2", title: "Meaningful Names",            pageStart: 19,  pageEnd: 50 },
      { id: "cc-ch3", title: "Functions",                   pageStart: 51,  pageEnd: 96 },
      { id: "cc-ch4", title: "Comments",                    pageStart: 97,  pageEnd: 126 },
      { id: "cc-ch5", title: "Formatting",                  pageStart: 127, pageEnd: 158 },
      { id: "cc-ch6", title: "Objects and Data Structures", pageStart: 159, pageEnd: 180 },
    ],
  },
  {
    id: "book-ydkjs",
    title: "You Don't Know JS: Scope & Closures",
    author: "Kyle Simpson",
    cover: "linear-gradient(135deg, #0d1117 0%, #1c2b3a 100%)",
    sourceType: "epub",
    createdAt: new Date("2026-06-10"),
    chapters: [
      { id: "yd-ch1", title: "What is Scope?",             pageStart: 1,  pageEnd: 28  },
      { id: "yd-ch2", title: "Lexical Scope",              pageStart: 29, pageEnd: 60  },
      { id: "yd-ch3", title: "Function vs. Block Scope",   pageStart: 61, pageEnd: 88  },
      { id: "yd-ch4", title: "Hoisting",                   pageStart: 89, pageEnd: 108 },
      { id: "yd-ch5", title: "Closure",                    pageStart: 109, pageEnd: 146 },
    ],
  },
];

// ── Singleton ─────────────────────────────────────────────────────

let _books: Book[] = BOOKS.map(b => ({ ...b, chapters: b.chapters.map(c => ({ ...c })) }));
const _listeners = new Set<() => void>();
function _notify() { _listeners.forEach(l => l()); }

// ── Hook ─────────────────────────────────────────────────────────

export function useBooksStore() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const l = () => rerender(n => n + 1);
    _listeners.add(l);
    return () => { _listeners.delete(l); };
  }, []);

  function getBook(id: string): Book | undefined {
    return _books.find(b => b.id === id);
  }

  function addBook(book: Omit<Book, "id" | "createdAt">): Book {
    const newBook: Book = { ...book, id: `book-${Date.now()}`, createdAt: new Date() };
    _books = [newBook, ..._books];
    _notify();
    return newBook;
  }

  function updateChapter(bookId: string, chapterId: string, patch: Partial<Chapter>): void {
    _books = _books.map(b => b.id !== bookId ? b : {
      ...b,
      chapters: b.chapters.map(c => c.id !== chapterId ? c : { ...c, ...patch }),
    });
    _notify();
  }

  return { books: _books, getBook, addBook, updateChapter };
}

export type BooksStore = ReturnType<typeof useBooksStore>;
