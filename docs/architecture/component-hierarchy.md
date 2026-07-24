# P1 Component Hierarchy

## Top-Level Structure

```
App (React Router)
└── Routes
    ├── LoginPage
    ├── CockpitShell ──► [renders child views via internal state]
    ├── TodayPage
    ├── GoalsPage
    ├── GoalCreatePage
    ├── VisionPage
    ├── CycleDashboard
    ├── CycleListPage
    ├── WeeklyPlanningPage
    ├── MidReviewPage
    ├── EndReviewPage
    ├── ProofPage
    ├── AdminPage
    ├── ChatPage
    ├── FeedPage
    └── MessagesPage
```

## CockpitShell Component Tree

```
CockpitShell
├── <aside> Primary Sidebar
│   ├── Profile section (avatar, name, P1 score ring)
│   ├── Mode tabs (Life OS / Goals)
│   ├── SidebarPrimaryItem × N (Today, Chat, Goals, Cycle, Vision)
│   ├── Area tree
│   │   └── AreaItem × 8 (expandable life domains)
│   │       └── SubNode × N (sub-categories per area)
│   └── Footer
│       ├── Admin link (Shield icon)
│       ├── My Proofs link (CheckCircle2 icon)
│       └── Settings button
├── <main> Content Area
│   └── [renders Cockpit home view or Chat view]
└── <aside> Right Sidebar
    ├── P1 Score section
    ├── Metric cards (streak, points, behaviour)
    ├── Wellbeing section
    ├── Today's Plan section
    ├── Quick links
    └── Notifications section
```

## TodayPage Component Tree

```
TodayPage
├── <header> Sticky header
├── Card Stack (ordered by cardOrder state)
│   └── TodayCard × 23 (wrapper component)
│       ├── Card header (title, icon, agent badge, collapse toggle, move arrows)
│       └── AnimatePresence (collapse/expand)
│           └── [Card content component]
│
├── Card Components (inner):
│   ├── CycleTodayCard        — cycle progress + week priorities
│   ├── VisionAlignCard       — vision score + insights
│   ├── BlessingCard          — morning blessing display
│   ├── YesterdayCard         — retrospective prompts
│   ├── GratitudeCard         — morning gratitude entries
│   ├── MorningRoutineCard    — checklist
│   ├── FocusCard             — AI-suggested focus area
│   ├── ActionsCard           — task list with proof integration
│   ├── HabitsCard            — habit tracker with proof integration
│   ├── AtRiskCard            — dismissable risk alerts
│   ├── EnergyCard            — slider + agent recommendation
│   ├── MealsCard             — nutrition log
│   ├── ShoppingCard          — shopping list
│   ├── RetrospectiveCard     — journaling prompts
│   ├── IfDayThenCard         — conditional rules (day-aware)
│   ├── AfternoonCard         — afternoon routine checklist
│   ├── FeelCard              — mood selector
│   ├── MakeGreatCard         — mood intervention
│   ├── ExpectationsCard      — daily expectations input
│   ├── IdeasCard             — idea capture
│   ├── NotesCard             — freeform notes
│   ├── EveningCard           — evening routine checklist
│   ├── TomorrowCard          — skeleton plan builder
│   └── Gratitude2Card        — evening gratitude
│
└── ProofModal (conditional, gated on proofModal state)
```

## GoalCreatePage Component Tree

```
GoalCreatePage
├── <header> Sticky (progress dots + Vision link)
├── DoneStep × (current-1) — collapsed completed steps
├── Steps (one active at a time):
│   ├── Step 1: Goal title + suggestions
│   ├── Step 2: Goal type selector
│   ├── Step 3: Dates + timeframe
│   ├── Step 4: Difficulty + Impact + Consistency + Points calc
│   ├── Step 5: Milestone generator (agent spinner)
│   ├── Step 6: Points breakdown + animated bar
│   └── Step 7: Mission Briefing (meta grid + launch)
└── LaunchSuccess overlay (post-launch)
```

## VisionPage Component Tree

```
VisionPage
├── <header> (Vision Alignment Score donut + agent insight banner)
├── Section order controls (↑↓ reorder)
└── VisionSection × 4 (collapsible/reorderable)
    ├── IdentityContent
    │   ├── "I am..." statements (inline edit, add, delete, AI generate)
    │   └── "Why This Matters" editable block
    ├── AreaVisionsContent
    │   ├── Neglected areas warning banner
    │   └── AreaCard × 8 (SVG donut ring, outcomes, agent insight)
    ├── YearArcsContent
    │   ├── Arc × 5 (expandable, gradient accents)
    │   └── New arc creation form
    └── LegacyContent
        ├── 6 editable fields
        └── Agent Reflect button
```

## CycleDashboard Component Tree

```
CycleDashboard
├── <header> (cycle name, dates, Plan Week button)
├── Hero card (intention, momentum gauge, progress bar, quick stats)
├── Tab nav (Overview | Milestones | Week Plan | Insights)
└── Tab content:
    ├── Overview tab:
    │   ├── Agent insight banner
    │   ├── Risk warnings
    │   ├── ProgressChart (SVG, actual vs target)
    │   └── GoalCard × N (expandable: milestones, targets, proof stats)
    ├── Milestones tab:
    │   └── Milestone rows grouped by status
    ├── Week Plan tab:
    │   ├── Week selector dots
    │   ├── Current week (priorities + targets + agent notes)
    │   └── Past weeks (completion bars)
    └── Insights tab:
        ├── CycleInsight cards × N
        ├── Agent recommendations list
        ├── Vision alignment breakdown
        └── Mid/End review shortcut buttons
```

## ProofModal Component Tree

```
ProofModal (fixed overlay, z-50)
├── Backdrop (click to close)
└── Modal panel
    ├── Header (task name, reason chip, urgency badge, ESC hint)
    ├── Proof type selector (tabs for each ProofType)
    ├── Upload zone (file input, image preview)
    ├── Reflection textarea
    ├── Honesty notice
    ├── Submit button (disabled until canSubmit)
    └── Success state (animated checkmark + agent analysis)
```

## Shared Component Patterns

### TodayCard (wrapper)
Used by all 23 Today cards. Provides:
- Collapse/expand via AnimatePresence
- Move up/down arrows (appear on hover)
- Agent badge (Sparkles icon) for agent-enhanced cards
- Accent colour per card

### SidebarPrimaryItem
Navigation button with active state, icon, label.

### StepCard (GoalCreatePage)
Numbered circle badge + content area for wizard steps.

### DoneStep (GoalCreatePage)
Collapsed completed step shown as pill with Edit link.

### GoalCard (CycleDashboard)
Expandable card showing progress bar, milestones, agent insight, proof stats.

### VisionSection (VisionPage)
Section wrapper with reorder controls, title, collapse/expand.

## Reusable Patterns

| Pattern | Used In | Description |
|---------|---------|-------------|
| AnimatePresence height:0→auto | TodayCard, GoalCard, AdminPage, ProofPage | Collapse/expand |
| SVG donut ring | VisionPage, CockpitShell, CycleDashboard | Progress gauge |
| Agent insight banner | TodayPage, VisionPage, CycleDashboard, GoalCreatePage | Indigo bg + Sparkles icon |
| Sticky header | All pages | bg-[#13151c]/95 backdrop-blur-md border-b |
| Status pill | ProofPage, AdminPage, CycleDashboard | color+bg+border triple |
| Spinner (loading) | GoalCreatePage, WeeklyPlanningPage, ProofModal | motion.span rotate:360 |
| Hover-reveal controls | TodayCard (move arrows), ActionsCard (delete) | opacity-0 group-hover:opacity-100 |
