# Today Engine

## Purpose

The Today Screen is the most important screen in P1. It is where Vision, Goals, Cycles, and Agent intelligence converge into a single daily interface. It is the user's daily cockpit — the place where they start, execute, and close each day.

## Route

`/today` → `TodayPage.tsx`

## Design Philosophy

The Today Screen is a **modular card stack**. Each card represents one domain of daily life. Cards are:
- Collapsible (toggle with header click)
- Reorderable (↑↓ arrows appear on card hover)
- Agent-enhanced (Sparkles badge on cards with AI logic)
- Cycle-aware (CycleTodayCard surfaces cycle priorities)
- Proof-integrated (ActionsCard and HabitsCard trigger ProofEngine)

## The 23 Cards

| ID | Title | Type | Agent |
|----|-------|------|-------|
| `cycleEngine` | 12-Week Cycle | Micro summary | ✓ |
| `visionAlign` | Vision Alignment | Micro summary | ✓ |
| `blessing` | Morning Blessing | Display | ✓ |
| `yesterday` | Thoughts From Yesterday | Prompt | — |
| `gratitude` | Morning Gratitude | Input list | — |
| `morning` | Morning Routine | Checklist | — |
| `focus` | Focus For Today | AI suggestion | ✓ |
| `actions` | Today's Actions | Task list | ✓ |
| `habits` | Habits For Today | Habit tracker | ✓ |
| `atrisk` | At Risk | Alert list | ✓ |
| `energy` | Energy & Wellbeing | Slider | ✓ |
| `meals` | Meals & Nutrition | Log | — |
| `shopping` | Shopping List | Checklist | — |
| `retrospective` | Retrospective | Journal | ✓ |
| `ifdaythen` | If Day · Then Do | Conditional rules | ✓ |
| `afternoon` | Afternoon Routine | Checklist | — |
| `feel` | How Do I Feel | Mood selector | ✓ |
| `makegreat` | How Will I Feel Great | Mood intervention | ✓ |
| `expectations` | Today's Expectations | Input | — |
| `ideas` | Ideas & Inspiration | Capture list | ✓ |
| `notes` | Important Notes | Freeform | — |
| `evening` | Evening Routine | Checklist | — |
| `tomorrow` | Skeleton Plan | Tomorrow builder | ✓ |
| `gratitude2` | Evening Gratitude | Input list | — |

## TodayCard Wrapper

Every card is wrapped in `TodayCard`:

```tsx
function TodayCard({ title, icon, accent, agent, collapsed, onToggle,
                     onMoveUp, onMoveDown, children }) {
  const [hovered, setHovered] = useState(false);
  // Shows ↑↓ arrows on hover via AnimatePresence
  // Collapses/expands via AnimatePresence height 0→auto
  // Shows Sparkles "Agent" pill if agent={true}
}
```

## Key Card Behaviours

### CycleTodayCard
- Reads `getCurrentCycle()` from cycleEngine
- Shows: cycle progress bar, momentum score, week priorities (top 3), upcoming milestones alert, agent note
- Links to `/cycle`

### VisionAlignCard
- Hardcoded score (74%)
- SVG donut ring animation
- 3 agent insights with icons
- Legacy reminder in amber
- Links to `/vision`

### ActionsCard
- Task list with priority badges
- Add new task via inline input (Enter key or + button)
- Delete task on hover (Trash icon)
- Toggle completion → calls `onProofRequest()`
- If proof required: ProofModal opens before task is marked done
- If proof not required: task completes immediately

### HabitsCard
- Habit list with streak counters
- Streaks colour-coded: orange ≥20d, amber ≥10d, grey otherwise
- Toggle → calls `onProofRequest()` with habit name + streak

### FocusCard
- Displays AI-suggested focus area
- "Refresh" button: 900ms simulated delay → new suggestion
- Agent branding: Sparkles + indigo border

### EnergyCard
- Range input 0–5
- Agent recommendation adapts to slider value:
  - ≤1: "Rest mode — defer non-critical tasks"
  - 2: "Gentle pace"
  - 3: "Steady work"
  - 4: "High performance mode"
  - 5: "Flow state — protect this block"

### AtRiskCard
- Dismissable alert cards (X button removes from list)
- Red/amber severity variants
- Shows "All goals are on track" empty state (green CheckCircle2)

### IfDayThenCard
- Reads day of week from `new Date()` at module load time
- `isSunday`, `isMonday`, `isLastOfMonth` constants
- Matching rules auto-activate with green highlight

### TomorrowCard
- 5 time slots (Morning, Mid-Morning, Afternoon, Late Afternoon, Evening)
- Auto-plan button: 1.1s delay → fills slots with AI suggestions
- Each slot editable inline

## Proof Integration

ProofEngine integration lives at the TodayPage level:

```tsx
// In TodayPage:
const MOCK_USER = { id:"u1", trustScore:78, behaviourScore:82, ... }
const [proofModal, setProofModal] = useState<ProofModalState | null>(null)

function handleProofRequest(taskName, difficulty, onApproved, streak?) {
  const decision = ProofEngine.shouldRequestProof(task, MOCK_USER)
  if (decision.required) setProofModal({ ..., onApproved })
  else onApproved()
}

// Cards receive:
<ActionsCard onProofRequest={handleProofRequest}/>
<HabitsCard  onProofRequest={handleProofRequest}/>

// Modal at bottom of return:
{proofModal && <ProofModal ... onSubmitted={() => {
  proofModal.onApproved()
  setProofModal(null)
}}/>}
```

## Cycle Integration

- `CycleTodayCard` (first card) reads current cycle data
- Shows this week's priorities (top 3)
- Shows upcoming milestone warnings
- Shows cycle progress bar + momentum score
- Links to `/cycle`

## Vision Integration

- `VisionAlignCard` (second card) shows alignment score
- Shows 3 vision-specific agent insights
- Shows legacy reminder
- Links to `/vision`

## Card State

```ts
const [cardOrder, setCardOrder] = useState<string[]>([...23 card IDs])
const [collapsed, setCollapsed]  = useState<Record<string, boolean>>({})
```

Reordering swaps adjacent indices. Collapsing toggles the boolean.

## Notes for Engineers

- `MOCK_USER` in TodayPage.tsx must be replaced with a real authenticated user object from context/store.
- `INIT_ACTIONS` and `INIT_HABITS` are hardcoded arrays. Replace with user-specific data from API.
- `isSunday`, `isMonday`, `isLastOfMonth` are computed at module load time. This means they won't update if the day changes while the app is open (edge case — acceptable for now).
- The card order and collapsed state are lost on refresh. In production, persist to localStorage or the user's profile.
- All agent "simulations" (async delays) should be replaced with real Claude API calls in production.
- The TodayPage returns a large JSX tree. Consider lazy-loading non-visible cards to improve initial render time.

## Notes for Designers

- The Today Screen is used every day — it must be fast, frictionless, and feel like home.
- The card stack should load with a subtle staggered animation (cards sliding in top-to-bottom) to create a sense of depth.
- The collapse/expand animation must be smooth. Current `height: 0 → auto` via Framer Motion is correct.
- The "Agent" badge (Sparkles + "Agent" text, indigo) should be subtle — it should feel like ambient intelligence, not a feature label.
- On mobile, the ↑↓ reorder arrows should be replaced with a drag handle.
- The CycleTodayCard and VisionAlignCard at the top should feel like a "situation report" — data-dense but scannable in 5 seconds.
- Consider an optional "Focus Mode" that shows only the top 3 cards full-screen.
