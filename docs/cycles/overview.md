# Cycle System Overview

The 12-Week Cycle Engine is P1's execution container. It converts a user's goals into a structured, time-bounded performance sprint with weekly plans, milestone tracking, momentum scoring, and three review rituals.

## Core Files

| File | Role |
|------|------|
| `src/frontend/src/lib/cycleEngine.ts` | Engine logic, types, data, CycleAgent class |
| `src/frontend/src/pages/CycleDashboard.tsx` | Cycle health hub (`/cycle`) |
| `src/frontend/src/pages/CycleListPage.tsx` | Cycle archive (`/cycles`) |
| `src/frontend/src/pages/WeeklyPlanningPage.tsx` | Weekly planning wizard (`/cycle/weekly-planning`) |
| `src/frontend/src/pages/MidReviewPage.tsx` | Week 6 checkpoint (`/cycle/mid-review`) |
| `src/frontend/src/pages/EndReviewPage.tsx` | Week 12 wrap-up (`/cycle/end-review`) |

## Cycle Lifecycle

```
Create Cycle
→ Assign Goals (up to 5)
→ Week 1–5: Daily execution + weekly planning
→ Week 6: Mid-Cycle Review (course correction)
→ Week 7–11: Continued execution
→ Week 12: End-Cycle Review
→ Archive → Start Next Cycle
```

## Data Structure

```typescript
interface Cycle {
  id: string;
  name: string;
  theme: string;
  startDate: Date;
  endDate: Date;
  currentWeek: number;         // 1–12
  goals: CycleGoal[];
  weeklyPlans: WeeklyPlan[];
  momentumScore: number;       // 0–100
  completionRate: number;      // 0–100
  risks: CycleRisk[];
  insights: string[];
  midReview?: MidReviewData;
  endReview?: EndReviewData;
}
```

## Momentum Score Formula

```
momentumScore = (milestoneDone/milestoneTotal × 40)
              + (avgCompletion/100 × 40)
              + (behaviourScore/100 × 20)
```

Interpretation:
- ≥ 75: Strong momentum, on track
- 50–74: Moderate, course correction advisable
- < 50: At risk, mid-cycle review urgent

## CycleAgent Methods

| Method | Purpose |
|--------|---------|
| `calculateMomentumScore(cycle)` | Returns 0–100 momentum score |
| `generateWeeklyTargets(cycle, week)` | 4 priority items for week |
| `detectCycleRisk(cycle)` | Array of `CycleRisk` objects |
| `generateCycleInsights(cycle)` | 3–4 insight strings |
| `generateMidReview(cycle)` | Mid-cycle text analysis |
| `generateEndReview(cycle)` | End-cycle lessons text |
| `suggestAdjustments(cycle)` | Per-goal adjustment text |

## Risk Detection Logic

```typescript
// Lag risk: any goal >15% behind target
if (goal.progress < expectedProgress - 15) → lag_risk

// Milestone risk: milestone due in ≤1 week, not completed
if (milestone.dueWeek <= currentWeek + 1 && status !== "completed") → milestone_risk

// Streak risk: any habit streak < 3
if (goal.streak < 3) → streak_risk
```

## Demo Data

- Current cycle: "Cycle 3 — Summer 2026", Week 6 (2026-05-04 to 2026-08-02)
- 5 goals with realistic progress (38%–95%)
- 2 past cycles in `PAST_CYCLES`

## Production Roadmap

- Persist cycles and weekly plans in database
- Claude API for all CycleAgent text generation
- Goal progress auto-computed from task completions (not manual percentage)
- Cycle creation wizard (name, theme, goal selection)
- Calendar integration for milestone due dates
