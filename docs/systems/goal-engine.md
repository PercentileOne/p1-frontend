# Goal Engine

## Purpose

The Goal Engine is the commitment layer of P1. It transforms vague aspirations into structured, scored, milestone-backed commitments with automatic proof requirements and cycle assignment. Goals are the primary unit of progress measurement across the entire platform.

## Routes

- `/goals` → `GoalsPage.tsx` — Goal dashboard
- `/goals/create` → `GoalCreatePage.tsx` — 7-step creation wizard

## Goal Anatomy

A goal in P1 has:

| Field | Description |
|-------|-------------|
| `title` | Clear, outcome-focused name |
| `type` | Categorised by life area |
| `description` | Optional detail |
| `difficulty` | `easy / medium / hard / epic` |
| `impact` | `low / moderate / high / transformational` |
| `consistency` | `one_off / habit / streak / multi_milestone` |
| `milestones` | Timed checkpoints (auto-generated or user-defined) |
| `totalPoints` | Calculated score from difficulty × impact × consistency |
| `startDate` | When work begins |
| `targetDate` | Deadline |

## Points Formula

```ts
base[difficulty]:   easy=100, medium=250, hard=450, epic=750
impact_multiplier:  low=1.0, moderate=1.2, high=1.5, transformational=2.0
consistency_multiplier: one_off=1.0, habit=1.1, streak=1.3, multi_milestone=1.2

totalPoints = Math.round(base * impact_mul * consistency_mul) + (milestoneCount * 25)
```

Example: Hard goal, High impact, Streak consistency, 4 milestones:
`Math.round(450 × 1.5 × 1.3) + (4 × 25) = 878 + 100 = 978 points`

## 7-Step Creation Wizard

### Step 1 — Goal Title + Intelligent Suggestions
User types their goal. After 320ms debounce, `getSuggestions(title)` pattern-matches the input and returns 3 pre-written alternatives:

```
Keyword groups: fast/water/omad → fasting suggestions
               fitness/gym/run  → fitness suggestions
               career/aws/code  → career suggestions
               read/book        → reading suggestions
               save/money       → financial suggestions
```

### Step 2 — Goal Type
User selects a goal category (health, career, wealth, relationships, etc.)

### Step 3 — Dates
Start date and target date. Calculates timeframe automatically.

### Step 4 — Scoring
User selects Difficulty, Impact, Consistency. Points calculator updates in real-time as selections change.

### Step 5 — Auto-Milestone Generation
User clicks "Generate Milestones". Agent spinner runs for 1.1s. `generateMilestones(title, goalType)` produces:

- Fasting goals: Day-by-day milestones (Day 1, Day 3, Day 7, etc.)
- Fitness/career/reading/general: Phase-based milestones (Foundation, Development, Mastery, Completion)

User can edit, delete, or add milestones.

### Step 6 — Points Breakdown
Animated progress bar shows points potential. Breakdown table shows base, multipliers, milestone bonus.

### Step 7 — Mission Briefing
Cinematic confirmation screen:
- Meta grid: 6 fields (type, difficulty, impact, consistency, dates, milestones)
- Milestone list with dates
- Points summary
- 4 agent insights (auto-generated from goal properties)
- "Launch Goal" button

### Post-Launch
`LaunchSuccess` overlay animates in:
- Zap icon animation
- 5 agent action items with staggered fade-in
- Two navigation buttons: Goals Dashboard or Today Screen

## Intelligent Suggestions

```ts
function getSuggestions(title: string): string[] {
  const t = title.toLowerCase();
  if (t.includes("fast") || t.includes("omad"))
    return ["Complete a 7-Day Water Fast", "Do a 3-Day Reset Fast", ...];
  // ... pattern groups
}
```

## Auto-Milestone Generation

```ts
function generateMilestones(title: string, goalType: string): Milestone[] {
  if (fasting keywords) return day-progression milestones;
  if (fitness keywords)  return phase milestones;
  // etc.
}
```

## Inputs

- User text input (goal title)
- User selections (type, difficulty, impact, consistency)
- User date selections (start, target)
- User edits to milestones (add, remove, edit title/date)

## Outputs

- Goal object with all fields populated
- Milestone list (3–8 milestones depending on type)
- Total points calculated
- Agent action items (5 bullet points)
- Navigation to Today or Goals dashboard

## Agent Logic

| Location | Trigger | Output |
|----------|---------|--------|
| Step 1 | Title typed (debounced 320ms) | 3 alternative goal suggestions |
| Step 5 | "Generate Milestones" click | 1.1s spinner → milestone list |
| Step 7 | Mission Briefing render | 4 goal-specific agent insights |
| LaunchSuccess | Post-launch | 5 agent action items |

## Proof Integration

Goals themselves don't trigger proof. Proof is triggered when:
- A task derived from a goal is completed on TodayPage
- A cycle milestone linked to a goal is due
- The goal has `difficulty === "epic"` (48% base proof probability)

## Cycle Integration

- CycleGoal wraps a goal with cycle-specific fields (progress, weeklyTarget, streak, etc.)
- In GoalCreatePage, planned feature: "Assign to current cycle?" toggle in Step 2
- CycleDashboard GoalCard shows goal progress within the cycle
- Milestones are tracked at the cycle level (`CycleMilestone` wraps the base milestone)

## Vision Integration

- GoalsPage header has a "Vision" link → `/vision`
- GoalCreatePage header has a "Vision" link → `/vision`
- In the cycle system, `CycleGoal.linkedVision` maps each goal to 1–2 vision areas

## Notes for Engineers

- Goal creation currently produces no persistent side effects. In production, POST to `/api/goals` on "Launch Goal" click.
- `getSuggestions()` and `generateMilestones()` are pure functions in GoalCreatePage.tsx. Extract to `lib/goalEngine.ts` as the codebase grows.
- The LaunchSuccess overlay hides the rest of the page (fixed positioned). Ensure z-index is above all other elements.
- The points formula should live in a shared utility so GoalsPage and CycleDashboard compute the same values.
- `DoneStep` in the wizard uses the step number and a hardcoded label map. Keep in sync with `STEP_LABELS`.

## Notes for Designers

- The Mission Briefing (Step 7) is the emotional peak of the creation flow. It should feel like a contract, not a form confirmation.
- The animated progress bar in Step 6 (`initial={{width:0}} animate={{width:...}}`) should be fast (0.4–0.6s) to feel responsive.
- The cinematic launch overlay should use the full viewport — no partial modal.
- Points display should use a large, bold, golden number (`text-yellow-400`) to make it feel like a reward.
- The "difficulty" selector in Step 4 should visually communicate the commitment level — "epic" should feel intimidating and exciting.
- Consider adding a visual "timeline" component to Step 3 to show the goal arc at a glance.
