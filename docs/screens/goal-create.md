# Goal Creation Wizard

**Route**: `/goals/create`  
**File**: `src/frontend/src/pages/GoalCreatePage.tsx`  
**Type**: 7-step creation wizard

## Purpose

The Goal Creation Wizard is the most important input flow in P1. It forces the user to specify their goal with precision — difficulty, impact, milestones, proof requirements, and points. The 7-step format prevents half-baked goals from entering the system. Step 7 (Mission Briefing) makes the commitment feel real and significant.

## User Flow

```
User navigates to /goals/create
→ Step 1: Title — text input for goal name
→ Step 2: Type — select (Health, Career, Financial, Personal, Education, Creative, Other)
→ Step 3: Dates — start date, target date (calendar or input)
→ Step 4: Scoring — difficulty slider (easy/medium/hard/epic) + impact selector (low/moderate/high/transformational)
→ Step 5: Milestones — up to 5 milestone cards (title, date, proof required, points)
→ Step 6: Points — display computed points formula with breakdown
→ Step 7: Mission Briefing — full goal summary, agent insights, "Launch Mission" CTA
→ LaunchSuccess overlay: animated Zap, 5 agent action items, navigate to /goals or /today
```

## Inputs

- User text inputs (title, milestone titles)
- User selections (type, difficulty, impact, dates)
- Agent-generated milestone suggestions (from `GoalEngine.getSuggestions(title)`)
- Agent-generated milestone list (from `GoalEngine.generateMilestones(goal)`)

## Outputs

- New goal object created in `goalEngine` (in-memory)
- Navigation to `/goals` or `/today` after launch

## Agent Logic

- Step 1: After title is entered, agent suggests goal improvements (750ms delay)
- Step 5: Agent pre-fills suggested milestones (650ms delay)
- Step 7: Agent generates 3 "this will be hard" honest observations (hardcoded in v0.1)
- LaunchSuccess: 5 items agent will do — "Aligned to your Summer 2026 Vision", "3 milestones created", etc.

## Proof Integration

- Milestone cards have "Proof Required" toggle — if enabled, completing that milestone will trigger a proof request
- Difficulty selection affects the base proof probability for all task completions in this goal

## Cycle Integration

- On Step 7 (Mission Briefing), a "Assign to Cycle" option links the goal to the active cycle
- Assigned goals appear in CycleDashboard GoalCard list

## Vision Integration

- Step 2 (Type) maps to Vision areas (Career → Career, Health → Health, etc.)
- Agent insight in Step 7 references the relevant Vision area: "This goal serves your Career vision."

## Notes for Engineers

- Step state: `useState<1|2|3|4|5|6|7>(1)`
- Points formula: `base × impactMultiplier × consistencyMultiplier + (milestones × 25)`
- `LaunchSuccess` overlay: conditional render with `AnimatePresence`
- Milestone state: `useState<Milestone[]>` — add/remove/edit inline
- Agent suggestions use simulated async with `setTimeout`

## Notes for Designers

- Step 4 (Scoring) is the most important UX moment — make difficulty selection feel consequential
- The points formula in Step 6 should animate as the user changes difficulty/impact
- Step 7 (Mission Briefing) should feel like a briefing room — dark, dramatic, intentional
- LaunchSuccess Zap animation should be full-screen, 2–3 seconds, then settle into the action items
- "Epic" difficulty should have a distinct visual treatment — it's a major commitment
