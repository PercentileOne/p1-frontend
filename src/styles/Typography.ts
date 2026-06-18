/* ══════════════════════════════════════════════════════════════
   P1 Typography Tokens — Phase 12B
   Centralises the type scale so a single edit propagates.
   All values map to Tailwind arbitrary-value syntax.
   ══════════════════════════════════════════════════════════════ */

export const type = {
  // ── Body text ─────────────────────────────────────────────────
  body: {
    base:  "text-[15px] leading-[1.55] font-normal text-white/80",
    sm:    "text-[13px] leading-[1.5]  font-normal text-white/75",
    xs:    "text-[12px] leading-[1.45] font-normal text-white/65",
  },

  // ── Headings (cinematic — do not change sizes here) ───────────
  heading: {
    xl:  "text-[22px] font-black  text-white/95 leading-tight",
    lg:  "text-[18px] font-bold   text-white/92 leading-snug",
    md:  "text-[15px] font-bold   text-white/90 leading-snug",
    sm:  "text-[13px] font-semibold text-white/88 leading-snug",
  },

  // ── Micro-labels (SectionLabel pattern) ───────────────────────
  // +2px from the old 9px baseline; brighter contrast
  label: {
    default: "text-[11px] font-bold uppercase tracking-widest text-white/45",
    muted:   "text-[11px] font-bold uppercase tracking-widest text-white/35",
    accent:  "text-[11px] font-bold uppercase tracking-widest text-indigo-400/70",
  },

  // ── Metadata / timestamps / counts ────────────────────────────
  // +1px from the old 9–10px baseline; brighter contrast
  meta: {
    default: "text-[11px] font-normal text-white/45",
    muted:   "text-[10px] font-normal text-white/35",
    bright:  "text-[11px] font-medium text-white/60",
  },

  // ── Tag chips ─────────────────────────────────────────────────
  // +2px from the old 8px baseline
  tag: "text-[10px] font-bold uppercase tracking-widest",

  // ── Placeholder text ──────────────────────────────────────────
  // Contrast only (no size change per spec)
  placeholder: "placeholder-white/30",

  // ── Activity feed micro-text ──────────────────────────────────
  activity: "text-[11px] font-normal text-white/55",
} as const;

/*
  Before/After reference (Phase 12B):
  ┌─────────────────────────────┬─────────────┬─────────────┐
  │ Element                     │ Before      │ After       │
  ├─────────────────────────────┼─────────────┼─────────────┤
  │ SectionLabel                │ 9px /30     │ 11px /45    │
  │ Note preview content        │ 10px /35    │ 12px /50    │
  │ Note title (list)           │ 12px /85    │ 13px /90    │
  │ Tag chips                   │ 8–9px /30   │ 10px /35    │
  │ Timestamps / metadata       │ 9–10px /20  │ 10–11px /35 │
  │ Card description            │ 11px /50    │ 13px /60    │
  │ Card footer meta            │ 10px /30    │ 11px /45    │
  │ NoteDetail textarea         │ 12px        │ 14px        │
  │ Teacher health labels       │ 9–10px /500 │ 11px /400   │
  │ Placeholder contrast        │ /20         │ /30         │
  └─────────────────────────────┴─────────────┴─────────────┘
*/
