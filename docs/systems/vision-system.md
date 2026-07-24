# Vision System

## Purpose

The Vision System is the identity foundation of P1. It captures who the user wants to become — not just what they want to achieve. It operates at three time horizons (identity, 1–5 years, and legacy) and maps to 8 life domains. Every other P1 system references Vision alignment to ensure that daily actions serve long-term identity.

## Route

`/vision` → `VisionPage.tsx`

## The Four Sections

### 1. Identity Vision — "I Am" Statements
The most fundamental layer. Users define who they ARE, not what they want. These statements are written in present tense and function as an identity anchor.

- Editable inline (click pencil icon)
- AI-generated suggestions (pool of 5 archetypes per session)
- "Why This Matters" block — captures the emotional reason behind the identity
- Agent insight displays contradictions or gaps across statements

### 2. Area Visions — 8 Life Domains
Each of the 8 areas has a vision description, motivation, desired outcomes, linked goals count, and progress ring.

| Domain | Default Accent |
|--------|---------------|
| Health & Vitality | Green |
| Friends & Family | Pink |
| Financial Wealth | Amber |
| Career & Purpose | Blue |
| Spirituality & Faith | Violet |
| Knowledge & Learning | Cyan |
| Mission & Legacy | Orange |
| Relationships & Love | Rose |

- SVG animated donut ring (progress 0–100%)
- "Neglected areas" warning when linkedGoals === 0
- Agent insight per area (gap analysis, momentum signal)

### 3. 1–5 Year Arcs
Time-bound vision arcs. Each arc has a horizon (1/2/3/5 years), a title, description, gradient accent, and agent prediction.

- 5 pre-loaded arcs for Francis (Build P1, Health, Family, AWS, Financial)
- Expandable detail view
- Custom arc creation form with horizon selector
- Agent predictions per arc

### 4. Legacy
The deepest layer. What does the user want to leave behind? 6 fields covering family, profession, community, personal truth, unexpected gift, and first line of obituary.

- Agent Reflect button (1.2s simulated delay, generates synthesis)
- Emerson quote as closing anchor: "To know even one life has breathed easier because you have lived."

## Inputs

- User edits to "I am" statements (inline text input)
- User edits to area vision descriptions
- User edits to year arc descriptions
- User edits to legacy fields
- User creates new year arcs

## Outputs

- `VISION_ALIGNMENT` score (74% synthetic, computed from area visions + linked goals)
- Vision alignment displayed in VisionPage header (donut gauge)
- Vision alignment micro-card on TodayPage (VisionAlignCard)
- Vision link in GoalCreatePage header
- Vision link in GoalsPage header

## Vision Alignment Score

Currently: synthetic constant (74%).

Production formula (planned):
```
SCORE = (
  linkedGoals_weight * 0.4 +
  progressAcrossAreas * 0.3 +
  identityStatements_completeness * 0.2 +
  legacyFields_completeness * 0.1
) * 100
```

## Agent Logic

| Trigger | Agent Behaviour |
|---------|----------------|
| On render | Header insight banner describes biggest vision gap or strength |
| Neglected area detected | Amber warning banner listing areas with 0 goals |
| "I am" statements | Agent insight looks for contradictions (e.g., "I am disciplined" + no health goals) |
| Year arc agent predictions | Pre-computed strings for each arc |
| Agent Reflect (Legacy) | 1.2s delay → synthesis paragraph generated from all 4 sections |
| "AI Generate" in identity | Returns 5 suggested statements from a pool |

## Proof Integration

The Vision System does not directly trigger proof requests. However:

- Completed goals linked to Vision areas contribute to `progress` on AreaVision cards
- High-vision-alignment cycles get flagged by CycleAgent as "Outstanding coherence"
- Low vision alignment triggers an agent warning in CycleDashboard Insights tab

## Cycle Integration

- Each CycleGoal has `linkedVision: string[]` — the vision areas it serves
- CycleDashboard Insights tab shows a Vision Alignment breakdown per goal
- EndReviewPage shows which vision arcs were served by the completed cycle
- CURRENT_CYCLE.visionAlignment feeds the CycleTodayCard display

## Notes for Engineers

- `VISION_ALIGNMENT` is a hardcoded constant (74) in VisionPage.tsx. In production, compute it from real goal/progress data.
- The `areaVisions` array is defined inline in VisionPage.tsx. Move to a shared data layer (context or store) so TodayPage and CycleDashboard can read the same data.
- The Agent Generate pool (`const SUGGESTIONS`) contains 5 strings. Production: call Claude API with the user's existing "I am" statements as context.
- All edits are lost on page refresh. Production: debounce + POST to `/api/vision`.
- SVG donut rings use `strokeDasharray` with circumference `(2π × r)`. For r=11: circumference ≈ 69.12.

## Notes for Designers

- The Vision page is the most emotional screen in P1. Every design decision here should feel weighty, premium, and intentional.
- The 8 AreaCards use a 2-column grid. On mobile, collapse to single column.
- The legacy section should feel sacred — amber accents, generous white space, serif-adjacent typography if possible.
- The "Vision Alignment Score" donut in the header should pulse gently when below 70%.
- The Emerson quote in Legacy is a permanent anchor — it should never be editable or removable.
- Consider a "Vision Statement" modal that lets users see all 4 sections in a single, printable view.
