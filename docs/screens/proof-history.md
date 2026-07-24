# Proof History (My Proofs)

**Route**: `/proof`  
**File**: `src/frontend/src/pages/ProofPage.tsx`  
**Type**: User-facing proof record

## Purpose

The Proof History screen shows the authenticated user's complete proof submission record. It surfaces trust score, behaviour score, submission stats, and a filterable list of all proof submissions. It is designed to make the user feel accountable and respected — their record is visible, honest, and navigable.

## User Flow

```
User navigates to /proof (via sidebar footer "My Proofs" link)
→ Trust Score card (animated progress bar)
→ Behaviour Score card (animated progress bar)
→ Stats row: Total | Approved | Pending | Flagged
→ Agent Integrity Summary banner
→ Filter tabs: All | Pending | Approved | Flagged | Rejected
→ Proof cards (expandable via click)
→ Expanded card: task name, difficulty, type, reason, media, reflection, agent analysis
```

## Inputs

- `ProofEngine.getUserSubmissions(userId)` — returns all proof submissions for the user
- Filter state: `ProofStatus | "all"`
- `MOCK_USER` — trust score, behaviour score, proof count, mismatch count

## Outputs

- No mutations (read-only for the user)
- Navigation to other screens via header back button

## Agent Logic

- Agent Integrity Summary banner: `bg-indigo-600/8 border-indigo-500/15` with Sparkles icon
- Banner content: summary of user's proof pattern and agent assessment
- Trust score interpretation: 80+ = "Verified", 60–79 = "Good standing", below 60 = "Building trust"

## Proof Integration

This screen IS the proof history. Key fields per submission:
- `type`: photo / video / voice / screenshot / document / location / timestamp / reflection / social
- `reason`: random_check / behaviour_mismatch / streak_integrity / difficulty_weighted / mid_progress / high_value
- `status`: pending / approved / rejected / flagged / auto_approved
- `agentAnalysis`: text from the agent's automated review

## Cycle Integration

Proof submissions reference cycle context indirectly via task difficulty and streak (which are cycle-driven). No direct cycle link in the UI.

## Vision Integration

No direct vision integration. Proof integrity protects the meaning of cycle completions, which are vision-linked.

## Notes for Engineers

- `timeAgo(d: Date)` helper: convert Date to "2h ago", "3d ago", etc.
- Filter tabs use `Set` membership check: `status === activeFilter || activeFilter === "all"`
- Expanded state: `Set<string>` of submission IDs, toggled on card click
- `import type { ProofSubmission, ProofStatus, ProofType }` — use `import type` not `import`
- Animated progress bars: use `motion.div` with `initial={{ width: 0 }} animate={{ width: \`${score}%\` }}`

## Notes for Designers

- Trust Score and Behaviour Score cards should be side-by-side on desktop, stacked on mobile
- The filter tabs should have a count badge per filter (e.g. "Pending (3)")
- Proof cards should show status as a colour-coded left border (green approved, amber pending, red rejected)
- The expanded view should feel like a record, not a form — everything is read-only for the user
- Consider a "Download My Record" export button for data transparency
