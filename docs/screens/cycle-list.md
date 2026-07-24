# Cycle List / Archive

**Route**: `/cycles`  
**File**: `src/frontend/src/pages/CycleListPage.tsx`  
**Type**: Cycle archive + new cycle launch

## Purpose

The Cycle List shows all past cycles alongside the current active cycle. It is the user's performance record — a longitudinal view of their transformation journey. It also provides the "Start New Cycle" entry point.

## User Flow

```
User navigates to /cycles (via sidebar or End-Cycle Review)
→ Current cycle card at top: highlighted, links to /cycle
→ Past cycle cards below: archived, with momentum score, goal completion %, proof count
→ "Start New Cycle" CTA: triggers cycle creation flow (stub in v0.1)
→ Click on past cycle: expands to show goal summary (v0.1 incomplete)
```

## Inputs

- `CURRENT_CYCLE` from `cycleEngine.ts`
- `PAST_CYCLES` from `cycleEngine.ts` (array of archived cycles)

## Outputs

- Navigation to `/cycle` (current)
- Future: navigation to past cycle detail view
- Future: cycle creation wizard

## Agent Logic

- Agent insight per past cycle: what pattern was observed (e.g. "Momentum peaked at Week 8 then dropped")
- Momentum score trend across cycles (visual)

## Proof Integration

- Past cycles show total verified proof submissions
- Verified count is the credibility signal for each cycle's achievements

## Cycle Integration

This screen IS the cycle archive. `PAST_CYCLES` accumulates as cycles are completed via EndReviewPage.

## Notes for Engineers

- `PAST_CYCLES` is seeded with 2 demo cycles in `cycleEngine.ts`
- Momentum score bar: same colour-coding as CycleDashboard (green ≥75, amber ≥50, red <50)
- Past cycle expand state: `Set<string>` of cycle IDs

## Notes for Designers

- The current cycle should be visually distinct (glowing border, "ACTIVE" badge)
- Past cycles should feel like a record book — the user should feel proud scrolling through them
- Show a simple trend line or bar chart of momentum scores across cycles
- "Start New Cycle" should be a prominent CTA, not an afterthought
