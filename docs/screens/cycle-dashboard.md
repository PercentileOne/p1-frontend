# Cycle Dashboard

**Route**: `/cycle`  
**File**: `src/frontend/src/pages/CycleDashboard.tsx`  
**Type**: Cycle health hub

## Purpose

The Cycle Dashboard is the command centre for the active 12-week cycle. It shows the headline momentum score, progress vs. target trajectory, goal-level completion, milestone status, and agent insights. It is the first place a user goes when they want to understand how their cycle is performing.

## User Flow

```
User navigates to /cycle (via sidebar or CycleTodayCard link)
→ Header shows cycle name, week, dates, momentum score ring
→ 4 tabs: Overview | Goals | Milestones | Insights
→ Overview: SVG line chart (actual vs. target), risk badges, agent insights
→ Goals tab: expandable GoalCard per cycle goal (progress bar, target, streak)
→ Milestones tab: milestones grouped by status (completed/in-progress/upcoming/missed)
→ Insights tab: agent observations + suggested adjustments
→ CTA buttons: Weekly Planning, Mid-Cycle Review (if week ≥ 6), End Review (if week ≥ 11)
```

## Inputs

- `getCurrentCycle()` from `cycleEngine.ts` — returns the full `Cycle` object
- `CycleAgent.generateCycleInsights(cycle)` — text insights
- `CycleAgent.suggestAdjustments(cycle)` — adjustment recommendations
- Current week (from `cycle.currentWeek`)

## Outputs

- Navigation to `/cycle/weekly-planning`, `/cycle/mid-review`, `/cycle/end-review`
- No data mutations (read-only dashboard)

## Agent Logic

- Momentum score badge: green (≥75), amber (≥50), red (<50)
- Risk badges from `CycleAgent.detectCycleRisk(cycle)`: `lag_risk`, `milestone_risk`, `streak_risk`
- Insights tab: 3–4 agent paragraphs from `generateCycleInsights()`
- Adjustment cards from `suggestAdjustments()`: per-goal text advice
- SVG ProgressChart compares actual completion (interpolated per week) vs. linear target

## Proof Integration

- Milestone cards show proof status: `proof_required`, `verified`, none
- Proof counts shown per goal (`proofCount` field on `CycleGoal`)

## Cycle Integration

- Primary cycle data display: momentum, completion rate, week, days remaining
- Links to all cycle sub-routes

## Vision Integration

- `linkedVision` field on each `CycleGoal` shown in GoalCard (which vision area this goal serves)

## Notes for Engineers

- `ProgressChart` SVG uses `W=560, H=140, PAD=32` — scale adjusts to current week
- The actual trajectory line uses `strokeDasharray` for a dashed/partial effect
- Tab state: `useState<"overview"|"goals"|"milestones"|"insights">`
- GoalCard expanded state: `Set<string>` with `useState`
- `import type` required for all `CycleGoal`, `Milestone`, `CycleRisk` imports

## Notes for Designers

- Momentum score should have a colour-coded ring (SVG donut) not just a number
- The SVG chart should have a subtle grid and axis labels
- The 4 tabs should have a tab bar that sticks below the hero section on scroll
- Completed milestones should use a strikethrough or check-circle visual treatment
- GoalCards should animate open/close with Framer Motion layout animation
