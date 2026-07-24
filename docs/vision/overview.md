# Vision System Overview

The Vision System is the identity layer of P1. Before a user can execute (Today Screen) or sprint (Cycle Engine), they must know who they are and who they are becoming. The Vision System answers that question across four dimensions.

## Core File

`src/frontend/src/pages/VisionPage.tsx`

## Four Vision Dimensions

### 1. I Am (Identity)
Present-tense identity statements. "I am a disciplined person who builds daily." These are not aspirations — they are declarations. The user writes who they already are, and the system holds them to it.

### 2. Area Visions (8 Life Domains)
| Domain | Description |
|--------|-------------|
| Health | Physical vitality and longevity |
| Family | Relationships with family |
| Wealth | Financial security and abundance |
| Career | Professional achievement |
| Spirituality | Connection to meaning and purpose |
| Knowledge | Continuous learning |
| Legacy | Long-term contribution and impact |
| Relationships | Friendships and community |

Each area has: vision statement, motivation, desired outcomes, linked goals, progress ring (SVG), agent insight.

### 3. Year Arcs (Time Horizons)
1-year, 3-year, and 5-year vision statements. Each has a gradient accent, title, description, and agent prediction.

### 4. Legacy
The deepest layer. 6 fields: what the user wants to be remembered for, who they want to impact, what they want to leave behind, their values, the words people would use to describe them, and the mark they want to leave on the world.

## Vision Alignment Score

A 0–100% metric computed from how well active goals and cycle targets serve the declared vision.

```
alignmentScore = sum(goalVisionScore × goalWeight) / totalWeight
```

In v0.1: hardcoded at 74%. In production: computed per user from real goal data.

## Agent Presence in Vision

| Location | Agent Output |
|----------|-------------|
| Each Area card | Insight: how this area is performing relative to goals |
| Each Arc | Prediction: agent forecast for this time horizon |
| Legacy tab | "Agent Reflect" button: 800ms → 2-paragraph reflection |
| VisionAlignCard (Today) | 3 insights, alignment score, legacy reminder |

## Integration Points

- **Today Screen**: VisionAlignCard shows score, 3 insights, link to `/vision`
- **Goal Create**: Step 2 maps goal type to vision area
- **CycleTodayCard**: shows alignment score
- **End-Cycle Review**: shows vision alignment delta over the cycle
- **Cycle Dashboard**: `linkedVision` field on each CycleGoal

## Production Roadmap

- Persist vision data per user in database
- Vision Alignment Score computed from real goal/cycle data
- Agent insights powered by Claude API
- Vision "refresh" ritual (every 12 weeks) — guided re-evaluation
- Shared vision (for couples, families, co-founders)
