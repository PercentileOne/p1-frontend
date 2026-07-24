# Feed Screen

**Route**: `/feed`  
**File**: `src/frontend/src/pages/FeedPage.tsx`  
**Type**: Social proof stream (future feature)

## Purpose

The Feed Screen is the social layer of P1 — a curated stream of verified achievements from the user's community. Unlike traditional social feeds optimised for engagement, the P1 Feed shows only verified completions, real cycle milestones, and authentic transformations. Nothing unverified appears here.

## User Flow

```
User navigates to /feed
→ Stream of achievement cards from other users
→ Each card: user name, achievement, difficulty, proof type badge, timestamp
→ "Verified" badge on all items (Proof Engine approval required to appear)
→ React with "This inspires me" (not a Like — deliberate framing)
→ Optional: follow specific users to filter feed
```

## Inputs

- Verified proof submissions from other users (production only)
- Follow list (production only)

## Outputs

- Reaction events
- Follow/unfollow actions

## Agent Logic

- Agent curates feed based on relevance: achievements similar to the user's current cycle goals surface higher
- Agent may highlight milestone moments: "Sarah just completed her 3rd consecutive 12-week cycle"

## Proof Integration

The Feed ONLY shows approved proof submissions. Pending, rejected, or flagged items never appear. This makes the Feed a trusted signal, not noise.

## Cycle Integration

Cycle completions are the highest-status events in the Feed — completing a 12-week cycle is the equivalent of crossing a finish line.

## Vision Integration

The Feed may surface users with similar vision areas — connecting people pursuing the same life domains.

## Notes for Engineers

- This screen is a stub in v0.1
- Do not build social features until the Proof System is robust and trusted (see Principle 22)
- Feed items must be gated on `status === "approved"` — never show unverified items

## Notes for Designers

- The Feed should feel like a highlight reel of real human achievement, not a scroll trap
- Achievement cards should be compact — name, task, difficulty badge, proof type, "N days ago"
- The "Verified" badge (green checkmark) should be prominent — it is the trust signal
- No infinite scroll — show 20 items per load to prevent mindless scrolling
- The reaction ("This inspires me") should feel weighty, not casual
