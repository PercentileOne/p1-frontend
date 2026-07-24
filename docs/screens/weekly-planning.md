# Weekly Planning

**Route**: `/cycle/weekly-planning`  
**File**: `src/frontend/src/pages/WeeklyPlanningPage.tsx`  
**Type**: 5-step wizard

## Purpose

The Weekly Planning screen is the user's weekly execution ritual inside a cycle. It is a structured 5-step wizard that reviews last week's performance, sets this week's targets, identifies priorities, receives an agent brief, and commits to the plan. It should take 5–10 minutes and leaves the user with a clear, confirmed plan for the next 7 days.

## User Flow

```
User opens /cycle/weekly-planning
→ Step 1: Last Week Review — shows previous week completion %, wins, carries forward
→ Step 2: Set Targets — per-goal numeric targets (inline editable)
→ Step 3: Priorities — ranked list of 3–5 priorities for the week
→ Step 4: Agent Brief — agent generates analysis (700ms) → shows 4 priority cards
→ Step 5: Confirm & Start — summary + "Start Week N" button
→ Plan locked: user redirected to /cycle
```

## Inputs

- Current cycle from `getCurrentCycle()`
- Last week's completion data (from `cycle.weeklyPlans[currentWeek - 2]` if exists)
- User edits to targets (inline input, Enter to save, Escape to cancel)
- User priority order (reorderable list)

## Outputs

- Updated weekly plan saved to `CURRENT_CYCLE.weeklyPlans` (in-memory)
- Plan locked status set to `true`
- Navigation to `/cycle` on completion

## Agent Logic

- Step 4: 700ms simulated agent analysis
- 4 priority cards generated from `CycleAgent.generateWeeklyTargets(cycle, weekNum)`
- Each card shows: goal name, target, why it matters this week
- Agent notes written to `currentPlan.agentNotes`

## Proof Integration

No proof requests in weekly planning. Proof happens at task/habit completion on the Today Screen.

## Cycle Integration

Core cycle workflow. Updates `CURRENT_CYCLE.weeklyPlans[currentWeek - 1]` with the confirmed plan.

## Vision Integration

Agent brief (Step 4) references which vision areas are served by this week's priorities.

## Notes for Engineers

- Step state: `useState<1|2|3|4|5>(1)`
- Inline target editing: `editIdx: number | null`, `editVal: string`
- `onKeyDown`: Enter saves, Escape cancels, other keys update `editVal`
- StepDot progress: 5 dots, filled = completed steps, current = indigo ring
- `AnimatePresence mode="wait"` wraps step content for slide transitions

## Notes for Designers

- Steps should transition left-to-right (forward) and right-to-left (back)
- The inline target editor should show on hover with an Edit3 icon
- Step 4 (Agent Brief) should feel like a loading moment — spinner, then reveal
- The final confirmation step should feel like a commitment ritual, not a summary
- Progress dots at top should be sticky so the user always knows which step they're on
