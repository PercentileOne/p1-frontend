# Admin / Proof Integrity

**Route**: `/admin`  
**File**: `src/frontend/src/pages/AdminPage.tsx`  
**Type**: Platform admin dashboard

## Purpose

The Admin screen is the operator's view of the Proof Engine. It shows the proof queue for review, all users' trust and behaviour scores, media submissions, and system health metrics. Access should be restricted to platform admins. In v0.1, it is accessible to all users for demonstration.

## User Flow

```
Admin navigates to /admin (via sidebar footer "Admin / Proof Integrity" link)
→ 4 KPI cards: Pending, Approved Today, Flagged, Avg Trust Score
→ Tab nav: Queue | Users | Media | System
→ Queue tab: expandable proof cards per submission
  → Expand: shows task, user, difficulty, proof type, reflection, media
  → 3 actions: Approve (green) | Reject (red) | Flag (amber)
  → Action triggers 420ms delay + status update + list refresh
→ Users tab: per-user rows with trust/behaviour bars, proof/mismatch counts
→ Media tab: grid of submitted media (placeholder in v0.1)
→ System tab: platform metrics + agent module status
```

## Inputs

- `ProofEngine.getAllSubmissions()` — all submissions across all users
- `DEMO_USERS: ProofUser[]` — 4 synthetic users (u1–u4)
- `activeTab` state — which tab is visible

## Outputs

- `ProofEngine.updateStatus(id, status)` — mutates `_proofStore`
- `ProofEngine.updateTrustScore(userId, delta)` — mutates user trust score
- All mutations are in-memory; reflected immediately in UI after refresh

## Agent Logic

- System tab: "Agent Module Status" table shows all agent components as Active/Simulated
- Automatic proof analysis: `agentAnalysis` field on each submission (auto-generated at submission time)
- KPI cards recompute after each action

## Proof Integration

This screen IS the proof admin interface. The `doAction(id, status)` function:
1. Sets `isProcessing.add(id)`
2. Waits 420ms (simulated AI processing)
3. Calls `ProofEngine.updateStatus(id, status)`
4. Adjusts trust score: +3 (approved), -4 (rejected), 0 (flagged)
5. Calls `refreshProofs()` to reload the list
6. Removes from `isProcessing`

## Cycle Integration

No direct cycle integration. Proof decisions affect trust scores which affect future proof rates across all cycles.

## Vision Integration

No direct vision integration.

## Notes for Engineers

- `Tab` type: `"queue" | "users" | "media" | "system"`
- `isProcessing: Set<string>` — tracks which proof IDs are in the 420ms processing state
- `import type { ProofSubmission, ProofStatus, ProofType, ProofUser }` — required
- `DEMO_USERS` is local to AdminPage — not imported from proofEngine
- The 420ms delay simulates AI analysis time; replace with real API call in production

## Notes for Designers

- The Queue tab is the primary view — it should load by default
- Proof cards should show user name, avatar, task name, difficulty badge, and proof type icon at a glance
- The 3 action buttons (Approve / Reject / Flag) should be large enough to tap on mobile
- Processing state should show a spinner replacing the action buttons for that card
- System tab should use a green/amber/red status dot pattern for module health
