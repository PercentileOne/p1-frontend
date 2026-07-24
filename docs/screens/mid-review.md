# Mid-Cycle Review

**Route**: `/cycle/mid-review`  
**File**: `src/frontend/src/pages/MidReviewPage.tsx`  
**Type**: Guided review screen

## Purpose

The Mid-Cycle Review is the Week 6 checkpoint — the last moment in the cycle where meaningful course correction is possible. It surfaces goal-level progress, detected risks, agent recommendations, and commitment questions. It is designed to be sobering and actionable, not celebratory.

## User Flow

```
User opens /cycle/mid-review (accessible from CycleDashboard CTA when currentWeek ≥ 6)
→ Amber hero card: "Halfway Point" with days remaining
→ Momentum score + trajectory sentence from agent
→ Per-goal progress bars with 50% marker (vertical white line)
→ Risk section: cards per detected risk from CycleAgent.detectCycleRisk()
→ Agent recommendations: text from CycleAgent.generateMidReview()
→ Commitment section: 2 questions (what to protect, what to drop)
→ "I'm Back In" confirm button → navigates back to /cycle
```

## Inputs

- `getCurrentCycle()` — full cycle state
- `CycleAgent.detectCycleRisk(cycle)` — array of risk objects
- `CycleAgent.generateMidReview(cycle)` — text analysis
- User text inputs for commitment questions (optional)

## Outputs

- `cycle.midReview` set (in-memory)
- Navigation back to `/cycle`

## Agent Logic

- Hero card: amber colour signals urgency — this is a warning, not a celebration
- Per-goal bars: the 50% marker (white vertical line at `left: "50%"`) shows where goals *should* be
- Goals below 50% visually "fall short" of the marker — immediately readable
- Risk cards: each risk has a type (`lag_risk`, `milestone_risk`, `streak_risk`) and description
- `generateMidReview()` produces 3–4 sentences of honest agent analysis
- Agent never softens the message: if the user is behind, it says so directly

## Proof Integration

No active proof requests. The review may reference past proof counts per goal to assess integrity.

## Cycle Integration

Sets `cycle.midReview` on the `CURRENT_CYCLE` object. Should only be accessible at week ≥ 6.

## Vision Integration

Agent may reference vision alignment in the mid-review analysis — e.g. "Goal 3 is behind but it's your highest-vision-alignment goal. Protect it."

## Notes for Engineers

- The 50% marker is implemented as `position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: white/20`
- Risk cards use: `lag_risk` → amber, `milestone_risk` → orange, `streak_risk` → red
- The "I'm Back In" button should set `cycle.midReview.completedAt = new Date()`
- Gate the route: if `currentWeek < 6`, redirect to `/cycle` or show "Not yet available"

## Notes for Designers

- The amber colour palette throughout signals caution, not celebration
- The 50% marker is the most important visual element — make it clear and labelled ("Target by Week 6")
- Risk cards should feel like alerts, not cards — icon, severity label, description
- The commitment questions should have a text input that feels like a journal entry
- The "I'm Back In" CTA should be large, confident, and final — a commitment button
