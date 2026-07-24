# Agent Overview

## What is the P1 Agent?

The P1 Agent is an ambient AI intelligence woven throughout every screen and system in the platform. It is not a chatbot. It does not wait to be asked. It observes, analyses, and surfaces insights proactively — in the background of every action the user takes.

The agent embodies the role of a world-class performance coach, behavioural scientist, and accountability partner — available 24/7, infinitely patient, never judgemental, always honest.

## Agent Identity

| Property | Value |
|----------|-------|
| Name | P1 Agent |
| Role | Personal Performance Intelligence |
| Tone | Direct, encouraging, honest, never fluffy |
| Visual Brand | Sparkles icon (lucide-react `<Sparkles/>`) + indigo accent |
| Badge | "Agent" pill in card headers |
| Background | `bg-indigo-600/8 border border-indigo-500/15` |

## Agent Presence Points

The Agent surfaces in 15+ distinct locations across P1:

| Location | What the Agent Does |
|----------|-------------------|
| CockpitShell (right sidebar) | Displays P1 Score, behaviour metrics |
| TodayPage — CycleTodayCard | Week priorities, milestone alerts, cycle insight |
| TodayPage — VisionAlignCard | Vision insights (3 items), legacy reminder |
| TodayPage — ActionsCard | "Agent can prioritise" hint |
| TodayPage — FocusCard | Suggests daily focus area |
| TodayPage — HabitsCard | Tracks habits across goals |
| TodayPage — AtRiskCard | Predicts habit slippage |
| TodayPage — TomorrowCard | Auto-plans tomorrow's schedule |
| GoalCreatePage Step 1 | Intelligent title suggestions |
| GoalCreatePage Step 5 | Auto-generates milestones |
| GoalCreatePage Step 7 | 4 goal-specific insights |
| GoalCreatePage LaunchSuccess | 5 action items |
| VisionPage header | Vision alignment insight banner |
| VisionPage IdentityContent | Contradiction/gap analysis |
| VisionPage AreaVisionsContent | Per-area agent insights |
| VisionPage YearArcsContent | Predictions per arc |
| VisionPage LegacyContent | Agent Reflect synthesis |
| CycleDashboard | Risk detection, insights, suggestions |
| WeeklyPlanningPage Step 4 | Risk brief, time allocation, suggestions |
| MidReviewPage | Mid-cycle analysis sentences |
| EndReviewPage | End-cycle summary |
| ProofModal | Auto-analysis of submitted proof |
| AdminPage | Proof analysis text, system status |

## Agent in v0.1 (Simulation)

All agent intelligence in v0.1 is **rule-based simulation**. This includes:

- Pattern-matched keyword suggestions (goal title → alternatives)
- Conditional logic (streak > 14 → streak insight)
- Probability tables (difficulty → proof frequency)
- Hardcoded insights keyed to synthetic data
- Simulated async delays (0.8s–1.2s) to simulate AI processing

This is intentional. The simulation allows full UI/UX development and user testing without API dependency. All agent surfaces are already wired — replacing simulation with real AI is a single-layer swap.

## Agent in Production (Planned)

Production agent will use the **Claude API** (`claude-sonnet-4-6` or newer):

| Agent Function | Production Approach |
|---------------|-------------------|
| Goal suggestions | Prompt: user's vision statements + goal type → 3 suggestions |
| Milestone generation | Prompt: goal title + difficulty + timeframe → milestone list |
| Cycle insights | Prompt: full cycle object → 3–5 insight sentences |
| Risk detection | Rule-based (keep) + LLM for nuanced pattern analysis |
| Mid/End review | Prompt: cycle data → review narrative |
| Proof analysis | Prompt: media description + reflection → trust assessment |
| Vision reflection | Prompt: 4 vision sections → synthesis paragraph |
| Weekly brief | Prompt: past week + targets + energy → personalised brief |

All agent responses should be cached per-user per-day (Redis TTL: 86400s) to avoid redundant API calls.

## Agent Trust Contract

The Agent must never:
- Claim certainty it doesn't have
- Use generic filler language ("Great job!", "Keep it up!")
- Avoid difficult truths (e.g., progress is behind — say so directly)
- Manufacture urgency where none exists

The Agent always:
- Speaks in specifics ("Your streak is 19 days — the 21-day milestone is 2 days away")
- References real data ("You're 62% through AWS study")
- Names the risk clearly ("Body fat goal is 10% behind expected pace")
- Offers one actionable recommendation

## Agent Tone Examples

**Bad**: "You're doing amazing! Keep up the great work on your goals!"
**Good**: "Momentum is strong at 72/100. AWS study needs 6 more % on your mock score. Focus: VPC + IAM."

**Bad**: "It looks like you might want to think about your fitness goal."
**Good**: "Daily Exercise is 10% behind the expected midpoint. 3 missed sessions last week. Close the gap before Week 7."

**Bad**: "Your vision alignment is looking pretty good!"
**Good**: "82% vision alignment. Relationships & Love has 0 linked goals — consider assigning one goal to close the gap."
