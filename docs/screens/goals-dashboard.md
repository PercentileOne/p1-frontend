# Goals Dashboard

**Route**: `/goals`  
**File**: `src/frontend/src/pages/GoalsDashboard.tsx`  
**Type**: Goal portfolio overview

## Purpose

The Goals Dashboard shows all of the user's active and completed goals across all cycles. It is the place to review goal health, start new goals, and navigate to individual goal detail. It is a portfolio view, not an execution view — execution happens on the Today Screen and Cycle Dashboard.

## User Flow

```
User navigates to /goals
→ Stats header: Total goals, Active, Completed, Total points
→ Filter tabs: All | Active | Completed | Archived
→ Goal cards in a list/grid
  → Each card: title, difficulty badge, progress bar, points, cycle link
  → Click: navigates to goal detail (not yet implemented in v0.1)
→ FAB / CTA: "+ New Goal" → navigates to /goals/create
```

## Inputs

- Hardcoded goal list (in-memory; replace with API)
- Filter state

## Outputs

- Navigation to `/goals/create`
- Navigation to goal detail (future)

## Agent Logic

- Agent badge on cards where the agent has flagged a risk or insight
- AtRisk goals highlighted with amber border

## Proof Integration

- Proof count shown per goal card (N verified completions)
- Goals with unverified completions shown with a flag indicator

## Cycle Integration

- Each goal card shows which cycle it belongs to
- Progress bars reflect cycle completion, not just task count

## Vision Integration

- Each goal card shows which Vision area it serves (small label or icon)

## Notes for Engineers

- This screen is a stub in v0.1 — full implementation pending
- Goal data should come from `goalEngine.ts` (to be built)
- Replace hardcoded data with API calls in production

## Notes for Designers

- Goal cards should immediately communicate: title, difficulty, progress, cycle, status
- Consider a kanban-style view option (columns by status) for power users
- The "+ New Goal" button should be a persistent FAB or sticky header CTA
