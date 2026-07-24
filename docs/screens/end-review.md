# End-Cycle Review

**Route**: `/cycle/end-review`  
**File**: `src/frontend/src/pages/EndReviewPage.tsx`  
**Type**: Guided reflection + launch screen

## Purpose

The End-Cycle Review is the Week 12 wrap-up — the completion ritual for a 12-week cycle. It shows what was achieved, what was missed, the identity shifts earned, proof verification summary, vision progress, and lessons learned. It ends with a "Start Next Cycle" CTA. This screen should feel like a graduation, not a report card.

## User Flow

```
User opens /cycle/end-review (accessible from CycleDashboard when currentWeek ≥ 11)
→ Achievement summary hero: momentum score, goals completed, milestones hit, proof submissions
→ Goals grouped: Completed (≥100%) | Partial (50–99%) | Missed (<50%)
→ Identity shifts section: 4 "I am" statements derived from cycle goals
→ Proof verification summary: N verified completions
→ Vision progress: alignment score change over the cycle
→ Lessons from agent: 3 agent-generated learning statements
→ "Lessons Learned" text input (user reflection)
→ Trophy animation + "LaunchSuccess" overlay → "Start Next Cycle" navigates to /cycles
```

## Inputs

- `getCurrentCycle()` — final state of all goals, milestones, proof counts
- `CycleAgent.generateEndReview(cycle)` — agent lessons text
- User text input for lessons learned

## Outputs

- Cycle archived to `PAST_CYCLES` (in-memory)
- `CURRENT_CYCLE` reset or replaced with next cycle template
- Navigation to `/cycles` (cycle archive / new cycle start)

## Agent Logic

- Goals grouped by completion percentage (computed from `goal.progress`)
- Identity shifts: 4 statements auto-derived from cycle goal titles (e.g. "Built a venture-backed pitch → I am a confident fundraiser")
- `generateEndReview()` produces 3 lessons the agent observed across the cycle
- LaunchSuccess overlay: Trophy icon animation (scale + fade), 5 completed transformation items

## Proof Integration

- Verification summary: shows total `proofCount` across cycle goals
- "Verified completions" count reinforces the meaning of achievements — only verified completions count

## Cycle Integration

- Final step in the cycle lifecycle: `planning → execution → mid-review → end-review → archive`
- "Start Next Cycle" moves to the CycleListPage where a new cycle can be initiated

## Vision Integration

- Vision alignment score delta: shows how much alignment improved during the cycle
- Identity shifts directly connect to the Vision System's "I am" statements

## Notes for Engineers

- Goal grouping: `completed = goals.filter(g => g.progress >= 100)`, etc.
- LaunchSuccess is a conditional overlay: `useState<boolean>(false)`, set to true on "Complete Cycle" button
- Trophy animation: `motion.div` with `initial={{ scale: 0 }} animate={{ scale: 1 }}` + spring
- Archiving: push `CURRENT_CYCLE` to `PAST_CYCLES`, reset `CURRENT_CYCLE` to null or next template
- Gate the route: if `currentWeek < 11`, redirect to `/cycle`

## Notes for Designers

- The Achievement hero should use gold/amber tones — this is the reward moment
- The goal grouping (Completed / Partial / Missed) should use green / amber / red respectively
- The Identity Shifts section is the most emotionally significant — give it space and gravity
- The Trophy animation should be full-screen for 2–3 seconds before settling
- "Start Next Cycle" button should look like beginning, not ending — forward momentum energy
