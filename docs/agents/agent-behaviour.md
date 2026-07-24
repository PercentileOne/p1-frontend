# Agent Behaviour

## Behavioural Principles

The P1 Agent operates on five core behavioural principles:

### 1. Specificity over Generality
Every agent output must reference actual data from the user's context. Generic phrases are forbidden.

### 2. Proactive, Not Reactive
The agent does not wait to be asked. It surfaces insights, risks, and suggestions automatically — at the right moment in the user's workflow.

### 3. Honesty over Comfort
If a goal is behind, the agent says so. If a streak is at risk, it flags it. If behaviour patterns don't match claimed completions, it requests proof. The agent is not a cheerleader — it is an honest partner.

### 4. Brevity over Thoroughness
Agent messages are short. One or two sentences maximum per insight. The user is busy. The agent respects their time.

### 5. Actionability
Every agent output either conveys a specific fact OR offers a specific recommendation. Observations without a "so what" are deleted.

## Timing of Agent Appearances

| Trigger Type | Example | Agent Response |
|-------------|---------|---------------|
| On render | CycleDashboard loads | Risk detection runs, insights displayed |
| User input (debounced) | Goal title typed | Suggestion pool activated after 320ms |
| Button click (simulated async) | "Generate Milestones" | 1.1s spinner → milestone list |
| Completion event | Task marked done | ProofEngine evaluates → modal or pass |
| Slider move | Energy level changed | Agent recommendation updates |
| Empty state | AtRiskCard all dismissed | "All goals on track" |
| Step completion | WeeklyPlanning Step 3 done | Agent Brief auto-loads on step 4 |

## Agent Output Types

### Insight Banners
Used on: VisionPage header, CycleDashboard, WeeklyPlanningPage.

Structure:
```
[Sparkles icon] [Label in caps, small, indigo]
[1–2 sentence body in slate-400]
```

### Inline Insight Cards
Used inside card components (AreaCard, GoalCard, habit cards).

Structure:
```
[Sparkles icon] [Body text in slate-400, small]
```

### Risk Alerts
Used on: CycleDashboard, WeeklyPlanningPage Step 4, TodayPage AtRiskCard.

Structure:
```
[AlertTriangle icon in red/amber] [Title in red/amber]
[Description] [Recommendation in indigo-300]
```

### Suggestion Lists
Used on: VisionPage (AI generate), GoalCreatePage (title suggestions, milestones), WeeklyPlanningPage (adjustments).

Structure:
```
[ChevronRight icon in indigo-500] [Item text]
× N items
```

### Proof Analysis
Used on: ProofModal success state, ProofPage expanded cards, AdminPage expanded cards.

Structure:
```
[Sparkles icon] [Analysis text (1–2 sentences)]
```

## Agent Badge Pattern

Cards with agent intelligence display a badge in the card header:

```tsx
{agent && (
  <span className="flex items-center gap-1 text-[9px] font-bold text-indigo-400/70
    bg-indigo-600/10 border border-indigo-500/15 px-2 py-0.5 rounded-full">
    <Sparkles size={9}/> Agent
  </span>
)}
```

23 cards total; approximately 14 are agent-enhanced.

## Simulation Delays

The v0.1 agent uses intentional delays to simulate AI processing. These are UX-honest — they set the expectation that real work is happening, making the output feel more credible when it arrives.

| Action | Delay | Reason |
|--------|-------|--------|
| FocusCard refresh | 900ms | Short AI task |
| GoalCreate Step 5 milestones | 1100ms | Medium AI task |
| WeeklyPlanning Step 4 brief | 1100ms | Medium AI task |
| ProofModal submit | 1200ms | Analysis + storage |
| VisionPage Agent Reflect | 1200ms | Deep synthesis |
| AdminPage action (approve etc.) | 420ms | API call simulation |
| TomorrowCard auto-plan | 1100ms | Schedule generation |
| WeeklyPlanning launch | 800ms | Confirmation processing |
| EndReview start next cycle | 1000ms | Transition processing |

## ProofEngine Behaviour Signals

The ProofEngine uses these behavioural signals to adjust proof frequency:

| Signal | Effect |
|--------|--------|
| `trustScore` | Higher trust → lower proof probability (modulator: `1 - (trust-50)/180`) |
| `mismatchCount > 3` | Always triggers proof |
| `streak > 30 AND trust < 60` | Always triggers proof |
| `difficulty === "epic" AND trust < 70` | Always triggers proof |
| Random 4% | Keeps users on their toes regardless of trust |
| `streak > 14` | Streak integrity check (probability = min 45%, streak × 1.2%) |
| `progress 40–65%` | Mid-progress check (18% probability) |

## BehaviourMonitor Signals (Production)

In production, BehaviourMonitor should track:

| Signal | How to Detect |
|--------|--------------|
| Completion velocity | Tasks completed per hour vs. historical average |
| Session length vs. output | Long sessions with few completions = possible bulk-marking |
| Time-of-day pattern | Completions at 3am when user usually acts at 7am |
| Streak interruption patterns | Interrupted at same point across multiple cycles |
| Reflection quality | Short reflections on high-difficulty tasks |
| Device fingerprint consistency | Proof submitted from different device |

## Agent Silence Rule

The agent does NOT generate output in these situations:
- When the user is in the middle of a multi-step flow (steps 1–4 of wizard)
- When all signals are nominal (no risk, good momentum, high trust)
- When the user has dismissed an alert (don't re-surface same alert in same session)
- When there is genuinely nothing to say (show nothing, not placeholder text)
