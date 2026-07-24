# P1 Glossary of Terms

This glossary defines all core concepts used across the P1 platform, codebase, and documentation. Terms are listed alphabetically.

---

## A

**Agent**
The AI intelligence layer embedded throughout P1. In v0.1, rule-based simulation. In production: Claude API. The agent observes user data, surfaces insights, detects risks, and makes recommendations — without being explicitly asked. See: [Agent Overview](../agents/agent-overview.md).

**Agent Badge**
The "Agent" pill displayed in card headers where AI intelligence is active. Uses the `<Sparkles/>` icon with indigo accent. Signals to the user that this card is actively being monitored and enhanced by the agent.

**Area Vision**
A vision statement for one of the 8 life domains (Health, Family, Wealth, Career, Spirituality, Knowledge, Legacy, Relationships). Each area has a description, motivation, desired outcomes, linked goals, and a progress ring.

**At Risk**
A Today Screen card that shows goals or habits predicted to slip based on agent analysis. Dismissable by the user. If all items are dismissed (or none exist), shows "All goals on track."

---

## B

**Behaviour Score**
A 0–100 score measuring the consistency, velocity, and honesty of a user's completion patterns. Tracked by `BehaviourMonitor`. Higher behaviour scores reduce proof request frequency.

**BehaviourMonitor**
A class in `proofEngine.ts` that detects behavioural anomalies. Returns true for `detectMismatch()` when: mismatchCount > 3, long streak with low trust, epic difficulty with low trust, or 4% random detection.

**Blessing**
The "Morning Blessing" card on the Today Screen. A daily affirmation or intention-setting moment. Agent-enhanced with contextual inspiration.

---

## C

**Card Stack**
The ordered list of 23 collapsible cards on the Today Screen. User can reorder cards (↑↓ arrows), collapse/expand each, and add new cards.

**Cycle**
A 12-week structured execution container. A cycle assigns goals, generates weekly plans, tracks milestones, computes momentum, and produces mid and end reviews. The fundamental performance unit of P1. See: [Cycle Engine](../systems/cycle-engine.md).

**Cycle Agent**
The `CycleAgent` class in `cycleEngine.ts`. Provides: `calculateMomentumScore`, `generateWeeklyTargets`, `detectCycleRisk`, `generateCycleInsights`, `generateMidReview`, `generateEndReview`, `suggestAdjustments`.

**Cycle Goal**
A goal assigned to a cycle, represented as `CycleGoal` in `cycleEngine.ts`. Extends a base goal with cycle-specific fields: progress, weeklyTarget, streak, proofCount, linkedVision.

**Cycle Milestone**
A checkpoint within a goal's cycle execution. Has a title, due week, status, proof requirement, and point value. Status: `upcoming → in_progress → completed | missed | at_risk`.

**Cycle Theme**
The strategic focus of a 12-week cycle. Cycle 1 = Foundation, Cycle 2 = Momentum, Cycle 3 = Acceleration, Cycle 4 = Mastery (planned).

---

## D

**Difficulty**
A 4-tier rating on goals: `easy (100pts base)`, `medium (250pts)`, `hard (450pts)`, `epic (750pts)`. Drives the points formula and proof probability. Epic goals have a 48% base proof request rate.

---

## E

**End-Cycle Review**
The Week 12 wrap-up screen at `/cycle/end-review`. Covers achievements, completed goals, missed goals, identity shifts, proof verification, vision progress, and lessons learned. Ends with "Start Next Cycle" CTA.

**Energy Card**
A Today Screen card with a range slider (0–5) that sets the user's energy level for the day. Agent recommendation adapts to the slider value in real time.

---

## F

**Focus Card**
A Today Screen card that displays an AI-suggested focus area for the day. User can refresh for a new suggestion (900ms simulated delay).

---

## G

**Goal**
The primary unit of structured ambition in P1. Has a title, type, description, difficulty, impact, consistency rating, milestones, points, and dates. Created via the 7-step Goal Creation Wizard.

**Goal Creation Wizard**
The 7-step flow at `/goals/create`. Steps: Title → Type → Dates → Scoring → Milestones → Points → Mission Briefing.

---

## H

**Habit**
A recurring daily or weekly action tracked on the Today Screen (HabitsCard). Has a streak counter. Completing a habit can trigger a proof request (especially at high streak values).

---

## I

