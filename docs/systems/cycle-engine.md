# Cycle Engine

## Purpose

The 12-Week Cycle Engine is the performance backbone of P1. It provides structured 12-week execution containers that connect Vision → Goals → Daily Actions. Each cycle has a theme, intention, momentum score, weekly plans, and comprehensive agent oversight. It answers the question: "What are you building in the next 12 weeks, and how is it going?"

## Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/cycle` | CycleDashboard | Active cycle overview |
| `/cycles` | CycleListPage | All cycles archive |
| `/cycle/weekly-planning` | WeeklyPlanningPage | 5-step weekly planning wizard |
| `/cycle/mid-review` | MidReviewPage | Week 6 checkpoint |
| `/cycle/end-review` | EndReviewPage | Week 12 wrap-up |

## Module Location

`src/frontend/src/lib/cycleEngine.ts`

## Cycle Structure

A `Cycle` object contains:

```ts
{
  id, name, number, status,
  startDate, endDate,         // 84-day window
  goals: CycleGoal[],         // goals assigned to this cycle
  weeklyPlans: WeeklyPlan[],  // 12 weekly plans
  currentWeek: number,        // 1–12
  momentumScore: number,      // 0–100, computed
  overallProgress: number,    // 0–100
  totalPoints, earnedPoints,
  risks: CycleRisk[],
  insights: CycleInsight[],
  visionAlignment: number,    // 0–100
  trustScoreImpact: number,   // delta from cycle start
  behaviourScore: number,
  theme: string,              // "Foundation" | "Acceleration" | "Mastery"
  intention: string,          // User's cycle commitment statement
}
```

## Current Cycle (Synthetic Data)

**Cycle 3 — Summer 2026**
- Start: 2026-05-04, End: 2026-08-02
- Current Week: 6 (mid-cycle)
- 5 Goals, 18 Milestones
- Momentum Score: ~72
- Vision Alignment: 82%

Goals in Cycle 3:
1. Complete AWS Solutions Architect Certification (hard, 62%)
2. Build & Launch P1 Beta (epic, 55%)
3. Daily Exercise — 84 Days (hard, 50%)
4. Read 3 Business Books (medium, 67%)
5. Reduce Body Fat to 15% (hard, 40%)

## CycleAgent Methods

### `calculateMomentumScore(cycle)`
```
score = (milestones_done/milestones_total * 40)
      + (avg_week_completion/100 * 40)
      + (behaviourScore/100 * 20)
```
Returns 0–100.

### `generateWeeklyTargets(cycle, weekNum)`
Maps cycle goals to `WeeklyTarget[]` for the given week. Flags proof-required for hard/epic goals and weeks 6/12.

### `detectCycleRisk(cycle)`
Returns `CycleRisk[]` based on:
- **Progress lag**: `expectedProgress - overallProgress > 15` → risk
- **Milestone due**: milestones with `dueWeek <= currentWeek + 1` and not completed
- **Streak risk**: goals with `streak < 3` and difficulty != "easy"

### `generateCycleInsights(cycle)`
Returns `CycleInsight[]` covering momentum, achievements, vision alignment, and top risk.

### `generateMidReview(cycle)`
Returns `string[]` — 5 sentences covering momentum, progress status, lagging goals, trust score, and proof integrity.

### `generateEndReview(cycle)`
Returns `string[]` — sentences covering final momentum, completions, partial goals, carry-forwards, trust delta, and vision alignment.

### `suggestAdjustments(cycle)`
Returns `string[]` — 2–3 tactical recommendations based on active risks.

## Weekly Plan Structure

```ts
interface WeeklyPlan {
  weekNumber: number,       // 1–12
  startDate, endDate: Date,
  priorities: string[],     // 3–5 key items
  targets: WeeklyTarget[],  // per-goal targets
  energyLevel: number,      // 1–5
  keyFocus: string,         // theme for the week
  agentNotes: string,       // agent summary
  completionRate: number,   // 0–100 (retrospective)
  locked: boolean,          // true for past weeks
}
```

