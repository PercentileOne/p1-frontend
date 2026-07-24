# Vision Screen

**Route**: `/vision`  
**File**: `src/frontend/src/pages/VisionPage.tsx`  
**Type**: Identity & vision hub

## Purpose

The Vision Screen is the identity layer of P1. It is where the user defines who they are, where they are going, and what they will leave behind. Everything in P1 — goals, cycles, daily actions — is validated against the Vision. It is the upstream of the entire system.

## User Flow

```
User navigates to /vision
→ Vision Alignment Score header (0–100%, SVG donut ring)
→ 4-tab navigation: I Am | Areas | Arcs | Legacy
→ I Am tab: editable "I am" statements (up to 8)
→ Areas tab: 8 life domain cards (Health, Family, Wealth, Career, Spirituality, Knowledge, Legacy, Relationships)
  → Each area: SVG ring progress, vision statement, motivation, desired outcomes, linked goals
  → Expandable per area
→ Arcs tab: 1–5 year vision arcs (time horizons)
  → Each arc: gradient header, horizon label, title, description, agent prediction
→ Legacy tab: 6 legacy fields + "Agent Reflect" button
  → Agent reflection: 800ms → agent paragraph appears
```

## Inputs

- Static seed data (vision statements, area data, arc data)
- User edits to "I am" statements (in-memory)
- User trigger on "Agent Reflect" button

## Outputs

- Updated "I am" statements (in-memory)
- Agent reflection text (generated on button click)
- Navigation to `/goals` for goal linking

## Agent Logic

- Vision Alignment Score: 74% (hardcoded in v0.1; production = computed from goal/cycle alignment)
- `<Sparkles/>` agent badge appears in: Areas (alignment advice), Arcs (prediction), Legacy (reflection)
- Legacy Reflect: 800ms simulated delay → 2-paragraph agent reflection on legacy statements
- Each Area card has an agent insight (indigo badge, italic text)

## Proof Integration

No direct proof integration. Vision data feeds the proof system's context for why goals matter.

## Cycle Integration

- Area cards show "Linked Goals" (which active cycle goals serve this vision area)
- Vision Alignment Score is displayed in CycleTodayCard on the Today Screen
- The End-Cycle Review references vision alignment delta

## Notes for Engineers

- Vision Alignment Score SVG: `r=40`, `circumference = 2π×40 ≈ 251.3`, `dashoffset = circumference × (1 - score/100)`
- Area progress rings: same SVG pattern, smaller radius
- Legacy Reflect: `useState<string | null>` for reflection text, `useState<boolean>` for loading
- "I am" statements: `useState<string[]>` — editable list, add/remove items
- Tab state: `useState<"iam" | "areas" | "arcs" | "legacy">`

## Notes for Designers

- The Vision Alignment Score ring should be the centrepiece of the page header
- "I am" statements should feel like a sacred list — large type, generous line height
- Area cards should use the area's representative colour as a gradient or accent
- The Legacy tab should feel slower, heavier, more contemplative than the other tabs
- Agent insights should be subtle — they are observations, not interruptions
