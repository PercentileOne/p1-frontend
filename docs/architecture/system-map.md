# P1 System Map

## Navigation Map

```
/ ──► /login
         │
         └──► /cockpit (CockpitShell)
                 │
                 ├──► /today              TodayPage
                 ├──► /goals              GoalsPage
                 │       └──► /goals/create   GoalCreatePage
                 ├──► /cycle              CycleDashboard
                 │       ├──► /cycles             CycleListPage
                 │       ├──► /cycle/weekly-planning  WeeklyPlanningPage
                 │       ├──► /cycle/mid-review    MidReviewPage
                 │       └──► /cycle/end-review    EndReviewPage
                 ├──► /vision             VisionPage
                 ├──► /proof              ProofPage
                 ├──► /admin              AdminPage
                 ├──► /chat               ChatPage
                 ├──► /feed               FeedPage
                 └──► /messages           MessagesPage
```

## Module Map

```
src/frontend/src/
│
├── lib/
│   ├── proofEngine.ts
│   │   ├── Types: ProofType, ProofReason, ProofStatus
│   │   ├── Types: ProofTask, ProofUser, ProofSubmission, ProofDecision
│   │   ├── Class: BehaviourMonitor
│   │   │   ├── detectMismatch(task, user): boolean
│   │   │   ├── behaviourScore(user): number
│   │   │   └── trustScore(user): number
│   │   ├── Class: ProofEngine
│   │   │   ├── shouldRequestProof(task, user): ProofDecision
│   │   │   ├── proofTypesFor(task): ProofType[]
│   │   │   ├── submitProof(submission): ProofSubmission
│   │   │   ├── getProofs(): ProofSubmission[]
│   │   │   ├── updateStatus(id, status): void
│   │   │   ├── _autoAnalyse(submission): string
│   │   │   ├── logProof(proof): void
│   │   │   └── verifyProof(proof): { approved, trustDelta, note }
│   │   └── Function: seedDemoProofs(): void
│   │
│   └── cycleEngine.ts
│       ├── Types: CycleDifficulty, CycleStatus, MilestoneStatus, RiskLevel
│       ├── Types: CycleMilestone, CycleGoal, WeeklyTarget, WeeklyPlan
│       ├── Types: CycleRisk, CycleInsight, Cycle
│       ├── Class: CycleAgent
│       │   ├── calculateMomentumScore(cycle): number
│       │   ├── generateWeeklyTargets(cycle, weekNum): WeeklyTarget[]
│       │   ├── detectCycleRisk(cycle): CycleRisk[]
│       │   ├── generateCycleInsights(cycle): CycleInsight[]
│       │   ├── generateMidReview(cycle): string[]
│       │   ├── generateEndReview(cycle): string[]
│       │   └── suggestAdjustments(cycle): string[]
│       ├── Data: CURRENT_CYCLE (Cycle 3 — Summer 2026)
│       ├── Data: PAST_CYCLES (Cycle 1, Cycle 2)
│       ├── Function: getCycles(): Cycle[]
│       ├── Function: getCurrentCycle(): Cycle
│       ├── Function: formatCycleDate(d): string
│       └── Function: weeksRemaining(cycle): number
│
└── components/
    └── ProofModal.tsx
        ├── Props: taskName, taskId, difficulty, streak, reason,
        │         message, proofTypes, urgency, onClose, onSubmitted, user
        ├── STATE: selectedType, mediaFile, mediaPreview
        │         reflection, submitting, done
        ├── LOGIC: canSubmit (validation rule)
        ├── LOGIC: handleSubmit (1.2s sim → ProofEngine.submitProof)
        └── EFFECT: ESC key closes modal
```

## Screen Responsibility Map

| Screen | Primary Responsibility | Secondary |
|--------|----------------------|-----------|
| LoginPage | Authentication entry | Redirect to /cockpit |
| CockpitShell | Navigation + sidebar + mode switching | P1 Score display |
| TodayPage | Daily execution hub | Cycle + Vision micro-cards |
| GoalsPage | Goals overview + progress | Navigate to create/cycle |
| GoalCreatePage | 7-step wizard for new goals | Cycle assignment (planned) |
| VisionPage | Identity + life domain visions | Cycle alignment display |
| CycleDashboard | Active cycle management | Weekly targets, milestones |
| CycleListPage | Historical cycle archive | Start next cycle |
| WeeklyPlanningPage | 5-step weekly planning wizard | Agent risk brief |
| MidReviewPage | Week 6 progress checkpoint | Risk + adjustment display |
| EndReviewPage | Week 12 completion review | Identity shifts, next cycle |
| ProofPage | User's personal proof history | Trust + behaviour scores |
| AdminPage | Admin proof review dashboard | User integrity panel |
| ChatPage | AI conversation interface | Context-aware assistance |
| FeedPage | Activity + social feed | Progress highlights |
| MessagesPage | Inbox + notifications | System alerts |

## Agent Integration Points

| Location | Agent Function | Trigger |
|----------|---------------|---------|
| TodayPage → CycleTodayCard | Display cycle priorities & warnings | On render |
| TodayPage → ActionsCard | ProofEngine.shouldRequestProof() | Task marked done |
| TodayPage → HabitsCard | ProofEngine.shouldRequestProof() | Habit marked done |
| TodayPage → FocusCard | Refresh suggestions | Button click |
| TodayPage → TomorrowCard | Auto-plan tomorrow | Button click |
| GoalCreatePage Step 5 | generateMilestones() | After goal type set |
| GoalCreatePage Step 7 | Agent insights display | Mission Briefing |
| CycleDashboard | CycleAgent.detectCycleRisk() | On render |
| CycleDashboard | CycleAgent.generateCycleInsights() | On render |
| WeeklyPlanningPage Step 4 | CycleAgent.suggestAdjustments() | After step 3 |
| MidReviewPage | CycleAgent.generateMidReview() | On render |
| EndReviewPage | CycleAgent.generateEndReview() | On render |
| AdminPage | ProofEngine._autoAnalyse() | On proof submission |
| VisionPage → IdentityContent | AI generate suggestions | Button click |

## Proof Integration Points

| Location | Proof Event | Type |
|----------|------------|------|
| ActionsCard | Mark task done | Probabilistic check |
| HabitsCard | Mark habit done | Probabilistic check (streak-aware) |
| CycleDashboard | View milestone status | Display only |
| WeeklyPlanningPage | Set targets | Flags proof-required targets |
| MidReviewPage | Progress review | Displays proof summary |
| EndReviewPage | Final review | Proof verification summary |
| ProofPage | View submission history | Display + expand |
| AdminPage | Review queue | Approve / Flag / Reject |