## Milestone Status Flow

```
upcoming → in_progress → completed
    ↓                         ↑
  at_risk ──────────────────┘
    ↓
  missed
```

## Momentum Score Interpretation

| Score | Meaning |
|-------|---------|
| 80–100 | Exceptional momentum — on track or ahead |
| 60–79 | Good momentum — some risk areas |
| 40–59 | Moderate — intervention recommended |
| Below 40 | At risk — cycle may fail without significant change |

## Weekly Planning Flow (5 Steps)

1. **Review Last Week** — completion rate, completed/missed items, proof summary, agent reflection
2. **Set Targets** — agent pre-fills from goal weekly targets; user can edit any target
3. **Set Priorities** — user defines 3–5 key priorities + sets energy level (1–5)
4. **Agent Brief** — risk detection, energy planning, habit reinforcement, time allocation chart, cycle adjustments
5. **Confirm & Launch** — summary of priorities + targets + energy → "Start Week" button → LaunchSuccess screen

## Mid-Cycle Review (Week 6)

Covers:
1. Progress at Week 6 vs expected (50%)
2. Agent analysis (5 bullet points)
3. Per-goal progress bars with expected midpoint marker
4. Risk analysis with recommendation text
5. Proof & integrity summary
6. Agent adjustment recommendations
7. Navigation to Plan Week 7

## End-Cycle Review (Week 12)

Covers:
1. Final momentum score, points, milestones, trust delta
2. Goals completed / in progress / missed
3. Agent end-cycle summary (5–6 sentences)
4. Identity shifts (what the user became)
5. Proof verification summary
6. Vision progress per arc
7. Lessons learned (4 items)
8. "Start Next Cycle" launch

## Proof Integration

| Proof Trigger | When |
|--------------|------|
| Mid-progress proof | Milestone at dueWeek ≤ currentWeek + 1 (Shield icon on milestone) |
| Weekly proof | `proofRequired: true` in WeeklyTarget (hard/epic goals) |
| End-cycle proof | Final milestone submission required before EndReview completion |
| Behaviour mismatch | CycleAgent.detectCycleRisk detects lag → feeds ProofEngine mismatch flag |
| Random | ProofEngine handles random checks; cycles don't add separate random layer |

## Vision Integration

- `CURRENT_CYCLE.visionAlignment = 82%` — how much the cycle serves the Vision
- Each `CycleGoal.linkedVision` lists the Vision areas served
- CycleDashboard Insights tab: Vision Alignment breakdown per goal
- EndReviewPage: per-vision-arc contribution summary
- CycleTodayCard on TodayPage displays cycle momentum + current week priorities

## Notes for Engineers

- `CURRENT_CYCLE` is a module-level singleton. `getCycles()` returns a combined array of `PAST_CYCLES + CURRENT_CYCLE`. In production, replace with API fetch.
- `weekStart()` and `weekEnd()` helpers are pure functions in `cycleEngine.ts`.
- The `locked` field on `WeeklyPlan` determines whether a week is editable. Past weeks are always locked.
- The ProgressChart in CycleDashboard renders actual progress as a line. The "actual" data is interpolated from `completionRate` on past `WeeklyPlan` objects.
- When implementing real weekly locking: week N locks at the end of day Sunday of that week (UTC midnight).
- The cycle ID format is `cycle_{number}`. In production use UUID v4.

## Notes for Designers

- The CycleDashboard hero card is the centrepiece of the experience. The momentum gauge (donut ring) should animate smoothly on page load.
- The momentum score should change colour: green (≥75), amber (55–74), red (<55).
- Weekly plan "past weeks" should feel faded vs. the current week highlighted with a distinct border.
- The WeeklyPlanningPage 5-step wizard should feel progressive, not overwhelming. One clear action per step.
- Mid-Cycle and End-Cycle review pages have different emotional tones: mid = assessment (amber), end = celebration + reflection (gold).
- The "Start Next Cycle" CTA on EndReviewPage should be the most prominent button on the entire screen.
