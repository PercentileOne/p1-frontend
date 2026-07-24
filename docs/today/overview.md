# Today System Overview

The Today System is the daily execution interface of P1. It is a configurable stack of 23 cards that the user works through each day. Everything else in P1 — Vision, Goals, Cycles, Proof — feeds into the Today Screen.

## Core Files

| File | Role |
|------|------|
| `src/frontend/src/pages/TodayPage.tsx` | Main screen, all card components, proof integration |
| `src/frontend/src/lib/proofEngine.ts` | Proof decisions for task/habit completion |
| `src/frontend/src/lib/cycleEngine.ts` | Cycle data for CycleTodayCard |
| `src/frontend/src/components/ProofModal.tsx` | Proof submission modal |

## Card Inventory (23 Cards)

| ID | Title | Type | Agent |
|----|-------|------|-------|
| cycleEngine | 12-Week Cycle | Info | Yes |
| visionAlign | Vision Alignment | Info | Yes |
| blessing | Morning Blessing | Ritual | Yes |
| focus | Today's Focus | AI | Yes |
| actions | Priority Actions | Execution | Yes |
| habits | Habits | Execution | Yes |
| atRisk | At Risk | Warning | Yes |
| energy | Energy Level | Reflection | Yes |
| meals | Meal Log | Tracking | No |
| water | Hydration | Tracking | No |
| reading | Reading | Learning | No |
| gratitude | Morning Gratitude | Ritual | No |
| eveningGratitude | Evening Gratitude | Ritual | No |
| journalPrompt | Journal Prompt | Reflection | Yes |
| affirmations | Daily Affirmations | Ritual | No |
| retrospective | Daily Retrospective | Reflection | Yes |
| ifDayThen | If-Day-Then-Do | Conditional | Yes |
| shopping | Shopping List | Utility | No |
| notes | Daily Notes | Utility | No |
| tomorrow | Tomorrow's Skeleton | Planning | Yes |
| eveningRoutine | Evening Routine | Ritual | No |
| wins | Today's Wins | Celebration | No |
| messages | Messages | Social | No |

## Proof Integration Pattern

```typescript
// Called when user marks any task or habit complete
const handleProofRequest = (
  taskName: string,
  difficulty: "easy" | "medium" | "hard" | "epic",
  onApproved: () => void,
  streak?: number
) => {
  const task = { id: Date.now().toString(), name: taskName, difficulty, streak: streak ?? 0, isHabit: false };
  const decision = ProofEngine.shouldRequestProof(task, MOCK_USER);
  if (decision.required) {
    setProofModal({ taskName, taskId: task.id, difficulty, streak, decision, onApproved });
  } else {
    onApproved(); // complete immediately without proof
  }
};
```

## Card Architecture

Each card follows this pattern:
```
<TodayCard id="..." title="..." icon={...} meta={CARD_META["..."]} ...>
  {/* card content */}
</TodayCard>
```

`TodayCard` provides: collapse/expand toggle, reorder arrows (↑↓), agent badge, accent colour, and consistent header styling.

`CARD_META` maps card ID to: `{ title, icon, accent, agent }`.

## State Architecture

| State | Type | Scope |
|-------|------|-------|
| Card order | `string[]` | TodayPage |
| Collapsed cards | `Set<string>` | TodayPage |
| Proof modal | `ProofModalState \| null` | TodayPage |
| Task list | `Task[]` | ActionsCard |
| Habit list | `Habit[]` | HabitsCard |
| Energy level | `number` (0–5) | EnergyCard |
| Focus text | `string` | FocusCard |
| Gratitude entries | `string[]` | GratitudeCard |

All state is in-memory (resets on refresh). Persistence is a production concern.

## Production Roadmap

- Persist card order and collapsed state per user (localStorage or API)
- Real task/habit data from API
- Card suggestions from agent based on cycle priorities
- "Focus Mode" — show only 3 highest-priority cards full-screen
- Daily summary email/notification generated from card state at end of day
