# Today Screen

**Route**: `/today`  
**File**: `src/frontend/src/pages/TodayPage.tsx`  
**Type**: Full-page daily execution hub

## Purpose

The Today Screen is where life is lived inside P1. It is the daily interface that surfaces everything the user needs to do, review, reflect on, and plan — all within a single scrollable card stack. Every other P1 system (Vision, Goals, Cycles, Proof) feeds data into the Today Screen.

## User Flow

```
User opens /today
→ Card stack loads (23 cards in default order)
→ CycleTodayCard shows: cycle progress, week priorities, milestone warnings
→ VisionAlignCard shows: alignment score, 3 insights
→ User works through cards top-to-bottom
→ ActionsCard: marks task done → ProofEngine check → task completes or modal opens
→ HabitsCard: marks habit done → ProofEngine check → habit completes or modal opens
→ ProofModal: user submits proof → task/habit marked done
→ User reorders or collapses cards as needed
→ End of day: Evening Routine, Evening Gratitude, Tomorrow Skeleton Plan
```

## Inputs

- Current date (computed at module load: `new Date()`)
- Day of week (determines IfDayThenCard active rules)
- Cycle data from `getCurrentCycle()`
- ProofEngine decision for each task/habit completion
- User edits to task lists, habit states, gratitude entries, notes, meal log, shopping list, etc.

## Outputs

- Task completion state (in-memory, resets on refresh)
- Habit completion state (in-memory, resets on refresh)
- Proof submissions (via ProofEngine → `_proofStore`)
- Tomorrow's skeleton plan (in-memory)
- Gratitude entries (in-memory)

## Agent Logic

| Card | Agent Behaviour |
|------|----------------|
| CycleTodayCard | Displays cycle priorities, milestone alerts, agent notes from `currentPlan.agentNotes` |
| VisionAlignCard | 3 hardcoded vision insights + legacy reminder |
| BlessingCard | Agent-generated morning inspiration |
| FocusCard | AI-suggested focus area; refreshes on button click (900ms) |
| ActionsCard | "Agent can prioritise" hint; proof integration via handleProofRequest |
| HabitsCard | "Agent is tracking N habits" note; proof integration |
| AtRiskCard | Agent-predicted slippage risks |
| EnergyCard | Agent recommendation adapts to slider value |
| RetrospectiveCard | Agent-guided journaling prompts |
| IfDayThenCard | Agent-surfaced conditional rules (day-aware) |
| TomorrowCard | Auto-plan generation (1.1s) |

## Proof Integration

```
Task/habit completed
→ handleProofRequest(name, difficulty, onApproved, streak?)
→ ProofEngine.shouldRequestProof(task, MOCK_USER)
→ if required: open ProofModal
→ if not: call onApproved() immediately
→ ProofModal submission: call onSubmitted() → onApproved() → task/habit marked done
```

## Cycle Integration

- CycleTodayCard (first card in stack) shows: cycle name, current week, progress bar, momentum score, this week's priorities (top 3), upcoming milestone warning, agent note
- Weekly planning link connects to `/cycle/weekly-planning`

## Vision Integration

- VisionAlignCard (second card in stack) shows: alignment score (74%), SVG donut ring, 3 agent insights, legacy reminder, link to `/vision`

## Notes for Engineers

- `MOCK_USER` object must be replaced with real authenticated user from auth context
- `INIT_ACTIONS` and `INIT_HABITS` are hardcoded. Replace with API data
- Card order and collapsed state are not persisted. Add localStorage or user profile storage
- `Zap` was already imported in the original file — do not re-import from lucide-react
- `getCurrentCycle()` imported from `cycleEngine.ts` — must use `import type` for type imports only

## Notes for Designers

- The card stack should have a subtle staggered entrance animation (50ms between cards)
- The CycleTodayCard and VisionAlignCard should look like a "situation report" — scannable in 5 seconds
- On mobile: ↑↓ reorder arrows should become drag handles
- The "Add Card" button at the bottom should open a card picker panel, not a blank card
- Consider a "Focus Mode" that shows only the 3 highest-priority cards full-screen