**Identity**
The first section of the Vision System. "I am" statements written in present tense. The foundational layer of P1's identity architecture.

**If Day Then Do**
A Today Screen card with conditional rules that auto-activate based on day of week (Sunday, Monday) or date (last day of month). Rules are pre-defined by the user.

**Impact**
A multiplier on the goal points formula: `low (×1.0)`, `moderate (×1.2)`, `high (×1.5)`, `transformational (×2.0)`.

---

## L

**LaunchSuccess**
The overlay that appears after launching a goal in GoalCreatePage. Shows an animated Zap icon, 5 agent action items, and two navigation buttons.

**Legacy**
The fourth and deepest section of the Vision System. 6 fields covering what the user wants to leave behind. Has an Agent Reflect feature.

---

## M

**Mid-Cycle Review**
The Week 6 checkpoint screen at `/cycle/mid-review`. The last point in a 12-week cycle where meaningful course correction is possible.

**Milestone**
A timed checkpoint within a goal. Has a title, due date (or due week in cycle context), proof requirement, description, and point value.

**Mission Briefing**
Step 7 of the Goal Creation Wizard. A cinematic confirmation screen that presents the goal as a formal mission with a meta grid, milestone list, points summary, and agent insights.

**Momentum Score**
A 0–100 score for a cycle computed as: `(milestones_done/total × 40) + (avg_completion/100 × 40) + (behaviourScore/100 × 20)`. The headline health metric for a cycle.

---

## P

**P1 Score**
The user's overall platform health score (visible in CockpitShell). Aggregates trust score, behaviour score, streak count, and points earned.

**Points**
A motivational scoring system. Earned by completing goals, milestones, and habits. Base points determined by goal difficulty, multiplied by impact and consistency, plus milestone bonuses (25pts each).

**Proof**
Evidence submitted by a user to verify a task or goal completion. Can be a photo, video, voice note, screenshot, document, location, timestamp, reflection, or social post. Processed by `ProofEngine`.

**Proof Engine**
The integrity system for P1. Decides when proof is required (probabilistically), accepts submissions, auto-analyses them, and updates trust scores. See: [Proof Engine](../systems/proof-engine.md).

**ProofDecision**
The object returned by `ProofEngine.shouldRequestProof()`. Contains: `required`, `reason`, `proofTypes`, `urgency`, `message`.

**ProofModal**
The overlay component that appears when proof is required. Allows the user to select a proof type, upload media, and write a reflection.

**ProofSubmission**
A submitted proof record. Contains: id, task/user info, type, reason, status, media, reflection, timestamp, trust score at submission, agent analysis.

---

## R

**Reason (Proof)**
Why proof was requested. One of: `random_check`, `behaviour_mismatch`, `streak_integrity`, `difficulty_weighted`, `mid_progress`, `high_value`.

**Retrospective**
A Today Screen card with journaling prompts for end-of-day reflection. Agent-enhanced.

---

## S

**Streak**
The count of consecutive days a habit or goal task has been completed. Streaks > 14 days trigger streak integrity proof checks. Streaks at 7/14/21/30 day milestones trigger special agent messages.

---

## T

**Today Screen**
The daily execution hub at `/today`. A stack of 23 collapsible, reorderable cards covering all aspects of daily life. The most-used screen in P1.

**Trust Score**
A 0–100 score per user representing the platform's confidence in their completion records. High trust reduces proof frequency. Low trust increases it. Changed by: +3 (full proof accepted), +1 (partial proof), -4 (proof rejected).

---

## V

**Vision**
The first layer of P1's identity architecture. Covers: I Am statements (identity), Area Visions (8 life domains), 1–5 Year Arcs (time horizons), and Legacy (what you leave behind). Lives at `/vision`.

**Vision Alignment Score**
A 0–100% metric representing how well the user's current goals and cycles serve their declared Vision. Displayed in VisionPage header and CycleTodayCard.

---

## W

**Weekly Plan**
A plan for one week in a 12-week cycle. Contains: priorities (3–5), per-goal targets, energy level, agent notes, completion rate (retrospective), and locked status.

**Weekly Planning**
The 5-step wizard at `/cycle/weekly-planning`. Covers: review last week → set targets → set priorities → agent brief → confirm & start week.

---

## Y

**Year Arc**
A 1–5 year vision statement for a specific domain of life. Part of the Vision System's third section. Each arc has a horizon, title, description, gradient accent, and agent prediction.
