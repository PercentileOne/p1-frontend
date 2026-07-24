# P1 Data Flow

## Overview

P1 data flows in one primary direction: from high-level identity (Vision) down to daily action (Today), with an integrity feedback loop (Proof → Trust → Agent) that flows back up.

## Primary Data Flow

```
┌─────────────────────────────────────────────────────┐
│                    VISION LAYER                      │
│  I am statements · Area Visions · Year Arcs · Legacy │
└──────────────────────┬──────────────────────────────┘
                       │ Vision alignment score feeds Goals
                       ▼
┌─────────────────────────────────────────────────────┐
│                    GOALS LAYER                       │
│  Goals · Difficulty · Impact · Milestones · Points  │
└──────────────────────┬──────────────────────────────┘
                       │ Goals assigned to Cycles
                       ▼
┌─────────────────────────────────────────────────────┐
│                   CYCLE LAYER                        │
│  12-Week Cycle · Weekly Plans · Momentum Score       │
└──────────────────────┬──────────────────────────────┘
                       │ Cycle surfaces tasks on Today
                       ▼
┌─────────────────────────────────────────────────────┐
│                   TODAY LAYER                        │
│  Actions · Habits · Focus · Routines · Cards        │
└──────────────────────┬──────────────────────────────┘
                       │ Completion triggers Proof check
                       ▼
┌─────────────────────────────────────────────────────┐
│                   PROOF LAYER                        │
│  ProofEngine.shouldRequestProof() → ProofModal      │
└──────────────────────┬──────────────────────────────┘
                       │ Verified proof updates Trust Score
                       ▼
┌─────────────────────────────────────────────────────┐
│                   TRUST LAYER                        │
│  TrustScore · BehaviourScore · MismatchCount        │
└──────────────────────┬──────────────────────────────┘
                       │ Trust modulates future proof frequency
                       ▼
┌─────────────────────────────────────────────────────┐
│                   AGENT LAYER                        │
│  Insights · Risk Alerts · Suggestions · Calibration │
└─────────────────────────────────────────────────────┘
```

## Key Data Entities

### VisionStatement
```ts
{ id, text, editable }
// Stored in VisionPage component state
// Production: user_vision_statements table
```

### AreaVision
```ts
{
  id, area, icon, description, why,
  outcomes: string[],
  linkedGoals: number,
  progress: number,        // 0–100
  agentInsight: string,
}
// 8 life domains: Health, Family, Wealth, Career,
// Spirituality, Knowledge, Legacy, Relationships
```

### Goal (GoalCreatePage output)
```ts
{
  title, type, description,
  difficulty: "easy"|"medium"|"hard"|"epic",
  impact: "low"|"moderate"|"high"|"transformational",
  consistency: "one_off"|"habit"|"streak"|"multi_milestone",
  milestones: { title, dueDate, description }[],
  totalPoints: number,
  startDate, targetDate,
}
```

### CycleGoal (cycleEngine.ts)
```ts
{
  id, title, area, difficulty,
  progress: number,         // 0–100
  weeklyTarget: string,
  streak: number,
  proofCount, proofVerified,
  milestones: CycleMilestone[],
  linkedVision: string[],
  agentInsight: string,
  color, points, pointsEarned,
}
```

### Cycle (cycleEngine.ts)
```ts
{
  id, name, number, status,
  startDate, endDate,
  goals: CycleGoal[],
  weeklyPlans: WeeklyPlan[],
  currentWeek: number,       // 1–12
  momentumScore: number,     // 0–100, computed
  overallProgress: number,
  totalPoints, earnedPoints,
  risks: CycleRisk[],
  insights: CycleInsight[],
  visionAlignment: number,
  trustScoreImpact: number,
  behaviourScore: number,
  theme, intention,
}
```

### ProofSubmission (proofEngine.ts)
```ts
{
  id, taskId, taskName,
  userId, userName,
  type: ProofType,
  reason: ProofReason,
  status: ProofStatus,
  mediaDataUrl?: string,
  mediaType?: string,
  fileName?: string,
  reflectionText?: string,
  timestamp: Date,
  trustScoreBefore: number,
  behaviourScore: number,
  agentAnalysis?: string,
  difficulty: string,
}
```

### ProofUser
```ts
{
  id, name,
  trustScore: number,        // 0–100
  behaviourScore: number,    // 0–100
  proofCount: number,
  lastProofAt?: Date,
  mismatchCount: number,
}
```

## Agent Data Flow

When a user marks a task done on the Today Screen:

```
User clicks task checkbox
        ↓
toggle() in ActionsCard/HabitsCard
        ↓
handleProofRequest(taskName, difficulty, onApproved, streak?)
        ↓
ProofEngine.shouldRequestProof(task, user)
        ↓
    [required=false]           [required=true]
        ↓                              ↓
onApproved() called immediately    ProofModal opens
Task marked done                        ↓
                              User submits proof
                                        ↓
                            ProofEngine.submitProof()
                                        ↓
                            ProofEngine._autoAnalyse()
                                        ↓
                             onSubmitted() → onApproved()
                                        ↓
                               Task marked done
```

## State Management Pattern

Currently: component-local `useState` + module-level in-memory stores.

| Store | Location | Description |
|-------|----------|-------------|
| `_proofStore` | `proofEngine.ts` | Array of `ProofSubmission` objects |
| `CURRENT_CYCLE` | `cycleEngine.ts` | Singleton active cycle object |
| `PAST_CYCLES` | `cycleEngine.ts` | Array of completed cycles |
| Card order | `TodayPage.tsx` | `useState<string[]>` |
| Collapsed state | `TodayPage.tsx` | `useState<Record<string,boolean>>` |
| Vision statements | `VisionPage.tsx` | `useState<string[]>` |

## Production Data Architecture (Planned)

```
PostgreSQL
├── users
├── user_vision_statements
├── user_area_visions
├── goals
├── goal_milestones
├── cycles
├── cycle_goals
├── weekly_plans
├── weekly_targets
├── proof_submissions
├── proof_decisions
└── trust_score_history

Redis (cache)
├── user_session:{userId}
├── cycle_momentum:{cycleId}
└── today_cards:{userId}:{date}
```

## Inter-Screen Data Dependencies

| Consumer | Depends On |
|----------|-----------|
| TodayPage | CycleEngine (priorities, milestones), ProofEngine (modal) |
| CycleDashboard | CycleEngine (full cycle object) |
| WeeklyPlanningPage | CycleEngine (goals, past weeks, risks) |
| MidReviewPage | CycleEngine (progress, risks, milestones) |
| EndReviewPage | CycleEngine (final state) |
| ProofPage | ProofEngine (user's submissions) |
| AdminPage | ProofEngine (all submissions), CycleEngine (users) |
| GoalCreatePage | No external deps (self-contained wizard) |
| VisionPage | No external deps (self-contained) |
